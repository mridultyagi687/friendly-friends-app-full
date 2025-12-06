/**
 * Storage Device Emulator
 * 
 * Emulates a 55TB storage device using sparse/paged allocation
 * Uses IndexedDB for persistence across sessions
 */

class StorageDevice {
  constructor(size = 55 * 1024 * 1024 * 1024 * 1024) { // 55TB default
    this.size = size; // Total addressable storage space
    this.blockSize = 512; // Standard disk sector size
    this.blockTable = new Map(); // Sparse block table: blockNumber -> ArrayBuffer
    this.allocatedBlocks = 0; // Track number of allocated blocks
    this.maxAllocatedBlocks = Math.floor((2 * 1024 * 1024 * 1024) / this.blockSize); // ~2GB max physical allocation (browser limit)
    
    // IndexedDB for persistence
    this.dbName = 'emulator-storage';
    this.dbVersion = 1;
    this.db = null;
    this.storeName = 'blocks';
    
    console.log(`Storage: Initialized with ${this.size / (1024 * 1024 * 1024 * 1024)}TB addressable space`);
    console.log(`Storage: Using sparse allocation (max ${this.maxAllocatedBlocks * this.blockSize / (1024 * 1024 * 1024)}GB physical allocation)`);
  }

  /**
   * Get block number from byte offset
   * @param {number|bigint} offset - Byte offset
   * @returns {number} - Block number
   */
  getBlockNumber(offset) {
    const off = typeof offset === 'bigint' ? Number(offset) : offset;
    return Math.floor(off / this.blockSize);
  }

  /**
   * Get offset within block
   * @param {number|bigint} offset - Byte offset
   * @returns {number} - Offset within block
   */
  getBlockOffset(offset) {
    const off = typeof offset === 'bigint' ? Number(offset) : offset;
    return off % this.blockSize;
  }

  /**
   * Initialize IndexedDB
   * @returns {Promise<void>}
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('Storage: Failed to open IndexedDB');
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('Storage: IndexedDB opened successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'blockNumber' });
          store.createIndex('blockNumber', 'blockNumber', { unique: true });
          console.log('Storage: IndexedDB store created');
        }
      };
    });
  }

  /**
   * Load block from IndexedDB
   * @param {number} blockNumber - Block number
   * @returns {Promise<Uint8Array|null>} - Block data or null
   */
  async loadBlockFromDB(blockNumber) {
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(blockNumber);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          // Convert ArrayBuffer back to Uint8Array
          const blockData = new Uint8Array(result.data);
          resolve(blockData);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.warn(`Storage: Failed to load block ${blockNumber} from DB`);
        resolve(null);
      };
    });
  }

  /**
   * Save block to IndexedDB
   * @param {number} blockNumber - Block number
   * @param {Uint8Array} blockData - Block data
   * @returns {Promise<void>}
   */
  async saveBlockToDB(blockNumber, blockData) {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({
        blockNumber: blockNumber,
        data: blockData.buffer, // Store as ArrayBuffer
        timestamp: Date.now(),
      });
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        console.warn(`Storage: Failed to save block ${blockNumber} to DB`);
        resolve(); // Don't reject - allow operation to continue
      };
    });
  }

  /**
   * Allocate a block if it doesn't exist
   * @param {number} blockNumber - Block number
   * @param {boolean} loadFromDB - Whether to try loading from IndexedDB first
   * @returns {Promise<Uint8Array|null>} - Block data or null if allocation limit reached
   */
  async allocateBlock(blockNumber, loadFromDB = true) {
    if (this.blockTable.has(blockNumber)) {
      return this.blockTable.get(blockNumber);
    }

    // Try loading from IndexedDB first
    if (loadFromDB && this.db) {
      const dbBlock = await this.loadBlockFromDB(blockNumber);
      if (dbBlock) {
        this.blockTable.set(blockNumber, dbBlock);
        this.allocatedBlocks++;
        return dbBlock;
      }
    }

    // Check if we've reached the allocation limit
    if (this.allocatedBlocks >= this.maxAllocatedBlocks) {
      console.warn(`Storage: Allocation limit reached (${this.allocatedBlocks} blocks allocated)`);
      return null;
    }

    try {
      const blockBuffer = new ArrayBuffer(this.blockSize);
      const blockView = new Uint8Array(blockBuffer);
      blockView.fill(0); // Initialize to zero
      this.blockTable.set(blockNumber, blockView);
      this.allocatedBlocks++;
      return blockView;
    } catch (e) {
      console.error(`Storage: Failed to allocate block ${blockNumber}:`, e);
      return null;
    }
  }

  /**
   * Get block for offset, allocating if necessary
   * @param {number|bigint} offset - Byte offset
   * @param {boolean} allocate - Whether to allocate if block doesn't exist
   * @returns {Promise<Uint8Array|null>} - Block data or null
   */
  async getBlock(offset, allocate = false) {
    const blockNumber = this.getBlockNumber(offset);
    let block = this.blockTable.get(blockNumber);
    
    if (!block) {
      if (allocate) {
        block = await this.allocateBlock(blockNumber);
      } else {
        // Try loading from DB without allocating
        block = await this.loadBlockFromDB(blockNumber);
        if (block) {
          this.blockTable.set(blockNumber, block);
          this.allocatedBlocks++;
        }
      }
    }
    
    return block;
  }

  /**
   * Initialize storage device
   * @returns {Promise<void>}
   */
  async init() {
    console.log(`Storage: Initializing ${this.size / (1024 * 1024 * 1024 * 1024)}TB addressable space...`);
    
    // Initialize IndexedDB
    try {
      await this.initDB();
    } catch (error) {
      console.warn('Storage: IndexedDB initialization failed, continuing without persistence:', error);
    }
    
    // Blocks are allocated on demand, so no pre-allocation needed
    console.log('Storage: Ready (blocks allocated on demand)');
  }

  /**
   * Read byte from storage
   * @param {number|bigint} offset - Byte offset
   * @returns {Promise<number>} - Byte value (0 if block not allocated)
   */
  async readByte(offset) {
    const off = typeof offset === 'bigint' ? Number(offset) : offset;
    
    if (off < 0 || off >= this.size) {
      throw new Error(`Storage access violation at offset 0x${off.toString(16)}`);
    }

    const block = await this.getBlock(off, false);
    if (!block) {
      return 0; // Block not allocated - return 0 (uninitialized storage)
    }

    const blockOffset = this.getBlockOffset(off);
    return block[blockOffset];
  }

  /**
   * Write byte to storage
   * @param {number|bigint} offset - Byte offset
   * @param {number} value - Byte value
   * @returns {Promise<void>}
   */
  async writeByte(offset, value) {
    const off = typeof offset === 'bigint' ? Number(offset) : offset;
    
    if (off < 0 || off >= this.size) {
      throw new Error(`Storage access violation at offset 0x${off.toString(16)}`);
    }

    const block = await this.getBlock(off, true);
    if (!block) {
      throw new Error(`Storage: Failed to allocate block for write at offset 0x${off.toString(16)}`);
    }

    const blockOffset = this.getBlockOffset(off);
    block[blockOffset] = value & 0xFF;
    
    // Save to IndexedDB asynchronously (don't await to avoid blocking)
    const blockNumber = this.getBlockNumber(off);
    this.saveBlockToDB(blockNumber, block).catch(err => {
      console.warn(`Storage: Failed to persist block ${blockNumber}:`, err);
    });
  }

  /**
   * Read word (16-bit) from storage
   * @param {number|bigint} offset - Byte offset
   * @returns {Promise<number>} - Word value
   */
  async readWord(offset) {
    const low = await this.readByte(offset);
    const high = await this.readByte(offset + 1);
    return low | (high << 8);
  }

  /**
   * Write word (16-bit) to storage
   * @param {number|bigint} offset - Byte offset
   * @param {number} value - Word value
   * @returns {Promise<void>}
   */
  async writeWord(offset, value) {
    await this.writeByte(offset, value & 0xFF);
    await this.writeByte(offset + 1, (value >> 8) & 0xFF);
  }

  /**
   * Read dword (32-bit) from storage
   * @param {number|bigint} offset - Byte offset
   * @returns {Promise<number>} - Dword value
   */
  async readDword(offset) {
    const low = await this.readWord(offset);
    const high = await this.readWord(offset + 2);
    return low | (high << 16);
  }

  /**
   * Write dword (32-bit) to storage
   * @param {number|bigint} offset - Byte offset
   * @param {number} value - Dword value
   * @returns {Promise<void>}
   */
  async writeDword(offset, value) {
    await this.writeWord(offset, value & 0xFFFF);
    await this.writeWord(offset + 2, (value >> 16) & 0xFFFF);
  }

  /**
   * Read qword (64-bit) from storage
   * @param {number|bigint} offset - Byte offset
   * @returns {Promise<bigint>} - Qword value
   */
  async readQword(offset) {
    const low = await this.readDword(offset);
    const high = await this.readDword(offset + 4);
    return BigInt(low) | (BigInt(high) << 32n);
  }

  /**
   * Write qword (64-bit) to storage
   * @param {number|bigint} offset - Byte offset
   * @param {bigint|number} value - Qword value
   * @returns {Promise<void>}
   */
  async writeQword(offset, value) {
    const val = typeof value === 'bigint' ? value : BigInt(value);
    await this.writeDword(offset, Number(val & 0xFFFFFFFFn));
    await this.writeDword(offset + 4, Number((val >> 32n) & 0xFFFFFFFFn));
  }

  /**
   * Read data from storage
   * @param {number|bigint} offset - Byte offset
   * @param {number} length - Number of bytes to read
   * @returns {Promise<Uint8Array>} - Data read
   */
  async readData(offset, length) {
    const off = typeof offset === 'bigint' ? Number(offset) : offset;
    const data = new Uint8Array(length);
    
    for (let i = 0; i < length; i++) {
      data[i] = await this.readByte(off + i);
    }
    
    return data;
  }

  /**
   * Write data to storage
   * @param {number|bigint} offset - Byte offset
   * @param {Uint8Array|ArrayBuffer} data - Data to write
   * @returns {Promise<void>}
   */
  async writeData(offset, data) {
    const off = typeof offset === 'bigint' ? Number(offset) : offset;
    const dataArray = data instanceof Uint8Array ? data : new Uint8Array(data);
    
    for (let i = 0; i < dataArray.length; i++) {
      await this.writeByte(off + i, dataArray[i]);
    }
  }

  /**
   * Get storage statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    return {
      totalSize: this.size,
      totalSizeTB: this.size / (1024 * 1024 * 1024 * 1024),
      blockSize: this.blockSize,
      allocatedBlocks: this.allocatedBlocks,
      allocatedSize: this.allocatedBlocks * this.blockSize,
      allocatedSizeGB: (this.allocatedBlocks * this.blockSize) / (1024 * 1024 * 1024),
      maxAllocatedBlocks: this.maxAllocatedBlocks,
      maxAllocatedSizeGB: (this.maxAllocatedBlocks * this.blockSize) / (1024 * 1024 * 1024),
      utilizationPercent: (this.allocatedBlocks / this.maxAllocatedBlocks) * 100,
    };
  }

  /**
   * Clear all storage (for testing/reset)
   * @returns {Promise<void>}
   */
  async clear() {
    this.blockTable.clear();
    this.allocatedBlocks = 0;
    
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('Storage: All blocks cleared');
          resolve();
        };
        
        request.onerror = () => {
          console.error('Storage: Failed to clear blocks');
          reject(new Error('Failed to clear storage'));
        };
      });
    }
  }
}

export default StorageDevice;

