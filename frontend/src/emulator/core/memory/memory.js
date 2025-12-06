/**
 * Memory Management Subsystem
 * 
 * Step 3: Memory management implementation
 * 
 * Uses sparse/paged memory model to support large address spaces (50GB+)
 * without allocating all memory upfront (browsers limit ArrayBuffer to ~2GB)
 */

class MemoryManager {
  constructor(size = 50 * 1024 * 1024 * 1024) { // 50GB default addressable space
    this.size = size; // Total addressable memory space
    this.pageSize = 4096; // 4KB pages
    this.pageTable = new Map(); // Sparse page table: pageNumber -> ArrayBuffer
    this.allocatedPages = 0; // Track number of allocated pages
    this.maxAllocatedPages = Math.floor((2 * 1024 * 1024 * 1024) / this.pageSize); // ~2GB max physical allocation (browser limit)
    
    console.log(`Memory: Initialized with ${this.size / (1024 * 1024 * 1024)}GB addressable space`);
    console.log(`Memory: Using sparse paging (max ${this.maxAllocatedPages * this.pageSize / (1024 * 1024)}MB physical allocation)`);
  }

  /**
   * Get page number from address
   * @param {number|bigint} address - Memory address
   * @returns {number} - Page number
   */
  getPageNumber(address) {
    const addr = typeof address === 'bigint' ? Number(address) : address;
    return Math.floor(addr / this.pageSize);
  }

  /**
   * Get offset within page
   * @param {number|bigint} address - Memory address
   * @returns {number} - Offset within page
   */
  getPageOffset(address) {
    const addr = typeof address === 'bigint' ? Number(address) : address;
    return addr % this.pageSize;
  }

  /**
   * Allocate a page if it doesn't exist
   * @param {number} pageNumber - Page number
   * @returns {Uint8Array|null} - Page data or null if allocation limit reached
   */
  allocatePage(pageNumber) {
    if (this.pageTable.has(pageNumber)) {
      return this.pageTable.get(pageNumber);
    }

    // Check if we've reached the allocation limit
    if (this.allocatedPages >= this.maxAllocatedPages) {
      console.warn(`Memory: Allocation limit reached (${this.allocatedPages} pages allocated)`);
      return null; // Return null instead of throwing - allows graceful degradation
    }

    try {
      const pageBuffer = new ArrayBuffer(this.pageSize);
      const pageView = new Uint8Array(pageBuffer);
      pageView.fill(0); // Initialize to zero
      this.pageTable.set(pageNumber, pageView);
      this.allocatedPages++;
      return pageView;
    } catch (e) {
      console.error(`Memory: Failed to allocate page ${pageNumber}:`, e);
      return null;
    }
  }

  /**
   * Get page for address, allocating if necessary
   * @param {number|bigint} address - Memory address
   * @returns {Uint8Array|null} - Page data or null
   */
  getPage(address) {
    const pageNumber = this.getPageNumber(address);
    let page = this.pageTable.get(pageNumber);
    
    if (!page) {
      // Allocate page on demand
      page = this.allocatePage(pageNumber);
    }
    
    return page;
  }

  /**
   * Initialize memory
   */
  init() {
    console.log(`Memory: Initializing ${this.size / (1024 * 1024 * 1024)}GB addressable space...`);
    // Pages are allocated on demand, so no initialization needed
    // Pre-allocate a small amount of memory for early boot (first 16MB)
    const preAllocPages = Math.min(4096, Math.floor((16 * 1024 * 1024) / this.pageSize)); // 16MB = 4096 pages
    for (let i = 0; i < preAllocPages; i++) {
      this.allocatePage(i);
    }
    console.log(`Memory: Pre-allocated ${preAllocPages} pages (${preAllocPages * this.pageSize / (1024 * 1024)}MB)`);
  }

  /**
   * Read byte from address
   * @param {number|bigint} address - Memory address
   * @returns {number} - Byte value (0 if page not allocated)
   */
  readByte(address) {
    const addr = typeof address === 'bigint' ? Number(address) : address;
    
    if (addr < 0 || addr >= this.size) {
      throw new Error(`Memory access violation at address 0x${addr.toString(16)}`);
    }

    const page = this.getPage(addr);
    if (!page) {
      // Page not allocated - return 0 (uninitialized memory)
      return 0;
    }

    const offset = this.getPageOffset(addr);
    return page[offset];
  }

  /**
   * Write byte to address
   * @param {number|bigint} address - Memory address
   * @param {number} value - Byte value (0-255)
   */
  writeByte(address, value) {
    const addr = typeof address === 'bigint' ? Number(address) : address;
    
    if (addr < 0 || addr >= this.size) {
      throw new Error(`Memory access violation at address 0x${addr.toString(16)}`);
    }
    if (value < 0 || value > 255) {
      throw new Error(`Invalid byte value: ${value}`);
    }

    const page = this.getPage(addr);
    if (!page) {
      // Page not allocated and allocation limit reached - silently fail
      console.warn(`Memory: Cannot write to address 0x${addr.toString(16)} - allocation limit reached`);
      return;
    }

    const offset = this.getPageOffset(addr);
    page[offset] = value;
  }

  /**
   * Read 16-bit value (little-endian)
   * @param {number|bigint} address - Memory address
   * @returns {number} - 16-bit value
   */
  readWord(address) {
    const addr = typeof address === 'bigint' ? Number(address) : address;
    return this.readByte(addr) | (this.readByte(addr + 1) << 8);
  }

  /**
   * Write 16-bit value (little-endian)
   * @param {number|bigint} address - Memory address
   * @param {number} value - 16-bit value
   */
  writeWord(address, value) {
    const addr = typeof address === 'bigint' ? Number(address) : address;
    this.writeByte(addr, value & 0xFF);
    this.writeByte(addr + 1, (value >> 8) & 0xFF);
  }

  /**
   * Read 32-bit value (little-endian)
   * @param {number|bigint} address - Memory address
   * @returns {number} - 32-bit value
   */
  readDword(address) {
    const addr = typeof address === 'bigint' ? Number(address) : address;
    return this.readWord(addr) | (this.readWord(addr + 2) << 16);
  }

  /**
   * Write 32-bit value (little-endian)
   * @param {number|bigint} address - Memory address
   * @param {number} value - 32-bit value
   */
  writeDword(address, value) {
    const addr = typeof address === 'bigint' ? Number(address) : address;
    this.writeWord(addr, value & 0xFFFF);
    this.writeWord(addr + 2, (value >> 16) & 0xFFFF);
  }

  /**
   * Read 64-bit value (little-endian)
   * @param {number|bigint} address - Memory address
   * @returns {bigint} - 64-bit value
   */
  readQword(address) {
    const addr = typeof address === 'bigint' ? Number(address) : address;
    const low = BigInt(this.readDword(addr));
    const high = BigInt(this.readDword(addr + 4));
    return low | (high << 32n);
  }

  /**
   * Write 64-bit value (little-endian)
   * @param {number|bigint} address - Memory address
   * @param {bigint} value - 64-bit value
   */
  writeQword(address, value) {
    const addr = typeof address === 'bigint' ? Number(address) : address;
    this.writeDword(addr, Number(value & 0xFFFFFFFFn));
    this.writeDword(addr + 4, Number((value >> 32n) & 0xFFFFFFFFn));
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
   * @param {number|bigint} address - Starting address
   * @param {Uint8Array} data - Data to load
   */
  loadData(address, data) {
    const startAddr = typeof address === 'bigint' ? Number(address) : address;
    for (let i = 0; i < data.length; i++) {
      this.writeByte(startAddr + i, data[i]);
    }
  }

  /**
   * Allocate a contiguous region of memory
   * @param {number|bigint} address - Starting address
   * @param {number} size - Size in bytes
   * @returns {boolean} - True if allocation succeeded
   */
  allocate(address, size) {
    const startAddr = typeof address === 'bigint' ? Number(address) : address;
    const startPage = this.getPageNumber(startAddr);
    const endPage = this.getPageNumber(startAddr + size - 1);
    
    let allocated = 0;
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      if (!this.pageTable.has(pageNum)) {
        if (this.allocatePage(pageNum)) {
          allocated++;
        } else {
          console.warn(`Memory: Failed to allocate page ${pageNum} (allocation limit reached)`);
          return false;
        }
      }
    }
    
    if (allocated > 0) {
      console.log(`Memory: Allocated ${allocated} pages for region 0x${startAddr.toString(16)}-0x${(startAddr + size).toString(16)}`);
    }
    return true;
  }

  /**
   * Get memory snapshot for saving
   * @returns {Object} - Memory snapshot (sparse page table)
   */
  getSnapshot() {
    const snapshot = {
      size: this.size,
      pageSize: this.pageSize,
      pages: {}
    };
    
    // Only save allocated pages
    for (const [pageNum, pageView] of this.pageTable.entries()) {
      snapshot.pages[pageNum] = Array.from(pageView); // Convert to regular array for JSON serialization
    }
    
    return snapshot;
  }

  /**
   * Restore memory from snapshot
   * @param {Object} snapshot - Memory snapshot
   */
  restoreSnapshot(snapshot) {
    if (snapshot.size !== this.size || snapshot.pageSize !== this.pageSize) {
      throw new Error('Snapshot size mismatch');
    }
    
    // Clear existing pages
    this.pageTable.clear();
    this.allocatedPages = 0;
    
    // Restore pages
    for (const [pageNumStr, pageData] of Object.entries(snapshot.pages)) {
      const pageNum = parseInt(pageNumStr, 10);
      const pageBuffer = new ArrayBuffer(this.pageSize);
      const pageView = new Uint8Array(pageBuffer);
      pageView.set(pageData);
      this.pageTable.set(pageNum, pageView);
      this.allocatedPages++;
    }
    
    console.log(`Memory: Restored ${this.allocatedPages} pages from snapshot`);
  }

  /**
   * Get memory statistics
   * @returns {Object} - Memory statistics
   */
  getStats() {
    return {
      addressableSize: this.size,
      addressableSizeGB: this.size / (1024 * 1024 * 1024),
      allocatedPages: this.allocatedPages,
      allocatedSize: this.allocatedPages * this.pageSize,
      allocatedSizeMB: (this.allocatedPages * this.pageSize) / (1024 * 1024),
      maxAllocatedPages: this.maxAllocatedPages,
      maxAllocatedSizeMB: (this.maxAllocatedPages * this.pageSize) / (1024 * 1024),
      utilizationPercent: ((this.allocatedPages / this.maxAllocatedPages) * 100).toFixed(2)
    };
  }
}

export default MemoryManager;

