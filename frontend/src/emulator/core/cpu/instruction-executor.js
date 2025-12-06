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
   * Update CPU flags
   */
  updateFlags(result, operandSize) {
    let flags = this.cpu.registers.rflags;

    // Zero flag (ZF)
    if (result === 0n) {
      flags |= 0x40n;
    } else {
      flags &= ~0x40n;
    }

    // Sign flag (SF) - most significant bit
    const mask = operandSize === 64 ? 0x8000000000000000n : 0x80000000n;
    if (result & mask) {
      flags |= 0x80n;
    } else {
      flags &= ~0x80n;
    }

    // Carry flag (CF) - simplified
    // Overflow flag (OF) - simplified

    this.cpu.registers.rflags = flags;
  }
}

export default InstructionExecutor;

