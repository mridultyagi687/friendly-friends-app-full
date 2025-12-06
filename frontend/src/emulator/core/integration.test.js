/**
 * Integration Tests
 * 
 * Tests for full emulator integration scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import CustomEmulator from './emulator.js';
import MemoryManager from './memory/memory.js';
import StorageDevice from './devices/storage.js';

describe('Emulator Integration Tests', () => {
  let emulator;
  let memory;
  let storage;

  beforeEach(() => {
    // Create a mock canvas
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    
    if (!canvas.getContext) {
      canvas.getContext = () => ({
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {},
        createImageData: () => ({ data: new Uint8ClampedArray(4) }),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        rect: () => {},
        clip: () => {},
      });
    }
    
    emulator = new CustomEmulator(canvas);
    memory = emulator.memory;
    storage = emulator.storage;
  });

  describe('Full Emulator Initialization', () => {
    it('should initialize all components without errors', async () => {
      await expect(emulator.init()).resolves.not.toThrow();
      
      expect(emulator.initialized).toBe(true);
      expect(emulator.memory).toBeDefined();
      expect(emulator.cpu).toBeDefined();
      expect(emulator.storage).toBeDefined();
      expect(emulator.vga).toBeDefined();
      expect(emulator.keyboard).toBeDefined();
      expect(emulator.mouse).toBeDefined();
      expect(emulator.uefi).toBeDefined();
      expect(emulator.diskController).toBeDefined();
      expect(emulator.apic).toBeDefined();
    });

    it('should handle multiple initialization calls', async () => {
      await emulator.init();
      await expect(emulator.init()).resolves.not.toThrow();
      expect(emulator.initialized).toBe(true);
    });
  });

  describe('Memory and Storage Integration', () => {
    it('should copy data from storage to memory', async () => {
      await emulator.init();
      await storage.init();
      
      // Write to storage
      const testData = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
      await storage.writeData(0x1000, testData);
      
      // Read from storage into memory
      const bufferAddr = 0x20000;
      const data = await storage.readData(0x1000, testData.length);
      
      for (let i = 0; i < data.length; i++) {
        memory.writeByte(bufferAddr + i, data[i]);
      }
      
      // Verify
      for (let i = 0; i < testData.length; i++) {
        expect(memory.readByte(bufferAddr + i)).toBe(testData[i]);
      }
    });

    it('should handle large data transfers', async () => {
      await emulator.init();
      await storage.init();
      
      // Write 1MB of data
      const size = 1024 * 1024;
      const testData = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        testData[i] = i & 0xFF;
      }
      
      await storage.writeData(0, testData);
      
      // Read back in chunks
      const chunkSize = 512;
      const bufferAddr = 0x30000;
      
      for (let offset = 0; offset < size; offset += chunkSize) {
        const chunk = await storage.readData(offset, chunkSize);
        for (let i = 0; i < chunk.length; i++) {
          memory.writeByte(bufferAddr + offset + i, chunk[i]);
        }
      }
      
      // Verify first and last bytes
      expect(memory.readByte(bufferAddr)).toBe(0);
      expect(memory.readByte(bufferAddr + size - 1)).toBe((size - 1) & 0xFF);
    });
  });

  describe('UEFI Protocol Integration', () => {
    it('should provide File I/O protocol', async () => {
      await emulator.init();
      
      expect(emulator.uefi.fileIO).toBeDefined();
      expect(emulator.uefi.fileIO.guid).toBe('09576E91-6D3F-11D2-8E39-00A0C969723B');
    });

    it('should provide Block I/O protocol', async () => {
      await emulator.init();
      
      expect(emulator.uefi.blockIO).toBeDefined();
      expect(emulator.uefi.blockIO.guid).toBe('964E5B22-6459-11D2-8E39-00A0C969723B');
    });

    it('should locate protocols via UEFI boot services', async () => {
      await emulator.init();
      
      const fileIOGuid = '09576E91-6D3F-11D2-8E39-00A0C969723B';
      const blockIOGuid = '964E5B22-6459-11D2-8E39-00A0C969723B';
      
      const fileIO = emulator.uefi.locateProtocol(fileIOGuid);
      const blockIO = emulator.uefi.locateProtocol(blockIOGuid);
      
      expect(fileIO).toBe(emulator.uefi.fileIO);
      expect(blockIO).toBe(emulator.uefi.blockIO);
    });
  });

  describe('Device Integration', () => {
    it('should have all required devices', async () => {
      await emulator.init();
      
      expect(emulator.vga).toBeDefined();
      expect(emulator.keyboard).toBeDefined();
      expect(emulator.mouse).toBeDefined();
      expect(emulator.storage).toBeDefined();
      expect(emulator.diskController).toBeDefined();
      expect(emulator.apic).toBeDefined();
    });

    it('should initialize disk controller', async () => {
      await emulator.init();
      
      const portInfo = emulator.diskController.getPortInfo(0);
      expect(portInfo).not.toBeNull();
      expect(portInfo.devicePresent).toBe(true);
      expect(portInfo.sectorSize).toBe(512);
    });

    it('should initialize APIC', async () => {
      await emulator.init();
      
      expect(emulator.apic.isEnabled()).toBe(true);
      expect(emulator.apic.getAPICBase()).toBe(0xFEE00000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid memory addresses gracefully', () => {
      memory.init();
      
      // Should return 0 for unallocated pages
      const value = memory.readByte(0x10000000);
      expect(value).toBe(0);
    });

    it('should handle storage read errors', async () => {
      await storage.init();
      
      // Reading from unallocated storage should return 0
      const value = await storage.readByte(0x10000000);
      expect(value).toBe(0);
    });

    it('should handle out of bounds addresses', () => {
      memory.init();
      
      // Should throw for out of bounds
      expect(() => {
        memory.readByte(memory.size + 1);
      }).toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle rapid memory operations', () => {
      memory.init();
      
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        memory.writeByte(i, i & 0xFF);
        memory.readByte(i);
      }
      const duration = Date.now() - start;
      
      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle sparse memory efficiently', () => {
      memory.init();
      
      const initialStats = memory.getStats();
      const initialPages = initialStats.allocatedPages;
      
      // Write to widely spaced addresses
      memory.writeByte(0x1000, 0xAA);
      memory.writeByte(0x1000000, 0xBB);
      memory.writeByte(0x10000000, 0xCC);
      
      const stats = memory.getStats();
      // Should only allocate a few additional pages (3 addresses = 3 pages)
      // Account for pre-allocation
      expect(stats.allocatedPages - initialPages).toBeLessThan(10);
    });
  });
});

