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
    this.devices = []; // Device tree
    this.pciDevices = []; // PCI devices discovered
  }

  /**
   * Initialize ACPI tables
   * Creates minimal but correct ACPI tables: RSDP → XSDT → FADT + DSDT + MADT
   */
  init() {
    console.log('ACPI: Initializing minimal ACPI tables...');
    
    // Calculate table addresses (aligned to 16-byte boundaries)
    const rsdpAddress = this.rsdpAddress; // 0xE0000
    const xsdtAddress = 0xE1000; // XSDT at 0xE1000
    const fadtAddress = 0xE2000; // FADT at 0xE2000
    const dsdtAddress = 0xE3000; // DSDT at 0xE3000
    const madtAddress = 0xE4000; // MADT at 0xE4000
    
    // Create RSDP (Root System Description Pointer) - points to XSDT
    this.createRSDP(rsdpAddress, xsdtAddress);
    
    // Create XSDT (Extended System Description Table) - uses 64-bit pointers
    this.createXSDT(xsdtAddress, [fadtAddress, dsdtAddress, madtAddress]);
    
    // Discover PCI devices FIRST (needed for DSDT)
    this.discoverPCIDevices();
    
    // Create FADT (Fixed ACPI Description Table)
    this.createFADT(fadtAddress, dsdtAddress);
    
    // Create DSDT (Differentiated System Description Table) - complete AML with PCI devices
    this.createDSDT(dsdtAddress);
    
    // Create MADT (Multiple APIC Description Table) - with Local APIC entry
    this.createMADT(madtAddress);
    
    // Build device tree
    this.buildDeviceTree();
    
    console.log('ACPI: Minimal ACPI tables initialized');
  }

  /**
   * Create RSDP (Root System Description Pointer)
   * This is the entry point for ACPI - points to XSDT
   */
  createRSDP(rsdpAddress, xsdtAddress) {
    // RSDP structure (36 bytes for ACPI 1.0, 20 more for 2.0+ = 56 bytes total)
    const signature = 'RSD PTR '; // 8 bytes
    const oemId = 'FRIEND '; // 6 bytes (pad with space)
    const revision = 2; // ACPI 2.0+
    
    let offset = 0;
    
    // Signature (8 bytes): "RSD PTR "
    for (let i = 0; i < 8; i++) {
      this.memory.writeByte(rsdpAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 8;
    
    // Checksum (1 byte) - placeholder, will calculate later
    this.memory.writeByte(rsdpAddress + offset, 0);
    offset += 1;
    
    // OEM ID (6 bytes): "FRIEND"
    for (let i = 0; i < 6; i++) {
      this.memory.writeByte(rsdpAddress + offset + i, oemId.charCodeAt(i));
    }
    offset += 6;
    
    // Revision (1 byte): 2 for ACPI 2.0+
    this.memory.writeByte(rsdpAddress + offset, revision);
    offset += 1;
    
    // RSDT Address (4 bytes) - ACPI 1.0 compatibility (set to 0 for ACPI 2.0+)
    this.writeUInt32(rsdpAddress + offset, 0);
    offset += 4;
    
    // Length (4 bytes) - ACPI 2.0+ structure length (36 bytes)
    this.writeUInt32(rsdpAddress + offset, 36);
    offset += 4;
    
    // XSDT Address (8 bytes) - ACPI 2.0+ (64-bit pointer to XSDT)
    this.writeUInt64(rsdpAddress + offset, xsdtAddress);
    offset += 8;
    
    // Extended Checksum (1 byte) - for bytes 0-35
    this.memory.writeByte(rsdpAddress + offset, 0);
    offset += 1;
    
    // Reserved (3 bytes)
    for (let i = 0; i < 3; i++) {
      this.memory.writeByte(rsdpAddress + offset + i, 0);
    }
    
    // Calculate checksum for first 20 bytes (ACPI 1.0)
    let checksum = 0;
    for (let i = 0; i < 20; i++) {
      checksum = (checksum + this.memory.readByte(rsdpAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(rsdpAddress + 8, checksum);
    
    // Calculate extended checksum for bytes 0-35 (ACPI 2.0+)
    let extChecksum = 0;
    for (let i = 0; i < 36; i++) {
      extChecksum = (extChecksum + this.memory.readByte(rsdpAddress + i)) & 0xFF;
    }
    extChecksum = (256 - extChecksum) & 0xFF;
    this.memory.writeByte(rsdpAddress + 32, extChecksum);
    
    this.tables.rsdp = rsdpAddress;
    console.log(`ACPI: RSDP created at 0x${rsdpAddress.toString(16)}, points to XSDT at 0x${xsdtAddress.toString(16)}`);
  }

  /**
   * Create XSDT (Extended System Description Table)
   * Uses 64-bit pointers instead of 32-bit (required for Windows 10/11)
   */
  createXSDT(xsdtAddress, tableAddresses) {
    // XSDT structure: Header (36 bytes) + 64-bit table pointers
    const signature = 'XSDT'; // 4 bytes
    const length = 36 + (tableAddresses.length * 8); // Header + 64-bit pointers
    const revision = 1;
    const oemId = 'FRIEND '; // 6 bytes
    const oemTableId = 'EMULATOR'; // 8 bytes
    const oemRevision = 1;
    const creatorId = 'FRIE'; // 4 bytes
    const creatorRevision = 1;
    
    let offset = 0;
    
    // ACPI Table Header (36 bytes)
    // Signature (4 bytes): "XSDT"
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(xsdtAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 4;
    
    // Length (4 bytes)
    this.writeUInt32(xsdtAddress + offset, length);
    offset += 4;
    
    // Revision (1 byte)
    this.memory.writeByte(xsdtAddress + offset, revision);
    offset += 1;
    
    // Checksum (1 byte) - placeholder, will calculate later
    this.memory.writeByte(xsdtAddress + offset, 0);
    offset += 1;
    
    // OEM ID (6 bytes): "FRIEND"
    for (let i = 0; i < 6; i++) {
      this.memory.writeByte(xsdtAddress + offset + i, oemId.charCodeAt(i));
    }
    offset += 6;
    
    // OEM Table ID (8 bytes): "EMULATOR"
    for (let i = 0; i < 8; i++) {
      this.memory.writeByte(xsdtAddress + offset + i, oemTableId.charCodeAt(i));
    }
    offset += 8;
    
    // OEM Revision (4 bytes)
    this.writeUInt32(xsdtAddress + offset, oemRevision);
    offset += 4;
    
    // Creator ID (4 bytes): "FRIE"
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(xsdtAddress + offset + i, creatorId.charCodeAt(i));
    }
    offset += 4;
    
    // Creator Revision (4 bytes)
    this.writeUInt32(xsdtAddress + offset, creatorRevision);
    offset += 4;
    
    // Table Pointers (64-bit each) - point to FADT, DSDT, MADT
    for (const tableAddr of tableAddresses) {
      this.writeUInt64(xsdtAddress + offset, tableAddr);
      offset += 8;
    }
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < length; i++) {
      checksum = (checksum + this.memory.readByte(xsdtAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(xsdtAddress + 8, checksum);
    
    this.tables.xsdt = xsdtAddress;
    console.log(`ACPI: XSDT created at 0x${xsdtAddress.toString(16)} with ${tableAddresses.length} table(s)`);
  }

  /**
   * Create FADT (Fixed ACPI Description Table)
   * Minimal but correct FADT structure
   */
  createFADT(fadtAddress, dsdtAddress) {
    // FADT structure (244 bytes for ACPI 5.0+)
    const signature = 'FACP'; // 4 bytes
    const length = 244;
    const revision = 6; // ACPI 6.0
    const oemId = 'FRIEND '; // 6 bytes
    const oemTableId = 'EMULATOR'; // 8 bytes
    const oemRevision = 1;
    const creatorId = 'FRIE'; // 4 bytes
    const creatorRevision = 1;
    
    let offset = 0;
    
    // ACPI Table Header (36 bytes)
    // Signature (4 bytes): "FACP"
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(fadtAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 4;
    
    // Length (4 bytes)
    this.writeUInt32(fadtAddress + offset, length);
    offset += 4;
    
    // Revision (1 byte)
    this.memory.writeByte(fadtAddress + offset, revision);
    offset += 1;
    
    // Checksum (1 byte) - placeholder
    this.memory.writeByte(fadtAddress + offset, 0);
    offset += 1;
    
    // OEM ID (6 bytes)
    for (let i = 0; i < 6; i++) {
      this.memory.writeByte(fadtAddress + offset + i, oemId.charCodeAt(i));
    }
    offset += 6;
    
    // OEM Table ID (8 bytes)
    for (let i = 0; i < 8; i++) {
      this.memory.writeByte(fadtAddress + offset + i, oemTableId.charCodeAt(i));
    }
    offset += 8;
    
    // OEM Revision (4 bytes)
    this.writeUInt32(fadtAddress + offset, oemRevision);
    offset += 4;
    
    // Creator ID (4 bytes)
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(fadtAddress + offset + i, creatorId.charCodeAt(i));
    }
    offset += 4;
    
    // Creator Revision (4 bytes)
    this.writeUInt32(fadtAddress + offset, creatorRevision);
    offset += 4;
    
    // FADT-specific fields (offset 36+)
    // FACS Address (offset 36, 4 bytes) - set to 0 (no FACS)
    this.writeUInt32(fadtAddress + offset, 0);
    offset += 4;
    
    // DSDT Address (offset 40, 4 bytes) - 32-bit pointer
    this.writeUInt32(fadtAddress + offset, dsdtAddress);
    offset += 4;
    
    // DSDT Address (offset 44, 8 bytes) - 64-bit pointer (ACPI 2.0+)
    this.writeUInt64(fadtAddress + offset, dsdtAddress);
    offset += 8;
    
    // Fill rest with zeros (minimal FADT)
    // Important fields that Windows checks:
    // - PM1a Event Block Address (offset 64, 2 bytes) - set to 0
    // - PM1b Event Block Address (offset 66, 2 bytes) - set to 0
    // - PM1a Control Block Address (offset 68, 2 bytes) - set to 0
    // - PM1b Control Block Address (offset 70, 2 bytes) - set to 0
    // - PM2 Control Block Address (offset 72, 2 bytes) - set to 0
    // - PM Timer Block Address (offset 76, 4 bytes) - set to 0
    // - GPE0 Block Address (offset 80, 4 bytes) - set to 0
    // - GPE1 Block Address (offset 84, 4 bytes) - set to 0
    // - Flags (offset 112, 4 bytes) - set to 0 (no legacy devices)
    
    while (offset < length) {
      this.memory.writeByte(fadtAddress + offset, 0);
      offset++;
    }
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < length; i++) {
      checksum = (checksum + this.memory.readByte(fadtAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(fadtAddress + 8, checksum);
    
    this.tables.fadt = fadtAddress;
    console.log(`ACPI: FADT created at 0x${fadtAddress.toString(16)}, DSDT at 0x${dsdtAddress.toString(16)}`);
  }

  /**
   * Create DSDT (Differentiated System Description Table)
   * Complete DSDT with PCI device definitions for Windows 11
   */
  createDSDT(dsdtAddress) {
    // DSDT structure: Header (36 bytes) + complete AML code
    const signature = 'DSDT'; // 4 bytes
    const revision = 2; // ACPI 2.0
    const oemId = 'FRIEND '; // 6 bytes
    const oemTableId = 'EMULATOR'; // 8 bytes
    const oemRevision = 1;
    const creatorId = 'FRIE'; // 4 bytes
    const creatorRevision = 1;
    
    // Build complete AML code
    const amlCode = this.buildCompleteAML();
    const length = 36 + amlCode.length; // Header + AML
    
    let offset = 0;
    
    // ACPI Table Header (36 bytes)
    // Signature (4 bytes): "DSDT"
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(dsdtAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 4;
    
    // Length (4 bytes)
    this.writeUInt32(dsdtAddress + offset, length);
    offset += 4;
    
    // Revision (1 byte)
    this.memory.writeByte(dsdtAddress + offset, revision);
    offset += 1;
    
    // Checksum (1 byte) - placeholder
    this.memory.writeByte(dsdtAddress + offset, 0);
    offset += 1;
    
    // OEM ID (6 bytes)
    for (let i = 0; i < 6; i++) {
      this.memory.writeByte(dsdtAddress + offset + i, oemId.charCodeAt(i));
    }
    offset += 6;
    
    // OEM Table ID (8 bytes)
    for (let i = 0; i < 8; i++) {
      this.memory.writeByte(dsdtAddress + offset + i, oemTableId.charCodeAt(i));
    }
    offset += 8;
    
    // OEM Revision (4 bytes)
    this.writeUInt32(dsdtAddress + offset, oemRevision);
    offset += 4;
    
    // Creator ID (4 bytes)
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(dsdtAddress + offset + i, creatorId.charCodeAt(i));
    }
    offset += 4;
    
    // Creator Revision (4 bytes)
    this.writeUInt32(dsdtAddress + offset, creatorRevision);
    offset += 4;
    
    // Write complete AML code
    for (let i = 0; i < amlCode.length; i++) {
      this.memory.writeByte(dsdtAddress + offset + i, amlCode[i]);
    }
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < length; i++) {
      checksum = (checksum + this.memory.readByte(dsdtAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(dsdtAddress + 8, checksum);
    
    this.tables.dsdt = dsdtAddress;
    console.log(`ACPI: DSDT created at 0x${dsdtAddress.toString(16)} with ${amlCode.length} bytes of AML`);
  }

  /**
   * Build complete AML code for DSDT
   * Includes: DefinitionBlock, Scope(\_SB), PCI bus, and device definitions
   */
  buildCompleteAML() {
    const aml = [];
    
    // DefinitionBlock signature (minimal - just scope)
    // Scope(\_SB) {
    aml.push(0x10); // ScopeOp
    aml.push(0x5F, 0x53, 0x42, 0x00); // "\_SB"
    
    // PCI0 device definition
    // Device(PCI0) {
    aml.push(0x5B); // DeviceOp
    aml.push(0x50, 0x43, 0x49, 0x30, 0x00); // "PCI0"
    
    // _HID (Hardware ID) = "PNP0A08" (PCI Express Root Bridge)
    aml.push(0x08); // NameOp
    aml.push(0x5F, 0x48, 0x49, 0x44, 0x00); // "_HID"
    aml.push(0x0C); // StringPrefix
    aml.push(0x07); // String length
    aml.push(0x50, 0x4E, 0x50, 0x30, 0x41, 0x30, 0x38); // "PNP0A08"
    aml.push(0x00); // NullChar
    
    // _CID (Compatible ID) = "PNP0A03" (PCI Bus)
    aml.push(0x08); // NameOp
    aml.push(0x5F, 0x43, 0x49, 0x44, 0x00); // "_CID"
    aml.push(0x0C); // StringPrefix
    aml.push(0x07); // String length
    aml.push(0x50, 0x4E, 0x50, 0x30, 0x41, 0x30, 0x33); // "PNP0A03"
    aml.push(0x00); // NullChar
    
    // _ADR (Address) = 0x00000000 (bus 0, device 0, function 0)
    aml.push(0x08); // NameOp
    aml.push(0x5F, 0x41, 0x44, 0x52, 0x00); // "_ADR"
    aml.push(0x0A); // DWordPrefix
    aml.push(0x00, 0x00, 0x00, 0x00); // 0x00000000
    
    // _CRS (Current Resource Settings) - PCI configuration space
    aml.push(0x08); // NameOp
    aml.push(0x5F, 0x43, 0x52, 0x53, 0x00); // "_CRS"
    aml.push(0x11); // BufferOp
    aml.push(0x0A); // Buffer length (10 bytes)
    aml.push(0x47); // WordBusNumber
    aml.push(0x01); // Min
    aml.push(0x00, 0x00); // Max (0)
    aml.push(0x00, 0x00); // Length (0 = all buses)
    aml.push(0x86); // QWordMemory
    aml.push(0x00); // Resource producer, non-cacheable
    aml.push(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00); // Min address (0)
    aml.push(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00); // Max address (0)
    aml.push(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00); // Address length (0)
    aml.push(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00); // Granularity (0)
    
    // Add PCI devices (SATA, VGA)
    for (const pciDevice of this.pciDevices) {
      this.addPCIDeviceToAML(aml, pciDevice);
    }
    
    // End Device(PCI0)
    aml.push(0x29); // EndOp
    
    // End Scope(\_SB)
    aml.push(0x29); // EndOp
    
    return aml;
  }

  /**
   * Add PCI device definition to AML
   */
  addPCIDeviceToAML(aml, pciDevice) {
    const deviceName = this.getPCIDeviceName(pciDevice);
    
    // Device(SATA) or Device(GFX0)
    aml.push(0x5B); // DeviceOp
    // Device name (4 bytes + null)
    const nameBytes = [];
    for (let i = 0; i < 4; i++) {
      nameBytes.push(deviceName.charCodeAt(i) || 0x5F); // '_' if shorter
    }
    nameBytes.push(0x00); // Null terminator
    aml.push(...nameBytes);
    
    // _ADR (Address) = (bus << 16) | (device << 8) | function
    aml.push(0x08); // NameOp
    aml.push(0x5F, 0x41, 0x44, 0x52, 0x00); // "_ADR"
    aml.push(0x0A); // DWordPrefix
    const adr = (pciDevice.bus << 16) | (pciDevice.device << 8) | pciDevice.function;
    aml.push(adr & 0xFF);
    aml.push((adr >> 8) & 0xFF);
    aml.push((adr >> 16) & 0xFF);
    aml.push((adr >> 24) & 0xFF);
    
    // _HID (Hardware ID) based on device class
    aml.push(0x08); // NameOp
    aml.push(0x5F, 0x48, 0x49, 0x44, 0x00); // "_HID"
    aml.push(0x0C); // StringPrefix
    
    let hidString = '';
    if (pciDevice.classCode === 0x010601) {
      hidString = 'PNP0600'; // SATA Controller
    } else if (pciDevice.classCode === 0x030000) {
      hidString = 'PNP0303'; // VGA Controller
    } else {
      hidString = 'PNP0A00'; // Generic PCI device
    }
    
    aml.push(hidString.length);
    for (let i = 0; i < hidString.length; i++) {
      aml.push(hidString.charCodeAt(i));
    }
    aml.push(0x00); // NullChar
    
    // _CRS (Current Resource Settings) - Memory and IRQ resources
    aml.push(0x08); // NameOp
    aml.push(0x5F, 0x43, 0x52, 0x53, 0x00); // "_CRS"
    aml.push(0x11); // BufferOp
    
    // Calculate buffer size: 1 byte length + memory descriptors + IRQ descriptor
    const bufferSize = 1 + 24 + 3; // Memory (24 bytes) + IRQ (3 bytes)
    aml.push(bufferSize);
    
    // Memory resource (MMIO base address)
    if (pciDevice.baseAddress0) {
      aml.push(0x87); // QWordMemory (64-bit)
      aml.push(0x00); // Resource producer, non-cacheable
      const baseAddr = BigInt(pciDevice.baseAddress0);
      // Min address
      for (let i = 0; i < 8; i++) {
        aml.push(Number((baseAddr >> BigInt(i * 8)) & 0xFFn));
      }
      // Max address (same as min for fixed)
      for (let i = 0; i < 8; i++) {
        aml.push(Number((baseAddr >> BigInt(i * 8)) & 0xFFn));
      }
      // Address length (1MB)
      const length = 0x100000n;
      for (let i = 0; i < 8; i++) {
        aml.push(Number((length >> BigInt(i * 8)) & 0xFFn));
      }
      // Granularity (0)
      for (let i = 0; i < 8; i++) {
        aml.push(0);
      }
    }
    
    // IRQ resource
    if (pciDevice.interruptLine) {
      aml.push(0x22); // IRQ descriptor
      aml.push(0x04); // Flags: edge-triggered, active high
      aml.push(pciDevice.interruptLine); // IRQ number
    }
    
    // End Device
    aml.push(0x29); // EndOp
  }

  /**
   * Create MADT (Multiple APIC Description Table)
   * Minimal MADT with Local APIC entry
   */
  createMADT(madtAddress) {
    // MADT structure: Header (36 bytes) + APIC entries
    const signature = 'APIC'; // 4 bytes
    const revision = 3; // ACPI 3.0
    const oemId = 'FRIEND '; // 6 bytes
    const oemTableId = 'EMULATOR'; // 8 bytes
    const oemRevision = 1;
    const creatorId = 'FRIE'; // 4 bytes
    const creatorRevision = 1;
    
    // Calculate length: Header (36) + Local APIC entry (8) = 44 bytes
    const length = 44;
    
    let offset = 0;
    
    // ACPI Table Header (36 bytes)
    // Signature (4 bytes): "APIC"
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(madtAddress + offset + i, signature.charCodeAt(i));
    }
    offset += 4;
    
    // Length (4 bytes)
    this.writeUInt32(madtAddress + offset, length);
    offset += 4;
    
    // Revision (1 byte)
    this.memory.writeByte(madtAddress + offset, revision);
    offset += 1;
    
    // Checksum (1 byte) - placeholder
    this.memory.writeByte(madtAddress + offset, 0);
    offset += 1;
    
    // OEM ID (6 bytes)
    for (let i = 0; i < 6; i++) {
      this.memory.writeByte(madtAddress + offset + i, oemId.charCodeAt(i));
    }
    offset += 6;
    
    // OEM Table ID (8 bytes)
    for (let i = 0; i < 8; i++) {
      this.memory.writeByte(madtAddress + offset + i, oemTableId.charCodeAt(i));
    }
    offset += 8;
    
    // OEM Revision (4 bytes)
    this.writeUInt32(madtAddress + offset, oemRevision);
    offset += 4;
    
    // Creator ID (4 bytes)
    for (let i = 0; i < 4; i++) {
      this.memory.writeByte(madtAddress + offset + i, creatorId.charCodeAt(i));
    }
    offset += 4;
    
    // Creator Revision (4 bytes)
    this.writeUInt32(madtAddress + offset, creatorRevision);
    offset += 4;
    
    // MADT-specific fields (offset 36+)
    // Local APIC Address (offset 36, 4 bytes) - APIC base address
    const apicBase = 0xFEE00000; // Standard APIC base
    this.writeUInt32(madtAddress + offset, apicBase);
    offset += 4;
    
    // Flags (offset 40, 4 bytes) - bit 0 = PCAT_COMPAT (dual 8259 PICs present)
    this.writeUInt32(madtAddress + offset, 1); // PCAT_COMPAT = 1
    offset += 4;
    
    // APIC Structure Entries start at offset 44
    // Local APIC Entry (Type 0)
    // Entry Type (1 byte): 0 = Processor Local APIC
    this.memory.writeByte(madtAddress + offset, 0);
    offset += 1;
    
    // Entry Length (1 byte): 8 bytes
    this.memory.writeByte(madtAddress + offset, 8);
    offset += 1;
    
    // ACPI Processor ID (1 byte): 0
    this.memory.writeByte(madtAddress + offset, 0);
    offset += 1;
    
    // APIC ID (1 byte): 0
    this.memory.writeByte(madtAddress + offset, 0);
    offset += 1;
    
    // Flags (4 bytes): bit 0 = Enabled
    this.writeUInt32(madtAddress + offset, 1); // Enabled
    offset += 4;
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < length; i++) {
      checksum = (checksum + this.memory.readByte(madtAddress + i)) & 0xFF;
    }
    checksum = (256 - checksum) & 0xFF;
    this.memory.writeByte(madtAddress + 8, checksum);
    
    this.tables.madt = madtAddress;
    console.log(`ACPI: MADT created at 0x${madtAddress.toString(16)} with Local APIC entry`);
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
    // Convert address to Number if it's BigInt
    const addr = typeof address === 'bigint' ? Number(address) : address;
    // Convert value to BigInt if it's a Number
    const val = typeof value === 'bigint' ? value : BigInt(value);
    
    this.writeUInt32(addr, Number(val & 0xFFFFFFFFn));
    this.writeUInt32(addr + 4, Number((val >> 32n) & 0xFFFFFFFFn));
  }

  /**
   * Discover PCI devices
   * Scans PCI configuration space for devices
   */
  discoverPCIDevices() {
    console.log('ACPI: Discovering PCI devices...');
    
    // Standard PCI configuration space addresses (0xCF8-0xCFF for I/O)
    // For emulation, we'll create a virtual PCI bus
    
    // Add AHCI controller (SATA)
    this.pciDevices.push({
      bus: 0,
      device: 31,
      function: 2,
      vendorId: 0x8086, // Intel
      deviceId: 0x2922, // ICH9M AHCI Controller
      classCode: 0x010601, // SATA AHCI Controller
      revisionId: 0x02,
      headerType: 0x00, // Standard header
      interruptLine: 0x0B, // IRQ 11
      interruptPin: 0x01, // INTA#
      baseAddress0: 0xFEBF0000, // MMIO base
      baseAddress5: 0xFEBC0000, // Port registers base
    });
    
    // Add VGA controller (if present)
    this.pciDevices.push({
      bus: 0,
      device: 2,
      function: 0,
      vendorId: 0x1234, // Generic VGA
      deviceId: 0x1111, // VGA Controller
      classCode: 0x030000, // VGA Controller
      revisionId: 0x01,
      headerType: 0x00,
      interruptLine: 0x0A, // IRQ 10
      interruptPin: 0x01, // INTA#
      baseAddress0: 0xE0000000, // Framebuffer base
    });
    
    console.log(`ACPI: Discovered ${this.pciDevices.length} PCI device(s)`);
  }

  /**
   * Build device tree from discovered devices
   */
  buildDeviceTree() {
    console.log('ACPI: Building device tree...');
    
    // Root device
    const rootDevice = {
      name: '\\_SB',
      type: 'Device',
      children: [],
    };
    
    // Add PCI bus
    const pciBus = {
      name: 'PCI0',
      type: 'Device',
      address: 0,
      children: [],
    };
    
    // Add PCI devices
    for (const pciDevice of this.pciDevices) {
      const deviceName = this.getPCIDeviceName(pciDevice);
      const device = {
        name: deviceName,
        type: 'Device',
        address: (pciDevice.bus << 16) | (pciDevice.device << 8) | pciDevice.function,
        vendorId: pciDevice.vendorId,
        deviceId: pciDevice.deviceId,
        classCode: pciDevice.classCode,
        interruptLine: pciDevice.interruptLine,
        interruptPin: pciDevice.interruptPin,
        baseAddresses: [
          pciDevice.baseAddress0 || 0,
          pciDevice.baseAddress5 || 0,
        ],
        children: [],
      };
      
      pciBus.children.push(device);
    }
    
    rootDevice.children.push(pciBus);
    this.devices.push(rootDevice);
    
    console.log(`ACPI: Device tree built with ${this.pciDevices.length} device(s)`);
  }

  /**
   * Get PCI device name from device info
   * @param {Object} pciDevice - PCI device info
   * @returns {string} - Device name
   */
  getPCIDeviceName(pciDevice) {
    // Map device IDs to names
    if (pciDevice.deviceId === 0x2922) {
      return 'SATA'; // AHCI Controller
    } else if (pciDevice.classCode === 0x030000) {
      return 'GFX0'; // Graphics
    } else {
      return `DEV${pciDevice.device}`;
    }
  }

  /**
   * Get device tree
   * @returns {Array} - Device tree
   */
  getDeviceTree() {
    return this.devices;
  }

  /**
   * Get PCI devices
   * @returns {Array} - PCI devices
   */
  getPCIDevices() {
    return this.pciDevices;
  }

  /**
   * Read PCI configuration space
   * @param {number} bus - PCI bus number
   * @param {number} device - PCI device number
   * @param {number} function - PCI function number
   * @param {number} offset - Register offset
   * @returns {number} - Register value
   */
  readPCIConfig(bus, device, function_, offset) {
    // Find device
    const pciDevice = this.pciDevices.find(d => 
      d.bus === bus && d.device === device && d.function === function_
    );
    
    if (!pciDevice) {
      return 0xFFFFFFFF; // Device not found
    }
    
    // Map offset to register
    switch (offset) {
      case 0x00: // Vendor ID
        return pciDevice.vendorId;
      case 0x02: // Device ID
        return pciDevice.deviceId;
      case 0x08: // Revision ID and Class Code
        return (pciDevice.classCode << 8) | pciDevice.revisionId;
      case 0x0C: // Header Type
        return pciDevice.headerType;
      case 0x3C: // Interrupt Line
        return pciDevice.interruptLine;
      case 0x3D: // Interrupt Pin
        return pciDevice.interruptPin;
      case 0x10: // Base Address 0
        return pciDevice.baseAddress0 || 0;
      case 0x24: // Base Address 5
        return pciDevice.baseAddress5 || 0;
      default:
        return 0;
    }
  }

  /**
   * Write PCI configuration space
   * @param {number} bus - PCI bus number
   * @param {number} device - PCI device number
   * @param {number} function - PCI function number
   * @param {number} offset - Register offset
   * @param {number} value - Register value
   */
  writePCIConfig(bus, device, function_, offset, value) {
    // Find device
    const pciDevice = this.pciDevices.find(d => 
      d.bus === bus && d.device === device && d.function === function_
    );
    
    if (!pciDevice) {
      return; // Device not found
    }
    
    // Update writable registers
    switch (offset) {
      case 0x04: // Command register
        // Allow command register writes (simplified)
        break;
      case 0x10: // Base Address 0
        if (pciDevice.baseAddress0 !== undefined) {
          pciDevice.baseAddress0 = value;
        }
        break;
      case 0x24: // Base Address 5
        if (pciDevice.baseAddress5 !== undefined) {
          pciDevice.baseAddress5 = value;
        }
        break;
      default:
        // Read-only or reserved registers
        break;
    }
  }

  /**
   * Get RSDP address (for UEFI to find ACPI tables)
   */
  getRSDPAddress() {
    return this.rsdpAddress;
  }
}

export default ACPITables;

