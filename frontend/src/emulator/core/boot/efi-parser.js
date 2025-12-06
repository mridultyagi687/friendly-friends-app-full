/**
 * EFI File Parser (PE/COFF Format)
 * 
 * Parses EFI executables (PE32+ format) for Windows 11 boot
 */

class EFIParser {
  constructor(memory) {
    this.memory = memory;
  }

  /**
   * Parse EFI executable file
   * @param {Uint8Array} efiData - EFI file data
   * @returns {Object} - Parsed EFI file information
   */
  parse(efiData) {
    console.log(`EFI Parser: Parsing EFI file (${efiData.length} bytes)`);

    // Parse DOS header
    const dosHeader = this.parseDOSHeader(efiData);
    if (!dosHeader) {
      throw new Error('Invalid DOS header');
    }

    // Get PE header offset
    const peOffset = dosHeader.e_lfanew;
    if (peOffset >= efiData.length) {
      throw new Error('Invalid PE header offset');
    }

    // Check PE signature
    const peSignature = this.readDword(efiData, peOffset);
    if (peSignature !== 0x00004550) { // "PE\0\0"
      throw new Error('Invalid PE signature');
    }

    // Parse PE header
    const peHeader = this.parsePEHeader(efiData, peOffset);
    
    // Parse section headers
    const sections = this.parseSectionHeaders(efiData, peOffset, peHeader);

    // Extract code sections
    const codeSections = sections.filter(s => 
      (s.characteristics & 0x20000000) !== 0 // IMAGE_SCN_CNT_CODE
    );

    // Find entry point
    const entryPoint = peHeader.optionalHeader.addressOfEntryPoint;

    return {
      dosHeader,
      peHeader,
      sections,
      codeSections,
      entryPoint,
      imageBase: peHeader.optionalHeader.imageBase,
      sizeOfImage: peHeader.optionalHeader.sizeOfImage,
    };
  }

  /**
   * Parse DOS header
   */
  parseDOSHeader(data) {
    if (data.length < 64) {
      return null;
    }

    // Check DOS signature
    const dosSignature = this.readWord(data, 0);
    if (dosSignature !== 0x5A4D) { // "MZ"
      return null;
    }

    return {
      e_magic: dosSignature,
      e_lfanew: this.readDword(data, 60), // Offset to PE header
    };
  }

  /**
   * Parse PE header
   */
  parsePEHeader(data, offset) {
    const peHeader = {
      signature: this.readDword(data, offset),
      machine: this.readWord(data, offset + 4),
      numberOfSections: this.readWord(data, offset + 6),
      timeDateStamp: this.readDword(data, offset + 8),
      pointerToSymbolTable: this.readDword(data, offset + 12),
      numberOfSymbols: this.readDword(data, offset + 16),
      sizeOfOptionalHeader: this.readWord(data, offset + 20),
      characteristics: this.readWord(data, offset + 22),
    };

    // Parse optional header (PE32+ for 64-bit)
    const optionalHeaderOffset = offset + 24;
    const optionalHeader = this.parseOptionalHeader(data, optionalHeaderOffset, peHeader.sizeOfOptionalHeader);

    return {
      ...peHeader,
      optionalHeader,
    };
  }

  /**
   * Parse optional header (PE32+ format for 64-bit)
   */
  parseOptionalHeader(data, offset, size) {
    const magic = this.readWord(data, offset);
    if (magic !== 0x20B) { // PE32+ (0x20B)
      throw new Error('Not a PE32+ file (expected 64-bit EFI)');
    }

    return {
      magic,
      majorLinkerVersion: data[offset + 2],
      minorLinkerVersion: data[offset + 3],
      sizeOfCode: this.readQword(data, offset + 4),
      sizeOfInitializedData: this.readQword(data, offset + 12),
      sizeOfUninitializedData: this.readQword(data, offset + 20),
      addressOfEntryPoint: this.readDword(data, offset + 28),
      baseOfCode: this.readDword(data, offset + 32),
      imageBase: this.readQword(data, offset + 36),
      sectionAlignment: this.readDword(data, offset + 44),
      fileAlignment: this.readDword(data, offset + 48),
      majorOperatingSystemVersion: this.readWord(data, offset + 52),
      minorOperatingSystemVersion: this.readWord(data, offset + 54),
      majorImageVersion: this.readWord(data, offset + 56),
      minorImageVersion: this.readWord(data, offset + 58),
      majorSubsystemVersion: this.readWord(data, offset + 60),
      minorSubsystemVersion: this.readWord(data, offset + 62),
      win32VersionValue: this.readDword(data, offset + 64),
      sizeOfImage: this.readDword(data, offset + 68),
      sizeOfHeaders: this.readDword(data, offset + 72),
      checkSum: this.readDword(data, offset + 76),
      subsystem: this.readWord(data, offset + 78),
      dllCharacteristics: this.readWord(data, offset + 80),
      sizeOfStackReserve: this.readQword(data, offset + 82),
      sizeOfStackCommit: this.readQword(data, offset + 90),
      sizeOfHeapReserve: this.readQword(data, offset + 98),
      sizeOfHeapCommit: this.readQword(data, offset + 106),
      loaderFlags: this.readDword(data, offset + 114),
      numberOfRvaAndSizes: this.readDword(data, offset + 118),
    };
  }

  /**
   * Parse section headers
   */
  parseSectionHeaders(data, peOffset, peHeader) {
    const sections = [];
    const sectionHeaderOffset = peOffset + 24 + peHeader.sizeOfOptionalHeader;

    for (let i = 0; i < peHeader.numberOfSections; i++) {
      const offset = sectionHeaderOffset + (i * 40);
      
      // Read section name (8 bytes, null-terminated)
      let name = '';
      for (let j = 0; j < 8; j++) {
        const byte = data[offset + j];
        if (byte === 0) break;
        name += String.fromCharCode(byte);
      }

      const section = {
        name: name.trim(),
        virtualSize: this.readDword(data, offset + 8),
        virtualAddress: this.readDword(data, offset + 12),
        sizeOfRawData: this.readDword(data, offset + 16),
        pointerToRawData: this.readDword(data, offset + 20),
        pointerToRelocations: this.readDword(data, offset + 24),
        pointerToLineNumbers: this.readDword(data, offset + 28),
        numberOfRelocations: this.readWord(data, offset + 32),
        numberOfLineNumbers: this.readWord(data, offset + 34),
        characteristics: this.readDword(data, offset + 36),
      };

      sections.push(section);
    }

    return sections;
  }

  /**
   * Load EFI file into memory
   * @param {Uint8Array} efiData - EFI file data
   * @param {number} loadAddress - Address to load at
   * @returns {Object} - Load information including entry point
   */
  loadIntoMemory(efiData, loadAddress = 0x1000000) {
    const parsed = this.parse(efiData);
    
    console.log(`EFI Parser: Loading EFI file at 0x${loadAddress.toString(16)}`);
    console.log(`EFI Parser: Entry point: 0x${parsed.entryPoint.toString(16)}`);
    console.log(`EFI Parser: Image base: 0x${parsed.imageBase.toString(16)}`);
    console.log(`EFI Parser: Size of image: ${parsed.sizeOfImage} bytes`);

    // Calculate load offset (difference between image base and load address)
    const loadOffset = loadAddress - Number(parsed.imageBase);

    // Load sections into memory
    for (const section of parsed.sections) {
      if (section.sizeOfRawData === 0) {
        continue; // Skip empty sections
      }

      const sectionLoadAddress = loadAddress + section.virtualAddress;
      const sectionData = efiData.slice(
        section.pointerToRawData,
        section.pointerToRawData + section.sizeOfRawData
      );

      // Write section to memory
      for (let i = 0; i < sectionData.length; i++) {
        this.memory.writeByte(sectionLoadAddress + i, sectionData[i]);
      }

      console.log(`EFI Parser: Loaded section ${section.name} at 0x${sectionLoadAddress.toString(16)} (${sectionData.length} bytes)`);
    }

    // Handle relocations
    this.handleRelocations(efiData, parsed, loadAddress, loadOffset);

    // Calculate actual entry point
    const actualEntryPoint = loadAddress + parsed.entryPoint;

    return {
      entryPoint: actualEntryPoint,
      loadAddress,
      imageBase: parsed.imageBase,
      sizeOfImage: parsed.sizeOfImage,
      sections: parsed.sections,
    };
  }

  /**
   * Handle relocations (simplified)
   */
  handleRelocations(efiData, parsed, loadAddress, loadOffset) {
    // Find relocation section (.reloc)
    const relocSection = parsed.sections.find(s => 
      s.name === '.reloc' || s.name.startsWith('.reloc')
    );

    if (!relocSection || relocSection.sizeOfRawData === 0) {
      console.log('EFI Parser: No relocation section found');
      return;
    }

    console.log(`EFI Parser: Processing relocations (${relocSection.sizeOfRawData} bytes)`);

    // Parse relocation blocks
    let offset = relocSection.pointerToRawData;
    const endOffset = offset + relocSection.sizeOfRawData;

    while (offset < endOffset) {
      const pageRVA = this.readDword(efiData, offset);
      const blockSize = this.readDword(efiData, offset + 4);

      if (pageRVA === 0 && blockSize === 0) {
        break; // End of relocations
      }

      // Process relocation entries in this block
      const entryCount = (blockSize - 8) / 2;
      for (let i = 0; i < entryCount; i++) {
        const entryOffset = offset + 8 + (i * 2);
        const entry = this.readWord(efiData, entryOffset);
        
        const type = entry >> 12;
        const rva = pageRVA + (entry & 0x0FFF);

        if (type === 10) { // IMAGE_REL_BASED_DIR64
          // 64-bit address relocation
          const relocAddress = loadAddress + rva;
          const currentValue = this.memory.readQword(relocAddress);
          const newValue = currentValue + BigInt(loadOffset);
          this.memory.writeQword(relocAddress, newValue);
        } else if (type === 3) { // IMAGE_REL_BASED_HIGHLOW
          // 32-bit address relocation
          const relocAddress = loadAddress + rva;
          const currentValue = this.memory.readDword(relocAddress);
          const newValue = currentValue + loadOffset;
          this.memory.writeDword(relocAddress, newValue);
        }
      }

      offset += blockSize;
    }

    console.log('EFI Parser: Relocations processed');
  }

  /**
   * Helper: Read 16-bit word (little-endian)
   */
  readWord(data, offset) {
    return data[offset] | (data[offset + 1] << 8);
  }

  /**
   * Helper: Read 32-bit dword (little-endian)
   */
  readDword(data, offset) {
    return data[offset] |
           (data[offset + 1] << 8) |
           (data[offset + 2] << 16) |
           (data[offset + 3] << 24);
  }

  /**
   * Helper: Read 64-bit qword (little-endian)
   */
  readQword(data, offset) {
    const low = this.readDword(data, offset);
    const high = this.readDword(data, offset + 4);
    return BigInt(low) | (BigInt(high) << 32n);
  }
}

export default EFIParser;

