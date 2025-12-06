/**
 * CPU Instruction Executor Test Suite
 * 
 * Tests for CPU instruction execution and BigInt handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import CPU from './cpu.js';
import MemoryManager from '../memory/memory.js';
import InstructionDecoder from './instruction-decoder.js';
import InstructionExecutor from './instruction-executor.js';

describe('CPU Instruction Executor Tests', () => {
  let cpu;
  let memory;
  let decoder;
  let executor;

  beforeEach(() => {
    memory = new MemoryManager();
    memory.init();
    
    cpu = new CPU();
    cpu.memory = memory;
    cpu.init();
    
    // Ensure all registers are initialized
    cpu.registers.rax = 0n;
    cpu.registers.rbx = 0n;
    cpu.registers.rcx = 0n;
    cpu.registers.rdx = 0n;
    cpu.registers.rsp = 0x10000n;
    cpu.registers.rbp = 0n;
    cpu.registers.rsi = 0n;
    cpu.registers.rdi = 0n;
    cpu.registers.r8 = 0n;
    cpu.registers.r9 = 0n;
    cpu.registers.r10 = 0n;
    cpu.registers.r11 = 0n;
    cpu.registers.r12 = 0n;
    cpu.registers.r13 = 0n;
    cpu.registers.r14 = 0n;
    cpu.registers.r15 = 0n;
    
    decoder = new InstructionDecoder(cpu, memory);
    executor = new InstructionExecutor(cpu, memory);
  });

  describe('Address Calculation', () => {
    it('should calculate addresses without BigInt errors', () => {
      // Create a mock instruction with ModR/M
      const instruction = {
        opcode: { mnemonic: 'MOV', length: 1 },
        modrm: {
          mod: 0,
          reg: 0,
          rm: 4, // SIB required
        },
        sib: {
          scale: 1,
          index: 0,
          base: 5, // RBP
        },
        displacement: 0x1000,
        rex: { w: true },
      };
      
      // Set up registers
      cpu.registers.rbp = 0x2000n;
      
      const address = executor.calculateAddress(instruction);
      expect(address).toBeTypeOf('number');
      expect(address).toBeGreaterThan(0);
    });

    it('should handle register addressing mode', () => {
      const instruction = {
        opcode: { mnemonic: 'MOV', length: 1 },
        modrm: {
          mod: 3, // Register mode
          reg: 0,
          rm: 1,
        },
      };
      
      const address = executor.calculateAddress(instruction);
      expect(address).toBeNull(); // Register mode returns null
    });

    it('should handle SIB addressing with scale', () => {
      const instruction = {
        opcode: { mnemonic: 'MOV', length: 1 },
        modrm: {
          mod: 0,
          reg: 0,
          rm: 4,
        },
        sib: {
          scale: 4,
          index: 1, // RCX
          base: 2, // RDX
        },
        displacement: 0x100,
        rex: { w: true },
      };
      
      cpu.registers.rdx = 0x1000n;
      cpu.registers.rcx = 0x10n;
      
      const address = executor.calculateAddress(instruction);
      expect(address).toBeTypeOf('number');
      // Expected: 0x1000 + (0x10 * 4) + 0x100 = 0x1140
      expect(address).toBe(0x1140);
    });
  });

  describe('Memory Operations', () => {
    it('should read memory without BigInt errors', () => {
      // Write test data
      memory.writeByte(0x1000, 0x42);
      memory.writeWord(0x2000, 0x1234);
      memory.writeDword(0x3000, 0x12345678);
      
      // Read using executor methods
      const byte = executor.readMemory(0x1000, 8);
      const word = executor.readMemory(0x2000, 16);
      const dword = executor.readMemory(0x3000, 32);
      
      expect(byte).toBe(0x42n);
      expect(word).toBe(0x1234n);
      expect(dword).toBe(0x12345678n);
    });

    it('should write memory without BigInt errors', () => {
      // Write using executor methods
      executor.writeMemory(0x1000, 0x42n, 8);
      executor.writeMemory(0x2000, 0x1234n, 16);
      executor.writeMemory(0x3000, 0x12345678n, 32);
      
      // Verify
      expect(memory.readByte(0x1000)).toBe(0x42);
      expect(memory.readWord(0x2000)).toBe(0x1234);
      expect(memory.readDword(0x3000)).toBe(0x12345678);
    });

    it('should handle BigInt addresses in readMemory', () => {
      memory.writeByte(0x5000, 0xAB);
      
      const address = BigInt(0x5000);
      const value = executor.readMemory(address, 8);
      
      expect(value).toBe(0xABn);
    });

    it('should handle BigInt addresses in writeMemory', () => {
      const address = BigInt(0x6000);
      executor.writeMemory(address, 0xCDn, 8);
      
      expect(memory.readByte(0x6000)).toBe(0xCD);
    });
  });

  describe('Flag Updates', () => {
    it('should update flags without BigInt errors', () => {
      cpu.registers.rflags = 0n;
      
      // Test with Number result
      executor.updateFlags(0, 64);
      expect((cpu.registers.rflags & 0x40n) !== 0n).toBe(true); // ZF set
      
      // Test with BigInt result
      executor.updateFlags(0n, 64);
      expect((cpu.registers.rflags & 0x40n) !== 0n).toBe(true); // ZF set
      
      // Test with non-zero
      executor.updateFlags(42, 64);
      expect((cpu.registers.rflags & 0x40n) !== 0n).toBe(false); // ZF clear
    });

    it('should handle sign flag correctly', () => {
      cpu.registers.rflags = 0n;
      
      // Positive number
      executor.updateFlags(0x7FFFFFFF, 32);
      expect((cpu.registers.rflags & 0x80n) !== 0n).toBe(false); // SF clear
      
      // Negative number (high bit set)
      executor.updateFlags(0x80000000, 32);
      expect((cpu.registers.rflags & 0x80n) !== 0n).toBe(true); // SF set
    });
  });

  describe('Instruction Execution', () => {
    it('should execute MOV instruction', () => {
      // Create MOV instruction: MOV [RBP+0x1000], RAX
      // Use RBP as base to avoid displacement-only addressing issues
      const instruction = {
        opcode: { mnemonic: 'MOV', length: 1, rToM: true },
        length: 1, // Also add length to instruction
        modrm: {
          mod: 2, // 32-bit displacement
          reg: 0, // RAX
          rm: 5, // RBP
        },
        displacement: 0x1000,
        rex: { w: true },
      };
      
      // Initialize registers
      cpu.registers.rax = 0x1234567890ABCDEFn;
      cpu.registers.rbp = 0n; // Base = 0, so address = 0 + 0x1000 = 0x1000
      
      const result = executor.execute(instruction);
      expect(result).toBe(true);
      
      // Verify value was written
      const value = memory.readQword(0x1000);
      expect(value).toBe(0x1234567890ABCDEFn);
    });

    it('should execute ADD instruction', () => {
      // Create ADD instruction: ADD RAX, [RBP+0x2000]
      // Use RBP as base to avoid displacement-only addressing issues
      const instruction = {
        opcode: { mnemonic: 'ADD', length: 1, mToR: true },
        length: 1, // Also add length to instruction
        modrm: {
          mod: 2, // 32-bit displacement
          reg: 0, // RAX
          rm: 5, // RBP
        },
        displacement: 0x2000,
        rex: { w: true },
      };
      
      // Initialize registers
      cpu.registers.rax = 0x1000n;
      cpu.registers.rbp = 0n; // Base = 0, so address = 0 + 0x2000 = 0x2000
      memory.writeQword(0x2000, 0x2000n);
      
      const result = executor.execute(instruction);
      expect(result).toBe(true);
      
      // Verify result
      expect(cpu.registers.rax).toBe(0x3000n);
    });

    it('should execute PUSH instruction', () => {
      // Create PUSH instruction: PUSH RAX
      const instruction = {
        opcode: { mnemonic: 'PUSH', length: 1, reg: 'rax', needsModRM: false },
        length: 1, // Also add length to instruction
        rex: { w: true },
      };
      
      // Initialize registers
      cpu.registers.rsp = 0x10000n;
      cpu.registers.rax = 0x1234567890ABCDEFn;
      
      const result = executor.executePUSH(instruction);
      expect(result).toBe(true);
      
      // Verify value was pushed
      const value = memory.readQword(Number(cpu.registers.rsp));
      expect(value).toBe(0x1234567890ABCDEFn);
      
      // Verify stack pointer was decremented
      expect(cpu.registers.rsp).toBe(0xFFF8n); // 0x10000 - 8
    });

    it('should execute POP instruction', () => {
      // Create POP instruction: POP RAX (opcode 0x58)
      const instruction = {
        opcode: { 
          mnemonic: 'POP', 
          length: 1, 
          reg: 'rax',
          needsModRM: false,
        },
        length: 1, // Also add length to instruction
        rex: { w: true },
      };
      
      // Initialize stack
      cpu.registers.rsp = 0xFFF8n;
      memory.writeQword(0xFFF8, 0xDEADBEEFCAFEBABEn);
      
      // Call executePOP directly
      const result = executor.executePOP(instruction);
      expect(result).toBe(true);
      
      // Verify value was popped
      expect(cpu.registers.rax).toBe(0xDEADBEEFCAFEBABEn);
      
      // Verify stack pointer was incremented
      expect(cpu.registers.rsp).toBe(0x10000n); // 0xFFF8 + 8
    });
  });

  describe('BigInt/Number Safety', () => {
    it('should handle all address types safely', () => {
      const addresses = [
        0x1000, // Number
        BigInt(0x2000), // BigInt
        0x3000, // Number
      ];
      
      addresses.forEach((addr, i) => {
        const value = 0x42 + i;
        executor.writeMemory(addr, BigInt(value), 8);
        const read = executor.readMemory(addr, 8);
        expect(read).toBe(BigInt(value));
      });
    });

    it('should not mix BigInt and Number in arithmetic', () => {
      // This test ensures no runtime errors occur
      const instruction = {
        opcode: { mnemonic: 'MOV', length: 1 },
        modrm: {
          mod: 0,
          reg: 0,
          rm: 4,
        },
        sib: {
          scale: 2,
          index: 1,
          base: 2,
        },
        displacement: 100,
        rex: { w: true },
      };
      
      cpu.registers.rdx = 0x1000n;
      cpu.registers.rcx = 0x10n;
      
      // Should not throw
      expect(() => {
        const addr = executor.calculateAddress(instruction);
        executor.readMemory(addr, 32);
      }).not.toThrow();
    });
  });
});

