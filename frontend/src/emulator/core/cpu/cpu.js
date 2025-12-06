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
      rip: 0n
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

