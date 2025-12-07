/**
 * Virtual Memory Manager
 * 
 * Implements x86-64 virtual memory with page tables
 * Supports 4-level paging (PML4 -> PDPT -> PD -> PT)
 */

class VirtualMemoryManager {
  constructor(physicalMemory) {
    this.physicalMemory = physicalMemory; // Reference to physical memory manager
    this.cr3 = 0n; // Page table base address (CR3 register)
    this.tlb = new Map(); // Translation Lookaside Buffer (cache)
    this.tlbMaxSize = 1024; // Max TLB entries
    
    // Page table entry flags
    this.PTE_PRESENT = 1n << 0n;      // Bit 0: Present
    this.PTE_WRITABLE = 1n << 1n;     // Bit 1: Writable
    this.PTE_USER = 1n << 2n;         // Bit 2: User accessible
    this.PTE_PWT = 1n << 3n;          // Bit 3: Page Write Through
    this.PTE_PCD = 1n << 4n;          // Bit 4: Page Cache Disable
    this.PTE_ACCESSED = 1n << 5n;     // Bit 5: Accessed
    this.PTE_DIRTY = 1n << 6n;        // Bit 6: Dirty
    this.PTE_PS = 1n << 7n;           // Bit 7: Page Size (for 2MB/1GB pages)
    this.PTE_GLOBAL = 1n << 8n;       // Bit 8: Global
    this.PTE_XD = 1n << 63n;          // Bit 63: Execute Disable (NX bit)
    
    // Page sizes
    this.PAGE_SIZE_4KB = 4096;
    this.PAGE_SIZE_2MB = 2 * 1024 * 1024;
    this.PAGE_SIZE_1GB = 1024 * 1024 * 1024;
  }

  /**
   * Set CR3 register (page table base)
   * @param {bigint} cr3 - CR3 value
   */
  setCR3(cr3) {
    this.cr3 = cr3 & 0xFFFFFFFFFFFFF000n; // Clear lower 12 bits (must be page-aligned)
    this.invalidateTLB(); // Invalidate TLB when CR3 changes
    console.log(`VirtualMemory: CR3 set to 0x${this.cr3.toString(16)}`);
  }

  /**
   * Get CR3 register
   * @returns {bigint} - CR3 value
   */
  getCR3() {
    return this.cr3;
  }

  /**
   * Invalidate TLB (clear cache)
   */
  invalidateTLB() {
    this.tlb.clear();
  }

  /**
   * Invalidate specific TLB entry
   * @param {bigint} virtualAddress - Virtual address to invalidate
   */
  invalidateTLBEntry(virtualAddress) {
    const page = virtualAddress & 0xFFFFFFFFFFFFF000n; // Page-aligned address
    this.tlb.delete(page);
  }

  /**
   * Get page table entry for a virtual address
   * @param {bigint} virtualAddress - Virtual address
   * @returns {bigint|null} - Page table entry or null if not present
   */
  getPTE(virtualAddress) {
    // Check TLB first
    const page = virtualAddress & 0xFFFFFFFFFFFFF000n;
    if (this.tlb.has(page)) {
      const tlbEntry = this.tlb.get(page);
      if (tlbEntry.present) {
        return tlbEntry.pte || null;
      }
    }

    // If CR3 is 0, paging is disabled
    if (this.cr3 === 0n) {
      return null;
    }

    // Walk page tables to get PTE
    try {
      // Level 0: PML4
      const pml4Index = this.getPageTableIndex(virtualAddress, 0);
      const pml4EntryAddr = this.cr3 + BigInt(pml4Index * 8);
      const pml4Entry = this.readPTE(pml4EntryAddr);
      
      if ((pml4Entry & this.PTE_PRESENT) === 0n) {
        return null;
      }
      
      const pdptBase = pml4Entry & 0xFFFFFFFFFFFFF000n;
      
      // Level 1: PDPT
      const pdptIndex = this.getPageTableIndex(virtualAddress, 1);
      const pdptEntryAddr = pdptBase + BigInt(pdptIndex * 8);
      const pdptEntry = this.readPTE(pdptEntryAddr);
      
      if ((pdptEntry & this.PTE_PRESENT) === 0n) {
        return null;
      }
      
      // Check for 1GB page
      if ((pdptEntry & this.PTE_PS) !== 0n) {
        return pdptEntry;
      }
      
      const pdBase = pdptEntry & 0xFFFFFFFFFFFFF000n;
      
      // Level 2: PD
      const pdIndex = this.getPageTableIndex(virtualAddress, 2);
      const pdEntryAddr = pdBase + BigInt(pdIndex * 8);
      const pdEntry = this.readPTE(pdEntryAddr);
      
      if ((pdEntry & this.PTE_PRESENT) === 0n) {
        return null;
      }
      
      // Check for 2MB page
      if ((pdEntry & this.PTE_PS) !== 0n) {
        return pdEntry;
      }
      
      const ptBase = pdEntry & 0xFFFFFFFFFFFFF000n;
      
      // Level 3: PT (4KB page)
      const ptIndex = this.getPageTableIndex(virtualAddress, 3);
      const ptEntryAddr = ptBase + BigInt(ptIndex * 8);
      const ptEntry = this.readPTE(ptEntryAddr);
      
      return ptEntry;
    } catch (error) {
      console.warn(`VirtualMemory: Error getting PTE for 0x${virtualAddress.toString(16)}:`, error);
      return null;
    }
  }

  /**
   * Extract page table index from address
   * @param {bigint} address - Virtual address
   * @param {number} level - Page table level (0-3)
   * @returns {number} - Index in page table
   */
  getPageTableIndex(address, level) {
    // x86-64 4-level paging:
    // Bits 47-39: PML4 index
    // Bits 38-30: PDPT index
    // Bits 29-21: PD index
    // Bits 20-12: PT index
    // Bits 11-0:  Offset within page
    
    const shifts = [39, 30, 21, 12];
    const masks = [0x1FFn, 0x1FFn, 0x1FFn, 0x1FFn];
    
    if (level < 0 || level > 3) {
      throw new Error(`Invalid page table level: ${level}`);
    }
    
    const shift = BigInt(shifts[level]);
    const mask = masks[level];
    return Number((address >> shift) & mask);
  }

  /**
   * Read page table entry
   * @param {bigint} pteAddress - Physical address of PTE
   * @returns {bigint} - Page table entry value
   */
  readPTE(pteAddress) {
    const low = BigInt(this.physicalMemory.readDword(Number(pteAddress)));
    const high = BigInt(this.physicalMemory.readDword(Number(pteAddress + 4n)));
    return low | (high << 32n);
  }

  /**
   * Write page table entry
   * @param {bigint} pteAddress - Physical address of PTE
   * @param {bigint} value - Page table entry value
   */
  writePTE(pteAddress, value) {
    this.physicalMemory.writeDword(Number(pteAddress), Number(value & 0xFFFFFFFFn));
    this.physicalMemory.writeDword(Number(pteAddress + 4n), Number((value >> 32n) & 0xFFFFFFFFn));
  }

  /**
   * Allocate a page table page
   * @returns {bigint} - Physical address of allocated page
   */
  allocatePageTable() {
    // Allocate a 4KB page for page table
    // We'll use a high address range for page tables (0x10000000+)
    const pageTableBase = 0x10000000n;
    let offset = 0n;
    
    // Find free page
    while (true) {
      const addr = pageTableBase + offset;
      // Check if page is free (all zeros)
      let isFree = true;
      for (let i = 0; i < 4096; i += 8) {
        const val = this.readPTE(addr + BigInt(i));
        if (val !== 0n) {
          isFree = false;
          break;
        }
      }
      
      if (isFree) {
        // Initialize page table to zeros
        for (let i = 0; i < 4096; i += 8) {
          this.writePTE(addr + BigInt(i), 0n);
        }
        return addr;
      }
      
      offset += 4096n;
      if (offset > 0x10000000n) { // Limit search
        throw new Error('VirtualMemory: Could not allocate page table');
      }
    }
  }

  /**
   * Create page table entry
   * @param {bigint} physicalAddress - Physical address
   * @param {bigint} flags - Page flags
   * @returns {bigint} - Page table entry
   */
  createPTE(physicalAddress, flags) {
    // Ensure physical address is page-aligned
    const aligned = physicalAddress & 0xFFFFFFFFFFFFF000n;
    return aligned | (flags & 0xFFFn); // Lower 12 bits are flags
  }

  /**
   * Translate virtual address to physical address
   * @param {bigint} virtualAddress - Virtual address
   * @param {boolean} write - Is this a write operation?
   * @returns {bigint|null} - Physical address or null if page fault
   */
  translateAddress(virtualAddress, write = false) {
    // Check TLB first
    const page = virtualAddress & 0xFFFFFFFFFFFFF000n;
    if (this.tlb.has(page)) {
      const tlbEntry = this.tlb.get(page);
      // Check if entry is still valid
      if (tlbEntry.present) {
        const offset = virtualAddress & 0xFFFn; // Lower 12 bits
        return tlbEntry.physical + BigInt(offset);
      }
    }

    // If CR3 is 0, paging is disabled - use identity mapping
    if (this.cr3 === 0n) {
      return virtualAddress;
    }

    // Walk page tables
    try {
      // Level 0: PML4
      const pml4Index = this.getPageTableIndex(virtualAddress, 0);
      const pml4EntryAddr = this.cr3 + BigInt(pml4Index * 8);
      const pml4Entry = this.readPTE(pml4EntryAddr);
      
      if ((pml4Entry & this.PTE_PRESENT) === 0n) {
        return null; // Page fault
      }
      
      const pdptBase = pml4Entry & 0xFFFFFFFFFFFFF000n;
      
      // Level 1: PDPT
      const pdptIndex = this.getPageTableIndex(virtualAddress, 1);
      const pdptEntryAddr = pdptBase + BigInt(pdptIndex * 8);
      const pdptEntry = this.readPTE(pdptEntryAddr);
      
      if ((pdptEntry & this.PTE_PRESENT) === 0n) {
        return null; // Page fault
      }
      
      // Check for 1GB page
      if ((pdptEntry & this.PTE_PS) !== 0n) {
        const physicalBase = pdptEntry & 0xFFFFFFFFC0000000n; // 1GB aligned
        const offset = virtualAddress & 0x3FFFFFFFn; // Lower 30 bits
        const physical = physicalBase + offset;
        
        // Update TLB
        this.updateTLB(page, physical, pdptEntry);
        return physical;
      }
      
      const pdBase = pdptEntry & 0xFFFFFFFFFFFFF000n;
      
      // Level 2: PD
      const pdIndex = this.getPageTableIndex(virtualAddress, 2);
      const pdEntryAddr = pdBase + BigInt(pdIndex * 8);
      const pdEntry = this.readPTE(pdEntryAddr);
      
      if ((pdEntry & this.PTE_PRESENT) === 0n) {
        return null; // Page fault
      }
      
      // Check for 2MB page
      if ((pdEntry & this.PTE_PS) !== 0n) {
        const physicalBase = pdEntry & 0xFFFFFFFFFFFFE00000n; // 2MB aligned
        const offset = virtualAddress & 0x1FFFFFn; // Lower 21 bits
        const physical = physicalBase + offset;
        
        // Update TLB
        this.updateTLB(page, physical, pdEntry);
        return physical;
      }
      
      const ptBase = pdEntry & 0xFFFFFFFFFFFFF000n;
      
      // Level 3: PT (4KB page)
      const ptIndex = this.getPageTableIndex(virtualAddress, 3);
      const ptEntryAddr = ptBase + BigInt(ptIndex * 8);
      const ptEntry = this.readPTE(ptEntryAddr);
      
      if ((ptEntry & this.PTE_PRESENT) === 0n) {
        return null; // Page fault
      }
      
      const physicalBase = ptEntry & 0xFFFFFFFFFFFFF000n;
      const offset = virtualAddress & 0xFFFn; // Lower 12 bits
      const physical = physicalBase + offset;
      
      // Update accessed flag
      if ((ptEntry & this.PTE_ACCESSED) === 0n) {
        const newEntry = ptEntry | this.PTE_ACCESSED;
        this.writePTE(ptEntryAddr, newEntry);
      }
      
      // Update dirty flag for writes
      if (write && (ptEntry & this.PTE_DIRTY) === 0n) {
        const newEntry = ptEntry | this.PTE_DIRTY;
        this.writePTE(ptEntryAddr, newEntry);
      }
      
      // Update TLB
      this.updateTLB(page, physical, ptEntry);
      
      return physical;
    } catch (error) {
      console.error('VirtualMemory: Address translation error:', error);
      return null; // Page fault
    }
  }

  /**
   * Update TLB entry
   * @param {bigint} virtualPage - Virtual page address
   * @param {bigint} physicalAddress - Physical address
   * @param {bigint} pte - Page table entry
   */
  updateTLB(virtualPage, physicalAddress, pte) {
    // Limit TLB size
    if (this.tlb.size >= this.tlbMaxSize) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.tlb.keys().next().value;
      this.tlb.delete(firstKey);
    }
    
    const physicalPage = physicalAddress & 0xFFFFFFFFFFFFF000n;
    this.tlb.set(virtualPage, {
      physical: physicalPage,
      present: (pte & this.PTE_PRESENT) !== 0n,
      writable: (pte & this.PTE_WRITABLE) !== 0n,
      user: (pte & this.PTE_USER) !== 0n,
      pte: pte, // Store full PTE for write protection checks
    });
  }

  /**
   * Setup identity mapping for a range
   * Maps virtual addresses to same physical addresses
   * @param {bigint} startAddress - Start address
   * @param {bigint} endAddress - End address
   * @param {bigint} flags - Page flags
   */
  setupIdentityMapping(startAddress, endAddress, flags) {
    if (this.cr3 === 0n) {
      // Allocate page tables
      const pml4 = this.allocatePageTable();
      this.cr3 = pml4;
    }
    
    const pml4Base = this.cr3;
    const defaultFlags = flags | this.PTE_PRESENT | this.PTE_WRITABLE;
    
    // For simplicity, we'll create 4KB pages
    for (let addr = startAddress; addr < endAddress; addr += 4096n) {
      const virtualAddr = addr;
      const physicalAddr = addr; // Identity mapping
      
      // Walk/create page tables
      const pml4Index = this.getPageTableIndex(virtualAddr, 0);
      let pml4EntryAddr = pml4Base + BigInt(pml4Index * 8);
      let pml4Entry = this.readPTE(pml4EntryAddr);
      
      if ((pml4Entry & this.PTE_PRESENT) === 0n) {
        const pdpt = this.allocatePageTable();
        pml4Entry = this.createPTE(pdpt, defaultFlags);
        this.writePTE(pml4EntryAddr, pml4Entry);
      }
      
      const pdptBase = pml4Entry & 0xFFFFFFFFFFFFF000n;
      const pdptIndex = this.getPageTableIndex(virtualAddr, 1);
      let pdptEntryAddr = pdptBase + BigInt(pdptIndex * 8);
      let pdptEntry = this.readPTE(pdptEntryAddr);
      
      if ((pdptEntry & this.PTE_PRESENT) === 0n) {
        const pd = this.allocatePageTable();
        pdptEntry = this.createPTE(pd, defaultFlags);
        this.writePTE(pdptEntryAddr, pdptEntry);
      }
      
      const pdBase = pdptEntry & 0xFFFFFFFFFFFFF000n;
      const pdIndex = this.getPageTableIndex(virtualAddr, 2);
      let pdEntryAddr = pdBase + BigInt(pdIndex * 8);
      let pdEntry = this.readPTE(pdEntryAddr);
      
      if ((pdEntry & this.PTE_PRESENT) === 0n) {
        const pt = this.allocatePageTable();
        pdEntry = this.createPTE(pt, defaultFlags);
        this.writePTE(pdEntryAddr, pdEntry);
      }
      
      const ptBase = pdEntry & 0xFFFFFFFFFFFFF000n;
      const ptIndex = this.getPageTableIndex(virtualAddr, 3);
      const ptEntryAddr = ptBase + BigInt(ptIndex * 8);
      const ptEntry = this.createPTE(physicalAddr, defaultFlags);
      this.writePTE(ptEntryAddr, ptEntry);
    }
    
    console.log(`VirtualMemory: Identity mapping set up for 0x${startAddress.toString(16)}-0x${endAddress.toString(16)}`);
  }

  /**
   * Initialize virtual memory
   * Sets up basic identity mapping for low memory
   */
  init() {
    console.log('VirtualMemory: Initializing virtual memory manager...');
    // Start with paging disabled (CR3 = 0)
    this.cr3 = 0n;
    this.invalidateTLB();
    console.log('VirtualMemory: Virtual memory initialized (paging disabled by default)');
  }
}

export default VirtualMemoryManager;

