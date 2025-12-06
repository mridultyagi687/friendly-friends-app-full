/**
 * UEFI Protocols Test Suite
 * 
 * Tests for UEFI File I/O and Block I/O protocols
 */

import { describe, it, expect, beforeEach } from 'vitest';
import FileIOProtocol from './file-io-protocol.js';
import BlockIOProtocol from './block-io-protocol.js';
import MemoryManager from '../memory/memory.js';
import StorageDevice from '../devices/storage.js';

describe('UEFI Protocols Tests', () => {
  let memory;
  let storage;
  let fileIO;
  let blockIO;

  beforeEach(async () => {
    memory = new MemoryManager();
    memory.init();
    
    storage = new StorageDevice();
    await storage.init();
    
    fileIO = new FileIOProtocol(storage, memory);
    blockIO = new BlockIOProtocol(storage, memory);
    await blockIO.init();
  });

  describe('File I/O Protocol', () => {
    it('should initialize File I/O Protocol', () => {
      expect(fileIO).toBeDefined();
      expect(fileIO.guid).toBe('09576E91-6D3F-11D2-8E39-00A0C969723B');
      expect(fileIO.revision).toBe(0x00010000);
    });

    it('should initialize with ISO parser', () => {
      const mockISOParser = {
        isoLoaded: true,
        readFile: (path) => {
          if (path === 'EFI/BOOT/BOOTX64.EFI') {
            return new Uint8Array([0x4D, 0x5A]); // MZ header
          }
          return null;
        },
      };
      
      fileIO.init(mockISOParser);
      expect(fileIO.files.size).toBeGreaterThan(0);
    });

    it('should open and read files', () => {
      // Add a test file
      fileIO.files.set('test.txt', {
        path: 'test.txt',
        data: new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]), // "Hello"
        size: 5,
      });
      
      const handle = fileIO.open('test.txt');
      expect(handle).not.toBeNull();
      expect(handle.isOpen).toBe(true);
      expect(handle.size).toBe(5);
      
      const data = fileIO.read(handle, 5);
      expect(data.length).toBe(5);
      expect(data[0]).toBe(0x48); // 'H'
    });

    it('should handle file not found', () => {
      const handle = fileIO.open('nonexistent.txt');
      expect(handle).toBeNull();
    });

    it('should write to files', () => {
      const handle = fileIO.open('test.txt', 2); // Write mode
      if (!handle) {
        // Create a new file handle
        fileIO.files.set('test.txt', {
          path: 'test.txt',
          data: new Uint8Array(0),
          size: 0,
        });
        const newHandle = fileIO.open('test.txt', 2);
        expect(newHandle).not.toBeNull();
        
        const data = new Uint8Array([0x57, 0x6F, 0x72, 0x6C, 0x64]); // "World"
        const written = fileIO.write(newHandle, data);
        expect(written).toBe(5);
        expect(newHandle.size).toBe(5);
      }
    });

    it('should get file info', () => {
      fileIO.files.set('test.txt', {
        path: 'test.txt',
        data: new Uint8Array([1, 2, 3]),
        size: 3,
      });
      
      const handle = fileIO.open('test.txt');
      const info = fileIO.getInfo(handle);
      
      expect(info).not.toBeNull();
      expect(info.size).toBe(3);
    });

    it('should set file position', () => {
      fileIO.files.set('test.txt', {
        path: 'test.txt',
        data: new Uint8Array([1, 2, 3, 4, 5]),
        size: 5,
      });
      
      const handle = fileIO.open('test.txt');
      fileIO.setPosition(handle, 2);
      
      expect(handle.position).toBe(2);
    });

    it('should get root directory', () => {
      const root = fileIO.getRoot();
      expect(root).not.toBeNull();
      expect(root.isDirectory).toBe(true);
    });
  });

  describe('Block I/O Protocol', () => {
    it('should initialize Block I/O Protocol', () => {
      expect(blockIO).toBeDefined();
      expect(blockIO.guid).toBe('964E5B22-6459-11D2-8E39-00A0C969723B');
      expect(blockIO.revision).toBe(0x00010000);
    });

    it('should have correct media information', () => {
      const media = blockIO.getMedia();
      expect(media).toBeDefined();
      expect(media.blockSize).toBe(512);
      expect(media.mediaPresent).toBe(true);
      expect(media.readOnly).toBe(false);
    });

    it('should reset successfully', () => {
      const result = blockIO.reset();
      expect(result).toBe(0); // EFI_SUCCESS
    });

    it('should read blocks from device', async () => {
      // Write test data to storage
      const testData = new Uint8Array(512);
      for (let i = 0; i < 512; i++) {
        testData[i] = i & 0xFF;
      }
      await storage.writeData(0, testData);
      
      // Allocate buffer in memory
      const bufferAddr = 0x10000;
      
      // Read blocks
      const result = await blockIO.readBlocks(1, 0, 512, bufferAddr);
      expect(result).toBe(0); // EFI_SUCCESS
      
      // Verify data was read
      const readData = new Uint8Array(512);
      for (let i = 0; i < 512; i++) {
        readData[i] = memory.readByte(bufferAddr + i);
      }
      
      expect(readData).toEqual(testData);
    });

    it('should write blocks to device', async () => {
      // Prepare test data in memory
      const bufferAddr = 0x20000;
      const testData = new Uint8Array(512);
      for (let i = 0; i < 512; i++) {
        testData[i] = (i * 2) & 0xFF;
        memory.writeByte(bufferAddr + i, testData[i]);
      }
      
      // Write blocks
      const result = await blockIO.writeBlocks(1, 0, 512, bufferAddr);
      expect(result).toBe(0); // EFI_SUCCESS
      
      // Verify data was written
      const writtenData = await storage.readData(0, 512);
      expect(writtenData).toEqual(testData);
    });

    it('should handle invalid media ID', async () => {
      const result = await blockIO.readBlocks(999, 0, 512, 0x10000);
      expect(result).toBe(1); // EFI_INVALID_PARAMETER
    });

    it('should handle out of range LBA', async () => {
      const media = blockIO.getMedia();
      const invalidLBA = media.lastBlock + 1000;
      
      const result = await blockIO.readBlocks(1, invalidLBA, 512, 0x10000);
      expect(result).toBe(2); // EFI_DEVICE_ERROR
    });

    it('should flush blocks', async () => {
      const result = await blockIO.flushBlocks();
      expect(result).toBe(0); // EFI_SUCCESS
    });

    it('should handle read-only media', async () => {
      blockIO.media.readOnly = true;
      
      const result = await blockIO.writeBlocks(1, 0, 512, 0x10000);
      expect(result).toBe(3); // EFI_WRITE_PROTECTED
      
      blockIO.media.readOnly = false; // Reset
    });
  });

  describe('Protocol Integration', () => {
    it('should work together for file operations', async () => {
      // Write file data to storage via Block I/O
      const fileData = new Uint8Array([0x4D, 0x5A, 0x90, 0x00]); // MZ header
      const bufferAddr = 0x30000;
      
      for (let i = 0; i < fileData.length; i++) {
        memory.writeByte(bufferAddr + i, fileData[i]);
      }
      
      // Write to storage
      await blockIO.writeBlocks(1, 0, 512, bufferAddr);
      
      // Read back via Block I/O
      const readBuffer = 0x40000;
      await blockIO.readBlocks(1, 0, 512, readBuffer);
      
      // Verify
      for (let i = 0; i < fileData.length; i++) {
        const value = memory.readByte(readBuffer + i);
        expect(value).toBe(fileData[i]);
      }
    });
  });
});

