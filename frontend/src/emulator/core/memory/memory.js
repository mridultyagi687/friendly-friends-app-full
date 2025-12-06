/**
 * Memory Management Subsystem
 * 
 * Step 3: Memory management implementation
 */

class MemoryManager {
  constructor(size = 4 * 1024 * 1024 * 1024) { // 4GB default
    this.size = size;
    this.memory = new ArrayBuffer(size);
    this.view = new Uint8Array(this.memory);
    this.pageTable = new Map(); // Virtual to physical page mapping
    this.pageSize = 4096; // 4KB pages
  }

  /**
   * Initialize memory
   */
  init() {
    console.log(`Memory: Initializing ${this.size / (1024 * 1024)}MB memory...`);
    // Clear memory
    this.view.fill(0);
  }

  /**
   * Read byte from physical address
   * @param {number} address - Physical address
   * @returns {number} - Byte value
   */
  readByte(address) {
    if (address < 0 || address >= this.size) {
      throw new Error(`Memory access violation at address 0x${address.toString(16)}`);
    }
    return this.view[address];
  }

  /**
   * Write byte to physical address
   * @param {number} address - Physical address
   * @param {number} value - Byte value (0-255)
   */
  writeByte(address, value) {
    if (address < 0 || address >= this.size) {
      throw new Error(`Memory access violation at address 0x${address.toString(16)}`);
    }
    if (value < 0 || value > 255) {
      throw new Error(`Invalid byte value: ${value}`);
    }
    this.view[address] = value;
  }

  /**
   * Read 16-bit value (little-endian)
   * @param {number} address - Physical address
   * @returns {number} - 16-bit value
   */
  readWord(address) {
    return this.readByte(address) | (this.readByte(address + 1) << 8);
  }

  /**
   * Write 16-bit value (little-endian)
   * @param {number} address - Physical address
   * @param {number} value - 16-bit value
   */
  writeWord(address, value) {
    this.writeByte(address, value & 0xFF);
    this.writeByte(address + 1, (value >> 8) & 0xFF);
  }

  /**
   * Read 32-bit value (little-endian)
   * @param {number} address - Physical address
   * @returns {number} - 32-bit value
   */
  readDword(address) {
    return this.readWord(address) | (this.readWord(address + 2) << 16);
  }

  /**
   * Write 32-bit value (little-endian)
   * @param {number} address - Physical address
   * @param {number} value - 32-bit value
   */
  writeDword(address, value) {
    this.writeWord(address, value & 0xFFFF);
    this.writeWord(address + 2, (value >> 16) & 0xFFFF);
  }

  /**
   * Read 64-bit value (little-endian)
   * @param {number} address - Physical address
   * @returns {bigint} - 64-bit value
   */
  readQword(address) {
    const low = BigInt(this.readDword(address));
    const high = BigInt(this.readDword(address + 4));
    return low | (high << 32n);
  }

  /**
   * Write 64-bit value (little-endian)
   * @param {number} address - Physical address
   * @param {bigint} value - 64-bit value
   */
  writeQword(address, value) {
    this.writeDword(address, Number(value & 0xFFFFFFFFn));
    this.writeDword(address + 4, Number((value >> 32n) & 0xFFFFFFFFn));
  }

  /**
   * Map virtual address to physical address
   * @param {bigint} virtualAddr - Virtual address
   * @returns {number} - Physical address
   */
  translateAddress(virtualAddr) {
    // TODO: Step 3 - Implement proper virtual memory translation
    // For now, identity mapping
    return Number(virtualAddr);
  }

  /**
   * Load data into memory
   * @param {number} address - Starting address
   * @param {Uint8Array} data - Data to load
   */
  loadData(address, data) {
    for (let i = 0; i < data.length; i++) {
      this.writeByte(address + i, data[i]);
    }
  }

  /**
   * Get memory snapshot for saving
   * @returns {ArrayBuffer} - Memory snapshot
   */
  getSnapshot() {
    return this.memory.slice(0);
  }

  /**
   * Restore memory from snapshot
   * @param {ArrayBuffer} snapshot - Memory snapshot
   */
  restoreSnapshot(snapshot) {
    if (snapshot.byteLength !== this.size) {
      throw new Error('Snapshot size mismatch');
    }
    this.memory = snapshot;
    this.view = new Uint8Array(this.memory);
  }
}

export default MemoryManager;

