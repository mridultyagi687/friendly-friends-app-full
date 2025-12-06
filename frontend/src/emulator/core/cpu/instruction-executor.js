/**
 * x86-64 Instruction Executor
 * 
 * Executes decoded x86-64 instructions
 */

class InstructionExecutor {
  constructor(cpu, memory) {
    this.cpu = cpu;
    this.memory = memory;
  }

  /**
   * Execute a decoded instruction
   * @param {Object} instruction - Decoded instruction
   * @returns {boolean} - True if executed successfully
   */
  execute(instruction) {
    if (!instruction || !instruction.opcode) {
      return false;
    }

    const mnemonic = instruction.opcode.mnemonic;

    try {
      switch (mnemonic) {
        case 'NOP':
          return this.executeNOP(instruction);
        case 'MOV':
          return this.executeMOV(instruction);
        case 'PUSH':
          return this.executePUSH(instruction);
        case 'POP':
          return this.executePOP(instruction);
        case 'ADD':
          return this.executeADD(instruction);
        case 'SUB':
          return this.executeSUB(instruction);
        case 'JMP':
          return this.executeJMP(instruction);
        case 'CALL':
          return this.executeCALL(instruction);
        case 'RET':
          return this.executeRET(instruction);
        case 'JZ':
        case 'JNZ':
          return this.executeJCC(instruction);
        case 'CMP':
          return this.executeCMP(instruction);
        case 'TEST':
          return this.executeTEST(instruction);
        case 'LEA':
          return this.executeLEA(instruction);
        case 'XOR':
          return this.executeXOR(instruction);
        case 'AND':
          return this.executeAND(instruction);
        case 'OR':
          return this.executeOR(instruction);
        case 'INT':
        case 'INT3':
        case 'INTO':
          return this.executeINT(instruction);
        case 'IRET':
          return this.executeIRET(instruction);
        case 'CLI':
          return this.executeCLI(instruction);
        case 'STI':
          return this.executeSTI(instruction);
        case 'PUSHF':
          return this.executePUSHF(instruction);
        case 'POPF':
          return this.executePOPF(instruction);
        case 'SHIFT':
          return this.executeSHIFT(instruction);
        case 'MOVSB':
        case 'MOVSW':
          return this.executeMOVS(instruction);
        case 'STOSB':
        case 'STOSW':
          return this.executeSTOS(instruction);
        case 'CMPSB':
        case 'CMPSW':
          return this.executeCMPS(instruction);
        case 'SCASB':
        case 'SCASW':
          return this.executeSCAS(instruction);
        case 'LOOP':
        case 'LOOPE':
        case 'LOOPNE':
          return this.executeLOOP(instruction);
        default:
          console.warn(`CPU: Unhandled instruction: ${mnemonic}`);
          return false;
      }
    } catch (error) {
      console.error(`CPU: Error executing ${mnemonic}:`, error);
      return false;
    }
  }

  /**
   * Execute NOP (No Operation)
   */
  executeNOP(instruction) {
    // Do nothing, just advance RIP
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute MOV instruction
   */
  executeMOV(instruction) {
    const { opcode, modrm, rex, immediate } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    // MOV reg, imm (e.g., MOV RAX, 0x1234)
    if (opcode.reg && immediate !== null) {
      const regName = opcode.reg;
      const value = BigInt(immediate);
      this.cpu.registers[regName] = value;
      this.cpu.registers.rip += BigInt(instruction.length);
      return true;
    }

    // MOV reg, mem or MOV mem, reg
    if (modrm) {
      const srcReg = this.getRegisterFromModRM(modrm, rex, operandSize);
      const dstAddr = this.calculateAddress(instruction);

      if (opcode.mToR) {
        // MOV reg, mem
        const value = this.readMemory(dstAddr, operandSize);
        this.cpu.registers[srcReg] = value;
      } else if (opcode.rToM) {
        // MOV mem, reg
        const value = this.cpu.registers[srcReg];
        this.writeMemory(dstAddr, value, operandSize);
      }

      this.cpu.registers.rip += BigInt(instruction.length);
      return true;
    }

    return false;
  }

  /**
   * Execute PUSH instruction
   */
  executePUSH(instruction) {
    const { opcode, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    let value;
    if (opcode.reg) {
      // PUSH reg
      value = this.cpu.registers[opcode.reg];
    } else {
      // PUSH imm (not implemented yet)
      return false;
    }

    // Decrement stack pointer
    this.cpu.registers.rsp -= BigInt(operandSize / 8);

    // Write value to stack
    const stackAddr = Number(this.cpu.registers.rsp);
    this.writeMemory(stackAddr, value, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute POP instruction
   */
  executePOP(instruction) {
    const { opcode, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!opcode.reg) {
      return false;
    }

    // Read value from stack
    const stackAddr = Number(this.cpu.registers.rsp);
    const value = this.readMemory(stackAddr, operandSize);

    // Write to register
    this.cpu.registers[opcode.reg] = value;

    // Increment stack pointer
    this.cpu.registers.rsp += BigInt(operandSize / 8);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute ADD instruction
   */
  executeADD(instruction) {
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm || !instruction.opcode.mToR) {
      return false;
    }

    const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
    const memAddr = this.calculateAddress(instruction);
    const memValue = this.readMemory(memAddr, operandSize);
    const regValue = this.cpu.registers[reg];

    // Perform addition
    const result = regValue + memValue;
    this.cpu.registers[reg] = result;

    // Update flags (simplified)
    this.updateFlags(result, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute SUB instruction
   */
  executeSUB(instruction) {
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm || !instruction.opcode.rToM) {
      return false;
    }

    const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
    const memAddr = this.calculateAddress(instruction);
    const memValue = this.readMemory(memAddr, operandSize);
    const regValue = this.cpu.registers[reg];

    // Perform subtraction
    const result = regValue - memValue;
    this.writeMemory(memAddr, result, operandSize);

    // Update flags (simplified)
    this.updateFlags(result, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute JMP instruction
   */
  executeJMP(instruction) {
    const { immediate, opcode } = instruction;

    if (immediate === null) {
      return false;
    }

    if (opcode.relative) {
      // Relative jump
      const offset = BigInt(immediate);
      this.cpu.registers.rip += offset;
    } else {
      // Absolute jump
      this.cpu.registers.rip = BigInt(immediate);
    }

    return true;
  }

  /**
   * Execute CALL instruction
   */
  executeCALL(instruction) {
    const { immediate, opcode, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (immediate === null || !opcode.relative) {
      return false;
    }

    // Push return address (next instruction)
    const returnAddr = this.cpu.registers.rip + BigInt(instruction.length);
    this.cpu.registers.rsp -= BigInt(operandSize / 8);
    const stackAddr = Number(this.cpu.registers.rsp);
    this.writeMemory(stackAddr, returnAddr, operandSize);

    // Jump to target
    const offset = BigInt(immediate);
    this.cpu.registers.rip += offset;

    return true;
  }

  /**
   * Execute RET instruction
   */
  executeRET(instruction) {
    const operandSize = 64; // Assume 64-bit

    // Pop return address from stack
    const stackAddr = Number(this.cpu.registers.rsp);
    const returnAddr = this.readMemory(stackAddr, operandSize);
    this.cpu.registers.rsp += BigInt(operandSize / 8);

    // Jump to return address
    this.cpu.registers.rip = returnAddr;

    return true;
  }

  /**
   * Execute conditional jump (JZ, JNZ, etc.)
   */
  executeJCC(instruction) {
    const { immediate, opcode } = instruction;
    const mnemonic = opcode.mnemonic;

    if (immediate === null || !opcode.relative) {
      return false;
    }

    // Check condition based on flags
    const zf = (this.cpu.registers.rflags & 0x40n) !== 0n; // Zero flag

    let shouldJump = false;
    if (mnemonic === 'JZ' && zf) {
      shouldJump = true;
    } else if (mnemonic === 'JNZ' && !zf) {
      shouldJump = true;
    }

    if (shouldJump) {
      const offset = BigInt(immediate);
      this.cpu.registers.rip += offset;
    } else {
      this.cpu.registers.rip += BigInt(instruction.length);
    }

    return true;
  }

  /**
   * Helper: Get register name from ModR/M
   */
  getRegisterFromModRM(modrm, rex, operandSize) {
    const regMap = [
      ['al', 'ax', 'eax', 'rax'],
      ['cl', 'cx', 'ecx', 'rcx'],
      ['dl', 'dx', 'edx', 'rdx'],
      ['bl', 'bx', 'ebx', 'rbx'],
      ['ah', 'sp', 'esp', 'rsp'],
      ['ch', 'bp', 'ebp', 'rbp'],
      ['dh', 'si', 'esi', 'rsi'],
      ['bh', 'di', 'edi', 'rdi'],
    ];

    let regIndex = modrm.reg;
    if (rex && rex.r) {
      regIndex += 8;
    }

    const sizeIndex = operandSize === 64 ? 3 : operandSize === 32 ? 2 : operandSize === 16 ? 1 : 0;
    return regMap[regIndex % 8][sizeIndex];
  }

  /**
   * Helper: Calculate memory address from instruction
   */
  calculateAddress(instruction) {
    const { modrm, sib, displacement, rex } = instruction;

    if (!modrm) {
      return 0;
    }

    // Direct addressing modes
    if (modrm.mod === 3) {
      // Register mode (not memory)
      return null;
    }

    let address = 0n;

    // Base register
    if (sib) {
      const baseReg = this.getRegisterFromModRM({ reg: sib.base, mod: 0 }, rex, 64);
      address += this.cpu.registers[baseReg] || 0n;
    } else {
      const baseReg = this.getRegisterFromModRM({ reg: modrm.rm, mod: 0 }, rex, 64);
      address += this.cpu.registers[baseReg] || 0n;
    }

    // Index register (SIB)
    if (sib) {
      const indexReg = this.getRegisterFromModRM({ reg: sib.index, mod: 0 }, rex, 64);
      address += (this.cpu.registers[indexReg] || 0n) * BigInt(sib.scale);
    }

    // Displacement
    if (displacement !== null) {
      address += BigInt(displacement);
    }

    return Number(address);
  }

  /**
   * Helper: Read from memory
   */
  readMemory(address, size) {
    if (address === null || address === undefined) {
      return 0n;
    }

    switch (size) {
      case 8:
        return BigInt(this.memory.readByte(address));
      case 16:
        return BigInt(this.memory.readWord(address));
      case 32:
        return BigInt(this.memory.readDword(address));
      case 64:
        return this.memory.readQword(address);
      default:
        return 0n;
    }
  }

  /**
   * Helper: Write to memory
   */
  writeMemory(address, value, size) {
    if (address === null || address === undefined) {
      return;
    }

    switch (size) {
      case 8:
        this.memory.writeByte(address, Number(value & 0xFFn));
        break;
      case 16:
        this.memory.writeWord(address, Number(value & 0xFFFFn));
        break;
      case 32:
        this.memory.writeDword(address, Number(value & 0xFFFFFFFFn));
        break;
      case 64:
        this.memory.writeQword(address, value);
        break;
    }
  }

  /**
   * Execute CMP instruction
   */
  executeCMP(instruction) {
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm || !instruction.opcode.mToR) {
      return false;
    }

    const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
    const memAddr = this.calculateAddress(instruction);
    const memValue = this.readMemory(memAddr, operandSize);
    const regValue = this.cpu.registers[reg];

    // Perform comparison (subtract but don't store result)
    const result = regValue - memValue;

    // Update flags based on comparison
    this.updateFlags(result, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute TEST instruction
   */
  executeTEST(instruction) {
    const { opcode, modrm, rex, immediate } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    let result;

    // TEST reg, imm
    if (opcode.reg && immediate !== null) {
      const regValue = this.cpu.registers[opcode.reg];
      const immValue = BigInt(immediate);
      result = regValue & immValue;
    }
    // TEST reg, reg or TEST reg, mem
    else if (modrm) {
      const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
      const regValue = this.cpu.registers[reg];
      
      if (instruction.opcode.mToR) {
        const memAddr = this.calculateAddress(instruction);
        const memValue = this.readMemory(memAddr, operandSize);
        result = regValue & memValue;
      } else {
        // TEST reg, reg (not fully implemented)
        return false;
      }
    } else {
      return false;
    }

    // Update flags (TEST sets flags but doesn't store result)
    this.updateFlags(result, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute LEA instruction (Load Effective Address)
   */
  executeLEA(instruction) {
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm || !instruction.opcode.mToR) {
      return false;
    }

    // Calculate address (but don't read from it)
    const address = this.calculateAddress(instruction);
    if (address === null) {
      return false;
    }

    // Load address into register
    const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
    this.cpu.registers[reg] = BigInt(address);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute XOR instruction
   */
  executeXOR(instruction) {
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm || !instruction.opcode.rToM) {
      return false;
    }

    const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
    const memAddr = this.calculateAddress(instruction);
    const memValue = this.readMemory(memAddr, operandSize);
    const regValue = this.cpu.registers[reg];

    // Perform XOR
    const result = regValue ^ memValue;
    this.writeMemory(memAddr, result, operandSize);

    // Update flags
    this.updateFlags(result, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute AND instruction
   */
  executeAND(instruction) {
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm || !instruction.opcode.rToM) {
      return false;
    }

    const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
    const memAddr = this.calculateAddress(instruction);
    const memValue = this.readMemory(memAddr, operandSize);
    const regValue = this.cpu.registers[reg];

    // Perform AND
    const result = regValue & memValue;
    this.writeMemory(memAddr, result, operandSize);

    // Update flags
    this.updateFlags(result, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute OR instruction
   */
  executeOR(instruction) {
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm || !instruction.opcode.rToM) {
      return false;
    }

    const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
    const memAddr = this.calculateAddress(instruction);
    const memValue = this.readMemory(memAddr, operandSize);
    const regValue = this.cpu.registers[reg];

    // Perform OR
    const result = regValue | memValue;
    this.writeMemory(memAddr, result, operandSize);

    // Update flags
    this.updateFlags(result, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Update CPU flags
   */
  updateFlags(result, operandSize) {
    let flags = this.cpu.registers.rflags;

    // Zero flag (ZF) - bit 6
    if (result === 0n) {
      flags |= 0x40n;
    } else {
      flags &= ~0x40n;
    }

    // Sign flag (SF) - bit 7 (most significant bit)
    const mask = operandSize === 64 ? 0x8000000000000000n : 0x80000000n;
    if (result & mask) {
      flags |= 0x80n;
    } else {
      flags &= ~0x80n;
    }

    // Parity flag (PF) - bit 2 (even parity of low 8 bits)
    const lowByte = Number(result & 0xFFn);
    let parity = 0;
    for (let i = 0; i < 8; i++) {
      if (lowByte & (1 << i)) parity++;
    }
    if ((parity % 2) === 0) {
      flags |= 0x04n;
    } else {
      flags &= ~0x04n;
    }

    // Carry flag (CF) - bit 0 (simplified, set on unsigned overflow)
    // Overflow flag (OF) - bit 11 (simplified, set on signed overflow)
    // These would need more complex logic based on the operation

    this.cpu.registers.rflags = flags;
  }

  /**
   * Execute INT instruction (software interrupt)
   */
  executeINT(instruction) {
    const { opcode, immediate } = instruction;
    let vector;

    if (opcode.mnemonic === 'INT3') {
      vector = 3; // Breakpoint
    } else if (opcode.mnemonic === 'INTO') {
      // Interrupt on overflow (if OF flag is set)
      if ((this.cpu.registers.rflags & 0x800n) !== 0n) {
        vector = 4;
      } else {
        // No interrupt, just continue
        this.cpu.registers.rip += BigInt(instruction.length);
        return true;
      }
    } else {
      // INT imm8
      if (immediate === null) {
        return false;
      }
      vector = immediate & 0xFF;
    }

    // TODO: Call interrupt handler
    // For now, just log
    console.log(`CPU: Software interrupt ${vector}`);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute IRET instruction (return from interrupt)
   */
  executeIRET(instruction) {
    const operandSize = 64;

    // Pop flags
    const flagsAddr = Number(this.cpu.registers.rsp);
    const flags = this.readMemory(flagsAddr, operandSize);
    this.cpu.registers.rsp += BigInt(operandSize / 8);
    this.cpu.registers.rflags = flags;

    // Pop return address (CS:RIP)
    const returnAddr = this.readMemory(Number(this.cpu.registers.rsp), operandSize);
    this.cpu.registers.rsp += BigInt(operandSize / 8);
    this.cpu.registers.rip = returnAddr;

    return true;
  }

  /**
   * Execute CLI instruction (clear interrupt flag)
   */
  executeCLI(instruction) {
    // Clear interrupt flag (IF) - bit 9
    this.cpu.registers.rflags &= ~0x200n;
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute STI instruction (set interrupt flag)
   */
  executeSTI(instruction) {
    // Set interrupt flag (IF) - bit 9
    this.cpu.registers.rflags |= 0x200n;
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute PUSHF instruction (push flags)
   */
  executePUSHF(instruction) {
    const operandSize = 64;

    // Decrement stack pointer
    this.cpu.registers.rsp -= BigInt(operandSize / 8);

    // Write flags to stack
    const stackAddr = Number(this.cpu.registers.rsp);
    this.writeMemory(stackAddr, this.cpu.registers.rflags, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute POPF instruction (pop flags)
   */
  executePOPF(instruction) {
    const operandSize = 64;

    // Read flags from stack
    const stackAddr = Number(this.cpu.registers.rsp);
    const flags = this.readMemory(stackAddr, operandSize);

    // Write to flags register
    this.cpu.registers.rflags = flags;

    // Increment stack pointer
    this.cpu.registers.rsp += BigInt(operandSize / 8);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute SHIFT instruction (SHL, SHR, SAR, ROL, ROR, RCL, RCR)
   */
  executeSHIFT(instruction) {
    const { modrm, rex, immediate, opcode } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm) {
      return false;
    }

    // Get shift count
    let shiftCount;
    if (opcode.shiftOpcode === 0xC1 && immediate !== null) {
      shiftCount = immediate & 0xFF;
    } else if (opcode.shiftOpcode === 0xD3) {
      shiftCount = Number(this.cpu.registers.rcx & 0xFFn);
    } else if (opcode.shiftOpcode === 0xD1) {
      shiftCount = 1;
    } else {
      return false;
    }

    // Get operation type from ModR/M reg field
    const shiftType = modrm.reg;
    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    let value = this.readMemory(memAddr, operandSize);
    let result;

    switch (shiftType) {
      case 0: // ROL (Rotate Left)
        shiftCount = shiftCount % operandSize;
        result = ((value << BigInt(shiftCount)) | (value >> BigInt(operandSize - shiftCount))) & this.getMask(operandSize);
        break;
      case 1: // ROR (Rotate Right)
        shiftCount = shiftCount % operandSize;
        result = ((value >> BigInt(shiftCount)) | (value << BigInt(operandSize - shiftCount))) & this.getMask(operandSize);
        break;
      case 4: // SHL (Shift Left)
        result = (value << BigInt(shiftCount)) & this.getMask(operandSize);
        break;
      case 5: // SHR (Shift Right, logical)
        result = (value >> BigInt(shiftCount)) & this.getMask(operandSize);
        break;
      case 7: // SAR (Shift Right, arithmetic)
        const signBit = value & (1n << BigInt(operandSize - 1));
        result = value >> BigInt(shiftCount);
        if (signBit) {
          // Sign extend
          result |= this.getSignExtendMask(operandSize, shiftCount);
        }
        result &= this.getMask(operandSize);
        break;
      default:
        console.warn(`CPU: Unhandled shift type ${shiftType}`);
        return false;
    }

    this.writeMemory(memAddr, result, operandSize);
    this.updateFlags(result, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute MOVS instruction (Move String)
   */
  executeMOVS(instruction) {
    const { opcode, rex } = instruction;
    const operandSize = opcode.mnemonic === 'MOVSB' ? 8 : (rex && rex.w) ? 64 : 32;

    // Source: [RSI], Destination: [RDI]
    const srcAddr = Number(this.cpu.registers.rsi);
    const dstAddr = Number(this.cpu.registers.rdi);

    // Read from source
    const value = this.readMemory(srcAddr, operandSize);

    // Write to destination
    this.writeMemory(dstAddr, value, operandSize);

    // Update pointers (direction flag determines direction)
    const df = (this.cpu.registers.rflags & 0x400n) !== 0n; // Direction flag
    const increment = BigInt(operandSize / 8);
    
    if (df) {
      this.cpu.registers.rsi -= increment;
      this.cpu.registers.rdi -= increment;
    } else {
      this.cpu.registers.rsi += increment;
      this.cpu.registers.rdi += increment;
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute STOS instruction (Store String)
   */
  executeSTOS(instruction) {
    const { opcode, rex } = instruction;
    const operandSize = opcode.mnemonic === 'STOSB' ? 8 : (rex && rex.w) ? 64 : 32;

    // Source: RAX, Destination: [RDI]
    const dstAddr = Number(this.cpu.registers.rdi);
    const value = this.cpu.registers.rax & this.getMask(operandSize);

    // Write to destination
    this.writeMemory(dstAddr, value, operandSize);

    // Update pointer
    const df = (this.cpu.registers.rflags & 0x400n) !== 0n;
    const increment = BigInt(operandSize / 8);
    
    if (df) {
      this.cpu.registers.rdi -= increment;
    } else {
      this.cpu.registers.rdi += increment;
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute CMPS instruction (Compare String)
   */
  executeCMPS(instruction) {
    const { opcode, rex } = instruction;
    const operandSize = opcode.mnemonic === 'CMPSB' ? 8 : (rex && rex.w) ? 64 : 32;

    // Source: [RSI], Destination: [RDI]
    const srcAddr = Number(this.cpu.registers.rsi);
    const dstAddr = Number(this.cpu.registers.rdi);

    const srcValue = this.readMemory(srcAddr, operandSize);
    const dstValue = this.readMemory(dstAddr, operandSize);

    // Compare (subtract)
    const result = dstValue - srcValue;
    this.updateFlags(result, operandSize);

    // Update pointers
    const df = (this.cpu.registers.rflags & 0x400n) !== 0n;
    const increment = BigInt(operandSize / 8);
    
    if (df) {
      this.cpu.registers.rsi -= increment;
      this.cpu.registers.rdi -= increment;
    } else {
      this.cpu.registers.rsi += increment;
      this.cpu.registers.rdi += increment;
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute SCAS instruction (Scan String)
   */
  executeSCAS(instruction) {
    const { opcode, rex } = instruction;
    const operandSize = opcode.mnemonic === 'SCASB' ? 8 : (rex && rex.w) ? 64 : 32;

    // Source: RAX, Destination: [RDI]
    const dstAddr = Number(this.cpu.registers.rdi);
    const dstValue = this.readMemory(dstAddr, operandSize);
    const srcValue = this.cpu.registers.rax & this.getMask(operandSize);

    // Compare
    const result = dstValue - srcValue;
    this.updateFlags(result, operandSize);

    // Update pointer
    const df = (this.cpu.registers.rflags & 0x400n) !== 0n;
    const increment = BigInt(operandSize / 8);
    
    if (df) {
      this.cpu.registers.rdi -= increment;
    } else {
      this.cpu.registers.rdi += increment;
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute LOOP instruction
   */
  executeLOOP(instruction) {
    const { immediate, opcode } = instruction;

    if (immediate === null || !opcode.relative) {
      return false;
    }

    // Decrement RCX
    this.cpu.registers.rcx -= 1n;

    let shouldLoop = false;
    if (opcode.mnemonic === 'LOOP') {
      shouldLoop = this.cpu.registers.rcx !== 0n;
    } else if (opcode.mnemonic === 'LOOPE') {
      const zf = (this.cpu.registers.rflags & 0x40n) !== 0n;
      shouldLoop = (this.cpu.registers.rcx !== 0n) && zf;
    } else if (opcode.mnemonic === 'LOOPNE') {
      const zf = (this.cpu.registers.rflags & 0x40n) !== 0n;
      shouldLoop = (this.cpu.registers.rcx !== 0n) && !zf;
    }

    if (shouldLoop) {
      const offset = BigInt(immediate);
      this.cpu.registers.rip += offset;
    } else {
      this.cpu.registers.rip += BigInt(instruction.length);
    }

    return true;
  }

  /**
   * Helper: Get bit mask for operand size
   */
  getMask(operandSize) {
    switch (operandSize) {
      case 8: return 0xFFn;
      case 16: return 0xFFFFn;
      case 32: return 0xFFFFFFFFn;
      case 64: return 0xFFFFFFFFFFFFFFFFn;
      default: return 0xFFFFFFFFFFFFFFFFn;
    }
  }

  /**
   * Helper: Get sign extension mask
   */
  getSignExtendMask(operandSize, shiftCount) {
    const mask = this.getMask(operandSize);
    const shiftMask = (1n << BigInt(operandSize - shiftCount)) - 1n;
    return (mask ^ shiftMask) & mask;
  }
}

export default InstructionExecutor;

