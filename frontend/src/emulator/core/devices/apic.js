/**
 * APIC (Advanced Programmable Interrupt Controller) Emulation
 * 
 * Windows requires APIC for interrupt handling
 */

class APIC {
  constructor(memory, cpu) {
    this.memory = memory;
    this.cpu = cpu;
    
    // Local APIC registers (simplified)
    this.registers = {
      // APIC ID Register
      APIC_ID: 0x0,
      
      // APIC Version Register
      APIC_VERSION: 0x00000014, // Version 0x14, 24 entries in LVT
      
      // Task Priority Register
      TPR: 0x0,
      
      // End of Interrupt Register
      EOI: 0x0,
      
      // Spurious Interrupt Vector Register
      SVR: 0x000001FF, // APIC enabled, spurious vector 0xFF
      
      // Local Vector Table (LVT) entries
      LVT_TIMER: 0x00010000, // Timer, masked
      LVT_THERMAL: 0x00010000, // Thermal, masked
      LVT_PERF: 0x00010000, // Performance, masked
      LVT_LINT0: 0x00010000, // Local interrupt 0, masked
      LVT_LINT1: 0x00010000, // Local interrupt 1, masked
      LVT_ERROR: 0x00010000, // Error, masked
      
      // Initial Count Register (for timer)
      INITIAL_COUNT: 0x0,
      
      // Current Count Register
      CURRENT_COUNT: 0x0,
      
      // Divide Configuration Register
      DIVIDE_CONFIG: 0x0,
    };
    
    // APIC base address (MSR 0x1B)
    this.apicBase = 0xFEE00000;
    
    this.initialized = false;
  }

  /**
   * Initialize APIC
   */
  init() {
    console.log('APIC: Initializing...');
    
    // Set APIC ID (processor ID)
    this.registers.APIC_ID = 0; // Single processor
    
    // Enable APIC (set bit 8 in SVR)
    this.registers.SVR |= 0x100;
    
    this.initialized = true;
    console.log('APIC: Initialized (Local APIC enabled)');
  }

  /**
   * Read APIC register
   * @param {number} offset - Register offset from APIC base
   * @returns {number} - Register value
   */
  readRegister(offset) {
    const registerName = this.getRegisterName(offset);
    if (registerName && this.registers.hasOwnProperty(registerName)) {
      return this.registers[registerName];
    }
    
    // Default: return 0 for unimplemented registers
    return 0;
  }

  /**
   * Write APIC register
   * @param {number} offset - Register offset from APIC base
   * @param {number} value - Value to write
   */
  writeRegister(offset, value) {
    const registerName = this.getRegisterName(offset);
    if (registerName && this.registers.hasOwnProperty(registerName)) {
      this.registers[registerName] = value;
      
      // Handle special register writes
      if (registerName === 'EOI') {
        // End of Interrupt - acknowledge interrupt
        this.handleEOI();
      } else if (registerName === 'INITIAL_COUNT') {
        // Start timer
        this.registers.CURRENT_COUNT = value;
      }
    }
  }

  /**
   * Get register name from offset
   * @param {number} offset - Register offset
   * @returns {string|null} - Register name
   */
  getRegisterName(offset) {
    const registerMap = {
      0x020: 'APIC_ID',
      0x030: 'APIC_VERSION',
      0x080: 'TPR',
      0x0B0: 'EOI',
      0x0F0: 'SVR',
      0x320: 'LVT_TIMER',
      0x330: 'LVT_THERMAL',
      0x340: 'LVT_PERF',
      0x350: 'LVT_LINT0',
      0x360: 'LVT_LINT1',
      0x370: 'LVT_ERROR',
      0x380: 'INITIAL_COUNT',
      0x390: 'CURRENT_COUNT',
      0x3E0: 'DIVIDE_CONFIG',
    };
    
    return registerMap[offset] || null;
  }

  /**
   * Handle End of Interrupt
   */
  handleEOI() {
    // Acknowledge interrupt
    // In a real APIC, this would clear the interrupt request
    console.log('APIC: End of Interrupt acknowledged');
  }

  /**
   * Send IPI (Inter-Processor Interrupt)
   * @param {number} destination - Destination APIC ID
   * @param {number} vector - Interrupt vector
   */
  sendIPI(destination, vector) {
    console.log(`APIC: Sending IPI to APIC ${destination}, vector 0x${vector.toString(16)}`);
    // In a multi-processor system, this would send an interrupt to another CPU
    // For now, we're single-processor, so this is a no-op
  }

  /**
   * Get APIC base address
   * @returns {number} - APIC base address
   */
  getAPICBase() {
    return this.apicBase;
  }

  /**
   * Check if APIC is enabled
   * @returns {boolean} - True if APIC is enabled
   */
  isEnabled() {
    return this.initialized && (this.registers.SVR & 0x100) !== 0;
  }
}

export default APIC;

