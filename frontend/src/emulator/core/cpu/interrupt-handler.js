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
    console.error('Interrupt: Page Fault (0x0E)');
    // TODO: Handle page fault - load page from disk, etc.
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

