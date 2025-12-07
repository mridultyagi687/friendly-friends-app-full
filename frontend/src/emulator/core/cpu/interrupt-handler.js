/**
 * Interrupt Handler
 * 
 * Handles x86-64 interrupts and exceptions
 */

class InterruptHandler {
  constructor(cpu, memory) {
    this.cpu = cpu;
    this.memory = memory;
    this.interruptTable = new Map(); // IDT (Interrupt Descriptor Table)
    this.interruptHandlers = new Map();
  }

  /**
   * Initialize interrupt handler
   */
  init() {
    console.log('Interrupt Handler: Initializing...');
    
    // Initialize IDT in memory (if CPU has IDT base)
    this.idtBase = null;
    this.idtLimit = 0;
    
    // Register common interrupt handlers
    this.registerHandler(0x00, this.handleDivideError.bind(this));
    this.registerHandler(0x01, this.handleDebug.bind(this));
    this.registerHandler(0x02, this.handleNMI.bind(this));
    this.registerHandler(0x03, this.handleBreakpoint.bind(this));
    this.registerHandler(0x04, this.handleOverflow.bind(this));
    this.registerHandler(0x05, this.handleBoundsCheck.bind(this));
    this.registerHandler(0x06, this.handleInvalidOpcode.bind(this));
    this.registerHandler(0x07, this.handleDeviceNotAvailable.bind(this));
    this.registerHandler(0x08, this.handleDoubleFault.bind(this));
    this.registerHandler(0x0A, this.handleInvalidTSS.bind(this));
    this.registerHandler(0x0B, this.handleSegmentNotPresent.bind(this));
    this.registerHandler(0x0C, this.handleStackFault.bind(this));
    this.registerHandler(0x0D, this.handleGeneralProtection.bind(this));
    this.registerHandler(0x0E, this.handlePageFault.bind(this));
    this.registerHandler(0x10, this.handleMathFault.bind(this));
    this.registerHandler(0x11, this.handleAlignmentCheck.bind(this));
    this.registerHandler(0x12, this.handleMachineCheck.bind(this));
    this.registerHandler(0x13, this.handleSIMDFloatingPoint.bind(this));
    this.registerHandler(0x14, this.handleVirtualization.bind(this));
    
    // Software interrupts
    this.registerHandler(0x80, this.handleSystemCall.bind(this)); // Linux syscall
    this.registerHandler(0x2E, this.handleSystemCall.bind(this)); // Windows syscall
    
    // Setup default IDT if CPU has IDT info
    this.setupDefaultIDT();
  }

  /**
   * Setup default IDT in memory
   * Creates IDT entries for all registered handlers
   */
  setupDefaultIDT() {
    if (!this.memory || !this.cpu) {
      return;
    }
    
    // Allocate IDT (256 entries * 16 bytes = 4096 bytes)
    const idtSize = 256 * 16;
    const idtBase = 0x1000n; // Place IDT at 0x1000
    
    // Check if CPU has IDT base set
    if (this.cpu.idt && this.cpu.idt.base) {
      this.idtBase = BigInt(this.cpu.idt.base);
      this.idtLimit = this.cpu.idt.limit || 0xFFFF;
    } else {
      // Use default location
      this.idtBase = idtBase;
      this.idtLimit = idtSize - 1;
      
      // Initialize IDT entries
      for (let i = 0; i < 256; i++) {
        this.setIDTEntry(i, 0n, 0, 0, false);
      }
      
      console.log(`Interrupt Handler: Default IDT setup at 0x${this.idtBase.toString(16)}`);
    }
  }

  /**
   * Set IDT entry
   * @param {number} vector - Interrupt vector (0-255)
   * @param {bigint} handlerAddress - Handler address
   * @param {number} selector - Code segment selector
   * @param {number} type - Gate type (0xE = interrupt, 0xF = trap)
   * @param {boolean} present - Present flag
   */
  setIDTEntry(vector, handlerAddress, selector = 0x08, type = 0xE, present = true) {
    if (!this.memory || vector < 0 || vector > 255) {
      return;
    }
    
    if (this.idtBase === null) {
      this.setupDefaultIDT();
    }
    
    const entryAddr = Number(this.idtBase) + (vector * 16);
    
    // IDT entry format (16 bytes):
    // Offset 0-1: Handler offset (low 16 bits)
    // Offset 2-3: Code segment selector
    // Offset 4: IST (Interrupt Stack Table) - 0
    // Offset 5: Type and attributes
    //   Bit 0-3: Gate type (0xE = interrupt, 0xF = trap)
    //   Bit 4: Storage segment (0 for interrupt gates)
    //   Bit 5-6: DPL (Descriptor Privilege Level) - 0
    //   Bit 7: Present (1 = present)
    // Offset 6-7: Handler offset (bits 16-31)
    // Offset 8-15: Handler offset (bits 32-63) - for 64-bit
    
    const offsetLow = Number(handlerAddress & 0xFFFFn);
    const offsetMid = Number((handlerAddress >> 16n) & 0xFFFFn);
    const offsetHigh = Number((handlerAddress >> 32n) & 0xFFFFFFFFn);
    
    const attributes = (present ? 0x80 : 0x00) | (type & 0x0F);
    
    // Write IDT entry
    this.memory.writeWord(entryAddr, offsetLow);
    this.memory.writeWord(entryAddr + 2, selector);
    this.memory.writeByte(entryAddr + 4, 0); // IST
    this.memory.writeByte(entryAddr + 5, attributes);
    this.memory.writeWord(entryAddr + 6, offsetMid);
    this.memory.writeDword(entryAddr + 8, offsetHigh);
  }

  /**
   * Get IDT entry
   * @param {number} vector - Interrupt vector
   * @returns {Object|null} - IDT entry info or null
   */
  getIDTEntry(vector) {
    if (!this.memory || this.idtBase === null || vector < 0 || vector > 255) {
      return null;
    }
    
    const entryAddr = Number(this.idtBase) + (vector * 16);
    
    const offsetLow = this.memory.readWord(entryAddr);
    const selector = this.memory.readWord(entryAddr + 2);
    const attributes = this.memory.readByte(entryAddr + 5);
    const offsetMid = this.memory.readWord(entryAddr + 6);
    const offsetHigh = this.memory.readDword(entryAddr + 8);
    
    const handlerAddress = BigInt(offsetLow) | (BigInt(offsetMid) << 16n) | (BigInt(offsetHigh) << 32n);
    const present = (attributes & 0x80) !== 0;
    const type = attributes & 0x0F;
    
    return {
      handlerAddress,
      selector,
      type,
      present,
    };
  }

  /**
   * Register interrupt handler
   * @param {number} vector - Interrupt vector number
   * @param {Function} handler - Handler function
   */
  registerHandler(vector, handler) {
    this.interruptHandlers.set(vector, handler);
  }

  /**
   * Handle interrupt
   * @param {number} vector - Interrupt vector
   * @param {number} errorCode - Error code (if applicable)
   * @returns {boolean} - True if handled successfully
   */
  handleInterrupt(vector, errorCode = 0) {
    const handler = this.interruptHandlers.get(vector);
    if (handler) {
      try {
        // Save current state
        this.saveState();

        // Call handler
        const result = handler(errorCode);

        // Restore state (if handler didn't modify it)
        // this.restoreState();
        
        // Return result if handler returned one, otherwise true
        return result !== false;
      } catch (e) {
        console.error(`Interrupt Handler: Error handling interrupt 0x${vector.toString(16)}:`, e);
        return false;
      }
    } else {
      console.warn(`Interrupt Handler: No handler for interrupt 0x${vector.toString(16)}`);
      return false;
    }
  }

  /**
   * Save CPU state before interrupt
   */
  saveState() {
    // TODO: Save registers, flags, etc. to stack
    // This would be done by the CPU when INT instruction is executed
  }

  /**
   * Restore CPU state after interrupt
   */
  restoreState() {
    // TODO: Restore registers, flags, etc. from stack
    // This would be done by IRET instruction
  }

  // Interrupt handlers
  handleDivideError(errorCode) {
    console.error('Interrupt: Divide Error (0x00)');
  }

  handleDebug(errorCode) {
    console.log('Interrupt: Debug Exception (0x01)');
  }

  handleNMI(errorCode) {
    console.warn('Interrupt: Non-Maskable Interrupt (0x02)');
  }

  handleBreakpoint(errorCode) {
    console.log('Interrupt: Breakpoint (0x03)');
  }

  handleOverflow(errorCode) {
    console.log('Interrupt: Overflow (0x04)');
  }

  handleBoundsCheck(errorCode) {
    console.error('Interrupt: Bounds Check Failed (0x05)');
  }

  handleInvalidOpcode(errorCode) {
    const rip = this.cpu.registers.rip || 0n;
    console.error(`Interrupt: Invalid Opcode (0x06) at RIP=0x${rip.toString(16)}`);
    
    // Try to skip the invalid instruction
    // This is a simplified approach - in reality, we'd decode and skip properly
    if (this.cpu && this.cpu.registers) {
      // Advance RIP by 1 byte (minimal skip)
      // A real handler would decode the instruction to skip it properly
      this.cpu.registers.rip += 1n;
      console.log(`Invalid Opcode: Skipped instruction, RIP now 0x${this.cpu.registers.rip.toString(16)}`);
    }
  }

  handleDeviceNotAvailable(errorCode) {
    console.warn('Interrupt: Device Not Available (0x07)');
  }

  handleDoubleFault(errorCode) {
    console.error('Interrupt: Double Fault (0x08) - System may be unstable');
  }

  handleInvalidTSS(errorCode) {
    console.error('Interrupt: Invalid TSS (0x0A)');
  }

  handleSegmentNotPresent(errorCode) {
    console.error('Interrupt: Segment Not Present (0x0B)');
  }

  handleStackFault(errorCode) {
    console.error('Interrupt: Stack Fault (0x0C)');
  }

  handleGeneralProtection(errorCode) {
    console.error(`Interrupt: General Protection Fault (0x0D) - Error Code: 0x${errorCode.toString(16)}`);
    
    // GP fault can occur for many reasons:
    // - Invalid segment access
    // - Privilege violation
    // - Invalid memory access
    // - Null segment selector
    
    // Try to recover if possible
    // For now, just log the error
    // In a real system, this would check the error code and handle accordingly
  }

  handlePageFault(errorCode) {
    // Page fault error code format:
    // Bit 0: P (Present) - 0 = page not present, 1 = protection violation
    // Bit 1: W/R (Write/Read) - 0 = read, 1 = write
    // Bit 2: U/S (User/Supervisor) - 0 = supervisor, 1 = user
    // Bit 3: RSVD - Reserved bit set
    // Bit 4: I/D (Instruction/Data) - 0 = data, 1 = instruction fetch
    
    const present = (errorCode & 0x01) === 0;
    const write = (errorCode & 0x02) !== 0;
    const user = (errorCode & 0x04) !== 0;
    const instruction = (errorCode & 0x10) !== 0;
    
    // Get faulting address from CR2
    const faultAddress = this.cpu.registers.cr2 || 0n;
    
    console.log(`Interrupt: Page Fault (0x0E) at 0x${faultAddress.toString(16)}`);
    console.log(`  Error Code: 0x${errorCode.toString(16)} (P=${present}, W=${write}, U=${user}, I=${instruction})`);
    
    // Try to handle the page fault
    if (this.memory && this.memory.getVirtualMemory) {
      const vmm = this.memory.getVirtualMemory();
      
      // If page not present, try to map it
      if (present) {
        // Page not present - try demand paging
        const page = faultAddress & 0xFFFFFFFFFFFFF000n; // Page-aligned
        
        // Allocate a physical page
        const physicalPage = this.allocatePhysicalPage(page);
        if (physicalPage !== null) {
          // Create page table entry
          const flags = vmm.PTE_PRESENT | vmm.PTE_WRITABLE | vmm.PTE_USER;
          const pte = vmm.createPTE(physicalPage, flags);
          
          // Find or create page table entry
          const pteAddr = this.findOrCreatePTE(vmm, faultAddress);
          if (pteAddr !== null) {
            vmm.writePTE(pteAddr, pte);
            vmm.invalidateTLBEntry(faultAddress);
            console.log(`Page Fault: Mapped page 0x${page.toString(16)} to 0x${physicalPage.toString(16)}`);
            return true; // Page fault handled
          }
        }
      }
    }
    
    // If we can't handle it, log error
    console.error(`Page Fault: Could not handle page fault at 0x${faultAddress.toString(16)}`);
    return false; // Page fault not handled
  }

  /**
   * Allocate a physical page for demand paging
   * @param {bigint} virtualPage - Virtual page address
   * @returns {bigint|null} - Physical page address or null
   */
  allocatePhysicalPage(virtualPage) {
    if (!this.memory) {
      return null;
    }
    
    // Try to allocate a page from physical memory
    // For now, use identity mapping (virtual = physical)
    // In a real system, we'd use a page frame allocator
    const physicalPage = virtualPage;
    
    // Ensure the page is allocated in physical memory
    const pageNumber = this.memory.getPageNumber(Number(physicalPage));
    const page = this.memory.allocatePage(pageNumber);
    
    if (page) {
      return physicalPage;
    }
    
    return null;
  }

  /**
   * Find or create page table entry for virtual address
   * @param {VirtualMemoryManager} vmm - Virtual memory manager
   * @param {bigint} virtualAddress - Virtual address
   * @returns {bigint|null} - PTE address or null
   */
  findOrCreatePTE(vmm, virtualAddress) {
    if (vmm.getCR3() === 0n) {
      return null; // Paging not enabled
    }
    
    try {
      // Walk page tables to find/create PTE
      const pml4Index = vmm.getPageTableIndex(virtualAddress, 0);
      const pml4EntryAddr = vmm.getCR3() + BigInt(pml4Index * 8);
      let pml4Entry = vmm.readPTE(pml4EntryAddr);
      
      if ((pml4Entry & vmm.PTE_PRESENT) === 0n) {
        // Create PDPT
        const pdpt = vmm.allocatePageTable();
        pml4Entry = vmm.createPTE(pdpt, vmm.PTE_PRESENT | vmm.PTE_WRITABLE);
        vmm.writePTE(pml4EntryAddr, pml4Entry);
      }
      
      const pdptBase = pml4Entry & 0xFFFFFFFFFFFFF000n;
      const pdptIndex = vmm.getPageTableIndex(virtualAddress, 1);
      let pdptEntryAddr = pdptBase + BigInt(pdptIndex * 8);
      let pdptEntry = vmm.readPTE(pdptEntryAddr);
      
      if ((pdptEntry & vmm.PTE_PRESENT) === 0n) {
        // Create PD
        const pd = vmm.allocatePageTable();
        pdptEntry = vmm.createPTE(pd, vmm.PTE_PRESENT | vmm.PTE_WRITABLE);
        vmm.writePTE(pdptEntryAddr, pdptEntry);
      }
      
      const pdBase = pdptEntry & 0xFFFFFFFFFFFFF000n;
      const pdIndex = vmm.getPageTableIndex(virtualAddress, 2);
      let pdEntryAddr = pdBase + BigInt(pdIndex * 8);
      let pdEntry = vmm.readPTE(pdEntryAddr);
      
      if ((pdEntry & vmm.PTE_PRESENT) === 0n) {
        // Create PT
        const pt = vmm.allocatePageTable();
        pdEntry = vmm.createPTE(pt, vmm.PTE_PRESENT | vmm.PTE_WRITABLE);
        vmm.writePTE(pdEntryAddr, pdEntry);
      }
      
      const ptBase = pdEntry & 0xFFFFFFFFFFFFF000n;
      const ptIndex = vmm.getPageTableIndex(virtualAddress, 3);
      const ptEntryAddr = ptBase + BigInt(ptIndex * 8);
      
      return ptEntryAddr;
    } catch (error) {
      console.error('Page Fault: Error finding/creating PTE:', error);
      return null;
    }
  }

  handleMathFault(errorCode) {
    console.error('Interrupt: Math Fault (0x10)');
  }

  handleAlignmentCheck(errorCode) {
    console.error('Interrupt: Alignment Check (0x11)');
  }

  handleMachineCheck(errorCode) {
    console.error('Interrupt: Machine Check (0x12)');
  }

  handleSIMDFloatingPoint(errorCode) {
    console.error('Interrupt: SIMD Floating Point Exception (0x13)');
  }

  handleVirtualization(errorCode) {
    console.error('Interrupt: Virtualization Exception (0x14)');
  }

  handleSystemCall(errorCode) {
    console.log('Interrupt: System Call');
    // TODO: Handle system calls (read, write, open, etc.)
  }
}

export default InterruptHandler;

