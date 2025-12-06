/**
 * ACPI (Advanced Configuration and Power Interface) Tables
 * 
 * Provides ACPI tables required for Windows 11 boot
 * ACPI tables describe hardware configuration to the OS
 */

class ACPITables {
  constructor(memory) {
    this.memory = memory;
    this.tables = {};
    this.rsdpAddress = 0xE0000; // Standard RSDP location
  }

  /**
   * Initialize ACPI tables
   */
  init() {
    console.log('ACPI: Initializing tables...');
    
    // Create RSDP (Root System Description Pointer)
    this.createRSDP();
    
    // Create RSDT (Root System Description Table)
    this.createRSDT();
    
    // Create FADT (Fixed ACPI Description Table)
    this.createFADT();
    
    // Create DSDT (Differentiated System Description Table)
    this.createDSDT();
    
    // Create MADT (Multiple APIC Description Table)
    this.createMADT();
    
    // Create MCFG (PCI Express Configuration Table)
    this.createMCFG();
    
    console.log('ACPI: Tables initialized');
  }

  /**
   * Create RSDP (Root System Description Pointer)
   * This is the entry point for ACPI
   */
  createRSDP() {
    const rsdpAddress = this.rsdpAddress;
    
    // RSDP structure (36 bytes for ACPI 1.0, 8 more for 2.0+)
    const signature = 'RSD PTR '; // 8 bytes
    const checksum = 0; // Will be calculated
    const oemId = 'FRIEND '; // 6 bytes
    const revision = 2; // ACPI 2.0+
    const rsdtAddress = rsdpAddress + 36; // RSDT follows RSDP
    
    // Write RSDP to memory
    let offset = 0;
    
    // Signature (8 bytes)
    for (let i = 0; i < 8; i++) {
      this.memory.writeByte(rsdpAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 8;
    
    // Checksum (1 byte) - placeholder
    this.memory.writeByte(rsdpAddress + offset, 0);
    offset += 1;
    
    // OEM ID (6 bytes)
    for (let i = 0; i < 6; i++) {
      this.memory.writeByte(rsdpAddress + offset + i, oemId.charCodeAt(i));
    }
    offset += 6;
    
    // Revision (1 byte)
    this.memory.writeByte(rsdpAddress + offset, revision);
    offset += 1;
    
    // RSDT Address (4 bytes for ACPI 1.0, 8 bytes for 2.0+)
    this.writeUInt32(rsdpAddress + offset, rsdtAddress);
    offset += 4;
    
    // Length (4 bytes) - ACPI 2.0+
    this.writeUInt32(rsdpAddress + offset, 36);
    offset += 4;
    
    // XSDT Address (8 bytes) - ACPI 2.0+
    this.writeUInt64(rsdpAddress + offset, rsdtAddress);
    offset += 8;
    
    // Extended Checksum (1 byte)
    this.memory.writeByte(rsdpAddress + offset, 0);
    offset += 1;
    
    // Reserved (3 bytes)
    for (let i = 0; i < 3; i++) {
      this.memory.writeByte(rsdpAddress + offset + i, 0);
    }
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < 20; i++) {
      checksum = (checksum + this.memory.readByte(rsdpAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(rsdpAddress + 8, checksum);
    
    this.tables.rsdp = rsdpAddress;
    console.log(`ACPI: RSDP created at 0x${rsdpAddress.toString(16)}`);
  }

  /**
   * Create RSDT (Root System Description Table)
   */
  createRSDT() {
    const rsdtAddress = this.rsdpAddress + 36;
    
    // ACPI Table Header (36 bytes)
    const signature = 'RSDT'; // 4 bytes
    const length = 36 + 4; // Header + 1 table pointer
    const revision = 1;
    const checksum = 0;
    const oemId = 'FRIEND '; // 6 bytes
    const oemTableId = 'EMULATOR'; // 8 bytes
    const oemRevision = 1;
    const creatorId = 'FRIE'; // 4 bytes
    const creatorRevision = 1;
    
    let offset = 0;
    
    // Signature (4 bytes)
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(rsdtAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 4;
    
    // Length (4 bytes)
    this.writeUInt32(rsdtAddress + offset, length);
    offset += 4;
    
    // Revision (1 byte)
    this.memory.writeByte(rsdtAddress + offset, revision);
    offset += 1;
    
    // Checksum (1 byte) - placeholder
    this.memory.writeByte(rsdtAddress + offset, 0);
    offset += 1;
    
    // OEM ID (6 bytes)
    for (let i = 0; i < 6; i++) {
      this.memory.writeByte(rsdtAddress + offset + i, oemId.charCodeAt(i));
    }
    offset += 6;
    
    // OEM Table ID (8 bytes)
    for (let i = 0; i < 8; i++) {
      this.memory.writeByte(rsdtAddress + offset + i, oemTableId.charCodeAt(i));
    }
    offset += 8;
    
    // OEM Revision (4 bytes)
    this.writeUInt32(rsdtAddress + offset, oemRevision);
    offset += 4;
    
    // Creator ID (4 bytes)
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(rsdtAddress + offset + i, creatorId.charCodeAt(i));
    }
    offset += 4;
    
    // Creator Revision (4 bytes)
    this.writeUInt32(rsdtAddress + offset, creatorRevision);
    offset += 4;
    
    // Table Pointers (4 bytes each)
    // Point to FADT
    const fadtAddress = rsdtAddress + length;
    this.writeUInt32(rsdtAddress + offset, fadtAddress);
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < length; i++) {
      checksum = (checksum + this.memory.readByte(rsdtAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(rsdtAddress + 8, checksum);
    
    this.tables.rsdt = rsdtAddress;
    console.log(`ACPI: RSDT created at 0x${rsdtAddress.toString(16)}`);
  }

  /**
   * Create FADT (Fixed ACPI Description Table)
   */
  createFADT() {
    const fadtAddress = this.rsdpAddress + 36 + 40; // After RSDT
    
    // FADT structure (244 bytes minimum)
    const signature = 'FACP'; // 4 bytes
    const length = 244;
    
    let offset = 0;
    
    // ACPI Table Header (36 bytes)
    // Signature
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(fadtAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 4;
    
    // Length
    this.writeUInt32(fadtAddress + offset, length);
    offset += 4;
    
    // Revision, Checksum, OEM ID, etc. (simplified)
    this.memory.writeByte(fadtAddress + offset, 1); // Revision
    offset += 1;
    this.memory.writeByte(fadtAddress + offset, 0); // Checksum placeholder
    offset += 1;
    
    // OEM ID (6 bytes)
    const oemId = 'FRIEND ';
    for (let i = 0; i < 6; i++) {
      this.memory.writeByte(fadtAddress + offset + i, oemId.charCodeAt(i));
    }
    offset += 6;
    
    // Fill rest with zeros (simplified FADT)
    for (let i = offset; i < length; i++) {
      this.memory.writeByte(fadtAddress + i, 0);
    }
    
    // Set DSDT pointer (offset 40 in FADT)
    const dsdtAddress = fadtAddress + length;
    this.writeUInt32(fadtAddress + 40, dsdtAddress);
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < length; i++) {
      checksum = (checksum + this.memory.readByte(fadtAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(fadtAddress + 8, checksum);
    
    this.tables.fadt = fadtAddress;
    console.log(`ACPI: FADT created at 0x${fadtAddress.toString(16)}`);
  }

  /**
   * Create DSDT (Differentiated System Description Table)
   */
  createDSDT() {
    const dsdtAddress = this.rsdpAddress + 36 + 40 + 244; // After FADT
    
    // DSDT structure (minimal)
    const signature = 'DSDT'; // 4 bytes
    const length = 200; // Minimal DSDT
    
    let offset = 0;
    
    // ACPI Table Header
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(dsdtAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 4;
    
    this.writeUInt32(dsdtAddress + offset, length);
    offset += 4;
    
    // Fill with minimal AML (ACPI Machine Language) code
    // This is a simplified DSDT - real one would contain device definitions
    for (let i = offset; i < length; i++) {
      this.memory.writeByte(dsdtAddress + i, 0);
    }
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < length; i++) {
      checksum = (checksum + this.memory.readByte(dsdtAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(dsdtAddress + 8, checksum);
    
    this.tables.dsdt = dsdtAddress;
    console.log(`ACPI: DSDT created at 0x${dsdtAddress.toString(16)}`);
  }

  /**
   * Create MADT (Multiple APIC Description Table)
   */
  createMADT() {
    const madtAddress = this.rsdpAddress + 36 + 40 + 244 + 200; // After DSDT
    
    // MADT structure (minimal)
    const signature = 'APIC'; // 4 bytes
    const length = 100;
    
    let offset = 0;
    
    // ACPI Table Header
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(madtAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 4;
    
    this.writeUInt32(madtAddress + offset, length);
    offset += 4;
    
    // Fill with minimal data
    for (let i = offset; i < length; i++) {
      this.memory.writeByte(madtAddress + i, 0);
    }
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < length; i++) {
      checksum = (checksum + this.memory.readByte(madtAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(madtAddress + 8, checksum);
    
    this.tables.madt = madtAddress;
    console.log(`ACPI: MADT created at 0x${madtAddress.toString(16)}`);
  }

  /**
   * Create MCFG (PCI Express Configuration Table)
   */
  createMCFG() {
    const mcfgAddress = this.rsdpAddress + 36 + 40 + 244 + 200 + 100; // After MADT
    
    // MCFG structure (minimal)
    const signature = 'MCFG'; // 4 bytes
    const length = 60;
    
    let offset = 0;
    
    // ACPI Table Header
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(mcfgAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 4;
    
    this.writeUInt32(mcfgAddress + offset, length);
    offset += 4;
    
    // Fill with minimal data
    for (let i = offset; i < length; i++) {
      this.memory.writeByte(mcfgAddress + i, 0);
    }
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < length; i++) {
      checksum = (checksum + this.memory.readByte(mcfgAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(mcfgAddress + 8, checksum);
    
    this.tables.mcfg = mcfgAddress;
    console.log(`ACPI: MCFG created at 0x${mcfgAddress.toString(16)}`);
  }

  /**
   * Helper: Write 32-bit unsigned integer (little-endian)
   */
  writeUInt32(address, value) {
    this.memory.writeByte(address, value & 0xFF);
    this.memory.writeByte(address + 1, (value >> 8) & 0xFF);
    this.memory.writeByte(address + 2, (value >> 16) & 0xFF);
    this.memory.writeByte(address + 3, (value >> 24) & 0xFF);
  }

  /**
   * Helper: Write 64-bit unsigned integer (little-endian)
   */
  writeUInt64(address, value) {
    this.writeUInt32(address, Number(value & 0xFFFFFFFFn));
    this.writeUInt32(address + 4, Number((value >> 32n) & 0xFFFFFFFFn));
  }

  /**
   * Get RSDP address (for UEFI to find ACPI tables)
   */
  getRSDPAddress() {
    return this.rsdpAddress;
  }
}

export default ACPITables;

