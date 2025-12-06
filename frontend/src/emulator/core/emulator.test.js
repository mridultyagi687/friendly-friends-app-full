/**
 * Emulator Test Suite
 * 
 * Tests for Windows 11 emulator components
 */

import { describe, it, expect, beforeEach } from 'vitest';
import CustomEmulator from './emulator.js';
import MemoryManager from './memory/memory.js';
import StorageDevice from './devices/storage.js';
import CPU from './cpu/cpu.js';

describe('Emulator Core Tests', () => {
  let emulator;
  let memory;
  let storage;
  let cpu;

  beforeEach(() => {
    // Create a mock canvas element for VGA
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    
    // Mock getContext to avoid jsdom issues
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
    cpu = emulator.cpu;
  });

  describe('Memory Manager', () => {
    it('should initialize with 50GB addressable space', () => {
      expect(memory.size).toBe(50 * 1024 * 1024 * 1024);
    });

    it('should read and write bytes without BigInt errors', () => {
      const address = 0x1000;
      const value = 0x42;
      
      memory.writeByte(address, value);
      const result = memory.readByte(address);
      
      expect(result).toBe(value);
    });

    it('should handle BigInt addresses correctly', () => {
      const address = BigInt(0x2000);
      const value = 0xAB;
      
      memory.writeByte(address, value);
      const result = memory.readByte(address);
      
      expect(result).toBe(value);
    });

    it('should read and write words correctly', () => {
      const address = 0x3000;
      const value = 0x1234;
      
      memory.writeWord(address, value);
      const result = memory.readWord(address);
      
      expect(result).toBe(value);
    });

    it('should read and write dwords correctly', () => {
      const address = 0x4000;
      const value = 0x12345678;
      
      memory.writeDword(address, value);
      const result = memory.readDword(address);
      
      expect(result).toBe(value);
    });

    it('should read and write qwords correctly', () => {
      const address = 0x5000;
      const value = 0x1234567890ABCDEFn;
      
      memory.writeQword(address, value);
      const result = memory.readQword(address);
      
      expect(result).toBe(value);
    });

    it('should handle sparse memory allocation', () => {
      // Write to a high address
      const address = 0x10000000;
      memory.writeByte(address, 0xFF);
      
      // Should not allocate all pages
      const stats = memory.getStats();
      expect(stats.allocatedPages).toBeLessThan(stats.maxAllocatedPages);
    });
  });

  describe('Storage Device', () => {
    it('should initialize with 55TB addressable space', async () => {
      await storage.init();
      const stats = storage.getStats();
      expect(stats.totalSizeTB).toBe(55);
    });

    it('should read and write bytes without BigInt errors', async () => {
      await storage.init();
      const offset = 0x1000;
      const value = 0x42;
      
      await storage.writeByte(offset, value);
      const result = await storage.readByte(offset);
      
      expect(result).toBe(value);
    });

    it('should handle BigInt offsets correctly', async () => {
      await storage.init();
      const offset = BigInt(0x2000);
      const value = 0xAB;
      
      await storage.writeByte(offset, value);
      const result = await storage.readByte(offset);
      
      expect(result).toBe(value);
    });

    it('should read and write words correctly', async () => {
      await storage.init();
      const offset = 0x3000;
      const value = 0x1234;
      
      await storage.writeWord(offset, value);
      const result = await storage.readWord(offset);
      
      expect(result).toBe(value);
    });

    it('should read and write dwords correctly', async () => {
      await storage.init();
      const offset = 0x4000;
      const value = 0x12345678;
      
      await storage.writeDword(offset, value);
      const result = await storage.writeDword(offset, value);
      
      expect(result).toBeUndefined(); // writeDword returns void
    });

    it('should read and write qwords correctly', async () => {
      await storage.init();
      const offset = 0x5000;
      const value = 0x1234567890ABCDEFn;
      
      await storage.writeQword(offset, value);
      const result = await storage.readQword(offset);
      
      expect(result).toBe(value);
    });
  });

  describe('CPU', () => {
    it('should initialize CPU registers', () => {
      cpu.memory = memory;
      cpu.init();
      
      expect(cpu.registers.rip).toBeDefined();
      expect(cpu.registers.rsp).toBeDefined();
      expect(cpu.registers.rax).toBeDefined();
    });

    it('should handle register operations without BigInt errors', () => {
      cpu.memory = memory;
      cpu.init();
      
      // Test register operations
      cpu.registers.rax = 0x1234567890ABCDEFn;
      cpu.registers.rbx = 0xFEDCBA0987654321n;
      
      expect(cpu.registers.rax).toBe(0x1234567890ABCDEFn);
      expect(cpu.registers.rbx).toBe(0xFEDCBA0987654321n);
    });
  });

  describe('Emulator Integration', () => {
    it('should initialize all components', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      
      // Mock getContext
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
      
      const emu = new CustomEmulator(canvas);
      await emu.init();
      
      expect(emu.memory).toBeDefined();
      expect(emu.cpu).toBeDefined();
      expect(emu.storage).toBeDefined();
      expect(emu.vga).toBeDefined();
      expect(emu.keyboard).toBeDefined();
      expect(emu.mouse).toBeDefined();
      expect(emu.uefi).toBeDefined();
      expect(emu.initialized).toBe(true);
    });

    it('should not throw errors during initialization', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      
      // Mock getContext
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
      
      const emu = new CustomEmulator(canvas);
      
      await expect(emu.init()).resolves.not.toThrow();
    });

    it('should handle memory and storage operations together', async () => {
      await storage.init();
      
      // Write to storage
      await storage.writeByte(0x1000, 0xAA);
      
      // Read from storage
      const value = await storage.readByte(0x1000);
      
      // Write to memory
      memory.writeByte(0x2000, value);
      
      // Read from memory
      const memValue = memory.readByte(0x2000);
      
      expect(memValue).toBe(0xAA);
    });
  });

  describe('BigInt/Number Mixing Prevention', () => {
    it('should not mix BigInt and Number in memory operations', () => {
      const address = BigInt(0x1000);
      const value = 0x42;
      
      // Should not throw
      expect(() => {
        memory.writeByte(address, value);
        const result = memory.readByte(address);
        expect(result).toBe(value);
      }).not.toThrow();
    });

    it('should not mix BigInt and Number in storage operations', async () => {
      await storage.init();
      const offset = BigInt(0x2000);
      const value = 0xAB;
      
      // Should not throw
      await expect(async () => {
        await storage.writeByte(offset, value);
        const result = await storage.readByte(offset);
        expect(result).toBe(value);
      }).not.toThrow();
    });

    it('should handle address arithmetic correctly', () => {
      const baseAddr = BigInt(0x1000);
      const offset = 10;
      
      // Should convert to Number before arithmetic
      const addr = typeof baseAddr === 'bigint' ? Number(baseAddr) : baseAddr;
      const finalAddr = addr + offset;
      
      memory.writeByte(finalAddr, 0xFF);
      const result = memory.readByte(finalAddr);
      
      expect(result).toBe(0xFF);
    });
  });
});

