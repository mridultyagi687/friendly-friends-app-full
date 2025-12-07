/**
 * x86-64 CPU Emulator Core
 * 
 * Step 2: Basic CPU emulation foundation
 * Enhanced with instruction decoder and executor
 */

import InstructionDecoder from './instruction-decoder.js';
import InstructionExecutor from './instruction-executor.js';
import InterruptHandler from './interrupt-handler.js';

class CPU {
  constructor() {
    // x86-64 General Purpose Registers
    this.registers = {
      rax: 0n, rbx: 0n, rcx: 0n, rdx: 0n,
      rsi: 0n, rdi: 0n, rbp: 0n, rsp: 0n,
      r8: 0n, r9: 0n, r10: 0n, r11: 0n,
      r12: 0n, r13: 0n, r14: 0n, r15: 0n,
      // Segment registers
      cs: 0, ds: 0, es: 0, fs: 0, gs: 0, ss: 0,
      // Control registers
      cr0: 0n, cr1: 0n, cr2: 0n, cr3: 0n, cr4: 0n,
      // Flags register
      rflags: 0n,
      // Instruction pointer
      rip: 0n,
      // XMM registers (16 x 128-bit) - CRITICAL for Windows
      xmm0: 0n, xmm1: 0n, xmm2: 0n, xmm3: 0n,
      xmm4: 0n, xmm5: 0n, xmm6: 0n, xmm7: 0n,
      xmm8: 0n, xmm9: 0n, xmm10: 0n, xmm11: 0n,
      xmm12: 0n, xmm13: 0n, xmm14: 0n, xmm15: 0n,
      // MXCSR register (SSE control/status) - CRITICAL
      mxcsr: 0x1F80, // Default: all exceptions masked, round to nearest
      // FPU registers (8 x 80-bit) - CRITICAL
      // Stored as 128-bit values (80-bit mantissa + 16-bit exponent + padding)
      st0: 0n, st1: 0n, st2: 0n, st3: 0n,
      st4: 0n, st5: 0n, st6: 0n, st7: 0n,
      // FPU control word
      fcw: 0x037F, // Default FPU control word
      // FPU status word
      fsw: 0x0000, // Default FPU status word
      // FPU tag word
      ftw: 0xFFFF, // All registers empty
      // SYSENTER registers (for SYSENTER/SYSEXIT)
      sysenter_cs: 0,
      sysenter_eip: 0n,
      sysenter_esp: 0n,
      // SYSCALL registers (for SYSCALL/SYSRET)
      star: 0n, // SYSCALL target address register
      lstar: 0n, // Long mode SYSCALL target
      cstar: 0n, // Compatibility mode SYSCALL target
      sfmask: 0n, // SYSCALL flag mask
      // Extended Control Register 0 (XCR0) - Controls XSAVE/XRSTOR
      xcr0: 0x07n, // Default: X87 (bit 0) + SSE/XMM (bit 1) + AVX/YMM (bit 2) enabled
      // Extended Feature Enable Register (EFER) - Model-specific register
      efer: 0n, // Default: all bits cleared
      // YMM registers (16 x 256-bit) - Upper 128 bits of each XMM register
      // Lower 128 bits are in XMM registers, upper 128 bits are here
      ymm0: 0n, ymm1: 0n, ymm2: 0n, ymm3: 0n,
      ymm4: 0n, ymm5: 0n, ymm6: 0n, ymm7: 0n,
      ymm8: 0n, ymm9: 0n, ymm10: 0n, ymm11: 0n,
      ymm12: 0n, ymm13: 0n, ymm14: 0n, ymm15: 0n,
    };

    this.running = false;
    this.memory = null; // Will be set by memory manager
    this.decoder = null; // Will be initialized
    this.executor = null; // Will be initialized
    this.interruptHandler = null; // Will be initialized
    this.instructionCount = 0;
    this.maxInstructions = 1000000; // Safety limit
  }

  /**
   * Initialize CPU
   */
  init() {
    console.log('CPU: Initializing x86-64 emulator...');
    // Set initial state
    this.registers.rip = 0x1000n; // Start address
    this.registers.rsp = 0x7FFF0n; // Stack pointer
    this.running = false;
    this.instructionCount = 0;
    
    // Initialize decoder, executor, and interrupt handler
    if (this.memory) {
      this.decoder = new InstructionDecoder(this, this.memory);
      this.executor = new InstructionExecutor(this, this.memory);
      this.interruptHandler = new InterruptHandler(this, this.memory);
      this.interruptHandler.init();
    }
  }

  /**
   * Execute a single instruction
   * @returns {boolean} - True if instruction executed successfully
   */
  executeInstruction() {
    if (!this.memory) {
      throw new Error('Memory not initialized');
    }

    if (!this.decoder || !this.executor) {
      // Initialize if not done yet
      this.decoder = new InstructionDecoder(this, this.memory);
      this.executor = new InstructionExecutor(this, this.memory);
    }

    // Safety check
    if (this.instructionCount >= this.maxInstructions) {
      console.warn('CPU: Instruction limit reached');
      this.running = false;
      return false;
    }

    try {
      // Decode instruction at current RIP
      const instruction = this.decoder.decode();
      if (!instruction) {
        console.warn(`CPU: Failed to decode instruction at 0x${this.registers.rip.toString(16)}`);
        return false;
      }

      // Execute instruction
      const success = this.executor.execute(instruction);
      if (!success) {
        console.warn(`CPU: Failed to execute ${instruction.opcode.mnemonic}`);
        // Still advance RIP to avoid infinite loop
        this.registers.rip += BigInt(instruction.length);
      }

      this.instructionCount++;
      return success;
    } catch (error) {
      console.error('CPU: Error executing instruction:', error);
      return false;
    }
  }

  /**
   * Run CPU (execute instructions in a loop)
   */
  run() {
    this.running = true;
    this.instructionCount = 0;
    console.log('CPU: Starting execution...');
    
    // Use requestAnimationFrame for non-blocking execution
    const executeLoop = () => {
      if (!this.running) {
        return;
      }

      // Execute a batch of instructions per frame
      const instructionsPerFrame = 1000;
      for (let i = 0; i < instructionsPerFrame && this.running; i++) {
        if (!this.executeInstruction()) {
          this.running = false;
          break;
        }
      }

      if (this.running) {
        requestAnimationFrame(executeLoop);
      } else {
        console.log('CPU: Execution stopped');
      }
    };

    executeLoop();
  }

  /**
   * Stop CPU execution
   */
  stop() {
    this.running = false;
    console.log('CPU: Stopped');
  }

  /**
   * Get CPU state for saving
   * @returns {Object} - Serialized CPU state
   */
  getState() {
    return {
      registers: { ...this.registers },
      running: this.running
    };
  }

  /**
   * Restore CPU state
   * @param {Object} state - Serialized CPU state
   */
  setState(state) {
    this.registers = { ...state.registers };
    this.running = state.running;
  }
}

export default CPU;

