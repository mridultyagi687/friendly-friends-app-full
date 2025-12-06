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
        case 'MUL':
        case 'MULDIV':
          return this.executeMULDIV(instruction);
        case 'CPUID':
          return this.executeCPUID(instruction);
        case 'RDTSC':
          return this.executeRDTSC(instruction);
        case 'INC':
          return this.executeINC(instruction);
        case 'INCDEC':
          return this.executeINCDEC(instruction);
        case 'NEG':
          return this.executeNEG(instruction);
        case 'FXSAVE':
          return this.executeFXSAVE(instruction);
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

  /**
   * Execute MUL/DIV/IMUL/IDIV/NEG instruction (0xF6/0xF7)
   */
  executeMULDIV(instruction) {
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm) {
      return false;
    }

    const operation = modrm.reg;

    // Handle NEG (reg field = 3)
    if (operation === 3) {
      return this.executeNEG(instruction);
    }

    // Handle MUL/DIV/IMUL/IDIV (reg fields 4, 5, 6, 7)
    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    const value = this.readMemory(memAddr, operandSize);

    switch (operation) {
      case 4: // MUL (unsigned multiply)
        return this.executeMULOperation(value, operandSize, false);
      case 5: // IMUL (signed multiply)
        return this.executeMULOperation(value, operandSize, true);
      case 6: // DIV (unsigned divide)
        return this.executeDIVOperation(value, operandSize, false);
      case 7: // IDIV (signed divide)
        return this.executeDIVOperation(value, operandSize, true);
      default:
        console.warn(`CPU: Unhandled MULDIV operation ${operation}`);
        return false;
    }
  }

  /**
   * Execute INCDEC instruction (0xFE/0xFF)
   */
  executeINCDEC(instruction) {
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm) {
      return false;
    }

    const operation = modrm.reg;

    if (operation === 0) {
      // INC
      return this.executeINC(instruction);
    } else if (operation === 1) {
      // DEC
      return this.executeDEC(instruction);
    } else {
      // Other operations (CALL, JMP, etc.) not implemented yet
      console.warn(`CPU: Unhandled INCDEC operation ${operation}`);
      return false;
    }
  }

  /**
   * Execute DEC instruction (Decrement)
   */
  executeDEC(instruction) {
    const { opcode, modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    let value, result;

    // DEC reg (direct register decrement)
    if (opcode && opcode.reg) {
      value = this.cpu.registers[opcode.reg];
      result = value - 1n;
      this.cpu.registers[opcode.reg] = result & this.getMask(operandSize);
    }
    // DEC r/m (memory or register via ModR/M)
    else if (modrm) {
      if (modrm.mod === 3) {
        // Register mode
        const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
        value = this.cpu.registers[reg];
        result = value - 1n;
        this.cpu.registers[reg] = result & this.getMask(operandSize);
      } else {
        // Memory mode
        const memAddr = this.calculateAddress(instruction);
        if (memAddr === null) {
          return false;
        }
        value = this.readMemory(memAddr, operandSize);
        result = value - 1n;
        this.writeMemory(memAddr, result, operandSize);
      }
    } else {
      return false;
    }

    // Update flags
    this.updateFlags(result, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute MUL/DIV/IMUL/IDIV instruction (legacy - now handled by executeMULDIV)
   */
  executeMUL(instruction) {
    return this.executeMULDIV(instruction);
  }
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm) {
      return false;
    }

    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    const value = this.readMemory(memAddr, operandSize);
    const operation = modrm.reg;

    switch (operation) {
      case 4: // MUL (unsigned multiply)
        return this.executeMULOperation(value, operandSize, false);
      case 5: // IMUL (signed multiply)
        return this.executeMULOperation(value, operandSize, true);
      case 6: // DIV (unsigned divide)
        return this.executeDIVOperation(value, operandSize, false);
      case 7: // IDIV (signed divide)
        return this.executeDIVOperation(value, operandSize, true);
      default:
        console.warn(`CPU: Unhandled MUL operation ${operation}`);
        return false;
    }
  }

  /**
   * Execute MUL operation
   */
  executeMULOperation(value, operandSize, signed) {
    let multiplicand;
    if (operandSize === 64) {
      multiplicand = this.cpu.registers.rax;
    } else if (operandSize === 32) {
      multiplicand = this.cpu.registers.eax & 0xFFFFFFFFn;
    } else if (operandSize === 16) {
      multiplicand = this.cpu.registers.ax & 0xFFFFn;
    } else {
      multiplicand = this.cpu.registers.al & 0xFFn;
    }

    const result = multiplicand * value;
    const resultMask = this.getMask(operandSize * 2);

    if (operandSize === 64) {
      // 64-bit: result in RDX:RAX
      this.cpu.registers.rax = result & 0xFFFFFFFFFFFFFFFFn;
      this.cpu.registers.rdx = (result >> 64n) & 0xFFFFFFFFFFFFFFFFn;
    } else if (operandSize === 32) {
      // 32-bit: result in EDX:EAX
      this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFF00000000n) | (result & 0xFFFFFFFFn);
      this.cpu.registers.rdx = (this.cpu.registers.rdx & 0xFFFFFFFF00000000n) | ((result >> 32n) & 0xFFFFFFFFn);
    } else if (operandSize === 16) {
      // 16-bit: result in DX:AX
      this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFFFFFF0000n) | (result & 0xFFFFn);
      this.cpu.registers.rdx = (this.cpu.registers.rdx & 0xFFFFFFFFFFFF0000n) | ((result >> 16n) & 0xFFFFn);
    } else {
      // 8-bit: result in AX
      this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFFFFFFFF00n) | (result & 0xFFn);
      this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFFFFFF00FFn) | ((result >> 8n) & 0xFFn) << 8n;
    }

    // Update flags
    const highPart = operandSize === 64 ? this.cpu.registers.rdx : 
                     operandSize === 32 ? (this.cpu.registers.rdx & 0xFFFFFFFFn) :
                     operandSize === 16 ? (this.cpu.registers.rdx & 0xFFFFn) :
                     (this.cpu.registers.rax >> 8n) & 0xFFn;

    // CF and OF are set if high part is non-zero
    if (highPart !== 0n) {
      this.cpu.registers.rflags |= 0x01n; // CF
      this.cpu.registers.rflags |= 0x800n; // OF
    } else {
      this.cpu.registers.rflags &= ~0x01n; // CF
      this.cpu.registers.rflags &= ~0x800n; // OF
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute DIV operation
   */
  executeDIVOperation(divisor, operandSize, signed) {
    if (divisor === 0n) {
      // Division by zero - trigger interrupt 0
      console.error('CPU: Division by zero');
      // TODO: Trigger interrupt 0
      return false;
    }

    let dividend, quotient, remainder;

    if (operandSize === 64) {
      // 64-bit: dividend in RDX:RAX
      dividend = (this.cpu.registers.rdx << 64n) | this.cpu.registers.rax;
      quotient = dividend / divisor;
      remainder = dividend % divisor;
      this.cpu.registers.rax = quotient & 0xFFFFFFFFFFFFFFFFn;
      this.cpu.registers.rdx = remainder & 0xFFFFFFFFFFFFFFFFn;
    } else if (operandSize === 32) {
      // 32-bit: dividend in EDX:EAX
      dividend = ((this.cpu.registers.rdx & 0xFFFFFFFFn) << 32n) | (this.cpu.registers.rax & 0xFFFFFFFFn);
      quotient = dividend / divisor;
      remainder = dividend % divisor;
      this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFF00000000n) | (quotient & 0xFFFFFFFFn);
      this.cpu.registers.rdx = (this.cpu.registers.rdx & 0xFFFFFFFF00000000n) | (remainder & 0xFFFFFFFFn);
    } else if (operandSize === 16) {
      // 16-bit: dividend in DX:AX
      dividend = ((this.cpu.registers.rdx & 0xFFFFn) << 16n) | (this.cpu.registers.rax & 0xFFFFn);
      quotient = dividend / divisor;
      remainder = dividend % divisor;
      this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFFFFFF0000n) | (quotient & 0xFFFFn);
      this.cpu.registers.rdx = (this.cpu.registers.rdx & 0xFFFFFFFFFFFF0000n) | (remainder & 0xFFFFn);
    } else {
      // 8-bit: dividend in AX
      dividend = this.cpu.registers.rax & 0xFFFFn;
      quotient = dividend / divisor;
      remainder = dividend % divisor;
      this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFFFFFFFF00n) | (quotient & 0xFFn);
      this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFFFFFF00FFn) | ((remainder & 0xFFn) << 8n);
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute CPUID instruction (Get CPU Information)
   */
  executeCPUID(instruction) {
    // CPUID reads EAX (input), writes to EAX, EBX, ECX, EDX (output)
    const input = Number(this.cpu.registers.rax & 0xFFFFFFFFn);

    let eax, ebx, ecx, edx;

    switch (input) {
      case 0: // Get vendor string
        // Return "GenuineIntel" (common for compatibility)
        eax = 0x0000000D; // Maximum input value
        ebx = 0x756E6547; // "Genu"
        ecx = 0x6C65746E; // "ntel"
        edx = 0x49656E69; // "ineI"
        break;
      case 1: // Get processor info and feature bits
        eax = 0x000306A9; // Family 6, Model 58, Stepping 9 (Ivy Bridge-like)
        ebx = 0x00020800; // Brand ID, etc.
        ecx = 0x7FFEFBFF; // Feature flags (SSE, SSE2, etc.)
        edx = 0xBFEBFBFF; // Feature flags (FPU, MMX, SSE, etc.)
        break;
      case 0x80000000: // Extended function info
        eax = 0x80000008; // Maximum extended function
        ebx = 0;
        ecx = 0;
        edx = 0;
        break;
      case 0x80000001: // Extended processor info
        eax = 0;
        ebx = 0;
        ecx = 0x00000001; // LAHF/SAHF support
        edx = 0x20000000; // Extended feature flags
        break;
      case 0x80000004: // Processor brand string (part 1-3)
        eax = 0x20202020; // Spaces
        ebx = 0x20202020;
        ecx = 0x20202020;
        edx = 0x20202020;
        break;
      default:
        // Unknown CPUID leaf - return zeros
        eax = 0;
        ebx = 0;
        ecx = 0;
        edx = 0;
    }

    // Write results to registers (32-bit, preserve upper bits)
    this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFF00000000n) | BigInt(eax);
    this.cpu.registers.rbx = (this.cpu.registers.rbx & 0xFFFFFFFF00000000n) | BigInt(ebx);
    this.cpu.registers.rcx = (this.cpu.registers.rcx & 0xFFFFFFFF00000000n) | BigInt(ecx);
    this.cpu.registers.rdx = (this.cpu.registers.rdx & 0xFFFFFFFF00000000n) | BigInt(edx);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute RDTSC instruction (Read Time Stamp Counter)
   */
  executeRDTSC(instruction) {
    // RDTSC returns 64-bit timestamp in EDX:EAX
    // Use high-resolution time for emulation
    const timestamp = BigInt(Math.floor(performance.now() * 1000000)); // Microseconds
    
    const low = timestamp & 0xFFFFFFFFn;
    const high = (timestamp >> 32n) & 0xFFFFFFFFn;

    // Write to EDX:EAX (32-bit, preserve upper bits)
    this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFF00000000n) | low;
    this.cpu.registers.rdx = (this.cpu.registers.rdx & 0xFFFFFFFF00000000n) | high;

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute INC instruction (Increment)
   */
  executeINC(instruction) {
    const { opcode, modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    let value, result;

    // INC reg (direct register increment)
    if (opcode.reg) {
      value = this.cpu.registers[opcode.reg];
      result = value + 1n;
      this.cpu.registers[opcode.reg] = result & this.getMask(operandSize);
    }
    // INC r/m (memory or register via ModR/M)
    else if (modrm) {
      if (modrm.mod === 3) {
        // Register mode
        const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
        value = this.cpu.registers[reg];
        result = value + 1n;
        this.cpu.registers[reg] = result & this.getMask(operandSize);
      } else {
        // Memory mode
        const memAddr = this.calculateAddress(instruction);
        if (memAddr === null) {
          return false;
        }
        value = this.readMemory(memAddr, operandSize);
        result = value + 1n;
        this.writeMemory(memAddr, result, operandSize);
      }
    } else {
      return false;
    }

    // Update flags
    this.updateFlags(result, operandSize);

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute NEG instruction (Negate - Two's Complement)
   */
  executeNEG(instruction) {
    const { modrm, rex } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    if (!modrm || modrm.reg !== 3) {
      return false; // NEG uses reg field = 3
    }

    let value, result;

    if (modrm.mod === 3) {
      // Register mode
      const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
      value = this.cpu.registers[reg];
      result = -value; // Two's complement negation
      this.cpu.registers[reg] = result & this.getMask(operandSize);
    } else {
      // Memory mode
      const memAddr = this.calculateAddress(instruction);
      if (memAddr === null) {
        return false;
      }
      value = this.readMemory(memAddr, operandSize);
      result = -value;
      this.writeMemory(memAddr, result, operandSize);
    }

    // Update flags
    this.updateFlags(result, operandSize);
    
    // Set carry flag if original value was not zero
    if (value !== 0n) {
      this.cpu.registers.rflags |= 0x01n; // CF
    } else {
      this.cpu.registers.rflags &= ~0x01n; // CF
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute FXSAVE/FXRSTOR instruction (Save/Restore FPU State)
   */
  executeFXSAVE(instruction) {
    const { modrm } = instruction;

    if (!modrm) {
      return false;
    }

    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    if (modrm.reg === 0) {
      // FXSAVE - Save FPU/MMX/SSE state
      // For now, just write zeros (512 bytes for FXSAVE)
      // TODO: Implement actual FPU state saving
      for (let i = 0; i < 512; i++) {
        this.memory.writeByte(memAddr + i, 0);
      }
      console.log('CPU: FXSAVE executed (simplified - zeros written)');
    } else if (modrm.reg === 1) {
      // FXRSTOR - Restore FPU/MMX/SSE state
      // For now, just read (do nothing with data)
      // TODO: Implement actual FPU state restoration
      for (let i = 0; i < 512; i++) {
        this.memory.readByte(memAddr + i);
      }
      console.log('CPU: FXRSTOR executed (simplified - data read but not used)');
    } else {
      return false;
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }
}

export default InstructionExecutor;

