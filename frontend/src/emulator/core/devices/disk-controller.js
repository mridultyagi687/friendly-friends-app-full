/**
 * Disk Controller Emulation (Simplified AHCI/SATA)
 * 
 * Provides disk controller interface for Windows to detect storage devices
 */

class DiskController {
  constructor(storage, memory) {
    this.storage = storage; // Storage device
    this.memory = memory; // Memory manager
    this.ports = []; // SATA ports
    this.initialized = false;
    
    // AHCI registers (memory-mapped I/O)
    this.ahciBase = 0xFEBF0000; // Base address for AHCI registers
    this.registers = {
      // Global Host Control (GHC)
      ghc: 0x00, // Global Host Control register
      is: 0x08, // Interrupt Status register
      pi: 0x0C, // Ports Implemented register
      vs: 0x10, // Version register
      ccc_ctl: 0x14, // Command Completion Coalescing Control
      ccc_ports: 0x18, // Command Completion Coalescing Ports
      em_loc: 0x1C, // Enclosure Management Location
      em_ctl: 0x20, // Enclosure Management Control
      cap2: 0x24, // Host Capabilities Extended
      bohc: 0x28, // BIOS/OS Handoff Control
    };
    
    // Port registers (each port has its own set)
    this.portRegisters = {
      clb: 0x00, // Command List Base Address
      clbu: 0x04, // Command List Base Address Upper
      fb: 0x08, // FIS Base Address
      fbu: 0x0C, // FIS Base Address Upper
      is: 0x10, // Interrupt Status
      ie: 0x14, // Interrupt Enable
      cmd: 0x18, // Command and Status
      reserved: 0x1C, // Reserved
      tfd: 0x20, // Task File Data
      sig: 0x24, // Signature
      ssts: 0x28, // Serial ATA Status
      sctl: 0x2C, // Serial ATA Control
      serr: 0x30, // Serial ATA Error
      sact: 0x34, // Serial ATA Active
      ci: 0x38, // Command Issue
      sntf: 0x3C, // Serial ATA Notification
      fbs: 0x40, // FIS-based Switching Control
    };
    
    // Initialize with one disk on port 0
    this.ports.push({
      portNumber: 0,
      deviceType: 'sata',
      devicePresent: true,
      storage: storage,
      lba: 0, // Logical Block Address
      sectorSize: 512,
      commandList: null, // Command list base address
      fisBase: null, // FIS base address
      commandActive: false,
      error: 0,
    });
  }

  /**
   * Initialize disk controller
   */
  init() {
    console.log('DiskController: Initializing...');
    
    // Set up PCI configuration space (simplified)
    this.pciConfig = {
      vendorId: 0x8086, // Intel
      deviceId: 0x2922, // ICH9M AHCI Controller
      classCode: 0x010601, // SATA AHCI Controller
      revisionId: 0x02,
      status: 0x0010, // Capabilities list
      command: 0x0007, // I/O, Memory, Bus Master enabled
    };
    
    // Initialize AHCI registers
    this.initAHCIRegisters();
    
    this.initialized = true;
    console.log(`DiskController: Initialized with ${this.ports.length} port(s)`);
  }

  /**
   * Initialize AHCI registers
   */
  initAHCIRegisters() {
    // Allocate memory for command lists and FIS structures
    const commandListBase = 0x1000000; // 1MB mark
    const fisBase = 0x1001000; // FIS structures
    
    // Initialize port 0
    const port = this.ports[0];
    port.commandList = commandListBase;
    port.fisBase = fisBase;
    
    // Write initial register values to memory (if memory-mapped)
    // In a real system, these would be actual MMIO registers
    // For emulation, we'll track them in memory
    
    // GHC: Enable AHCI (bit 31)
    this.writeRegister(this.registers.ghc, 0x80000000);
    
    // PI: Ports Implemented (bit 0 = port 0)
    this.writeRegister(this.registers.pi, 0x00000001);
    
    // Port 0 registers
    const port0Base = this.ahciBase + 0x100; // Port 0 starts at offset 0x100
    this.writeRegister(port0Base + this.portRegisters.clb, commandListBase & 0xFFFFFFFF);
    this.writeRegister(port0Base + this.portRegisters.clbu, (commandListBase >> 32) & 0xFFFFFFFF);
    this.writeRegister(port0Base + this.portRegisters.fb, fisBase & 0xFFFFFFFF);
    this.writeRegister(port0Base + this.portRegisters.fbu, (fisBase >> 32) & 0xFFFFFFFF);
    
    // Port signature (SATA device)
    this.writeRegister(port0Base + this.portRegisters.sig, 0x00000101); // SATA signature
    
    // Port status (device present)
    this.writeRegister(port0Base + this.portRegisters.ssts, 0x00000303); // Device detected, ready
    
    console.log('DiskController: AHCI registers initialized');
  }

  /**
   * Write AHCI register (simplified - stores in memory)
   * @param {number} offset - Register offset
   * @param {number} value - Register value
   */
  writeRegister(offset, value) {
    // In a real system, this would write to MMIO
    // For emulation, we store register values
    if (!this.registerValues) {
      this.registerValues = new Map();
    }
    this.registerValues.set(offset, value);
  }

  /**
   * Read AHCI register (simplified - reads from memory)
   * @param {number} offset - Register offset
   * @returns {number} - Register value
   */
  readRegister(offset) {
    if (!this.registerValues) {
      return 0;
    }
    return this.registerValues.get(offset) || 0;
  }

  /**
   * Process AHCI command queue
   * Handles command list processing with proper error recovery
   */
  async processCommandQueue(portNumber) {
    const port = this.ports[portNumber];
    if (!port || !port.commandList) {
      return false;
    }
    
    const port0Base = this.ahciBase + 0x100 + (portNumber * 0x80);
    const ci = this.readRegister(port0Base + this.portRegisters.ci); // Command Issue register
    
    if (ci === 0) {
      return true; // No commands pending
    }
    
    // Process each pending command (bit set in CI)
    for (let slot = 0; slot < 32; slot++) {
      if (ci & (1 << slot)) {
        const success = await this.processCommand(portNumber, slot);
        if (!success) {
          // Set error bit in TFD (Task File Data)
          const tfd = this.readRegister(port0Base + this.portRegisters.tfd);
          this.writeRegister(port0Base + this.portRegisters.tfd, tfd | 0x01); // Error bit
          this.writeRegister(port0Base + this.portRegisters.serr, 0x01); // Set error in SERR
        }
        // Clear command issue bit
        this.writeRegister(port0Base + this.portRegisters.ci, ci & ~(1 << slot));
      }
    }
    
    return true;
  }

  /**
   * Process single AHCI command
   */
  async processCommand(portNumber, slot) {
    const port = this.ports[portNumber];
    if (!port || !port.commandList) {
      return false;
    }
    
    // Command list entry is 32 bytes at commandList + (slot * 32)
    const cmdBase = port.commandList + (slot * 32);
    
    // Read command header (first 8 bytes)
    const cmdFlags = this.memory.readDword(cmdBase);
    const prdtl = (cmdFlags >> 16) & 0xFFFF; // PRDT length
    const prdbc = this.memory.readDword(cmdBase + 4); // PRD byte count
    
    // Read command FIS (Frame Information Structure) - 20 bytes at offset 0x40
    const fisBase = port.fisBase;
    const fisType = this.memory.readByte(fisBase);
    
    if (fisType === 0x27) { // Register FIS - Host to Device
      // Extract command details
      const command = this.memory.readByte(fisBase + 2);
      const feature = this.memory.readByte(fisBase + 3);
      const lbaLow = this.memory.readByte(fisBase + 4);
      const lbaMid = this.memory.readByte(fisBase + 5);
      const lbaHigh = this.memory.readByte(fisBase + 6);
      const device = this.memory.readByte(fisBase + 7);
      const countLow = this.memory.readByte(fisBase + 12);
      const countHigh = this.memory.readByte(fisBase + 13);
      
      const lba = lbaLow | (lbaMid << 8) | ((lbaHigh & 0x0F) << 16) | ((device & 0xE0) << 24);
      const sectorCount = countLow | (countHigh << 8);
      
      // Read PRDT (Physical Region Descriptor Table)
      const prdtBase = cmdBase + 0x80; // PRDT starts at offset 0x80 in command table
      const bufferAddress = this.memory.readQword(prdtBase);
      const bufferSize = (this.memory.readDword(prdtBase + 8) & 0x3FFFF) + 1; // Lower 18 bits
      
      // Execute command
      if (command === 0x20 || command === 0x24) { // READ SECTORS or READ SECTORS EXT
        return await this.readSectors(portNumber, lba, sectorCount, Number(bufferAddress));
      } else if (command === 0x30 || command === 0x34) { // WRITE SECTORS or WRITE SECTORS EXT
        return await this.writeSectors(portNumber, lba, sectorCount, Number(bufferAddress));
      } else if (command === 0xEC) { // IDENTIFY DEVICE
        return await this.identifyDevice(portNumber, Number(bufferAddress));
      }
    }
    
    return false;
  }

  /**
   * Identify device (ATA command)
   */
  async identifyDevice(portNumber, bufferAddress) {
    const port = this.ports[portNumber];
    if (!port) {
      return false;
    }
    
    // Create IDENTIFY DEVICE response (512 bytes = 256 words)
    const identifyData = new Uint16Array(256);
    
    // Fill with device information
    const stats = this.storage.getStats();
    const totalSectors = Math.floor(stats.totalSize / 512);
    
    // Word 0: General configuration
    identifyData[0] = 0x0040; // ATA device, not removable
    
    // Word 1: Number of logical cylinders (obsolete)
    identifyData[1] = 0x0000;
    
    // Word 6: Number of logical heads (obsolete)
    identifyData[6] = 0x0000;
    
    // Word 60-61: Total number of user addressable sectors (LBA28)
    const lba28 = totalSectors > 0x0FFFFFFF ? 0x0FFFFFFF : totalSectors;
    identifyData[60] = lba28 & 0xFFFF;
    identifyData[61] = (lba28 >> 16) & 0xFFFF;
    
    // Word 100-103: Total number of user addressable sectors (LBA48)
    identifyData[100] = Number(totalSectors & 0xFFFFn);
    identifyData[101] = Number((totalSectors >> 16n) & 0xFFFFn);
    identifyData[102] = Number((totalSectors >> 32n) & 0xFFFFn);
    identifyData[103] = Number((totalSectors >> 48n) & 0xFFFFn);
    
    // Word 83: LBA48 support
    identifyData[83] = 0x0400; // LBA48 supported
    
    // Serial number (word 10-19): "EMULATOR-DISK"
    const serial = 'EMULATOR-DISK';
    for (let i = 0; i < 10; i++) {
      const char1 = i * 2 < serial.length ? serial.charCodeAt(i * 2) : 0x20;
      const char2 = i * 2 + 1 < serial.length ? serial.charCodeAt(i * 2 + 1) : 0x20;
      identifyData[10 + i] = char1 | (char2 << 8);
    }
    
    // Model number (word 27-46): "FRIENDLY FRIENDS DISK"
    const model = 'FRIENDLY FRIENDS DISK';
    for (let i = 0; i < 20; i++) {
      const char1 = i * 2 < model.length ? model.charCodeAt(i * 2) : 0x20;
      const char2 = i * 2 + 1 < model.length ? model.charCodeAt(i * 2 + 1) : 0x20;
      identifyData[27 + i] = char1 | (char2 << 8);
    }
    
    // Write to memory (little-endian word format)
    for (let i = 0; i < 256; i++) {
      const word = identifyData[i];
      this.memory.writeByte(bufferAddress + i * 2, word & 0xFF);
      this.memory.writeByte(bufferAddress + i * 2 + 1, (word >> 8) & 0xFF);
    }
    
    return true;
  }

  /**
   * Read from disk
   * @param {number} portNumber - Port number
   * @param {number} lba - Logical Block Address
   * @param {number} sectorCount - Number of sectors to read
   * @param {number} bufferAddress - Memory address to read into
   * @returns {Promise<boolean>} - Success
   */
  async readSectors(portNumber, lba, sectorCount, bufferAddress) {
    const port = this.ports[portNumber];
    if (!port || !port.devicePresent) {
      console.warn(`DiskController: Port ${portNumber} not available`);
      return false;
    }
    
    const offset = lba * port.sectorSize;
    const size = sectorCount * port.sectorSize;
    
    try {
      const data = await this.storage.readData(offset, size);
      
      // Write to memory
      const bufferAddr = typeof bufferAddress === 'bigint' ? Number(bufferAddress) : bufferAddress;
      for (let i = 0; i < data.length; i++) {
        this.memory.writeByte(bufferAddr + i, data[i]);
      }
      
      console.log(`DiskController: Read ${sectorCount} sector(s) from LBA ${lba} on port ${portNumber}`);
      return true;
    } catch (error) {
      console.error(`DiskController: Read error:`, error);
      return false;
    }
  }

  /**
   * Write to disk
   * @param {number} portNumber - Port number
   * @param {number} lba - Logical Block Address
   * @param {number} sectorCount - Number of sectors to write
   * @param {number} bufferAddress - Memory address to read from
   * @returns {Promise<boolean>} - Success
   */
  async writeSectors(portNumber, lba, sectorCount, bufferAddress) {
    const port = this.ports[portNumber];
    if (!port || !port.devicePresent) {
      console.warn(`DiskController: Port ${portNumber} not available`);
      return false;
    }
    
    const offset = lba * port.sectorSize;
    const size = sectorCount * port.sectorSize;
    
    try {
      // Read from memory
      const bufferAddr = typeof bufferAddress === 'bigint' ? Number(bufferAddress) : bufferAddress;
      const data = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        data[i] = this.memory.readByte(bufferAddr + i);
      }
      
      // Write to storage
      await this.storage.writeData(offset, data);
      
      console.log(`DiskController: Wrote ${sectorCount} sector(s) to LBA ${lba} on port ${portNumber}`);
      return true;
    } catch (error) {
      console.error(`DiskController: Write error:`, error);
      return false;
    }
  }

  /**
   * Get port information
   * @param {number} portNumber - Port number
   * @returns {Object|null} - Port information
   */
  getPortInfo(portNumber) {
    const port = this.ports[portNumber];
    if (!port) {
      return null;
    }
    
    const stats = this.storage.getStats();
    
    return {
      portNumber: port.portNumber,
      deviceType: port.deviceType,
      devicePresent: port.devicePresent,
      sectorSize: port.sectorSize,
      totalSectors: Math.floor(stats.totalSize / port.sectorSize),
      totalSize: stats.totalSize,
      totalSizeTB: stats.totalSizeTB,
    };
  }

  /**
   * Get PCI configuration
   * @returns {Object} - PCI configuration
   */
  getPCIConfig() {
    return this.pciConfig;
  }
}

export default DiskController;

