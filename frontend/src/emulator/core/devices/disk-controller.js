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
    
    // Initialize with one disk on port 0
    this.ports.push({
      portNumber: 0,
      deviceType: 'sata',
      devicePresent: true,
      storage: storage,
      lba: 0, // Logical Block Address
      sectorSize: 512,
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
    
    this.initialized = true;
    console.log(`DiskController: Initialized with ${this.ports.length} port(s)`);
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

