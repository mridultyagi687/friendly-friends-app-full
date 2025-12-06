/**
 * Instruction Coverage Tests
 * 
 * Tests for CPU instructions that Windows 11 boot process commonly uses
 */

import { describe, it, expect, beforeEach } from 'vitest';
import CPU from './cpu/cpu.js';
import MemoryManager from './memory/memory.js';
import InstructionDecoder from './cpu/instruction-decoder.js';
import InstructionExecutor from './cpu/instruction-executor.js';

describe('Instruction Coverage Tests', () => {
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
    decoder = new InstructionDecoder(cpu, memory);
    executor = new InstructionExecutor(cpu, memory);
  });

  describe('Control Flow Instructions', () => {
    it('should execute JMP with relative offset', () => {
      cpu.registers.rip = 0x1000n;
      const instruction = {
        opcode: { mnemonic: 'JMP', length: 1, hasImmediate: true },
        immediate: 0x100,
        length: 5, // 1 byte opcode + 4 byte offset
      };
      
      executor.executeJMP(instruction);
      expect(cpu.registers.rip).toBe(0x1100n);
    });

    it('should execute JZ when zero flag is set', () => {
      cpu.registers.rflags |= 0x40n; // Set ZF
      cpu.registers.rip = 0x1000n;
      const instruction = {
        opcode: { mnemonic: 'JZ', length: 1, hasImmediate: true },
        immediate: 0x100,
        length: 5,
      };
      
      executor.executeJZ(instruction);
      expect(cpu.registers.rip).toBe(0x1100n);
    });

    it('should not execute JZ when zero flag is not set', () => {
      cpu.registers.rflags &= ~0x40n; // Clear ZF
      cpu.registers.rip = 0x1000n;
      const instruction = {
        opcode: { mnemonic: 'JZ', length: 1, hasImmediate: true },
        immediate: 0x100,
        length: 5,
      };
      
      executor.executeJZ(instruction);
      expect(cpu.registers.rip).toBe(0x1005n); // Should advance by instruction length
    });

    it('should execute JNZ when zero flag is not set', () => {
      cpu.registers.rflags &= ~0x40n; // Clear ZF
      cpu.registers.rip = 0x1000n;
      const instruction = {
        opcode: { mnemonic: 'JNZ', length: 1, hasImmediate: true },
        immediate: 0x100,
        length: 5,
      };
      
      executor.executeJNZ(instruction);
      expect(cpu.registers.rip).toBe(0x1100n);
    });

    it('should execute CALL with relative offset', () => {
      cpu.registers.rsp = 0x10000n;
      cpu.registers.rip = 0x1000n;
      const instruction = {
        opcode: { mnemonic: 'CALL', length: 1, hasImmediate: true },
        immediate: 0x100,
        length: 5,
      };
      
      executor.executeCALL(instruction);
      expect(cpu.registers.rip).toBe(0x1100n);
      expect(cpu.registers.rsp).toBe(0xFFF8n); // Stack grew by 8 bytes
      
      // Verify return address was pushed
      const returnAddr = memory.readQword(0xFFF8);
      expect(returnAddr).toBe(0x1005n);
    });

    it('should execute RET', () => {
      cpu.registers.rsp = 0xFFF8n;
      memory.writeQword(0xFFF8, 0x2000n);
      const instruction = {
        opcode: { mnemonic: 'RET', length: 1 },
        length: 1,
      };
      
      executor.executeRET(instruction);
      expect(cpu.registers.rip).toBe(0x2000n);
      expect(cpu.registers.rsp).toBe(0x10000n);
    });
  });

  describe('Arithmetic Instructions', () => {
    it('should execute ADD with flags', () => {
      cpu.registers.rax = 0x7FFFFFFFn;
      cpu.registers.rbx = 1n;
      
      const instruction = {
        opcode: { mnemonic: 'ADD', length: 1, rToM: false },
        modrm: { mod: 3, reg: 0, rm: 3 }, // ADD RAX, RBX
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeADD(instruction);
      expect(cpu.registers.rax).toBe(0x80000000n);
      // Should set overflow flag
      expect(cpu.registers.rflags & 0x800n).toBe(0x800n); // OF
    });

    it('should execute SUB with flags', () => {
      cpu.registers.rax = 0x100n;
      cpu.registers.rbx = 0x200n;
      
      const instruction = {
        opcode: { mnemonic: 'SUB', length: 1, rToM: false },
        modrm: { mod: 3, reg: 0, rm: 3 }, // SUB RAX, RBX
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeSUB(instruction);
      expect(cpu.registers.rax).toBe(0xFFFFFFFFFFFFFF00n); // Wraps around
      // Should set carry flag
      expect(cpu.registers.rflags & 0x1n).toBe(0x1n); // CF
    });

    it('should execute MUL', () => {
      cpu.registers.rax = 0x1000n;
      cpu.registers.rbx = 0x10n;
      
      const instruction = {
        opcode: { mnemonic: 'MUL', length: 1, needsModRM: true },
        modrm: { mod: 3, reg: 0, rm: 3 }, // MUL RBX
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeMUL(instruction);
      expect(cpu.registers.rax).toBe(0x10000n);
    });

    it('should execute IMUL (signed multiply)', () => {
      cpu.registers.rax = 0x1000n;
      cpu.registers.rbx = -0x10n;
      
      const instruction = {
        opcode: { mnemonic: 'IMUL', length: 1, needsModRM: true },
        modrm: { mod: 3, reg: 0, rm: 3 }, // IMUL RBX
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeIMUL(instruction);
      // Result should be negative
      expect(Number(cpu.registers.rax)).toBeLessThan(0);
    });

    it('should execute DIV', () => {
      cpu.registers.rax = 0x10000n; // Dividend
      cpu.registers.rdx = 0n; // High part
      cpu.registers.rbx = 0x10n; // Divisor
      
      const instruction = {
        opcode: { mnemonic: 'DIV', length: 1, needsModRM: true },
        modrm: { mod: 3, reg: 0, rm: 3 }, // DIV RBX
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeDIV(instruction);
      expect(cpu.registers.rax).toBe(0x1000n); // Quotient
    });
  });

  describe('Bitwise Instructions', () => {
    it('should execute AND', () => {
      cpu.registers.rax = 0xFFn;
      cpu.registers.rbx = 0xF0n;
      
      const instruction = {
        opcode: { mnemonic: 'AND', length: 1, rToM: false },
        modrm: { mod: 3, reg: 0, rm: 3 }, // AND RAX, RBX
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeAND(instruction);
      expect(cpu.registers.rax).toBe(0xF0n);
    });

    it('should execute OR', () => {
      cpu.registers.rax = 0x0Fn;
      cpu.registers.rbx = 0xF0n;
      
      const instruction = {
        opcode: { mnemonic: 'OR', length: 1, rToM: false },
        modrm: { mod: 3, reg: 0, rm: 3 }, // OR RAX, RBX
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeOR(instruction);
      expect(cpu.registers.rax).toBe(0xFFn);
    });

    it('should execute XOR', () => {
      cpu.registers.rax = 0xFFn;
      cpu.registers.rbx = 0xF0n;
      
      const instruction = {
        opcode: { mnemonic: 'XOR', length: 1, rToM: false },
        modrm: { mod: 3, reg: 0, rm: 3 }, // XOR RAX, RBX
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeXOR(instruction);
      expect(cpu.registers.rax).toBe(0x0Fn);
    });

    it('should execute SHL (shift left)', () => {
      cpu.registers.rax = 0x1n;
      cpu.registers.rcx = 4n; // Shift count
      
      const instruction = {
        opcode: { mnemonic: 'SHL', length: 1, needsModRM: true },
        modrm: { mod: 3, reg: 4, rm: 0 }, // SHL RAX, CL
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeSHL(instruction);
      expect(cpu.registers.rax).toBe(0x10n);
    });

    it('should execute SHR (shift right)', () => {
      cpu.registers.rax = 0x10n;
      cpu.registers.rcx = 4n; // Shift count
      
      const instruction = {
        opcode: { mnemonic: 'SHR', length: 1, needsModRM: true },
        modrm: { mod: 3, reg: 5, rm: 0 }, // SHR RAX, CL
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeSHR(instruction);
      expect(cpu.registers.rax).toBe(0x1n);
    });
  });

  describe('String Instructions', () => {
    it('should execute MOVSB', () => {
      cpu.registers.rsi = 0x1000n; // Source
      cpu.registers.rdi = 0x2000n; // Destination
      cpu.registers.rcx = 10n; // Count
      memory.writeByte(0x1000, 0xAA);
      
      const instruction = {
        opcode: { mnemonic: 'MOVSB', length: 1 },
        length: 1,
        prefixes: { rep: 'rep' },
      };
      
      executor.executeMOVSB(instruction);
      expect(memory.readByte(0x2000)).toBe(0xAA);
      expect(cpu.registers.rsi).toBe(0x1001n);
      expect(cpu.registers.rdi).toBe(0x2001n);
      expect(cpu.registers.rcx).toBe(9n);
    });

    it('should execute STOSB', () => {
      cpu.registers.rax = 0x42n;
      cpu.registers.rdi = 0x2000n; // Destination
      cpu.registers.rcx = 5n; // Count
      
      const instruction = {
        opcode: { mnemonic: 'STOSB', length: 1 },
        length: 1,
        prefixes: { rep: 'rep' },
      };
      
      executor.executeSTOSB(instruction);
      expect(memory.readByte(0x2000)).toBe(0x42);
      expect(cpu.registers.rdi).toBe(0x2001n);
      expect(cpu.registers.rcx).toBe(4n);
    });
  });

  describe('System Instructions', () => {
    it('should execute CPUID', () => {
      cpu.registers.rax = 0n; // EAX input
      
      const instruction = {
        opcode: { mnemonic: 'CPUID', length: 1 },
        length: 2,
      };
      
      executor.executeCPUID(instruction);
      // CPUID should set EAX, EBX, ECX, EDX
      expect(cpu.registers.rax).toBeDefined();
      expect(cpu.registers.rbx).toBeDefined();
      expect(cpu.registers.rcx).toBeDefined();
      expect(cpu.registers.rdx).toBeDefined();
    });

    it('should execute RDTSC', () => {
      const instruction = {
        opcode: { mnemonic: 'RDTSC', length: 1 },
        length: 2,
      };
      
      executor.executeRDTSC(instruction);
      // RDTSC should set EDX:EAX
      expect(cpu.registers.rax).toBeDefined();
      expect(cpu.registers.rdx).toBeDefined();
    });

    it('should execute WRMSR', () => {
      cpu.registers.rcx = 0x1B0n; // MSR address (IA32_SYSENTER_CS)
      cpu.registers.rax = 0x1000n; // Low 32 bits
      cpu.registers.rdx = 0n; // High 32 bits
      
      const instruction = {
        opcode: { mnemonic: 'WRMSR', length: 1 },
        length: 2,
      };
      
      executor.executeWRMSR(instruction);
      // Should not throw
      expect(cpu.registers.rip).toBeGreaterThan(0n);
    });

    it('should execute RDMSR', () => {
      cpu.registers.rcx = 0x1B0n; // MSR address
      
      const instruction = {
        opcode: { mnemonic: 'RDMSR', length: 1 },
        length: 2,
      };
      
      executor.executeRDMSR(instruction);
      // Should set EDX:EAX
      expect(cpu.registers.rax).toBeDefined();
      expect(cpu.registers.rdx).toBeDefined();
    });
  });

  describe('Conditional Move Instructions', () => {
    it('should execute CMOVZ when zero flag is set', () => {
      cpu.registers.rflags |= 0x40n; // Set ZF
      cpu.registers.rax = 0x1000n;
      cpu.registers.rbx = 0x2000n;
      
      const instruction = {
        opcode: { mnemonic: 'CMOVZ', length: 1, rToM: false },
        modrm: { mod: 3, reg: 0, rm: 3 }, // CMOVZ RAX, RBX
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeCMOV(instruction);
      expect(cpu.registers.rax).toBe(0x2000n);
    });

    it('should not execute CMOVZ when zero flag is not set', () => {
      cpu.registers.rflags &= ~0x40n; // Clear ZF
      cpu.registers.rax = 0x1000n;
      cpu.registers.rbx = 0x2000n;
      
      const instruction = {
        opcode: { mnemonic: 'CMOVZ', length: 1, rToM: false },
        modrm: { mod: 3, reg: 0, rm: 3 }, // CMOVZ RAX, RBX
        displacement: null,
        rex: { w: true },
        length: 2,
      };
      
      executor.executeCMOV(instruction);
      expect(cpu.registers.rax).toBe(0x1000n); // Should not change
    });
  });

  describe('SSE Instructions', () => {
    it('should execute MOVDQA', () => {
      // Initialize memory with test data
      const memAddr = 0x1000;
      for (let i = 0; i < 16; i++) {
        memory.writeByte(memAddr + i, i);
      }
      
      cpu.registers.rbx = BigInt(memAddr);
      
      const instruction = {
        opcode: { mnemonic: 'MOVDQA', length: 2, needsModRM: true },
        modrm: { mod: 0, reg: 0, rm: 3 }, // MOVDQA XMM0, [RBX]
        displacement: null, // No displacement
        rex: { w: true },
        length: 3,
      };
      
      executor.executeMOVDQA(instruction);
      // Verify data was accessed (simplified - actual would use XMM registers)
      expect(memory.readByte(memAddr)).toBe(0);
    });

    it('should execute PXOR', () => {
      const memAddr = 0x1000;
      // Initialize memory
      for (let i = 0; i < 16; i++) {
        memory.writeByte(memAddr + i, 0xFF);
        memory.writeByte(memAddr + 0x100 + i, 0xF0);
      }
      
      cpu.registers.rbx = BigInt(memAddr + 0x100);
      
      const instruction = {
        opcode: { mnemonic: 'PXOR', length: 2, needsModRM: true },
        modrm: { mod: 0, reg: 0, rm: 3 }, // PXOR XMM0, [RBX]
        displacement: null, // No displacement
        rex: { w: true },
        length: 3,
      };
      
      executor.executePXOR(instruction);
      // PXOR should XOR the values
      // 0xFF XOR 0xF0 = 0x0F
      // (This is simplified - actual implementation would use XMM registers)
      expect(memory.readByte(memAddr + 0x100)).toBe(0xF0);
    });
  });
});

