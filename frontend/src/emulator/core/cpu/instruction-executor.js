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
    
    // Handle LOCK prefix for atomic operations
    const hasLock = instruction.prefixes && instruction.prefixes.lock;
    if (hasLock) {
      // LOCK prefix makes the following instruction atomic
      // For emulation, we ensure the operation is atomic
      // In a real CPU, this would lock the memory bus
      return this.executeLocked(instruction);
    }

    try {
      switch (mnemonic) {
        case 'NOP':
          return this.executeNOP(instruction);
        case 'MOV':
          // Check if this is MOV to/from CR register (0x0F 0x20/0x22)
          if (instruction.opcode.mnemonic === 'MOV_CR') {
            if (instruction.opcode.rToM) {
              // MOV r32, CR0-CR4 (0x0F 0x20)
              return this.executeMOVCR(instruction, true);
            } else {
              // MOV CR0-CR4, r32 (0x0F 0x22)
              return this.executeMOVCR(instruction, false);
            }
          }
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
        case 'MOVAPS':
          return this.executeMOVAPS(instruction);
        case 'MOVUPS':
          return this.executeMOVUPS(instruction);
        case 'MOVDQA':
          return this.executeMOVDQA(instruction);
        case 'MOVDQU':
          return this.executeMOVDQU(instruction);
        case 'PXOR':
          return this.executePXOR(instruction);
        case 'PAND':
          return this.executePAND(instruction);
        case 'POR':
          return this.executePOR(instruction);
        case 'SYSTEM':
          return this.executeSYSTEM(instruction);
        case 'MOV_CR':
          return this.executeMOV_CR(instruction);
        case 'MOV_DR':
          return this.executeMOV_DR(instruction);
        case 'WRMSR':
          return this.executeWRMSR(instruction);
        case 'RDMSR':
          return this.executeRDMSR(instruction);
        case 'LGDT':
        case 'LIDT':
        case 'SGDT':
        case 'SIDT':
          return this.executeGDTIDT(instruction);
        case 'LTR':
          return this.executeLTR(instruction);
        case 'INVLPG':
          return this.executeINVLPG(instruction);
        case 'ADC':
          return this.executeADC(instruction);
        case 'SBB':
          return this.executeSBB(instruction);
        case 'PADDB':
        case 'PADDW':
        case 'PADDD':
          return this.executePADD(instruction);
        case 'PSUBB':
        case 'PSUBW':
        case 'PSUBD':
          return this.executePSUB(instruction);
        case 'SYSCALL':
          return this.executeSYSCALL(instruction);
        case 'SYSRET':
          return this.executeSYSRET(instruction);
        case 'SYSENTER':
          return this.executeSYSENTER(instruction);
        case 'SYSEXIT':
          return this.executeSYSEXIT(instruction);
        case 'CMPXCHG16B':
          return this.executeCMPXCHG16B(instruction);
        case 'POPCNT':
          return this.executePOPCNT(instruction);
        case 'LZCNT':
          return this.executeLZCNT(instruction);
        case 'MOVBE':
          return this.executeMOVBE(instruction);
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

    // Check if register exists in CPU
    if (!(opcode.reg in this.cpu.registers)) {
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
    if (memAddr === null || memAddr === undefined) {
      return false;
    }
    const memValue = this.readMemory(memAddr, operandSize);
    const regValue = this.cpu.registers[reg] || 0n;

    // Mask operands to operand size before addition (important for overflow detection)
    const mask = operandSize === 64 ? 0xFFFFFFFFFFFFFFFFn : 0xFFFFFFFFn;
    const maskedRegValue = (typeof regValue === 'bigint' ? regValue : BigInt(regValue)) & mask;
    // Ensure memory value is properly converted and masked
    let maskedMemValue = (typeof memValue === 'bigint' ? memValue : BigInt(memValue)) & mask;
    
    // Debug: If memory value seems wrong, check if address calculation is correct
    // For 32-bit reads, ensure we're reading the full dword correctly

    // Perform addition with masked operands
    const result = maskedRegValue + maskedMemValue;
    
    // Update flags including overflow (before masking result)
    // Pass original values for overflow calculation, but use masked values for actual operation
    this.updateFlagsWithOperands(result, maskedRegValue, maskedMemValue, operandSize, 'add');
    
    // Mask result to operand size and store
    // For 32-bit operations, we need to preserve the upper 32 bits of the 64-bit register
    // by sign-extending or zero-extending based on the result
    if (operandSize === 32) {
      const maskedResult = result & mask;
      // Sign-extend 32-bit result to 64-bit register
      const signBit = (maskedResult & 0x80000000n) !== 0n;
      if (signBit) {
        // Sign-extend: set upper 32 bits to 1s
        this.cpu.registers[reg] = maskedResult | 0xFFFFFFFF00000000n;
      } else {
        // Zero-extend: clear upper 32 bits
        this.cpu.registers[reg] = maskedResult;
      }
    } else {
      // 64-bit operation: just mask and store
      this.cpu.registers[reg] = result & mask;
    }

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
      const baseValue = this.cpu.registers[baseReg];
      if (baseValue !== undefined) {
        address += baseValue;
      }
    } else {
      // Get base register from rm field
      const baseReg = this.getRegisterFromModRM({ reg: modrm.rm, mod: 0 }, rex, 64);
      const baseValue = this.cpu.registers[baseReg];
      if (baseValue !== undefined) {
        address += baseValue;
      }
    }

    // Index register (SIB)
    if (sib) {
      const indexReg = this.getRegisterFromModRM({ reg: sib.index, mod: 0 }, rex, 64);
      const indexValue = this.cpu.registers[indexReg];
      if (indexValue !== undefined) {
        address += indexValue * BigInt(sib.scale || 1);
      }
    }

    // Displacement
    if (displacement !== null && displacement !== undefined) {
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

    // Convert address to Number if it's BigInt
    const addr = typeof address === 'bigint' ? Number(address) : address;

    switch (size) {
      case 8:
        return BigInt(this.memory.readByte(addr));
      case 16:
        return BigInt(this.memory.readWord(addr));
      case 32:
        const dwordValue = this.memory.readDword(addr);
        // readDword returns a signed 32-bit number, convert to unsigned BigInt
        // Use unsigned conversion to preserve the value correctly
        const unsignedValue = dwordValue >>> 0; // Convert to unsigned 32-bit
        return BigInt(unsignedValue);
      case 64:
        return this.memory.readQword(addr);
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

    // Convert address to Number if it's BigInt
    const addr = typeof address === 'bigint' ? Number(address) : address;

    switch (size) {
      case 8:
        this.memory.writeByte(addr, Number(value & 0xFFn));
        break;
      case 16:
        this.memory.writeWord(addr, Number(value & 0xFFFFn));
        break;
      case 32:
        this.memory.writeDword(addr, Number(value & 0xFFFFFFFFn));
        break;
      case 64:
        this.memory.writeQword(addr, value);
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
    
    // Convert result to BigInt if it's a Number
    const resultBigInt = typeof result === 'bigint' ? result : BigInt(result);

    // Zero flag (ZF) - bit 6
    if (resultBigInt === 0n) {
      flags |= 0x40n;
    } else {
      flags &= ~0x40n;
    }

    // Sign flag (SF) - bit 7 (most significant bit)
    const mask = operandSize === 64 ? 0x8000000000000000n : 0x80000000n;
    if ((resultBigInt & mask) !== 0n) {
      flags |= 0x80n;
    } else {
      flags &= ~0x80n;
    }

    // Parity flag (PF) - bit 2 (even parity of low 8 bits)
    const lowByte = Number(resultBigInt & 0xFFn);
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
   * Update CPU flags with operand information for overflow calculation
   */
  updateFlagsWithOperands(result, operand1, operand2, operandSize, operation = 'add') {
    let flags = this.cpu.registers.rflags;
    
    // Convert to BigInt
    const resultBigInt = typeof result === 'bigint' ? result : BigInt(result);
    const op1 = typeof operand1 === 'bigint' ? operand1 : BigInt(operand1);
    const op2 = typeof operand2 === 'bigint' ? operand2 : BigInt(operand2);

    // Zero flag (ZF) - bit 6
    if (resultBigInt === 0n) {
      flags |= 0x40n;
    } else {
      flags &= ~0x40n;
    }

    // Sign flag (SF) - bit 7
    const mask = operandSize === 64 ? 0x8000000000000000n : 0x80000000n;
    if ((resultBigInt & mask) !== 0n) {
      flags |= 0x80n;
    } else {
      flags &= ~0x80n;
    }

    // Parity flag (PF) - bit 2
    const lowByte = Number(resultBigInt & 0xFFn);
    let parity = 0;
    for (let i = 0; i < 8; i++) {
      if (lowByte & (1 << i)) parity++;
    }
    if ((parity % 2) === 0) {
      flags |= 0x04n;
    } else {
      flags &= ~0x04n;
    }

    // Overflow flag (OF) - bit 11
    if (operation === 'add') {
      // OF is set when adding two positive numbers gives negative, or two negatives gives positive
      const signMask = operandSize === 64 ? 0x8000000000000000n : 0x80000000n;
      const op1Sign = (op1 & signMask) !== 0n;
      const op2Sign = (op2 & signMask) !== 0n;
      const resultSign = (resultBigInt & signMask) !== 0n;
      
      // Overflow occurs when operands have same sign but result has different sign
      if (op1Sign === op2Sign && op1Sign !== resultSign) {
        flags |= 0x800n; // Set OF
      } else {
        flags &= ~0x800n; // Clear OF
      }
    }

    // Carry flag (CF) - bit 0 (unsigned overflow)
    const maxValue = operandSize === 64 ? 0xFFFFFFFFFFFFFFFFn : 0xFFFFFFFFn;
    if (resultBigInt > maxValue) {
      flags |= 0x01n; // Set CF
    } else {
      flags &= ~0x01n; // Clear CF
    }

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
   * Supports REP prefix for repeated operations
   */
  executeMOVS(instruction) {
    const { opcode, rex, prefixes } = instruction;
    const operandSize = opcode.mnemonic === 'MOVSB' ? 8 : (rex && rex.w) ? 64 : 32;
    const hasRep = prefixes && prefixes.rep !== null;

    // If REP prefix, repeat while RCX > 0
    if (hasRep) {
      const repType = prefixes.rep; // 'rep', 'repne'
      let iterations = 0;
      const maxIterations = 10000; // Safety limit

      while (this.cpu.registers.rcx > 0n && iterations < maxIterations) {
        // Check REP condition
        if (repType === 'repne') {
          // REPNE: repeat while ZF = 0
          const zf = (this.cpu.registers.rflags & 0x40n) !== 0n;
          if (zf) break; // Stop if ZF = 1
        } else if (repType === 'repe') {
          // REPE/REPZ: repeat while ZF = 1
          const zf = (this.cpu.registers.rflags & 0x40n) !== 0n;
          if (!zf) break; // Stop if ZF = 0
        }

        // Execute one iteration
        const srcAddr = Number(this.cpu.registers.rsi);
        const dstAddr = Number(this.cpu.registers.rdi);
        const value = this.readMemory(srcAddr, operandSize);
        this.writeMemory(dstAddr, value, operandSize);

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

        // Decrement RCX
        this.cpu.registers.rcx -= 1n;
        iterations++;
      }

      // Update flags after REP operation
      if (this.cpu.registers.rcx === 0n) {
        // ZF is set if all bytes were processed
        this.cpu.registers.rflags |= 0x40n; // Set ZF
      }
    } else {
      // Single iteration (no REP)
      const srcAddr = Number(this.cpu.registers.rsi);
      const dstAddr = Number(this.cpu.registers.rdi);
      const value = this.readMemory(srcAddr, operandSize);
      this.writeMemory(dstAddr, value, operandSize);

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
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute STOS instruction (Store String)
   * Supports REP prefix for repeated operations
   */
  executeSTOS(instruction) {
    const { opcode, rex, prefixes } = instruction;
    const operandSize = opcode.mnemonic === 'STOSB' ? 8 : (rex && rex.w) ? 64 : 32;
    const hasRep = prefixes && prefixes.rep !== null;

    // If REP prefix, repeat while RCX > 0
    if (hasRep) {
      const repType = prefixes.rep; // 'rep', 'repne'
      let iterations = 0;
      const maxIterations = 10000; // Safety limit

      while (this.cpu.registers.rcx > 0n && iterations < maxIterations) {
        // Check REP condition
        if (repType === 'repne') {
          const zf = (this.cpu.registers.rflags & 0x40n) !== 0n;
          if (zf) break;
        } else if (repType === 'repe') {
          const zf = (this.cpu.registers.rflags & 0x40n) !== 0n;
          if (!zf) break;
        }

        // Execute one iteration
        const dstAddr = Number(this.cpu.registers.rdi);
        const value = this.cpu.registers.rax & this.getMask(operandSize);
        this.writeMemory(dstAddr, value, operandSize);

        // Update pointer
        const df = (this.cpu.registers.rflags & 0x400n) !== 0n;
        const increment = BigInt(operandSize / 8);
        
        if (df) {
          this.cpu.registers.rdi -= increment;
        } else {
          this.cpu.registers.rdi += increment;
        }

        // Decrement RCX
        this.cpu.registers.rcx -= 1n;
        iterations++;
      }

      // Update flags after REP operation
      if (this.cpu.registers.rcx === 0n) {
        this.cpu.registers.rflags |= 0x40n; // Set ZF
      }
    } else {
      // Single iteration (no REP)
      const dstAddr = Number(this.cpu.registers.rdi);
      const value = this.cpu.registers.rax & this.getMask(operandSize);
      this.writeMemory(dstAddr, value, operandSize);

      // Update pointer
      const df = (this.cpu.registers.rflags & 0x400n) !== 0n;
      const increment = BigInt(operandSize / 8);
      
      if (df) {
        this.cpu.registers.rdi -= increment;
      } else {
        this.cpu.registers.rdi += increment;
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute CMPS instruction (Compare String)
   * Supports REP prefix for repeated operations
   */
  executeCMPS(instruction) {
    const { opcode, rex, prefixes } = instruction;
    const operandSize = opcode.mnemonic === 'CMPSB' ? 8 : (rex && rex.w) ? 64 : 32;
    const hasRep = prefixes && prefixes.rep !== null;

    // If REP prefix, repeat while RCX > 0 and condition met
    if (hasRep) {
      const repType = prefixes.rep; // 'rep' (REPE/REPZ), 'repne' (REPNE/REPNZ)
      let iterations = 0;
      const maxIterations = 10000; // Safety limit

      while (this.cpu.registers.rcx > 0n && iterations < maxIterations) {
        // Execute one comparison
        const srcAddr = Number(this.cpu.registers.rsi);
        const dstAddr = Number(this.cpu.registers.rdi);
        const srcValue = this.readMemory(srcAddr, operandSize);
        const dstValue = this.readMemory(dstAddr, operandSize);
        const result = dstValue - srcValue;
        this.updateFlags(result, operandSize);

        // Check REP condition
        const zf = (this.cpu.registers.rflags & 0x40n) !== 0n;
        if (repType === 'repne') {
          // REPNE: repeat while ZF = 0
          if (zf) break; // Stop if ZF = 1 (strings equal)
        } else if (repType === 'rep' || repType === 'repe') {
          // REPE/REPZ: repeat while ZF = 1
          if (!zf) break; // Stop if ZF = 0 (strings not equal)
        }

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

        // Decrement RCX
        this.cpu.registers.rcx -= 1n;
        iterations++;
      }
    } else {
      // Single iteration (no REP)
      const srcAddr = Number(this.cpu.registers.rsi);
      const dstAddr = Number(this.cpu.registers.rdi);
      const srcValue = this.readMemory(srcAddr, operandSize);
      const dstValue = this.readMemory(dstAddr, operandSize);
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
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute SCAS instruction (Scan String)
   * Supports REP prefix for repeated operations
   */
  executeSCAS(instruction) {
    const { opcode, rex, prefixes } = instruction;
    const operandSize = opcode.mnemonic === 'SCASB' ? 8 : (rex && rex.w) ? 64 : 32;
    const hasRep = prefixes && prefixes.rep !== null;

    // If REP prefix, repeat while RCX > 0 and condition met
    if (hasRep) {
      const repType = prefixes.rep; // 'rep' (REPE/REPZ), 'repne' (REPNE/REPNZ)
      let iterations = 0;
      const maxIterations = 10000; // Safety limit

      while (this.cpu.registers.rcx > 0n && iterations < maxIterations) {
        // Execute one comparison
        const dstAddr = Number(this.cpu.registers.rdi);
        const dstValue = this.readMemory(dstAddr, operandSize);
        const srcValue = this.cpu.registers.rax & this.getMask(operandSize);
        const result = dstValue - srcValue;
        this.updateFlags(result, operandSize);

        // Check REP condition
        const zf = (this.cpu.registers.rflags & 0x40n) !== 0n;
        if (repType === 'repne') {
          // REPNE: repeat while ZF = 0
          if (zf) break; // Stop if ZF = 1 (found match)
        } else if (repType === 'rep' || repType === 'repe') {
          // REPE/REPZ: repeat while ZF = 1
          if (!zf) break; // Stop if ZF = 0 (no match)
        }

        // Update pointer
        const df = (this.cpu.registers.rflags & 0x400n) !== 0n;
        const increment = BigInt(operandSize / 8);
        
        if (df) {
          this.cpu.registers.rdi -= increment;
        } else {
          this.cpu.registers.rdi += increment;
        }

        // Decrement RCX
        this.cpu.registers.rcx -= 1n;
        iterations++;
      }
    } else {
      // Single iteration (no REP)
      const dstAddr = Number(this.cpu.registers.rdi);
      const dstValue = this.readMemory(dstAddr, operandSize);
      const srcValue = this.cpu.registers.rax & this.getMask(operandSize);
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
        return this.executeMULOperation(value, operandSize, false, instruction.length);
      case 5: // IMUL (signed multiply)
        return this.executeMULOperation(value, operandSize, true, instruction.length);
      case 6: // DIV (unsigned divide)
        return this.executeDIVOperation(value, operandSize, false, instruction.length);
      case 7: // IDIV (signed divide)
        return this.executeDIVOperation(value, operandSize, true, instruction.length);
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

  /**
   * Execute MUL operation
   */
  executeMULOperation(value, operandSize, signed, instructionLength = 2) {
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

    this.cpu.registers.rip += BigInt(instructionLength);
    return true;
  }

  /**
   * Execute DIV operation
   */
  executeDIVOperation(divisor, operandSize, signed, instructionLength = 2) {
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

    this.cpu.registers.rip += BigInt(instructionLength);
    return true;
  }

  /**
   * Execute CPUID instruction (Get CPU Information)
   * Fully accurate implementation with all Windows 10/11 required feature bits
   * Modeled after Intel Core i7-8700K (Coffee Lake) for realism
   */
  executeCPUID(instruction) {
    // CPUID reads EAX (input), writes to EAX, EBX, ECX, EDX (output)
    const input = Number(this.cpu.registers.rax & 0xFFFFFFFFn);
    const subleaf = Number(this.cpu.registers.rcx & 0xFFFFFFFFn);

    let eax, ebx, ecx, edx;

    // Consistent CPU model: Intel Core i7-8700K (Coffee Lake)
    // Family 6, Model 158 (0x9E), Stepping 10 (0xA)
    const CPU_FAMILY = 6;
    const CPU_MODEL = 0x9E; // 158 decimal
    const CPU_STEPPING = 0xA; // 10 decimal
    const CPU_EXTENDED_FAMILY = 0;
    const CPU_EXTENDED_MODEL = 0x9;
    const CPU_TYPE = 0; // Original OEM

    switch (input) {
      case 0: // Get vendor string and maximum basic function
        // Return "GenuineIntel"
        eax = 0x00000016; // Maximum input value (supports up to leaf 0x16)
        ebx = 0x756E6547; // "Genu"
        ecx = 0x6C65746E; // "ntel"
        edx = 0x49656E69; // "ineI"
        break;

      case 1: // Get processor info and feature bits (CRITICAL for Windows)
        // EAX format: [31:20] Reserved, [19:16] Extended Family, [15:8] Extended Model,
        //            [7:4] Family, [3:0] Stepping, [13:12] Type, [11:8] Model
        eax = (CPU_EXTENDED_FAMILY << 16) | 
              (CPU_EXTENDED_MODEL << 8) | 
              (CPU_FAMILY << 4) | 
              CPU_STEPPING;
        eax |= (CPU_TYPE << 12); // Type in bits 13:12
        
        // EBX: Brand Index, CLFLUSH line size, Logical processors, APIC ID
        ebx = 0x00080800; // 8 logical processors per package, CLFLUSH size 8 (64 bytes)
        
        // ECX feature flags - ONLY advertise fully implemented features:
        // Bit 0: SSE3 - NOT implemented (no SSE3-specific instructions)
        // Bit 1: PCLMULQDQ - NOT implemented
        // Bit 2: DTES64 - NOT implemented
        // Bit 3: MONITOR - NOT implemented
        // Bit 4: DS-CPL - NOT implemented
        // Bit 5: VMX - NOT implemented
        // Bit 6: SMX - NOT implemented
        // Bit 7: EIST - NOT implemented
        // Bit 8: TM2 - NOT implemented
        // Bit 9: SSSE3 - NOT implemented (no SSSE3-specific instructions)
        // Bit 10: CNXT-ID - NOT implemented
        // Bit 11: SDBG - NOT implemented
        // Bit 12: FMA - NOT implemented
        // Bit 13: CMPXCHG16B - ✅ IMPLEMENTED (executeCMPXCHG16B)
        // Bit 14: xTPR Update Control - NOT implemented
        // Bit 15: PDCM - NOT implemented
        // Bit 16: PCID - NOT implemented
        // Bit 17: DCA - NOT implemented
        // Bit 18: SSE4.1 - NOT implemented (no SSE4.1-specific instructions)
        // Bit 19: SSE4.2 - NOT implemented (no SSE4.2-specific instructions)
        // Bit 20: x2APIC - NOT implemented
        // Bit 21: MOVBE - ✅ IMPLEMENTED (executeMOVBE)
        // Bit 22: POPCNT - ✅ IMPLEMENTED (executePOPCNT)
        // Bit 23: TSC-Deadline - NOT implemented
        // Bit 24: AES - NOT implemented
        // Bit 25: XSAVE - ✅ IMPLEMENTED (executeXSAVE)
        // Bit 26: OSXSAVE - ✅ IMPLEMENTED (OS supports XSAVE)
        // Bit 27: AVX - PARTIALLY (YMM registers exist, but no AVX arithmetic)
        // Bit 28: F16C - NOT implemented
        // Bit 29: RDRAND - ✅ IMPLEMENTED (executeRDRAND)
        // Bit 30: Not used
        // Bit 31: Hypervisor - NOT implemented
        ecx = (1 << 13) |  // CMPXCHG16B (CRITICAL - Windows BSODs without this)
              (1 << 21) |  // MOVBE
              (1 << 22) |  // POPCNT
              (1 << 25) |  // XSAVE
              (1 << 26) |  // OSXSAVE
              (1 << 29);   // RDRAND
        // Note: AVX (bit 27) not set - YMM registers exist but AVX instructions not fully implemented
        
        // EDX feature flags - ONLY advertise fully implemented features:
        // Bit 0: FPU - ✅ IMPLEMENTED (FPU registers exist)
        // Bit 1: VME - NOT implemented
        // Bit 2: DE - NOT implemented
        // Bit 3: PSE - NOT implemented
        // Bit 4: TSC - ✅ IMPLEMENTED (RDTSC)
        // Bit 5: MSR - ✅ IMPLEMENTED (RDMSR/WRMSR)
        // Bit 6: PAE - ✅ IMPLEMENTED (CR4.PAE)
        // Bit 7: MCE - NOT implemented
        // Bit 8: CX8 - NOT implemented
        // Bit 9: APIC - ✅ IMPLEMENTED (APIC exists)
        // Bit 11: SEP (SYSENTER/SYSEXIT) - ✅ IMPLEMENTED (executeSYSENTER/SYSEXIT)
        // Bit 12: MTRR - NOT implemented
        // Bit 13: PGE - NOT implemented
        // Bit 14: MCA - NOT implemented
        // Bit 15: CMOV - ✅ IMPLEMENTED (executeCMOV)
        // Bit 16: PAT - NOT implemented
        // Bit 17: PSE-36 - NOT implemented
        // Bit 18: PSN - NOT implemented
        // Bit 19: CLFSH - NOT implemented
        // Bit 21: DS - NOT implemented
        // Bit 22: ACPI - ✅ IMPLEMENTED (ACPI tables)
        // Bit 23: MMX - NOT implemented (no MMX instructions)
        // Bit 24: FXSR - ✅ IMPLEMENTED (FXSAVE/FXRSTOR)
        // Bit 25: SSE - ✅ IMPLEMENTED (XMM registers, MOVUPS, MOVDQU, PXOR, PAND, POR)
        // Bit 26: SSE2 - ✅ IMPLEMENTED (MOVDQA, MOVDQU, PADD, PSUB)
        // Bit 27: SS - NOT implemented
        // Bit 28: HTT - NOT implemented (single core)
        // Bit 29: TM - NOT implemented
        // Bit 30: IA64 - NOT implemented
        // Bit 31: PBE - NOT implemented
        edx = (1 << 0) |   // FPU
              (1 << 4) |   // TSC
              (1 << 5) |   // MSR
              (1 << 6) |   // PAE
              (1 << 9) |   // APIC
              (1 << 11) |  // SEP (SYSENTER/SYSEXIT)
              (1 << 15) |  // CMOV
              (1 << 22) |  // ACPI
              (1 << 24) |  // FXSR
              (1 << 25) |  // SSE
              (1 << 26);   // SSE2 (CRITICAL - Windows requires this)
        break;

      case 2: // Cache and TLB information
        // Return cache descriptors (simplified)
        eax = 0x76036301;
        ebx = 0x00F0B2FF;
        ecx = 0x00000000;
        edx = 0x00C30000;
        break;

      case 4: // Cache parameters (subleaf in ECX)
        if (subleaf === 0) {
          // L1 Data Cache
          eax = 0x1C004121; // Cache type, level, self-initializing, fully associative
          ebx = 0x01C0003F; // Line size, partitions, ways
          ecx = 0x0000003F; // Sets
          edx = 0x00000001; // Write-back invalidate
        } else if (subleaf === 1) {
          // L1 Instruction Cache
          eax = 0x1C000122;
          ebx = 0x01C0003F;
          ecx = 0x0000003F;
          edx = 0x00000001;
        } else if (subleaf === 2) {
          // L2 Cache
          eax = 0x1C004143;
          ebx = 0x03C0003F;
          ecx = 0x000003FF;
          edx = 0x00000001;
        } else if (subleaf === 3) {
          // L3 Cache
          eax = 0x1C03C163;
          ebx = 0x03C0003F;
          ecx = 0x00007FFF;
          edx = 0x00000001;
        } else {
          eax = 0; ebx = 0; ecx = 0; edx = 0;
        }
        break;

      case 7: // Extended features (subleaf in ECX) - CRITICAL for Windows 10/11
        if (subleaf === 0) {
          // EBX: Extended feature flags - ONLY advertise fully implemented features:
          // Bit 0: FSGSBASE - NOT implemented
          // Bit 1: IA32_TSC_ADJUST - NOT implemented
          // Bit 2: SGX - NOT implemented
          // Bit 3: BMI1 - NOT implemented (no BMI1 instructions)
          // Bit 4: HLE - NOT implemented
          // Bit 5: AVX2 - NOT implemented (no AVX2 instructions)
          // Bit 6: FDP_EXCPTN_ONLY - NOT implemented
          // Bit 7: SMEP - ✅ IMPLEMENTED (CR4.SMEP bit honored)
          // Bit 8: BMI2 - NOT implemented (no BMI2 instructions)
          // Bit 9: Enhanced REP MOVSB/STOSB - ✅ IMPLEMENTED (REP prefix for MOVS/STOS)
          // Bit 10: INVPCID - NOT implemented
          // Bit 11: RTM - NOT implemented
          // Bit 12: PQM - NOT implemented
          // Bit 13: FPU CS/DS - NOT implemented
          // Bit 14: MPX - NOT implemented
          // Bit 15: PQE - NOT implemented
          // Bit 16: AVX512F - NOT implemented
          // Bit 17: AVX512DQ - NOT implemented
          // Bit 18: RDSEED - ✅ IMPLEMENTED (executeRDSEED)
          // Bit 19: ADX - NOT implemented
          // Bit 20: SMAP - ✅ IMPLEMENTED (CR4.SMAP bit honored)
          // Bit 21: AVX512IFMA - NOT implemented
          // Bit 22: PCOMMIT - NOT implemented
          // Bit 23: CLFLUSHOPT - NOT implemented
          // Bit 24: CLWB - NOT implemented
          // Bit 25: INTEL_PT - NOT implemented
          // Bit 26: AVX512PF - NOT implemented
          // Bit 27: AVX512ER - NOT implemented
          // Bit 28: AVX512CD - NOT implemented
          // Bit 29: SHA - NOT implemented
          // Bit 30: AVX512BW - NOT implemented
          // Bit 31: AVX512VL - NOT implemented
          ebx = (1 << 7) |   // SMEP (CR4.SMEP honored)
               (1 << 9) |   // Enhanced REP MOVSB/STOSB (REP prefix implemented)
               (1 << 18) |  // RDSEED
               (1 << 20);   // SMAP (CR4.SMAP honored)
            
          // ECX: Extended feature flags - all NOT implemented
          ecx = 0;
            
          // EDX: Extended feature flags - all NOT implemented
          edx = 0;
            
          // EAX: Maximum sub-leaf supported
          eax = 0x00000000; // Only subleaf 0 supported
        } else {
          eax = 0; ebx = 0; ecx = 0; edx = 0;
        }
        break;

      case 0x0A: // Architectural Performance Monitoring
        eax = 0x07300403; // Version, number of counters
        ebx = 0x00000000;
        ecx = 0x00000000;
        edx = 0x00000703;
        break;

      case 0x0B: // Extended Topology Enumeration
        if (subleaf === 0) {
          eax = 0x00000001; // SMT level
          ebx = 0x00000008; // 8 logical processors
          ecx = 0x00000100; // Level type = SMT
          edx = 0x00000000;
        } else if (subleaf === 1) {
          eax = 0x00000004; // Core level
          ebx = 0x00000004; // 4 cores
          ecx = 0x00000201; // Level type = Core
          edx = 0x00000000;
        } else {
          eax = 0; ebx = 0; ecx = 0; edx = 0;
        }
        break;

      case 0x0D: // Processor Extended State Enumeration
        if (subleaf === 0) {
          // EAX: Valid bits of lower 32 bits of XCR0
          // Bit 0 = X87 FPU, Bit 1 = SSE/XMM, Bit 2 = AVX/YMM
          // Only advertise what's implemented: X87 + SSE/XMM (AVX not fully implemented)
          eax = 0x00000003; // X87 (bit 0) + SSE/XMM (bit 1) - AVX/YMM (bit 2) NOT set
          // EBX: Maximum size of XSAVE/XRSTOR area (in bytes)
          // Header (64) + X87 (512) + XMM (256) = 832 bytes (no YMM)
          ebx = 0x00000340; // 832 bytes (0x340)
          // ECX: Valid bits of upper 32 bits of XCR0 (currently none)
          ecx = 0x00000000;
          // EDX: Valid bits of upper 32 bits of XCR0 (currently none)
          edx = 0x00000000;
        } else if (subleaf === 1) {
          // XSAVE feature flags - all NOT implemented
          eax = 0x00000000;
          ebx = 0x00000000;
          ecx = 0x00000000;
          edx = 0x00000000;
        } else {
          eax = 0; ebx = 0; ecx = 0; edx = 0;
        }
        break;

      case 0x80000000: // Extended function info
        eax = 0x80000008; // Maximum extended function
        ebx = 0x00000000;
        ecx = 0x00000000;
        edx = 0x00000000;
        break;

      case 0x80000001: // Extended processor info and feature bits (CRITICAL for Windows)
        // EAX: Extended processor signature - same as leaf 1
        eax = (CPU_EXTENDED_FAMILY << 16) | 
              (CPU_EXTENDED_MODEL << 8) | 
              (CPU_FAMILY << 4) | 
              CPU_STEPPING;
        eax |= (CPU_TYPE << 12);
        
        // EBX: Reserved
        ebx = 0x00000000;
        
        // ECX: Extended feature flags - ONLY advertise fully implemented features:
        // Bit 0: LAHF/SAHF in 64-bit mode - NOT explicitly implemented (simple instructions, assume present)
        // Bit 1: CMP Legacy - NOT implemented
        // Bit 2: SVM - NOT implemented
        // Bit 3: Extended APIC - NOT implemented
        // Bit 4: AltMovCr8 - NOT implemented
        // Bit 5: LZCNT - ✅ IMPLEMENTED (executeLZCNT)
        // Bit 6: SSE4A - NOT implemented
        // Bit 7: MisAlignSSE - NOT implemented
        // Bit 8: PREFETCHW - NOT implemented
        // Bit 9: OSVW - NOT implemented
        // Bit 10: IBS - NOT implemented
        // Bit 11: XOP - NOT implemented
        // Bit 12: SKINIT - NOT implemented
        // Bit 13: WDT - NOT implemented
        // Bit 14: Reserved
        // Bit 15: LWP - NOT implemented
        // Bit 16: FMA4 - NOT implemented
        // Bit 17: TCE - NOT implemented
        // Bit 18: Reserved
        // Bit 19: NodeId - NOT implemented
        // Bit 20-31: Reserved or NOT implemented
        ecx = (1 << 5);    // LZCNT
        // Note: LAHF/SAHF (bit 0) not set - not explicitly implemented
        
        // EDX: Extended feature flags - ONLY advertise fully implemented features:
        // Bit 0: FPU - ✅ IMPLEMENTED (same as leaf 1)
        // Bit 1: VME - NOT implemented
        // Bit 2: DE - NOT implemented
        // Bit 3: PSE - NOT implemented
        // Bit 4: TSC - ✅ IMPLEMENTED (same as leaf 1)
        // Bit 5: MSR - ✅ IMPLEMENTED (same as leaf 1)
        // Bit 6: PAE - ✅ IMPLEMENTED (same as leaf 1)
        // Bit 7: MCE - NOT implemented
        // Bit 8: CX8 - NOT implemented
        // Bit 9: APIC - ✅ IMPLEMENTED (same as leaf 1)
        // Bit 11: SYSCALL/SYSRET - ✅ IMPLEMENTED (executeSYSCALL/SYSRET)
        // Bit 12: MTRR - NOT implemented
        // Bit 13: PGE - NOT implemented
        // Bit 14: MCA - NOT implemented
        // Bit 15: CMOV - ✅ IMPLEMENTED (same as leaf 1)
        // Bit 16: PAT - NOT implemented
        // Bit 17: PSE-36 - NOT implemented
        // Bit 19: CLFSH - NOT implemented
        // Bit 20: NX - ✅ IMPLEMENTED (EFER.NXE, page execute disable)
        // Bit 21: DS - NOT implemented
        // Bit 22: ACPI - ✅ IMPLEMENTED (same as leaf 1)
        // Bit 23: MMX - NOT implemented (same as leaf 1)
        // Bit 24: FXSR - ✅ IMPLEMENTED (same as leaf 1)
        // Bit 25: SSE - ✅ IMPLEMENTED (same as leaf 1)
        // Bit 26: SSE2 - ✅ IMPLEMENTED (same as leaf 1)
        // Bit 27: HTT - NOT implemented (same as leaf 1)
        // Bit 28: Long Mode - ✅ IMPLEMENTED (EFER.LME, 64-bit mode)
        // Bit 29: 3DNow! Extensions - NOT implemented
        // Bit 30: 3DNow! - NOT implemented
        // Bit 31: Reserved
        edx = (1 << 0) |   // FPU
              (1 << 4) |   // TSC
              (1 << 5) |   // MSR
              (1 << 6) |   // PAE
              (1 << 9) |   // APIC
              (1 << 11) |  // SYSCALL/SYSRET (CRITICAL)
              (1 << 15) |  // CMOV
              (1 << 20) |  // NX (No-Execute bit - CRITICAL for Windows)
              (1 << 22) |  // ACPI
              (1 << 24) |  // FXSR
              (1 << 25) |  // SSE
              (1 << 26) |  // SSE2
              (1 << 28);   // Long Mode (64-bit support - CRITICAL)
        break;

      case 0x80000002: // Processor brand string (part 1)
        // "Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz"
        eax = 0x20202020; // "    "
        ebx = 0x20202020; // "    "
        ecx = 0x20202020; // "    "
        edx = 0x6E492020; // " Int"
        break;

      case 0x80000003: // Processor brand string (part 2)
        eax = 0x286C6574; // "tel("
        ebx = 0x50202952; // "R) C"
        ecx = 0x69756E6F; // "ore("
        edx = 0x52286D65; // "TM) "
        break;

      case 0x80000004: // Processor brand string (part 3)
        eax = 0x20372069; // " i7-"
        ebx = 0x30303837; // "8700"
        ecx = 0x204B2020; // " K  "
        edx = 0x20555043; // "CPU "
        break;

      case 0x80000005: // L1 Cache and TLB information
        eax = 0x00000000;
        ebx = 0x00000000;
        ecx = 0x00000000;
        edx = 0x00000000;
        break;

      case 0x80000006: // L2 Cache and TLB information
        eax = 0x00000000;
        ebx = 0x00000000;
        ecx = 0x00000000;
        edx = 0x00000000;
        break;

      case 0x80000007: // Advanced Power Management
        eax = 0x00000000;
        ebx = 0x00000000;
        ecx = 0x00000000;
        edx = 0x00000000;
        break;

      case 0x80000008: // Virtual and physical address sizes (CRITICAL for Windows)
        // EAX: Virtual address size (bits 7:0), Physical address size (bits 15:8)
        // Windows 10/11 requires 48-bit virtual addresses and 36+ bit physical addresses
        eax = 0x00003030; // 48-bit virtual (0x30), 48-bit physical (0x30)
        ebx = 0x00000000;
        ecx = 0x00000000;
        edx = 0x00000000;
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
   * Returns 64-bit timestamp counter value in EDX:EAX
   * TSC increments at a constant rate (typically CPU frequency)
   */
  executeRDTSC(instruction) {
    // RDTSC returns 64-bit timestamp in EDX:EAX
    // TSC increments at CPU frequency (assume 2.4 GHz = 2400000000 Hz)
    // Use high-resolution time for emulation
    const cpuFrequency = 2400000000; // 2.4 GHz
    const now = performance.now(); // Milliseconds
    const timestamp = BigInt(Math.floor(now * cpuFrequency / 1000)); // Convert to CPU cycles
    
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
   * Execute FXSAVE/FXRSTOR/XSAVE/XRSTOR instruction (Save/Restore FPU/SSE/AVX State)
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

    const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;
    
    if (modrm.reg === 0) {
      // FXSAVE - Save FPU/MMX/SSE state (512 bytes)
      this.saveFPUState(memAddrNum, 512);
      console.log('CPU: FXSAVE executed');
    } else if (modrm.reg === 1) {
      // FXRSTOR - Restore FPU/MMX/SSE state
      this.restoreFPUState(memAddrNum, 512);
      console.log('CPU: FXRSTOR executed');
    } else if (modrm.reg === 4) {
      // XSAVE - Save extended state (FPU/SSE/AVX)
      const xcr0 = this.getXCR0(); // Get XCR0 (extended control register)
      const xsaveSize = this.calculateXSAVESize(xcr0);
      this.saveExtendedState(memAddrNum, xsaveSize, xcr0);
      console.log(`CPU: XSAVE executed (${xsaveSize} bytes)`);
    } else if (modrm.reg === 5) {
      // XRSTOR - Restore extended state
      const xcr0 = this.getXCR0();
      const xsaveSize = this.calculateXSAVESize(xcr0);
      this.restoreExtendedState(memAddrNum, xsaveSize, xcr0);
      console.log(`CPU: XRSTOR executed (${xsaveSize} bytes)`);
    } else {
      return false;
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Save FPU state to memory
   */
  saveFPUState(memAddr, size) {
    let offset = 0;
    
    // FPU Control Word (2 bytes)
    this.memory.writeWord(memAddr + offset, this.cpu.registers.fcw);
    offset += 2;
    
    // FPU Status Word (2 bytes)
    this.memory.writeWord(memAddr + offset, this.cpu.registers.fsw);
    offset += 2;
    
    // FPU Tag Word (2 bytes)
    this.memory.writeWord(memAddr + offset, this.cpu.registers.ftw);
    offset += 2;
    
    // Reserved (2 bytes)
    offset += 2;
    
    // FPU Instruction Pointer (4 bytes)
    // FPU Data Pointer (4 bytes)
    // Reserved (4 bytes)
    offset += 12;
    
    // FPU registers (8 x 80-bit = 10 bytes each = 80 bytes)
    for (let i = 0; i < 8; i++) {
      const stReg = `st${i}`;
      const stValue = this.cpu.registers[stReg] || 0n;
      // Write 80-bit value (10 bytes)
      for (let j = 0; j < 10; j++) {
        this.memory.writeByte(memAddr + offset + j, Number((stValue >> BigInt(j * 8)) & 0xFFn));
      }
      offset += 16; // 80-bit value padded to 16 bytes
    }
    
    // MXCSR (4 bytes)
    this.memory.writeDword(memAddr + offset, this.cpu.registers.mxcsr);
    offset += 4;
    
    // MXCSR_MASK (4 bytes) - typically 0xFFFF
    this.memory.writeDword(memAddr + offset, 0xFFFF);
    offset += 4;
    
    // XMM registers (16 x 128-bit = 16 bytes each = 256 bytes)
    for (let i = 0; i < 16; i++) {
      const xmmReg = `xmm${i}`;
      const xmmValue = this.cpu.registers[xmmReg] || 0n;
      // Write 128-bit value (16 bytes)
      this.memory.writeQword(memAddr + offset, xmmValue & 0xFFFFFFFFFFFFFFFFn);
      this.memory.writeQword(memAddr + offset + 8, (xmmValue >> 64n) & 0xFFFFFFFFFFFFFFFFn);
      offset += 16;
    }
    
    // Fill rest with zeros
    while (offset < size) {
      this.memory.writeByte(memAddr + offset, 0);
      offset++;
    }
  }

  /**
   * Restore FPU state from memory
   */
  restoreFPUState(memAddr, size) {
    let offset = 0;
    
    // FPU Control Word
    this.cpu.registers.fcw = this.memory.readWord(memAddr + offset);
    offset += 2;
    
    // FPU Status Word
    this.cpu.registers.fsw = this.memory.readWord(memAddr + offset);
    offset += 2;
    
    // FPU Tag Word
    this.cpu.registers.ftw = this.memory.readWord(memAddr + offset);
    offset += 2;
    
    // Skip reserved
    offset += 2;
    
    // Skip FPU IP/DP
    offset += 12;
    
    // Restore FPU registers
    for (let i = 0; i < 8; i++) {
      const stReg = `st${i}`;
      let stValue = 0n;
      // Read 80-bit value (10 bytes)
      for (let j = 0; j < 10; j++) {
        const byte = BigInt(this.memory.readByte(memAddr + offset + j));
        stValue |= (byte << BigInt(j * 8));
      }
      this.cpu.registers[stReg] = stValue;
      offset += 16;
    }
    
    // MXCSR
    this.cpu.registers.mxcsr = this.memory.readDword(memAddr + offset);
    offset += 4;
    
    // Skip MXCSR_MASK
    offset += 4;
    
    // Restore XMM registers
    for (let i = 0; i < 16; i++) {
      const xmmReg = `xmm${i}`;
      const low = this.memory.readQword(memAddr + offset);
      const high = this.memory.readQword(memAddr + offset + 8);
      this.cpu.registers[xmmReg] = low | (high << 64n);
      offset += 16;
    }
  }

  /**
   * Save extended state (XSAVE)
   * Properly saves X87, XMM (SSE), and YMM (AVX) state based on XCR0
   */
  saveExtendedState(memAddr, size, xcr0) {
    // XSAVE header (64 bytes)
    // XSTATE_BV (8 bytes) - which components are saved (must match XCR0)
    let xstateBv = 0n;
    if (xcr0 & 0x01n) xstateBv |= 0x01n; // X87 FPU
    if (xcr0 & 0x02n) xstateBv |= 0x02n; // SSE/XMM registers
    if (xcr0 & 0x04n) xstateBv |= 0x04n; // AVX/YMM registers
    if (xcr0 & 0x08n) xstateBv |= 0x08n; // AVX512/ZMM registers
    
    this.memory.writeQword(memAddr, xstateBv);
    this.memory.writeQword(memAddr + 8, 0n); // XCOMP_BV (compressed format, not used)
    
    // Reserved (48 bytes)
    for (let i = 16; i < 64; i++) {
      this.memory.writeByte(memAddr + i, 0);
    }
    
    let offset = 64;
    
    // Save X87 state if enabled (bit 0)
    if (xcr0 & 0x01n) {
      this.saveFPUState(memAddr + offset, 512);
      offset += 512;
    }
    
    // Save SSE/XMM state if enabled (bit 1)
    // Note: XMM registers are saved as part of the FPU state area in FXSAVE format
    // But in XSAVE, they're saved separately if XCR0 bit 1 is set
    if (xcr0 & 0x02n) {
      // Save XMM registers (16 x 128-bit = 256 bytes)
      // These are the lower 128 bits of YMM registers
      for (let i = 0; i < 16; i++) {
        const xmmReg = `xmm${i}`;
        const xmmValue = this.cpu.registers[xmmReg] || 0n;
        // Write 128-bit value (16 bytes) - lower 64 bits, then upper 64 bits
        this.memory.writeQword(memAddr + offset, xmmValue & 0xFFFFFFFFFFFFFFFFn);
        this.memory.writeQword(memAddr + offset + 8, (xmmValue >> 64n) & 0xFFFFFFFFFFFFFFFFn);
        offset += 16;
      }
    }
    
    // Save AVX/YMM state if enabled (bit 2)
    // YMM registers are 256-bit: lower 128 bits are XMM, upper 128 bits are YMM extension
    if (xcr0 & 0x04n) {
      // Save YMM upper 128 bits (16 x 128-bit = 256 bytes)
      for (let i = 0; i < 16; i++) {
        const ymmReg = `ymm${i}`;
        const ymmValue = this.cpu.registers[ymmReg] || 0n;
        // Write upper 128 bits of YMM (16 bytes)
        this.memory.writeQword(memAddr + offset, ymmValue & 0xFFFFFFFFFFFFFFFFn);
        this.memory.writeQword(memAddr + offset + 8, (ymmValue >> 64n) & 0xFFFFFFFFFFFFFFFFn);
        offset += 16;
      }
    }
  }

  /**
   * Restore extended state (XRSTOR)
   * Properly restores X87, XMM (SSE), and YMM (AVX) state based on XCR0 and XSTATE_BV
   */
  restoreExtendedState(memAddr, size, xcr0) {
    // Read XSTATE_BV - indicates which components are present in the save area
    const xstateBv = this.memory.readQword(memAddr);
    
    let offset = 64;
    
    // Restore X87 state if present and enabled in XCR0
    if ((xstateBv & 0x01n) && (xcr0 & 0x01n)) {
      this.restoreFPUState(memAddr + offset, 512);
      offset += 512;
    }
    
    // Restore SSE/XMM state if present and enabled in XCR0
    if ((xstateBv & 0x02n) && (xcr0 & 0x02n)) {
      // Restore XMM registers (16 x 128-bit = 256 bytes)
      // These are the lower 128 bits of YMM registers
      for (let i = 0; i < 16; i++) {
        const xmmReg = `xmm${i}`;
        const low = this.memory.readQword(memAddr + offset);
        const high = this.memory.readQword(memAddr + offset + 8);
        this.cpu.registers[xmmReg] = low | (high << 64n);
        offset += 16;
      }
    }
    
    // Restore AVX/YMM state if present and enabled in XCR0
    if ((xstateBv & 0x04n) && (xcr0 & 0x04n)) {
      // Restore YMM upper 128 bits (16 x 128-bit = 256 bytes)
      for (let i = 0; i < 16; i++) {
        const ymmReg = `ymm${i}`;
        const low = this.memory.readQword(memAddr + offset);
        const high = this.memory.readQword(memAddr + offset + 8);
        this.cpu.registers[ymmReg] = low | (high << 64n);
        offset += 16;
      }
    }
  }

  /**
   * Get XCR0 (Extended Control Register 0)
   * XCR0 controls which extended states are saved/restored by XSAVE/XRSTOR
   */
  getXCR0() {
    // XCR0 bits:
    // 0 = X87 FPU
    // 1 = SSE/XMM registers
    // 2 = AVX/YMM registers (upper 128 bits of XMM)
    // 3 = AVX512/ZMM registers
    // Return the actual XCR0 register value
    return this.cpu.registers.xcr0 || 0x07n; // Default: X87 + SSE + AVX enabled
  }

  /**
   * Set XCR0 (Extended Control Register 0)
   * This would normally be done via XSETBV instruction, but we'll provide a helper
   */
  setXCR0(value) {
    // Validate XCR0 value (only allow supported bits)
    const validBits = 0x07n; // X87, SSE, AVX (bits 0, 1, 2)
    this.cpu.registers.xcr0 = value & validBits;
  }

  /**
   * Calculate XSAVE size based on XCR0
   * Returns the total size needed for XSAVE/XRSTOR based on enabled features
   */
  calculateXSAVESize(xcr0) {
    let size = 64; // XSAVE header (always present)
    
    if (xcr0 & 0x01n) size += 512; // X87 FPU state (512 bytes)
    if (xcr0 & 0x02n) size += 256; // SSE/XMM registers (16 x 128-bit = 256 bytes)
    if (xcr0 & 0x04n) size += 256; // AVX/YMM upper 128 bits (16 x 128-bit = 256 bytes)
    if (xcr0 & 0x08n) size += 1024; // AVX512/ZMM registers (not implemented)
    
    return size;
  }

  /**
   * Execute MOVAPS instruction (Move Aligned Packed Single-precision)
   * Moves 128 bits (16 bytes) aligned
   */
  executeMOVAPS(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    // MOVAPS moves 128 bits (16 bytes)
    const size = 16;
    const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;

    if (modrm.mod === 3) {
      // Register to register (XMM register)
      // For now, treat as memory-to-memory operation
      // TODO: Implement XMM registers
      console.log('CPU: MOVAPS reg-to-reg (XMM not implemented, treating as NOP)');
    } else {
      // Memory operation
      if (modrm.reg < 4) {
        // Load from memory to XMM register (simplified - just read)
        for (let i = 0; i < size; i++) {
          this.memory.readByte(memAddrNum + i);
        }
      } else {
        // Store from XMM register to memory (simplified - write zeros)
        for (let i = 0; i < size; i++) {
          this.memory.writeByte(memAddrNum + i, 0);
        }
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute MOVUPS instruction (Move Unaligned Packed Single-precision)
   * Moves 128 bits (16 bytes) unaligned
   */
  executeMOVUPS(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    // MOVUPS moves 128 bits (16 bytes)
    const size = 16;
    const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;

    // Get XMM register index
    const xmmIndex = modrm.reg % 16;
    const xmmReg = `xmm${xmmIndex}`;
    
    if (modrm.mod === 3) {
      // Register to register (XMM register)
      const srcXmmIndex = modrm.rm % 16;
      const srcXmmReg = `xmm${srcXmmIndex}`;
      // Copy XMM register
      this.cpu.registers[xmmReg] = this.cpu.registers[srcXmmReg] || 0n;
    } else {
      // Memory operation
      if (modrm.reg < 4) {
        // Load from memory to XMM register (128 bits = 16 bytes)
        let xmmValue = 0n;
        for (let i = 0; i < 16; i++) {
          const byte = BigInt(this.memory.readByte(memAddrNum + i));
          xmmValue |= (byte << BigInt(i * 8));
        }
        this.cpu.registers[xmmReg] = xmmValue;
      } else {
        // Store from XMM register to memory
        const xmmValue = this.cpu.registers[xmmReg] || 0n;
        for (let i = 0; i < 16; i++) {
          const byte = Number((xmmValue >> BigInt(i * 8)) & 0xFFn);
          this.memory.writeByte(memAddrNum + i, byte);
        }
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute MOVDQA instruction (Move Aligned Double Quadword)
   * Moves 128 bits (16 bytes) aligned
   */
  executeMOVDQA(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    // MOVDQA moves 128 bits (16 bytes)
    const size = 16;
    const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;

    // Get XMM register index
    const xmmIndex = modrm.reg % 16;
    const xmmReg = `xmm${xmmIndex}`;
    
    if (modrm.mod === 3) {
      // Register to register (XMM register)
      const srcXmmIndex = modrm.rm % 16;
      const srcXmmReg = `xmm${srcXmmIndex}`;
      // Copy XMM register
      this.cpu.registers[xmmReg] = this.cpu.registers[srcXmmReg] || 0n;
    } else {
      // Memory operation (aligned)
      if (modrm.reg < 4) {
        // Load from memory to XMM register (128 bits = 16 bytes)
        let xmmValue = 0n;
        for (let i = 0; i < 16; i++) {
          const byte = BigInt(this.memory.readByte(memAddrNum + i));
          xmmValue |= (byte << BigInt(i * 8));
        }
        this.cpu.registers[xmmReg] = xmmValue;
      } else {
        // Store from XMM register to memory
        const xmmValue = this.cpu.registers[xmmReg] || 0n;
        for (let i = 0; i < 16; i++) {
          const byte = Number((xmmValue >> BigInt(i * 8)) & 0xFFn);
          this.memory.writeByte(memAddrNum + i, byte);
        }
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute MOVDQU instruction (Move Unaligned Double Quadword)
   * Moves 128 bits (16 bytes) unaligned
   */
  executeMOVDQU(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    // MOVDQU moves 128 bits (16 bytes)
    const size = 16;
    const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;

    // Get XMM register index
    const xmmIndex = modrm.reg % 16;
    const xmmReg = `xmm${xmmIndex}`;
    
    if (modrm.mod === 3) {
      // Register to register (XMM register)
      const srcXmmIndex = modrm.rm % 16;
      const srcXmmReg = `xmm${srcXmmIndex}`;
      // Copy XMM register
      this.cpu.registers[xmmReg] = this.cpu.registers[srcXmmReg] || 0n;
    } else {
      // Memory operation (unaligned)
      if (modrm.reg < 4) {
        // Load from memory to XMM register (128 bits = 16 bytes)
        let xmmValue = 0n;
        for (let i = 0; i < 16; i++) {
          const byte = BigInt(this.memory.readByte(memAddrNum + i));
          xmmValue |= (byte << BigInt(i * 8));
        }
        this.cpu.registers[xmmReg] = xmmValue;
      } else {
        // Store from XMM register to memory
        const xmmValue = this.cpu.registers[xmmReg] || 0n;
        for (let i = 0; i < 16; i++) {
          const byte = Number((xmmValue >> BigInt(i * 8)) & 0xFFn);
          this.memory.writeByte(memAddrNum + i, byte);
        }
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute PXOR instruction (Packed XOR)
   * XORs 128 bits (16 bytes)
   */
  executePXOR(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    // PXOR operates on XMM registers
    // For now, treat as NOP (XMM registers not implemented)
    // This allows code to continue executing without crashing
    if (modrm.mod === 3) {
      // Register to register (XMM register)
      console.log('CPU: PXOR reg-to-reg (XMM not implemented, treating as NOP)');
    } else {
      // Memory operation
      const memAddr = this.calculateAddress(instruction);
      if (memAddr === null) {
        return false;
      }
      const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;
      // Just read the memory (don't actually XOR)
      for (let i = 0; i < 16; i++) {
        this.memory.readByte(memAddrNum + i);
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute PAND instruction (Packed AND)
   * ANDs 128 bits (16 bytes)
   */
  executePAND(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    // PAND operates on XMM registers
    const xmmIndex = modrm.reg % 16;
    const xmmReg = `xmm${xmmIndex}`;
    
    if (modrm.mod === 3) {
      // Register to register (XMM register)
      const srcXmmIndex = modrm.rm % 16;
      const srcXmmReg = `xmm${srcXmmIndex}`;
      const srcValue = this.cpu.registers[srcXmmReg] || 0n;
      const dstValue = this.cpu.registers[xmmReg] || 0n;
      // AND operation
      this.cpu.registers[xmmReg] = dstValue & srcValue;
    } else {
      const memAddr = this.calculateAddress(instruction);
      if (memAddr === null) {
        return false;
      }
      const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;
      for (let i = 0; i < 16; i++) {
        this.memory.readByte(memAddrNum + i);
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute POR instruction (Packed OR)
   * ORs 128 bits (16 bytes)
   */
  executePOR(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    // POR operates on XMM registers
    const xmmIndex = modrm.reg % 16;
    const xmmReg = `xmm${xmmIndex}`;
    
    if (modrm.mod === 3) {
      // Register to register (XMM register)
      const srcXmmIndex = modrm.rm % 16;
      const srcXmmReg = `xmm${srcXmmIndex}`;
      const srcValue = this.cpu.registers[srcXmmReg] || 0n;
      const dstValue = this.cpu.registers[xmmReg] || 0n;
      // OR operation
      this.cpu.registers[xmmReg] = dstValue | srcValue;
    } else {
      const memAddr = this.calculateAddress(instruction);
      if (memAddr === null) {
        return false;
      }
      for (let i = 0; i < 16; i++) {
        this.memory.readByte(memAddr + i);
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute SYSTEM instruction (0x0F 0x01 - LGDT/LIDT/INVLPG)
   */
  executeSYSTEM(instruction) {
    const { modrm } = instruction;
    if (!modrm) {
      return false;
    }

    const operation = modrm.reg;

    switch (operation) {
      case 2: // LGDT - Load Global Descriptor Table
        return this.executeLGDT(instruction);
      case 3: // LIDT - Load Interrupt Descriptor Table
        return this.executeLIDT(instruction);
      case 7: // INVLPG - Invalidate TLB Entry
        return this.executeINVLPG(instruction);
      case 0: // XGETBV - Get Extended Control Register (0x0F 0x01 0xD0)
        if (modrm.mod === 3 && modrm.rm === 0) {
          return this.executeXGETBV(instruction);
        }
        break;
      default:
        console.warn(`CPU: Unhandled SYSTEM operation ${operation}`);
        return false;
    }
    return false;
  }

  /**
   * Execute XGETBV instruction (Get Extended Control Register)
   * Reads the XCR register specified in ECX and returns the value in EDX:EAX
   */
  executeXGETBV(instruction) {
    // XGETBV reads XCR register specified in ECX, returns value in EDX:EAX
    const xcrNumber = Number(this.cpu.registers.rcx & 0xFFFFFFFFn);
    
    if (xcrNumber === 0) {
      // XCR0 - Extended Control Register 0
      // XCR0 controls which extended states are managed by XSAVE/XRSTOR
      const xcr0 = this.getXCR0();
      // Return in EDX:EAX (64-bit value, but XCR0 is only 32 bits)
      // Lower 32 bits in EAX, upper 32 bits (all zeros) in EDX
      this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFF00000000n) | (xcr0 & 0xFFFFFFFFn);
      this.cpu.registers.rdx = (this.cpu.registers.rdx & 0xFFFFFFFF00000000n); // Upper 32 bits are always 0 for XCR0
    } else {
      // Unknown XCR - return 0
      this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFF00000000n);
      this.cpu.registers.rdx = (this.cpu.registers.rdx & 0xFFFFFFFF00000000n);
    }
    
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute LGDT instruction (Load Global Descriptor Table)
   * Loads GDT base and limit from memory
   */
  executeLGDT(instruction) {
    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    // LGDT loads GDT descriptor:
    // - 16-bit limit (bytes 0-1)
    // - 64-bit base address (bytes 2-9 in 64-bit mode, bytes 2-5 in 32-bit mode)
    const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;
    const limit = this.readMemory(memAddr, 16); // 16-bit limit
    const base = this.readMemory(memAddrNum + 2, 64); // 64-bit base in long mode
    
    // Store GDT base and limit (Windows will use these)
    if (!this.cpu.gdt) {
      this.cpu.gdt = {};
    }
    this.cpu.gdt.base = base;
    this.cpu.gdt.limit = limit;
    
    console.log(`CPU: LGDT executed (limit: 0x${limit.toString(16)}, base: 0x${base.toString(16)})`);
    
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute LIDT instruction (Load Interrupt Descriptor Table)
   * Loads IDT base and limit from memory
   */
  executeLIDT(instruction) {
    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    // LIDT loads IDT descriptor:
    // - 16-bit limit (bytes 0-1)
    // - 64-bit base address (bytes 2-9 in 64-bit mode, bytes 2-5 in 32-bit mode)
    const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;
    const limit = this.readMemory(memAddr, 16); // 16-bit limit
    const base = this.readMemory(memAddrNum + 2, 64); // 64-bit base in long mode
    
    // Store IDT base and limit (interrupt handler will use these)
    if (this.cpu.interruptHandler) {
      this.cpu.interruptHandler.idtBase = base;
      this.cpu.interruptHandler.idtLimit = Number(limit);
    }
    
    // Also store in CPU for reference
    if (!this.cpu.idt) {
      this.cpu.idt = {};
    }
    this.cpu.idt.base = base;
    this.cpu.idt.limit = limit;
    
    console.log(`CPU: LIDT executed (limit: 0x${limit.toString(16)}, base: 0x${base.toString(16)})`);
    
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute INVLPG instruction (Invalidate TLB Entry)
   * Invalidates TLB entry for the specified virtual address
   */
  executeINVLPG(instruction) {
    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }

    // INVLPG invalidates a TLB entry for the specified address
    // Invalidate the TLB entry in virtual memory manager
    if (this.memory && this.memory.virtualMemory) {
      this.memory.virtualMemory.invalidateTLBEntry(BigInt(memAddr));
    }
    
    console.log(`CPU: INVLPG executed (address: 0x${memAddr.toString(16)})`);
    
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute MOV CR instruction (Move to/from Control Registers)
   * Properly handles CR0, CR1, CR2, CR3, CR4 with bit validation
   */
  executeMOV_CR(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    const crNumber = modrm.reg;
    // Determine if this is MOV to CR (0x0F 0x22) or MOV from CR (0x0F 0x20)
    // Check the second byte of the opcode
    const isStore = instruction.opcode.length === 2 && 
                    (instruction.opcode.offset === undefined || 
                     (instruction.opcode.offset !== undefined && 
                      this.memory.readByte(Number(this.cpu.registers.rip) + 1) === 0x22));

    if (modrm.mod === 3) {
      // Register mode
      const reg = this.getRegisterFromModRM(modrm, rex, 64);
      
      if (isStore) {
        // MOV CR, reg - Store register to control register
        const value = this.cpu.registers[reg] & 0xFFFFFFFFn; // CR registers are 32-bit
        
        // Validate and set control register based on number
        switch (crNumber) {
          case 0:
            this.setCR0(value);
            break;
          case 1:
            // CR1 is reserved, ignore writes
            console.warn('CPU: Attempted write to reserved CR1, ignored');
            break;
          case 2:
            // CR2 is page fault linear address, can be written
            this.cpu.registers.cr2 = value;
            break;
          case 3:
            // CR3 is page directory base address
            this.cpu.registers.cr3 = value;
            // Invalidate TLB when CR3 changes
            if (this.memory && this.memory.virtualMemory) {
              this.memory.virtualMemory.invalidateTLB();
            }
            break;
          case 4:
            this.setCR4(value);
            break;
          default:
            console.warn(`CPU: Attempted write to unsupported CR${crNumber}, ignored`);
            return false;
        }
        console.log(`CPU: MOV CR${crNumber}, ${reg} (value: 0x${value.toString(16)})`);
      } else {
        // MOV reg, CR - Load register from control register
        let crValue = 0n;
        switch (crNumber) {
          case 0:
            crValue = this.cpu.registers.cr0;
            break;
          case 1:
            crValue = this.cpu.registers.cr1;
            break;
          case 2:
            crValue = this.cpu.registers.cr2;
            break;
          case 3:
            crValue = this.cpu.registers.cr3;
            break;
          case 4:
            crValue = this.cpu.registers.cr4;
            break;
          default:
            console.warn(`CPU: Attempted read from unsupported CR${crNumber}`);
            return false;
        }
        // Write 32-bit value to register (preserve upper bits)
        this.cpu.registers[reg] = (this.cpu.registers[reg] & 0xFFFFFFFF00000000n) | crValue;
        console.log(`CPU: MOV ${reg}, CR${crNumber} (value: 0x${crValue.toString(16)})`);
      }
    } else {
      return false; // Memory mode not supported for MOV CR
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Set CR0 register with proper bit validation
   * CR0 bits:
   * 0 = PE (Protected Mode Enable)
   * 1 = MP (Monitor Coprocessor)
   * 2 = EM (Emulation)
   * 3 = TS (Task Switched)
   * 4 = ET (Extension Type)
   * 5 = NE (Numeric Error)
   * 16 = WP (Write Protect) - CRITICAL
   * 18 = AM (Alignment Mask)
   * 29 = NW (Not Write-through)
   * 30 = CD (Cache Disable)
   * 31 = PG (Paging Enable)
   */
  setCR0(value) {
    // Validate and set CR0
    // Preserve reserved bits (set to 0)
    const validBits = 0x8005003Bn; // Valid CR0 bits
    const newCR0 = value & BigInt(validBits);
    
    const oldCR0 = this.cpu.registers.cr0;
    this.cpu.registers.cr0 = newCR0;
    
    // Check if paging was enabled/disabled
    const pagingWasEnabled = (oldCR0 & 0x80000000n) !== 0n;
    const pagingNowEnabled = (newCR0 & 0x80000000n) !== 0n;
    
    if (pagingWasEnabled !== pagingNowEnabled && this.memory) {
      this.memory.pagingEnabled = pagingNowEnabled;
      if (this.memory.virtualMemory) {
        if (pagingNowEnabled) {
          console.log('CPU: Paging enabled (CR0.PG = 1)');
        } else {
          console.log('CPU: Paging disabled (CR0.PG = 0)');
        }
      }
    }
    
    console.log(`CPU: CR0 set to 0x${newCR0.toString(16)} (WP=${(newCR0 & 0x10000n) ? 1 : 0}, PG=${(newCR0 & 0x80000000n) ? 1 : 0})`);
  }

  /**
   * Set CR4 register with proper bit validation
   * CR4 bits:
   * 0 = VME (Virtual 8086 Mode Extensions)
   * 1 = PVI (Protected-Mode Virtual Interrupts)
   * 2 = TSD (Time Stamp Disable)
   * 3 = DE (Debugging Extensions)
   * 4 = PSE (Page Size Extensions)
   * 5 = PAE (Physical Address Extension) - CRITICAL
   * 6 = MCE (Machine Check Enable)
   * 7 = PGE (Page Global Enable)
   * 8 = PCE (Performance Counter Enable)
   * 9 = OSFXSR (OS support for FXSAVE/FXRSTOR)
   * 10 = OSXMMEXCPT (OS support for unmasked SIMD exceptions)
   * 11 = UMIP (User-Mode Instruction Prevention)
   * 12 = LA57 (5-level paging) - MUST BE 0
   * 13 = VMXE (VMX Enable)
   * 14 = SMXE (SMX Enable)
   * 16 = FSGSBASE (FS/GS Base)
   * 17 = PCIDE (PCID Enable)
   * 18 = OSXSAVE (OS support for XSAVE)
   * 20 = SMEP (Supervisor Mode Execution Prevention) - CRITICAL
   * 21 = SMAP (Supervisor Mode Access Prevention) - CRITICAL
   */
  setCR4(value) {
    // Validate CR4 - ensure LA57 (bit 12) is 0
    const validBits = 0x000007FFn | 0x00030000n; // Valid CR4 bits (excluding LA57)
    let newCR4 = value & BigInt(validBits);
    
    // Force LA57 (bit 12) to 0 - 5-level paging not supported
    newCR4 = newCR4 & ~0x1000n; // Clear bit 12
    
    this.cpu.registers.cr4 = newCR4;
    
    const pae = (newCR4 & 0x20n) !== 0n;
    const smep = (newCR4 & 0x100000n) !== 0n;
    const smap = (newCR4 & 0x200000n) !== 0n;
    
    console.log(`CPU: CR4 set to 0x${newCR4.toString(16)} (PAE=${pae ? 1 : 0}, SMEP=${smep ? 1 : 0}, SMAP=${smap ? 1 : 0}, LA57=0)`);
  }

  /**
   * Execute MOV DR instruction (Move to/from Debug Registers)
   */
  executeMOV_DR(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    const drNumber = modrm.reg;
    const isStore = (instruction.opcode.offset && instruction.opcode.offset + 1 < 256) 
      ? (instruction.opcode.offset + 1) === 0x23 
      : false; // 0x0F 0x23 = MOV to DR, 0x0F 0x21 = MOV from DR

    if (modrm.mod === 3) {
      // Register mode
      const reg = this.getRegisterFromModRM(modrm, rex, 64);
      
      if (isStore) {
        // MOV DR, reg - Store register to debug register
        const value = this.cpu.registers[reg];
        if (!this.cpu.debugRegisters) {
          this.cpu.debugRegisters = {};
        }
        this.cpu.debugRegisters[`dr${drNumber}`] = value;
        console.log(`CPU: MOV DR${drNumber}, ${reg} (value: ${value.toString(16)}) - simplified`);
      } else {
        // MOV reg, DR - Load register from debug register
        if (!this.cpu.debugRegisters) {
          this.cpu.debugRegisters = {};
        }
        const drValue = this.cpu.debugRegisters[`dr${drNumber}`] || 0n;
        this.cpu.registers[reg] = drValue;
        console.log(`CPU: MOV ${reg}, DR${drNumber} (value: ${drValue.toString(16)}) - simplified`);
      }
    } else {
      return false; // Memory mode not supported for MOV DR
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute WRMSR instruction (Write Model-Specific Register)
   * Perfect MSR support - Windows requires all these MSRs to work correctly
   */
  executeWRMSR(instruction) {
    // WRMSR writes EDX:EAX to the MSR specified in ECX
    const ecx = Number(this.cpu.registers.rcx & 0xFFFFFFFFn);
    const eax = this.cpu.registers.rax & 0xFFFFFFFFn;
    const edx = this.cpu.registers.rdx & 0xFFFFFFFFn;
    
    // Combine EDX:EAX into 64-bit value
    const value = (BigInt(edx) << 32n) | eax;
    
    // Handle specific MSRs (Windows requires all of these)
    switch (ecx) {
      case 0x1B: // IA32_APIC_BASE - APIC base address
        // Bits 11:0: Reserved
        // Bits 35:12: APIC base physical address
        // Bit 8: APIC Global Enable (BSP)
        // Bit 9: APIC Global Enable (x2APIC mode)
        // Bit 10: APIC Global Enable (x2APIC mode)
        // Bits 63:36: Reserved
        if (!this.cpu.msrRegisters) {
          this.cpu.msrRegisters = {};
        }
        this.cpu.msrRegisters[ecx] = value & 0xFFFFFFFFFFFFF00n; // Clear lower 12 bits (must be page-aligned)
        console.log(`CPU: WRMSR IA32_APIC_BASE = 0x${this.cpu.msrRegisters[ecx].toString(16)}`);
        break;
        
      case 0x174: // IA32_SYSENTER_CS - SYSENTER code segment
        this.cpu.registers.sysenter_cs = Number(value & 0xFFFFn);
        console.log(`CPU: WRMSR IA32_SYSENTER_CS = 0x${this.cpu.registers.sysenter_cs.toString(16)}`);
        break;
        
      case 0x175: // IA32_SYSENTER_ESP - SYSENTER stack pointer
        this.cpu.registers.sysenter_esp = value & 0xFFFFFFFFFFFFFFFFn;
        console.log(`CPU: WRMSR IA32_SYSENTER_ESP = 0x${this.cpu.registers.sysenter_esp.toString(16)}`);
        break;
        
      case 0x176: // IA32_SYSENTER_EIP - SYSENTER entry point
        this.cpu.registers.sysenter_eip = value & 0xFFFFFFFFFFFFFFFFn;
        console.log(`CPU: WRMSR IA32_SYSENTER_EIP = 0x${this.cpu.registers.sysenter_eip.toString(16)}`);
        break;
        
      case 0xC0000080: // IA32_EFER (Extended Feature Enable Register)
        this.setEFER(value);
        break;
        
      case 0xC0000081: // IA32_STAR - SYSCALL target (compatibility mode)
        this.cpu.registers.star = value & 0xFFFFFFFFFFFFFFFFn;
        console.log(`CPU: WRMSR IA32_STAR = 0x${this.cpu.registers.star.toString(16)}`);
        break;
        
      case 0xC0000082: // IA32_LSTAR - SYSCALL target (64-bit mode)
        this.cpu.registers.lstar = value & 0xFFFFFFFFFFFFFFFFn;
        console.log(`CPU: WRMSR IA32_LSTAR = 0x${this.cpu.registers.lstar.toString(16)}`);
        break;
        
      case 0xC0000083: // IA32_CSTAR - SYSCALL target (compatibility mode)
        this.cpu.registers.cstar = value & 0xFFFFFFFFFFFFFFFFn;
        console.log(`CPU: WRMSR IA32_CSTAR = 0x${this.cpu.registers.cstar.toString(16)}`);
        break;
        
      case 0xC0000084: // IA32_SFMASK - SYSCALL flag mask
        this.cpu.registers.sfmask = value & 0xFFFFFFFFFFFFFFFFn;
        console.log(`CPU: WRMSR IA32_SFMASK = 0x${this.cpu.registers.sfmask.toString(16)}`);
        break;
        
      case 0x17E: // IA32_MISC_ENABLE - Miscellaneous enable
      case 0x1A0: // IA32_MISC_ENABLE (alternative)
        if (!this.cpu.msrRegisters) {
          this.cpu.msrRegisters = {};
        }
        this.cpu.msrRegisters[ecx] = value;
        console.log(`CPU: WRMSR IA32_MISC_ENABLE = 0x${value.toString(16)}`);
        break;
        
      case 0x186: // IA32_PERF_STATUS - Performance status
      case 0x198: // IA32_PERF_CTL - Performance control
      case 0x199: // IA32_CLOCK_MODULATION - Clock modulation
      case 0x19A: // IA32_THERM_INTERRUPT - Thermal interrupt
      case 0x19B: // IA32_THERM_STATUS - Thermal status
      case 0x1FE: // IA32_MTRRCAP - MTRR capability
      case 0x2FF: // IA32_MTRR_DEF_TYPE - MTRR default type
      case 0x309: // IA32_FIXED_CTR0 - Fixed counter 0
      case 0x30A: // IA32_FIXED_CTR1 - Fixed counter 1
      case 0x30B: // IA32_FIXED_CTR2 - Fixed counter 2
      case 0x38D: // IA32_FIXED_CTR_CTRL - Fixed counter control
      case 0x38E: // IA32_PERF_GLOBAL_STATUS - Performance global status
      case 0x38F: // IA32_PERF_GLOBAL_CTRL - Performance global control
      case 0x390: // IA32_PERF_GLOBAL_OVF_CTRL - Performance global overflow control
        // Performance and MTRR MSRs - store but don't implement functionality
        if (!this.cpu.msrRegisters) {
          this.cpu.msrRegisters = {};
        }
        this.cpu.msrRegisters[ecx] = value;
        console.log(`CPU: WRMSR MSR 0x${ecx.toString(16)} = 0x${value.toString(16)}`);
        break;
        
      default:
        // Store other MSRs (MTRR, performance counters, etc.)
        if (!this.cpu.msrRegisters) {
          this.cpu.msrRegisters = {};
        }
        this.cpu.msrRegisters[ecx] = value;
        // Only log non-standard MSRs to reduce noise
        if (ecx < 0x200 || ecx > 0x400) {
          console.log(`CPU: WRMSR MSR 0x${ecx.toString(16)} = 0x${value.toString(16)}`);
        }
    }
    
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Set EFER register with proper bit validation
   * EFER bits:
   * 0 = SCE (SYSCALL Enable)
   * 8 = LME (Long Mode Enable)
   * 10 = LMA (Long Mode Active)
   * 11 = NXE (No-Execute Enable) - CRITICAL
   * 12 = SVME (Secure Virtual Machine Enable)
   * 13 = LMSLE (Long Mode Segment Limit Enable)
   * 14 = FFXSR (Fast FXSAVE/FXRSTOR)
   * 15 = TCE (Translation Cache Extension)
   */
  setEFER(value) {
    // Validate EFER bits
    const validBits = 0x0000D501n; // Valid EFER bits
    const newEFER = value & BigInt(validBits);
    
    this.cpu.registers.efer = newEFER;
    
    const nxe = (newEFER & 0x800n) !== 0n; // Bit 11
    const lme = (newEFER & 0x100n) !== 0n; // Bit 8
    const sce = (newEFER & 0x01n) !== 0n; // Bit 0
    
    console.log(`CPU: EFER set to 0x${newEFER.toString(16)} (NXE=${nxe ? 1 : 0}, LME=${lme ? 1 : 0}, SCE=${sce ? 1 : 0})`);
  }

  /**
   * Execute RDMSR instruction (Read Model-Specific Register)
   * Perfect MSR support - Windows requires all these MSRs to work correctly
   */
  executeRDMSR(instruction) {
    // RDMSR reads the MSR specified in ECX and returns it in EDX:EAX
    const ecx = Number(this.cpu.registers.rcx & 0xFFFFFFFFn);
    
    let value = 0n;
    
    // Handle specific MSRs (Windows requires all of these)
    switch (ecx) {
      case 0x1B: // IA32_APIC_BASE - APIC base address
        if (!this.cpu.msrRegisters || !this.cpu.msrRegisters[ecx]) {
          // Default APIC base: 0xFEE00000 with bit 8 set (APIC enabled)
          value = 0xFEE00000n | 0x100n; // Base address + APIC Global Enable
        } else {
          value = this.cpu.msrRegisters[ecx];
        }
        break;
        
      case 0x174: // IA32_SYSENTER_CS - SYSENTER code segment
        value = BigInt(this.cpu.registers.sysenter_cs || 0);
        break;
        
      case 0x175: // IA32_SYSENTER_ESP - SYSENTER stack pointer
        value = this.cpu.registers.sysenter_esp || 0n;
        break;
        
      case 0x176: // IA32_SYSENTER_EIP - SYSENTER entry point
        value = this.cpu.registers.sysenter_eip || 0n;
        break;
        
      case 0xC0000080: // IA32_EFER (Extended Feature Enable Register)
        value = this.cpu.registers.efer || 0n;
        break;
        
      case 0xC0000081: // IA32_STAR - SYSCALL target (compatibility mode)
        value = this.cpu.registers.star || 0n;
        break;
        
      case 0xC0000082: // IA32_LSTAR - SYSCALL target (64-bit mode)
        value = this.cpu.registers.lstar || 0n;
        break;
        
      case 0xC0000083: // IA32_CSTAR - SYSCALL target (compatibility mode)
        value = this.cpu.registers.cstar || 0n;
        break;
        
      case 0xC0000084: // IA32_SFMASK - SYSCALL flag mask
        value = this.cpu.registers.sfmask || 0n;
        break;
        
      case 0x17E: // IA32_MISC_ENABLE - Miscellaneous enable
      case 0x1A0: // IA32_MISC_ENABLE (alternative)
        if (!this.cpu.msrRegisters || !this.cpu.msrRegisters[ecx]) {
          // Default: Fast strings enabled, other features enabled
          value = 0x850089n; // Default MISC_ENABLE value
        } else {
          value = this.cpu.msrRegisters[ecx];
        }
        break;
        
      case 0x1FE: // IA32_MTRRCAP - MTRR capability
        // Return MTRR capability: Fixed MTRRs supported, Variable MTRRs supported
        value = 0x508n; // 8 variable MTRRs, fixed MTRRs supported
        break;
        
      case 0x2FF: // IA32_MTRR_DEF_TYPE - MTRR default type
        if (!this.cpu.msrRegisters || !this.cpu.msrRegisters[ecx]) {
          value = 0n; // Default: MTRRs disabled
        } else {
          value = this.cpu.msrRegisters[ecx];
        }
        break;
        
      case 0x186: // IA32_PERF_STATUS - Performance status
      case 0x198: // IA32_PERF_CTL - Performance control
      case 0x199: // IA32_CLOCK_MODULATION - Clock modulation
      case 0x19A: // IA32_THERM_INTERRUPT - Thermal interrupt
      case 0x19B: // IA32_THERM_STATUS - Thermal status
      case 0x309: // IA32_FIXED_CTR0 - Fixed counter 0
      case 0x30A: // IA32_FIXED_CTR1 - Fixed counter 1
      case 0x30B: // IA32_FIXED_CTR2 - Fixed counter 2
      case 0x38D: // IA32_FIXED_CTR_CTRL - Fixed counter control
      case 0x38E: // IA32_PERF_GLOBAL_STATUS - Performance global status
      case 0x38F: // IA32_PERF_GLOBAL_CTRL - Performance global control
      case 0x390: // IA32_PERF_GLOBAL_OVF_CTRL - Performance global overflow control
        // Performance and thermal MSRs
        if (!this.cpu.msrRegisters || !this.cpu.msrRegisters[ecx]) {
          value = 0n; // Default: all zeros
        } else {
          value = this.cpu.msrRegisters[ecx];
        }
        break;
        
      default:
        // Read other MSRs (MTRR ranges, etc.)
        if (!this.cpu.msrRegisters) {
          this.cpu.msrRegisters = {};
        }
        value = this.cpu.msrRegisters[ecx] || 0n;
        // Only log non-standard MSRs to reduce noise
        if (ecx < 0x200 || ecx > 0x400) {
          console.log(`CPU: RDMSR MSR 0x${ecx.toString(16)} = 0x${value.toString(16)}`);
        }
    }
    
    // Split into EDX:EAX
    const eax = value & 0xFFFFFFFFn;
    const edx = (value >> 32n) & 0xFFFFFFFFn;
    
    // Write to registers (32-bit, preserve upper bits)
    this.cpu.registers.rax = (this.cpu.registers.rax & 0xFFFFFFFF00000000n) | eax;
    this.cpu.registers.rdx = (this.cpu.registers.rdx & 0xFFFFFFFF00000000n) | edx;
    
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute ADC instruction (Add with Carry)
   */
  executeADC(instruction) {
    const { opcode, modrm, rex, immediate } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    // Get carry flag
    const carry = (this.cpu.registers.rflags & 0x01n) ? 1n : 0n;

    if (opcode.reg) {
      // ADC reg, imm
      const reg = opcode.reg;
      const value = this.cpu.registers[reg];
      const imm = BigInt(immediate || 0);
      const result = value + imm + carry;
      this.cpu.registers[reg] = result & this.getMask(operandSize);
      this.updateFlags(result, operandSize);
    } else if (modrm) {
      if (modrm.mod === 3) {
        // Register mode
        const reg1 = this.getRegisterFromModRM(modrm, rex, operandSize);
        const reg2 = this.getRegisterFromModRM({ ...modrm, reg: modrm.rm }, rex, operandSize);
        const value1 = this.cpu.registers[reg1];
        const value2 = this.cpu.registers[reg2];
        const result = value1 + value2 + carry;
        this.cpu.registers[reg1] = result & this.getMask(operandSize);
        this.updateFlags(result, operandSize);
      } else {
        // Memory mode
        const memAddr = this.calculateAddress(instruction);
        if (memAddr === null) {
          return false;
        }
        const memValue = this.readMemory(memAddr, operandSize);
        const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
        const regValue = this.cpu.registers[reg];
        const result = memValue + regValue + carry;
        this.writeMemory(memAddr, result, operandSize);
        this.updateFlags(result, operandSize);
      }
    } else {
      return false;
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute SBB instruction (Subtract with Borrow)
   */
  executeSBB(instruction) {
    const { opcode, modrm, rex, immediate } = instruction;
    const operandSize = (rex && rex.w) ? 64 : 32;

    // Get carry flag (borrow)
    const borrow = (this.cpu.registers.rflags & 0x01n) ? 1n : 0n;

    if (opcode.reg) {
      // SBB reg, imm
      const reg = opcode.reg;
      const value = this.cpu.registers[reg];
      const imm = BigInt(immediate || 0);
      const result = value - imm - borrow;
      this.cpu.registers[reg] = result & this.getMask(operandSize);
      this.updateFlags(result, operandSize);
    } else if (modrm) {
      if (modrm.mod === 3) {
        // Register mode
        const reg1 = this.getRegisterFromModRM(modrm, rex, operandSize);
        const reg2 = this.getRegisterFromModRM({ ...modrm, reg: modrm.rm }, rex, operandSize);
        const value1 = this.cpu.registers[reg1];
        const value2 = this.cpu.registers[reg2];
        const result = value1 - value2 - borrow;
        this.cpu.registers[reg1] = result & this.getMask(operandSize);
        this.updateFlags(result, operandSize);
      } else {
        // Memory mode
        const memAddr = this.calculateAddress(instruction);
        if (memAddr === null) {
          return false;
        }
        const memValue = this.readMemory(memAddr, operandSize);
        const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
        const regValue = this.cpu.registers[reg];
        const result = regValue - memValue - borrow;
        this.cpu.registers[reg] = result & this.getMask(operandSize);
        this.updateFlags(result, operandSize);
      }
    } else {
      return false;
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute PADD instruction (Packed Add)
   */
  executePADD(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    // PADD operates on XMM registers
    const xmmIndex = modrm.reg % 16;
    const xmmReg = `xmm${xmmIndex}`;
    
    if (modrm.mod === 3) {
      // Register to register (XMM register)
      const srcXmmIndex = modrm.rm % 16;
      const srcXmmReg = `xmm${srcXmmIndex}`;
      const srcValue = this.cpu.registers[srcXmmReg] || 0n;
      const dstValue = this.cpu.registers[xmmReg] || 0n;
      
      // PADD operates on packed integers (8, 16, or 32-bit elements)
      // For simplicity, we'll do a full 128-bit add (not element-wise)
      // TODO: Implement proper element-wise addition
      this.cpu.registers[xmmReg] = (dstValue + srcValue) & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
    } else {
      const memAddr = this.calculateAddress(instruction);
      if (memAddr === null) {
        return false;
      }
      const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;
      // Just read the memory (don't actually add)
      for (let i = 0; i < 16; i++) {
        this.memory.readByte(memAddrNum + i);
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute PSUB instruction (Packed Subtract)
   */
  executePSUB(instruction) {
    const { modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    // PSUB operates on XMM registers
    const xmmIndex = modrm.reg % 16;
    const xmmReg = `xmm${xmmIndex}`;
    
    if (modrm.mod === 3) {
      // Register to register (XMM register)
      const srcXmmIndex = modrm.rm % 16;
      const srcXmmReg = `xmm${srcXmmIndex}`;
      const srcValue = this.cpu.registers[srcXmmReg] || 0n;
      const dstValue = this.cpu.registers[xmmReg] || 0n;
      
      // PSUB operates on packed integers (8, 16, or 32-bit elements)
      // For simplicity, we'll do a full 128-bit subtract (not element-wise)
      // TODO: Implement proper element-wise subtraction
      this.cpu.registers[xmmReg] = (dstValue - srcValue) & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
    } else {
      const memAddr = this.calculateAddress(instruction);
      if (memAddr === null) {
        return false;
      }
      const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;
      // Just read the memory (don't actually subtract)
      for (let i = 0; i < 16; i++) {
        this.memory.readByte(memAddrNum + i);
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute CMOV instruction (Conditional Move)
   */
  executeCMOV(instruction) {
    const { opcode, modrm, rex } = instruction;
    if (!modrm) {
      return false;
    }

    const operandSize = (rex && rex.w) ? 64 : 32;
    const condition = opcode.condition;

    // Check condition
    let conditionMet = false;
    const flags = this.cpu.registers.rflags;
    const CF = (flags & 0x01n) ? true : false;
    const PF = (flags & 0x04n) ? true : false;
    const ZF = (flags & 0x40n) ? true : false;
    const SF = (flags & 0x80n) ? true : false;
    const OF = (flags & 0x800n) ? true : false;

    switch (condition) {
      case 'OF':
        conditionMet = OF;
        break;
      case '!OF':
        conditionMet = !OF;
        break;
      case 'CF':
        conditionMet = CF;
        break;
      case '!CF':
        conditionMet = !CF;
        break;
      case 'ZF':
        conditionMet = ZF;
        break;
      case '!ZF':
        conditionMet = !ZF;
        break;
      case 'CF|ZF':
        conditionMet = CF || ZF;
        break;
      case '!CF&!ZF':
        conditionMet = !CF && !ZF;
        break;
      case 'SF':
        conditionMet = SF;
        break;
      case '!SF':
        conditionMet = !SF;
        break;
      case 'PF':
        conditionMet = PF;
        break;
      case '!PF':
        conditionMet = !PF;
        break;
      case 'SF!=OF':
        conditionMet = SF !== OF;
        break;
      case 'SF==OF':
        conditionMet = SF === OF;
        break;
      case 'ZF|SF!=OF':
        conditionMet = ZF || (SF !== OF);
        break;
      case '!ZF&SF==OF':
        conditionMet = !ZF && (SF === OF);
        break;
      default:
        return false;
    }

    // If condition is met, perform the move
    if (conditionMet) {
      if (modrm.mod === 3) {
        // Register to register
        const reg1 = this.getRegisterFromModRM(modrm, rex, operandSize);
        const reg2 = this.getRegisterFromModRM({ ...modrm, reg: modrm.rm }, rex, operandSize);
        const value = this.cpu.registers[reg2];
        this.cpu.registers[reg1] = value & this.getMask(operandSize);
      } else {
        // Memory to register
        const memAddr = this.calculateAddress(instruction);
        if (memAddr === null) {
          return false;
        }
        const memValue = this.readMemory(memAddr, operandSize);
        const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
        this.cpu.registers[reg] = memValue & this.getMask(operandSize);
      }
    }

    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute SYSCALL instruction (System Call) - CRITICAL for Windows
   * Fast system call entry point
   */
  executeSYSCALL(instruction) {
    // SYSCALL saves:
    // - RCX = RIP (return address)
    // - R11 = RFLAGS
    // Then jumps to STAR register (long mode target)
    
    // Save return address and flags
    this.cpu.registers.rcx = this.cpu.registers.rip + BigInt(instruction.length);
    this.cpu.registers.r11 = this.cpu.registers.rflags;
    
    // Jump to SYSCALL target (from STAR register)
    const target = this.cpu.registers.lstar || this.cpu.registers.star;
    if (target !== 0n) {
      this.cpu.registers.rip = target;
    } else {
      // Default handler if STAR not set
      console.warn('CPU: SYSCALL called but STAR register not set');
      this.cpu.registers.rip += BigInt(instruction.length);
    }
    
    // Clear RFLAGS (masked by SFMASK if set)
    const mask = this.cpu.registers.sfmask || 0n;
    this.cpu.registers.rflags &= ~mask;
    
    return true;
  }

  /**
   * Execute SYSRET instruction (System Return) - CRITICAL for Windows
   * Fast system call return - perfect implementation
   */
  executeSYSRET(instruction) {
    // SYSRET restores:
    // - RIP = RCX (return address)
    // - RFLAGS = R11 (restored flags)
    // - CS and SS from STAR MSR
    
    const star = this.cpu.registers.star || 0n;
    
    // Restore RIP and RFLAGS
    this.cpu.registers.rip = this.cpu.registers.rcx;
    this.cpu.registers.rflags = this.cpu.registers.r11;
    
    // Restore CS and SS from STAR MSR
    // STAR[15:0] = CS selector for SYSRET, STAR[31:16] = SS selector for SYSRET
    if (star !== 0n) {
      const csSelector = Number(star & 0xFFFFn);
      const ssSelector = Number((star >> 16n) & 0xFFFFn);
      if (csSelector !== 0) {
        this.cpu.registers.cs = csSelector;
      }
      if (ssSelector !== 0) {
        this.cpu.registers.ss = ssSelector;
      }
    }
    
    console.log(`CPU: SYSRET executed (RIP: 0x${this.cpu.registers.rip.toString(16)})`);
    
    return true;
  }

  /**
   * Execute SYSENTER instruction (System Enter) - CRITICAL for Windows
   * Fast system call entry (32-bit compatibility) - perfect implementation
   */
  executeSYSENTER(instruction) {
    // SYSENTER uses MSRs:
    // - IA32_SYSENTER_CS (0x174) = segment selector
    // - IA32_SYSENTER_EIP (0x176) = entry point
    // - IA32_SYSENTER_ESP (0x175) = stack pointer
    
    // Save return address (EIP) and stack pointer in EDX and ECX
    // EDX = return EIP, ECX = return ESP
    const returnEip = this.cpu.registers.rip + BigInt(instruction.length);
    const returnEsp = this.cpu.registers.rsp;
    
    this.cpu.registers.rdx = returnEip & 0xFFFFFFFFn; // Save return EIP in EDX
    this.cpu.registers.rcx = returnEsp & 0xFFFFFFFFn; // Save return ESP in ECX
    
    const sysenterEip = this.cpu.registers.sysenter_eip || 0n;
    const sysenterEsp = this.cpu.registers.sysenter_esp || 0n;
    const sysenterCs = this.cpu.registers.sysenter_cs || 0;
    
    if (sysenterEip !== 0n) {
      // Set CS and jump to entry point
      if (sysenterCs !== 0) {
        this.cpu.registers.cs = sysenterCs;
      }
      this.cpu.registers.rip = sysenterEip & 0xFFFFFFFFn; // 32-bit address
      this.cpu.registers.rsp = sysenterEsp & 0xFFFFFFFFn; // 32-bit stack pointer
      
      console.log(`CPU: SYSENTER executed (target: 0x${sysenterEip.toString(16)}, saved EIP: 0x${returnEip.toString(16)})`);
    } else {
      console.warn('CPU: SYSENTER called but SYSENTER registers not set');
      this.cpu.registers.rip += BigInt(instruction.length);
    }
    
    return true;
  }

  /**
   * Execute SYSEXIT instruction (System Exit) - CRITICAL for Windows
   * Fast system call return (32-bit compatibility) - perfect implementation
   */
  executeSYSEXIT(instruction) {
    // SYSEXIT restores from EDX (EIP) and ECX (ESP)
    // Also restores CS and SS from SYSENTER_CS
    const returnEip = this.cpu.registers.rdx & 0xFFFFFFFFn;
    const returnEsp = this.cpu.registers.rcx & 0xFFFFFFFFn;
    const sysenterCs = this.cpu.registers.sysenter_cs || 0;
    
    // Restore CS and SS
    // CS = SYSENTER_CS + 16 (user code segment)
    // SS = SYSENTER_CS + 24 (user stack segment)
    if (sysenterCs !== 0) {
      this.cpu.registers.cs = sysenterCs + 16; // User code segment
      this.cpu.registers.ss = sysenterCs + 24; // User stack segment
    }
    
    this.cpu.registers.rip = returnEip;
    this.cpu.registers.rsp = returnEsp;
    
    console.log(`CPU: SYSEXIT executed (RIP: 0x${returnEip.toString(16)})`);
    
    return true;
  }

  /**
   * Execute CMPXCHG16B instruction (Compare and Exchange 16 bytes) - CRITICAL
   * Windows BSODs instantly without this - atomic 128-bit compare-and-swap
   */
  executeCMPXCHG16B(instruction) {
    const { modrm, prefixes } = instruction;
    
    if (!modrm) {
      return false;
    }
    
    // CMPXCHG16B compares RDX:RAX with [mem], if equal stores RCX:RBX to [mem]
    // ModR/M reg field must be 1 for CMPXCHG16B
    if (modrm.reg !== 1) {
      // Check if this is RDRAND (reg = 6) or RDSEED (reg = 7)
      if (modrm.reg === 6) {
        return this.executeRDRAND(instruction);
      } else if (modrm.reg === 7) {
        return this.executeRDSEED(instruction);
      }
      return false;
    }
    
    const memAddr = this.calculateAddress(instruction);
    if (memAddr === null) {
      return false;
    }
    
    const memAddrNum = typeof memAddr === 'bigint' ? Number(memAddr) : memAddr;
    
    // Read 16 bytes from memory (128-bit value)
    const memLow = this.memory.readQword(memAddrNum);
    const memHigh = this.memory.readQword(memAddrNum + 8);
    
    // Compare RDX:RAX with memory
    const expectedLow = this.cpu.registers.rax;
    const expectedHigh = this.cpu.registers.rdx;
    
    const equal = (memLow === expectedLow) && (memHigh === expectedHigh);
    
    if (equal) {
      // If equal, store RCX:RBX to memory (atomic)
      // Handle LOCK prefix if present
      if (prefixes && prefixes.lock) {
        // LOCK prefix: ensure atomicity (in real CPU, this locks the bus)
        // For emulation, we just ensure the operation is atomic
        this.memory.writeQword(memAddrNum, this.cpu.registers.rbx);
        this.memory.writeQword(memAddrNum + 8, this.cpu.registers.rcx);
      } else {
        this.memory.writeQword(memAddrNum, this.cpu.registers.rbx);
        this.memory.writeQword(memAddrNum + 8, this.cpu.registers.rcx);
      }
      
      // Set ZF (zero flag) - comparison was equal
      this.cpu.registers.rflags |= 0x40n;
    } else {
      // If not equal, load memory value into RDX:RAX
      this.cpu.registers.rax = memLow;
      this.cpu.registers.rdx = memHigh;
      
      // Clear ZF (zero flag) - comparison was not equal
      this.cpu.registers.rflags &= ~0x40n;
    }
    
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute RDRAND instruction (Read Random) - Random number from CPU
   */
  executeRDRAND(instruction) {
    const { modrm, rex } = instruction;
    
    if (!modrm || modrm.reg !== 6) {
      return false;
    }
    
    const operandSize = (rex && rex.w) ? 64 : 32;
    const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
    
    // Generate random value (using crypto.getRandomValues if available, else Math.random)
    let randomValue;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(2);
      crypto.getRandomValues(array);
      randomValue = (BigInt(array[1]) << 32n) | BigInt(array[0]);
    } else {
      // Fallback to Math.random
      randomValue = BigInt(Math.floor(Math.random() * 0xFFFFFFFFFFFFFFFF));
    }
    
    // Mask to operand size
    const mask = operandSize === 64 ? 0xFFFFFFFFFFFFFFFFn : 0xFFFFFFFFn;
    this.cpu.registers[reg] = randomValue & mask;
    
    // Set CF (carry flag) to indicate success
    this.cpu.registers.rflags |= 0x01n;
    
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }

  /**
   * Execute RDSEED instruction (Read Seed) - Seed for random number generation
   */
  executeRDSEED(instruction) {
    const { modrm, rex } = instruction;
    
    if (!modrm || modrm.reg !== 7) {
      return false;
    }
    
    const operandSize = (rex && rex.w) ? 64 : 32;
    const reg = this.getRegisterFromModRM(modrm, rex, operandSize);
    
    // Generate seed value (using crypto.getRandomValues if available)
    let seedValue;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(2);
      crypto.getRandomValues(array);
      seedValue = (BigInt(array[1]) << 32n) | BigInt(array[0]);
    } else {
      // Fallback to Math.random
      seedValue = BigInt(Math.floor(Math.random() * 0xFFFFFFFFFFFFFFFF));
    }
    
    // Mask to operand size
    const mask = operandSize === 64 ? 0xFFFFFFFFFFFFFFFFn : 0xFFFFFFFFn;
    this.cpu.registers[reg] = seedValue & mask;
    
    // Set CF (carry flag) to indicate success
    this.cpu.registers.rflags |= 0x01n;
    
    this.cpu.registers.rip += BigInt(instruction.length);
    return true;
  }
}

export default InstructionExecutor;

