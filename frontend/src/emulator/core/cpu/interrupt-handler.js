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
   */
  handleInterrupt(vector, errorCode = 0) {
    console.log(`Interrupt Handler: Handling interrupt 0x${vector.toString(16)}`);

    const handler = this.interruptHandlers.get(vector);
    if (handler) {
      // Save current state
      this.saveState();

      // Call handler
      handler(errorCode);

      // Restore state (if handler didn't modify it)
      // this.restoreState();
    } else {
      console.warn(`Interrupt Handler: No handler for interrupt 0x${vector.toString(16)}`);
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
    console.error('Interrupt: Invalid Opcode (0x06)');
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
    console.error('Interrupt: General Protection Fault (0x0D)');
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

