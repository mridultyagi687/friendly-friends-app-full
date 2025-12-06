/**
 * UEFI Block I/O Protocol
 * 
 * Provides low-level block device access for storage
 */

class BlockIOProtocol {
  constructor(storage, memory) {
    this.storage = storage; // Storage device
    this.memory = memory; // Memory manager
    this.guid = '964E5B22-6459-11D2-8E39-00A0C969723B'; // EFI_BLOCK_IO_PROTOCOL_GUID
    
    // Protocol revision
    this.revision = 0x00010000; // EFI 1.0
    
    // Media information
    this.media = {
      mediaId: 1,
      removableMedia: false,
      mediaPresent: true,
      logicalPartition: false,
      readOnly: false,
      writeCaching: false,
      blockSize: 512, // 512-byte sectors
      ioAlign: 1,
      lastBlock: 0, // Will be set based on storage size
    };
    
    // Calculate last block based on storage size
    this.updateMediaInfo();
  }

  /**
   * Update media information based on storage size
   */
  updateMediaInfo() {
    if (this.storage) {
      const stats = this.storage.getStats();
      // Calculate number of blocks (sectors)
      this.media.lastBlock = Math.floor(stats.totalSize / this.media.blockSize) - 1;
      console.log(`BlockIO: Media initialized - ${this.media.lastBlock + 1} blocks (${stats.totalSizeTB}TB)`);
    }
  }

  /**
   * Initialize Block I/O Protocol
   */
  init() {
    console.log('BlockIO: Initializing Block I/O Protocol...');
    this.updateMediaInfo();
    console.log('BlockIO: Initialized');
  }

  /**
   * Reset block device
   * @returns {number} - EFI status code (0 = success)
   */
  reset() {
    console.log('BlockIO: Reset called');
    return 0; // EFI_SUCCESS
  }

  /**
   * Read blocks from device
   * @param {number} mediaId - Media ID
   * @param {number} lba - Logical Block Address (sector number)
   * @param {number} bufferSize - Size to read in bytes
   * @param {number} buffer - Memory address to read into
   * @returns {Promise<number>} - EFI status code (0 = success)
   */
  async readBlocks(mediaId, lba, bufferSize, buffer) {
    if (mediaId !== this.media.mediaId) {
      console.warn(`BlockIO: Invalid media ID: ${mediaId}`);
      return 1; // EFI_INVALID_PARAMETER
    }
    
    if (lba > this.media.lastBlock) {
      console.warn(`BlockIO: LBA out of range: ${lba} > ${this.media.lastBlock}`);
      return 2; // EFI_DEVICE_ERROR
    }
    
    const offset = lba * this.media.blockSize;
    const numBlocks = Math.ceil(bufferSize / this.media.blockSize);
    
    try {
      // Read data from storage
      const data = await this.storage.readData(offset, bufferSize);
      
      // Write to memory at buffer address
      const bufferAddr = typeof buffer === 'bigint' ? Number(buffer) : buffer;
      for (let i = 0; i < data.length; i++) {
        this.memory.writeByte(bufferAddr + i, data[i]);
      }
      
      console.log(`BlockIO: Read ${data.length} bytes from LBA ${lba} (${numBlocks} blocks)`);
      return 0; // EFI_SUCCESS
    } catch (error) {
      console.error(`BlockIO: Read error:`, error);
      return 2; // EFI_DEVICE_ERROR
    }
  }

  /**
   * Write blocks to device
   * @param {number} mediaId - Media ID
   * @param {number} lba - Logical Block Address (sector number)
   * @param {number} bufferSize - Size to write in bytes
   * @param {number} buffer - Memory address to read from
   * @returns {Promise<number>} - EFI status code (0 = success)
   */
  async writeBlocks(mediaId, lba, bufferSize, buffer) {
    if (mediaId !== this.media.mediaId) {
      console.warn(`BlockIO: Invalid media ID: ${mediaId}`);
      return 1; // EFI_INVALID_PARAMETER
    }
    
    if (this.media.readOnly) {
      console.warn('BlockIO: Attempted write to read-only media');
      return 3; // EFI_WRITE_PROTECTED
    }
    
    if (lba > this.media.lastBlock) {
      console.warn(`BlockIO: LBA out of range: ${lba} > ${this.media.lastBlock}`);
      return 2; // EFI_DEVICE_ERROR
    }
    
    const offset = lba * this.media.blockSize;
    
    try {
      // Read data from memory
      const bufferAddr = typeof buffer === 'bigint' ? Number(buffer) : buffer;
      const data = new Uint8Array(bufferSize);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = this.memory.readByte(bufferAddr + i);
      }
      
      // Write to storage
      await this.storage.writeData(offset, data);
      
      console.log(`BlockIO: Wrote ${bufferSize} bytes to LBA ${lba}`);
      return 0; // EFI_SUCCESS
    } catch (error) {
      console.error(`BlockIO: Write error:`, error);
      return 2; // EFI_DEVICE_ERROR
    }
  }

  /**
   * Flush blocks to device
   * @returns {Promise<number>} - EFI status code (0 = success)
   */
  async flushBlocks() {
    // For our storage device, writes are already persisted
    // (IndexedDB handles persistence)
    return 0; // EFI_SUCCESS
  }

  /**
   * Get media information
   * @returns {Object} - Media information
   */
  getMedia() {
    return this.media;
  }
}

export default BlockIOProtocol;

