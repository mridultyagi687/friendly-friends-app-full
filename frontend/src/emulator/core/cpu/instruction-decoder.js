/**
 * x86-64 Instruction Decoder
 * 
 * Decodes x86-64 instructions from binary format
 */

class InstructionDecoder {
  constructor(cpu, memory) {
    this.cpu = cpu;
    this.memory = memory;
  }

  /**
   * Decode instruction at current RIP
   * @returns {Object|null} - Decoded instruction or null
   */
  decode() {
    const rip = Number(this.cpu.registers.rip);
    const instructionBytes = this.readInstructionBytes(rip);
    
    if (!instructionBytes || instructionBytes.length === 0) {
      return null;
    }

    // Parse instruction prefix bytes
    let offset = 0;
    const prefixes = this.parsePrefixes(instructionBytes, offset);
    offset = prefixes.offset;

    // Parse REX prefix (x86-64)
    const rex = this.parseREX(instructionBytes, offset);
    if (rex.present) {
      offset++;
    }

    // Parse opcode
    const opcode = this.parseOpcode(instructionBytes, offset);
    offset += opcode.length;

    // Parse ModR/M and SIB if needed
    let modrm = null;
    let sib = null;
    if (opcode.needsModRM) {
      modrm = this.parseModRM(instructionBytes, offset);
      offset++;
      
      if (modrm.needsSIB) {
        sib = this.parseSIB(instructionBytes, offset);
        offset++;
      }
    }

    // Parse immediate/displacement if needed
    let immediate = null;
    let displacement = null;
    if (opcode.hasImmediate) {
      immediate = this.readImmediate(instructionBytes, offset, opcode.immediateSize);
      offset += opcode.immediateSize;
    }
    if (modrm && modrm.hasDisplacement) {
      displacement = this.readDisplacement(instructionBytes, offset, modrm.displacementSize);
      offset += modrm.displacementSize;
    }

    return {
      prefixes,
      rex,
      opcode,
      modrm,
      sib,
      immediate,
      displacement,
      length: offset,
      bytes: instructionBytes.slice(0, offset),
    };
  }

  /**
   * Read instruction bytes from memory
   */
  readInstructionBytes(address) {
    const bytes = [];
    // Read up to 15 bytes (max x86-64 instruction length)
    for (let i = 0; i < 15; i++) {
      try {
        bytes.push(this.memory.readByte(address + i));
      } catch (e) {
        break;
      }
    }
    return bytes.length > 0 ? new Uint8Array(bytes) : null;
  }

  /**
   * Parse instruction prefixes
   */
  parsePrefixes(bytes, offset) {
    const prefixes = {
      lock: false,
      rep: null, // null, 'rep', 'repe', 'repne'
      segment: null, // 'cs', 'ds', 'es', 'fs', 'gs', 'ss'
      operandSize: false, // 0x66
      addressSize: false, // 0x67
    };

    while (offset < bytes.length) {
      const byte = bytes[offset];
      
      if (byte === 0xF0) {
        prefixes.lock = true;
      } else if (byte === 0xF3) {
        prefixes.rep = 'rep';
      } else if (byte === 0xF2) {
        prefixes.rep = 'repne';
      } else if (byte === 0x2E) {
        prefixes.segment = 'cs';
      } else if (byte === 0x3E) {
        prefixes.segment = 'ds';
      } else if (byte === 0x26) {
        prefixes.segment = 'es';
      } else if (byte === 0x64) {
        prefixes.segment = 'fs';
      } else if (byte === 0x65) {
        prefixes.segment = 'gs';
      } else if (byte === 0x36) {
        prefixes.segment = 'ss';
      } else if (byte === 0x66) {
        prefixes.operandSize = true;
      } else if (byte === 0x67) {
        prefixes.addressSize = true;
      } else {
        break; // Not a prefix
      }
      
      offset++;
    }

    return { ...prefixes, offset };
  }

  /**
   * Parse REX prefix
   */
  parseREX(bytes, offset) {
    if (offset >= bytes.length) {
      return { present: false };
    }

    const byte = bytes[offset];
    if ((byte & 0xF0) === 0x40) {
      return {
        present: true,
        w: (byte & 0x08) !== 0, // 64-bit operand size
        r: (byte & 0x04) !== 0, // Extension of ModR/M reg field
        x: (byte & 0x02) !== 0, // Extension of SIB index field
        b: (byte & 0x01) !== 0, // Extension of ModR/M r/m or SIB base
      };
    }

    return { present: false };
  }

  /**
   * Parse opcode
   */
  parseOpcode(bytes, offset) {
    if (offset >= bytes.length) {
      return { mnemonic: 'UNKNOWN', length: 0, needsModRM: false, hasImmediate: false };
    }

    const firstByte = bytes[offset];
    
    // Handle multi-byte opcodes (0x0F prefix)
    if (firstByte === 0x0F && offset + 1 < bytes.length) {
      return this.parseTwoByteOpcode(bytes, offset);
    }

    // Single-byte opcodes
    return this.parseSingleByteOpcode(firstByte, offset);
  }

  /**
   * Parse single-byte opcode
   */
  parseSingleByteOpcode(byte, offset) {
    const opcodes = {
      0x90: { mnemonic: 'NOP', length: 1, needsModRM: false, hasImmediate: false },
      0xC3: { mnemonic: 'RET', length: 1, needsModRM: false, hasImmediate: false },
      0x48: { mnemonic: 'DEC', length: 1, needsModRM: true, hasImmediate: false }, // REX.W prefix
      0x89: { mnemonic: 'MOV', length: 1, needsModRM: true, hasImmediate: false, rToM: true },
      0x8B: { mnemonic: 'MOV', length: 1, needsModRM: true, hasImmediate: false, mToR: true },
      0xB8: { mnemonic: 'MOV', length: 1, needsModRM: false, hasImmediate: true, immediateSize: 4, reg: 'rax' },
      0xB9: { mnemonic: 'MOV', length: 1, needsModRM: false, hasImmediate: true, immediateSize: 4, reg: 'rcx' },
      0xBA: { mnemonic: 'MOV', length: 1, needsModRM: false, hasImmediate: true, immediateSize: 4, reg: 'rdx' },
      0xBB: { mnemonic: 'MOV', length: 1, needsModRM: false, hasImmediate: true, immediateSize: 4, reg: 'rbx' },
      0x50: { mnemonic: 'PUSH', length: 1, needsModRM: false, hasImmediate: false, reg: 'rax' },
      0x51: { mnemonic: 'PUSH', length: 1, needsModRM: false, hasImmediate: false, reg: 'rcx' },
      0x58: { mnemonic: 'POP', length: 1, needsModRM: false, hasImmediate: false, reg: 'rax' },
      0x59: { mnemonic: 'POP', length: 1, needsModRM: false, hasImmediate: false, reg: 'rcx' },
      0xE9: { mnemonic: 'JMP', length: 1, needsModRM: false, hasImmediate: true, immediateSize: 4, relative: true },
      0xEB: { mnemonic: 'JMP', length: 1, needsModRM: false, hasImmediate: true, immediateSize: 1, relative: true },
      0xE8: { mnemonic: 'CALL', length: 1, needsModRM: false, hasImmediate: true, immediateSize: 4, relative: true },
      0x03: { mnemonic: 'ADD', length: 1, needsModRM: true, hasImmediate: false, mToR: true },
      0x29: { mnemonic: 'SUB', length: 1, needsModRM: true, hasImmediate: false, rToM: true },
    };

    const opcode = opcodes[byte];
    if (opcode) {
      return { ...opcode, offset };
    }

    // Unknown opcode
    return {
      mnemonic: 'UNKNOWN',
      length: 1,
      needsModRM: false,
      hasImmediate: false,
      offset,
      byte: byte.toString(16),
    };
  }

  /**
   * Parse two-byte opcode (0x0F prefix)
   */
  parseTwoByteOpcode(bytes, offset) {
    if (offset + 1 >= bytes.length) {
      return { mnemonic: 'UNKNOWN', length: 2, needsModRM: false, hasImmediate: false };
    }

    const secondByte = bytes[offset + 1];
    const twoByteOpcodes = {
      0x84: { mnemonic: 'JZ', length: 2, needsModRM: false, hasImmediate: true, immediateSize: 4, relative: true },
      0x85: { mnemonic: 'JNZ', length: 2, needsModRM: false, hasImmediate: true, immediateSize: 4, relative: true },
    };

    const opcode = twoByteOpcodes[secondByte];
    if (opcode) {
      return { ...opcode, offset };
    }

    return { mnemonic: 'UNKNOWN', length: 2, needsModRM: false, hasImmediate: false, offset };
  }

  /**
   * Parse ModR/M byte
   */
  parseModRM(bytes, offset) {
    if (offset >= bytes.length) {
      return null;
    }

    const byte = bytes[offset];
    const mod = (byte >> 6) & 0x03;
    const reg = (byte >> 3) & 0x07;
    const rm = byte & 0x07;

    return {
      mod,
      reg,
      rm,
      needsSIB: mod !== 3 && rm === 4,
      hasDisplacement: mod === 1 || mod === 2 || (mod === 0 && rm === 5),
      displacementSize: mod === 1 ? 1 : mod === 2 ? 4 : 0,
    };
  }

  /**
   * Parse SIB byte
   */
  parseSIB(bytes, offset) {
    if (offset >= bytes.length) {
      return null;
    }

    const byte = bytes[offset];
    const scale = (byte >> 6) & 0x03;
    const index = (byte >> 3) & 0x07;
    const base = byte & 0x07;

    return {
      scale: 1 << scale, // 1, 2, 4, or 8
      index,
      base,
    };
  }

  /**
   * Read immediate value
   */
  readImmediate(bytes, offset, size) {
    if (offset + size > bytes.length) {
      return null;
    }

    let value = 0;
    for (let i = 0; i < size; i++) {
      value |= bytes[offset + i] << (i * 8);
    }

    // Sign extend if needed
    if (size === 1 && (value & 0x80)) {
      value |= 0xFFFFFF00;
    } else if (size === 2 && (value & 0x8000)) {
      value |= 0xFFFF0000;
    }

    return value;
  }

  /**
   * Read displacement value
   */
  readDisplacement(bytes, offset, size) {
    return this.readImmediate(bytes, offset, size);
  }

  /**
   * Get register name from ModR/M field
   */
  getRegisterName(regField, rex, operandSize) {
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

    const index = rex ? (rex.r ? 8 : 0) + regField : regField;
    const sizeIndex = operandSize === 64 ? 3 : operandSize === 32 ? 2 : operandSize === 16 ? 1 : 0;
    
    return regMap[index % 8][sizeIndex];
  }
}

export default InstructionDecoder;

