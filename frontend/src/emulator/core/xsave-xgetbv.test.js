/**
 * Unit tests for XCR0, XGETBV, XSETBV, XSAVE, XRSTOR, FXSAVE, FXRSTOR
 * and 64-bit ADD flag semantics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import CPU from './cpu/cpu.js';
import MemoryManager from './memory/memory.js';
import InstructionDecoder from './cpu/instruction-decoder.js';
import InstructionExecutor from './cpu/instruction-executor.js';
import InterruptHandler from './cpu/interrupt-handler.js';

describe('XCR0 / XGETBV / XSETBV / XSAVE / XRSTOR Tests', () => {
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
    decoder = cpu.decoder;
    executor = cpu.executor;
    
    // Initialize interrupt handler for fault testing
    if (!cpu.interruptHandler) {
      cpu.interruptHandler = new InterruptHandler(cpu, memory);
      cpu.interruptHandler.init();
    }
  });

  describe('XCR0 Initialization', () => {
    it('should initialize XCR0 to 0', () => {
      expect(cpu.registers.xcr0).toBe(0n);
    });
  });

  describe('XSETBV Tests', () => {
    it('should set XCR0 to 0x3 (bits 0 & 1) when CPL=0', () => {
      // Set up XSETBV instruction: 0x0F 0x01 0xD1 (XSETBV)
      cpu.registers.rcx = 0n; // XCR0 index
      cpu.registers.rax = 0x3n; // Lower 32 bits
      cpu.registers.rdx = 0n; // Upper 32 bits
      cpu.registers.rip = 0x1000n;
      
      // Write instruction bytes to memory
      memory.writeByte(0x1000, 0x0F);
      memory.writeByte(0x1001, 0x01);
      memory.writeByte(0x1002, 0xD1); // mod=3, reg=0, rm=1 (XSETBV)
      
      const instruction = decoder.decode();
      expect(instruction).toBeDefined();
      // The decoder recognizes 0x0F 0x01 as 'LGDT', but executeSYSTEM handles XSETBV
      expect(instruction.opcode.mnemonic).toBe('LGDT');
      
      const success = executor.execute(instruction);
      expect(success).toBe(true);
      expect(cpu.registers.xcr0).toBe(0x3n);
    });

    it('should raise #GP when XSETBV attempted with reserved bits set', () => {
      const handleInterruptSpy = vi.spyOn(cpu.interruptHandler, 'handleInterrupt');
      
      cpu.registers.rcx = 0n;
      cpu.registers.rax = (1 << 10) | 0x3n; // Reserved bit 10 set
      cpu.registers.rdx = 0n;
      cpu.registers.rip = 0x1000n;
      
      memory.writeByte(0x1000, 0x0F);
      memory.writeByte(0x1001, 0x01);
      memory.writeByte(0x1002, 0xD1);
      
      const instruction = decoder.decode();
      const success = executor.execute(instruction);
      
      expect(success).toBe(false);
      expect(handleInterruptSpy).toHaveBeenCalledWith(13, 0); // #GP fault
      expect(cpu.registers.xcr0).toBe(0n); // Should not be changed
    });
  });

  describe('XGETBV Tests', () => {
    it('should return XCR0 value in EDX:EAX after valid XSETBV', () => {
      // First set XCR0
      cpu.registers.xcr0 = 0x7n; // Bits 0, 1, 2
      
      // Execute XGETBV
      cpu.registers.rcx = 0n; // XCR0 index
      cpu.registers.rax = 0n;
      cpu.registers.rdx = 0n;
      cpu.registers.rip = 0x1000n;
      
      memory.writeByte(0x1000, 0x0F);
      memory.writeByte(0x1001, 0x01);
      memory.writeByte(0x1002, 0xD0); // mod=3, reg=0, rm=0 (XGETBV)
      
      const instruction = decoder.decode();
      const success = executor.execute(instruction);
      
      expect(success).toBe(true);
      expect(cpu.registers.rax & 0xFFFFFFFFn).toBe(0x7n);
      expect(cpu.registers.rdx & 0xFFFFFFFFn).toBe(0n); // Upper 32 bits should be 0
    });
  });

  describe('FXSAVE / FXRSTOR Tests', () => {
    it('should save and restore XMM registers via FXSAVE/FXRSTOR', () => {
      const bufferAddr = 0x2000;
      
      // Populate XMM registers with pattern
      cpu.registers.xmm0 = 0x1234567890ABCDEFn;
      cpu.registers.xmm1 = 0xFEDCBA0987654321n;
      cpu.registers.mxcsr = 0x1F80;
      cpu.registers.fcw = 0x037F;
      cpu.registers.fsw = 0x0000;
      
      // Execute FXSAVE
      cpu.registers.rip = 0x1000n;
      memory.writeByte(0x1000, 0x0F);
      memory.writeByte(0x1001, 0xAE);
      memory.writeByte(0x1002, 0x00); // mod=0, reg=0, rm=0 (FXSAVE [mem])
      memory.writeDword(0x1003, bufferAddr);
      
      let instruction = decoder.decode();
      let success = executor.execute(instruction);
      expect(success).toBe(true);
      
      // Zero registers
      cpu.registers.xmm0 = 0n;
      cpu.registers.xmm1 = 0n;
      cpu.registers.mxcsr = 0;
      
      // Execute FXRSTOR
      cpu.registers.rip = 0x1000n;
      memory.writeByte(0x1000, 0x0F);
      memory.writeByte(0x1001, 0xAE);
      memory.writeByte(0x1002, 0x08); // mod=0, reg=1, rm=0 (FXRSTOR [mem])
      memory.writeDword(0x1003, bufferAddr);
      
      instruction = decoder.decode();
      success = executor.execute(instruction);
      expect(success).toBe(true);
      
      // Verify XMM registers restored
      expect(cpu.registers.xmm0).toBe(0x1234567890ABCDEFn);
      expect(cpu.registers.xmm1).toBe(0xFEDCBA0987654321n);
      expect(cpu.registers.mxcsr).toBe(0x1F80);
    });
  });

  describe('XSAVE / XRSTOR Tests', () => {
    it('should save and restore XMM registers via XSAVE/XRSTOR with XCR0 bits 0..1', () => {
      const bufferAddr = 0x3000;
      
      // Set XCR0 to enable X87 and SSE
      cpu.registers.xcr0 = 0x3n; // Bits 0 and 1
      
      // Populate XMM registers
      cpu.registers.xmm0 = 0x1111222233334444n;
      cpu.registers.xmm1 = 0x5555666677778888n;
      cpu.registers.mxcsr = 0x1F80;
      
      // Execute XSAVE
      cpu.registers.rip = 0x1000n;
      memory.writeByte(0x1000, 0x0F);
      memory.writeByte(0x1001, 0xAE);
      memory.writeByte(0x1002, 0x20); // mod=0, reg=4, rm=0 (XSAVE [mem])
      memory.writeDword(0x1003, bufferAddr);
      
      let instruction = decoder.decode();
      let success = executor.execute(instruction);
      expect(success).toBe(true);
      
      // Zero registers
      cpu.registers.xmm0 = 0n;
      cpu.registers.xmm1 = 0n;
      cpu.registers.mxcsr = 0;
      
      // Execute XRSTOR
      cpu.registers.rip = 0x1000n;
      memory.writeByte(0x1000, 0x0F);
      memory.writeByte(0x1001, 0xAE);
      memory.writeByte(0x1002, 0x28); // mod=0, reg=5, rm=0 (XRSTOR [mem])
      memory.writeDword(0x1003, bufferAddr);
      
      instruction = decoder.decode();
      success = executor.execute(instruction);
      expect(success).toBe(true);
      
      // Verify XMM registers restored
      expect(cpu.registers.xmm0).toBe(0x1111222233334444n);
      expect(cpu.registers.xmm1).toBe(0x5555666677778888n);
      expect(cpu.registers.mxcsr).toBe(0x1F80);
    });

    it('should save and restore YMM upper halves via XSAVE/XRSTOR with XCR0 bit 2', () => {
      const bufferAddr = 0x4000;
      
      // Set XCR0 to enable X87, SSE, and AVX
      cpu.registers.xcr0 = 0x7n; // Bits 0, 1, 2
      
      // Populate YMM upper halves
      cpu.registers.ymm0 = 0xAAAABBBBCCCCDDDDn;
      cpu.registers.ymm1 = 0xEEEEFFFF00001111n;
      
      // Execute XSAVE
      cpu.registers.rip = 0x1000n;
      memory.writeByte(0x1000, 0x0F);
      memory.writeByte(0x1001, 0xAE);
      memory.writeByte(0x1002, 0x20);
      memory.writeDword(0x1003, bufferAddr);
      
      let instruction = decoder.decode();
      let success = executor.execute(instruction);
      expect(success).toBe(true);
      
      // Zero YMM registers
      cpu.registers.ymm0 = 0n;
      cpu.registers.ymm1 = 0n;
      
      // Execute XRSTOR
      cpu.registers.rip = 0x1000n;
      memory.writeByte(0x1000, 0x0F);
      memory.writeByte(0x1001, 0xAE);
      memory.writeByte(0x1002, 0x28);
      memory.writeDword(0x1003, bufferAddr);
      
      instruction = decoder.decode();
      success = executor.execute(instruction);
      expect(success).toBe(true);
      
      // Verify YMM upper halves restored
      expect(cpu.registers.ymm0).toBe(0xAAAABBBBCCCCDDDDn);
      expect(cpu.registers.ymm1).toBe(0xEEEEFFFF00001111n);
    });

    it('should raise #UD when XRSTOR attempted with unsupported xstate_bv bits', () => {
      const handleInterruptSpy = vi.spyOn(cpu.interruptHandler, 'handleInterrupt');
      const bufferAddr = 0x5000;
      
      // Set XCR0
      cpu.registers.xcr0 = 0x7n;
      
      // Create XSAVE buffer with FXSAVE area (required) and invalid header
      // First, write FXSAVE area (512 bytes) - just zeros for simplicity
      for (let i = 0; i < 512; i++) {
        memory.writeByte(bufferAddr + i, 0);
      }
      
      // Create invalid XSAVE header with unsupported bit set
      const headerOffset = 512;
      memory.writeQword(bufferAddr + headerOffset, 1n << 10n); // Bit 10 set (unsupported)
      
      // Execute XRSTOR
      cpu.registers.rip = 0x1000n;
      memory.writeByte(0x1000, 0x0F);
      memory.writeByte(0x1001, 0xAE);
      memory.writeByte(0x1002, 0x28);
      memory.writeDword(0x1003, bufferAddr);
      
      const instruction = decoder.decode();
      const success = executor.execute(instruction);
      
      expect(success).toBe(false);
      expect(handleInterruptSpy).toHaveBeenCalledWith(6, 0); // #UD fault
    });
  });

  describe('64-bit ADD Flag Semantics', () => {
    // Helper function to compute reference flags
    function computeReferenceFlags(a, b, operandSize) {
      const MASK64 = (1n << 64n) - 1n;
      const SIGN64 = 1n << 63n;
      const SIGN32 = 1n << 31n;
      const mask = operandSize === 64 ? MASK64 : 0xFFFFFFFFn;
      const signMask = operandSize === 64 ? SIGN64 : SIGN32;
      
      const sum = (a + b) & mask;
      
      const CF = (a + b) > mask ? 1 : 0;
      const OF = (((~(a ^ b)) & (a ^ sum)) & signMask) !== 0n ? 1 : 0;
      const ZF = sum === 0n ? 1 : 0;
      const SF = (sum & signMask) !== 0n ? 1 : 0;
      const AF = ((a ^ b ^ sum) & 0x10n) !== 0n ? 1 : 0;
      
      return { CF, OF, ZF, SF, AF, result: sum };
    }

    // Helper function to extract flags from RFLAGS
    function extractFlags(rflags) {
      return {
        CF: (rflags & 0x01n) !== 0n ? 1 : 0,
        AF: (rflags & 0x10n) !== 0n ? 1 : 0,
        ZF: (rflags & 0x40n) !== 0n ? 1 : 0,
        SF: (rflags & 0x80n) !== 0n ? 1 : 0,
        OF: (rflags & 0x800n) !== 0n ? 1 : 0,
      };
    }

    it('should compute correct flags for 64-bit ADD operations', () => {
      const testCases = [
        { a: 0x7FFFFFFFFFFFFFFFn, b: 1n, operandSize: 64 }, // Signed overflow
        { a: 0xFFFFFFFFFFFFFFFFn, b: 1n, operandSize: 64 }, // Unsigned overflow
        { a: 0n, b: 0n, operandSize: 64 }, // Zero result
        { a: 0x8000000000000000n, b: 0x8000000000000000n, operandSize: 64 }, // Large values
        { a: 0x1234567890ABCDEFn, b: 0xFEDCBA0987654321n, operandSize: 64 },
      ];

      for (const testCase of testCases) {
        const { a, b, operandSize } = testCase;
        const ref = computeReferenceFlags(a, b, operandSize);
        
        // Set up ADD instruction
        // For ADD r/m, r: Add register to memory, store in memory
        // We want: Add [RBX] (b) to RAX (a), store in RAX
        // So we use: ADD RAX, [RBX] but this is actually ADD [RBX], RAX in Intel syntax
        // Better: Use ADD r, r/m format: ADD RAX, RBX (register to register)
        // Or: Use ADD r/m, r but swap operands
        
        // Actually, let's use a simpler approach: ADD RAX, imm32
        // But for testing flags, we need memory operand
        // Let's use: ADD [RBX], RAX format but we want result in RAX
        // So we'll use: MOV RAX, [RBX] then ADD RAX, <value>
        // Or better: Use ADD r, r/m: 0x01 opcode
        
        // Set up ADD instruction: ADD RAX, [RBX]
        // 0x03 = ADD r, r/m (add memory/register to register)
        cpu.registers.rax = a;
        cpu.registers.rbx = 0x2000n; // Memory address (different from instruction address)
        memory.writeQword(0x2000, b); // Write data to separate address
        cpu.registers.rip = 0x1000n; // Instruction address
        cpu.registers.rflags = 0n;
        
        // Write ADD instruction: ADD RAX, [RBX] (64-bit with REX.W)
        memory.writeByte(0x1000, 0x48); // REX.W prefix (64-bit)
        memory.writeByte(0x1001, 0x03); // ADD r, r/m64
        memory.writeByte(0x1002, 0x03); // mod=0, reg=0 (RAX), rm=3 (RBX) - ADD RAX, [RBX]
        
        const instruction = decoder.decode();
        const success = executor.execute(instruction);
        
        expect(success).toBe(true);
        
        const actualFlags = extractFlags(cpu.registers.rflags);
        const actualResult = cpu.registers.rax & (operandSize === 64 ? 0xFFFFFFFFFFFFFFFFn : 0xFFFFFFFFn);
        
        expect(actualResult).toBe(ref.result);
        expect(actualFlags.CF).toBe(ref.CF);
        expect(actualFlags.OF).toBe(ref.OF);
        expect(actualFlags.ZF).toBe(ref.ZF);
        expect(actualFlags.SF).toBe(ref.SF);
        expect(actualFlags.AF).toBe(ref.AF);
      }
    });

    it('should pass randomized 64-bit ADD flag tests', () => {
      const N = 10000;
      let failures = [];
      
      for (let i = 0; i < N; i++) {
        // Generate random 64-bit values
        const a = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) | 
                  (BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) << 32n);
        const b = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) | 
                  (BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) << 32n);
        
        const ref = computeReferenceFlags(a, b, 64);
        
        // Set up ADD instruction: ADD RAX, [RBX]
        cpu.registers.rax = a;
        cpu.registers.rbx = 0x2000n; // Memory address (different from instruction address)
        memory.writeQword(0x2000, b); // Write data to separate address
        cpu.registers.rip = 0x1000n; // Instruction address
        cpu.registers.rflags = 0n;
        
        memory.writeByte(0x1000, 0x48); // REX.W prefix (64-bit)
        memory.writeByte(0x1001, 0x03); // ADD r, r/m64
        memory.writeByte(0x1002, 0x03); // mod=0, reg=0 (RAX), rm=3 (RBX) - ADD RAX, [RBX]
        
        const instruction = decoder.decode();
        const success = executor.execute(instruction);
        
        if (!success) {
          failures.push({ a, b, error: 'Instruction execution failed' });
          continue;
        }
        
        const actualFlags = extractFlags(cpu.registers.rflags);
        const actualResult = cpu.registers.rax & 0xFFFFFFFFFFFFFFFFn;
        
        if (actualResult !== ref.result || 
            actualFlags.CF !== ref.CF ||
            actualFlags.OF !== ref.OF ||
            actualFlags.ZF !== ref.ZF ||
            actualFlags.SF !== ref.SF ||
            actualFlags.AF !== ref.AF) {
          failures.push({
            a: a.toString(16),
            b: b.toString(16),
            expected: ref,
            actual: { ...actualFlags, result: actualResult.toString(16) },
          });
        }
      }
      
      if (failures.length > 0) {
        console.error('ADD flag test failures:', failures.slice(0, 10)); // Log first 10 failures
        expect(failures.length).toBe(0);
      }
    });
  });
});

