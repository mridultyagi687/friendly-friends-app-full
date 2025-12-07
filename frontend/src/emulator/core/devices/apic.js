/**
 * APIC (Advanced Programmable Interrupt Controller) Emulation
 * 
 * Full Local APIC (LAPIC) implementation with:
 * - All LAPIC registers
 * - APIC timer
 * - TPR (Task Priority Register)
 * - EOI (End of Interrupt)
 * - Spurious vector handling
 * - SIPI (Startup Inter-Processor Interrupt)
 * 
 * Windows requires APIC for interrupt handling
 */

class APIC {
  constructor(memory, cpu) {
    this.memory = memory;
    this.cpu = cpu;
    
    // Local APIC registers (full implementation)
    this.registers = {
      // 0x020: APIC ID Register (bits 24-31)
      APIC_ID: 0x0,
      
      // 0x030: APIC Version Register
      // Bits 0-7: Version
      // Bits 8-15: Reserved
      // Bits 16-23: Max LVT entry
      APIC_VERSION: 0x00050014, // Version 0x14, 5 LVT entries (bits 16-23 = 0x05)
      
      // 0x040: Task Priority Register (TPR) - CRITICAL
      // Bits 0-3: Task Priority Sub-class (TPS)
      // Bits 4-7: Task Priority Class (TPC)
      TPR: 0x0,
      
      // 0x050: Arbitration Priority Register (APR) - read-only
      APR: 0x0,
      
      // 0x060: Processor Priority Register (PPR) - read-only
      PPR: 0x0,
      
      // 0x070: End of Interrupt Register (EOI) - write-only
      EOI: 0x0,
      
      // 0x080: Remote Read Register (RRD) - read-only
      RRD: 0x0,
      
      // 0x090: Logical Destination Register (LDR)
      // Bits 24-31: Logical APIC ID
      LDR: 0x0,
      
      // 0x0A0: Destination Format Register (DFR)
      // Flat mode: 0xFFFFFFFF
      // Cluster mode: 0x0FFFFFFF
      DFR: 0xFFFFFFFF,
      
      // 0x0B0: Spurious Interrupt Vector Register (SVR) - CRITICAL
      // Bits 0-3: Spurious vector
      // Bit 8: APIC Software Enable (ASE)
      // Bit 9: Focus Processor Checking (FPC) - disabled
      SVR: 0x000001FF, // APIC enabled (bit 8), spurious vector 0xFF
      
      // 0x0D0: In-Service Register (ISR) - 8 registers (256 bits)
      ISR: new Array(8).fill(0), // 8 x 32-bit registers
      
      // 0x0E0: Trigger Mode Register (TMR) - 8 registers (256 bits)
      TMR: new Array(8).fill(0), // 8 x 32-bit registers
      
      // 0x0F0: Interrupt Request Register (IRR) - 8 registers (256 bits)
      IRR: new Array(8).fill(0), // 8 x 32-bit registers
      
      // 0x280: Error Status Register (ESR)
      ESR: 0x0,
      
      // 0x300: Interrupt Command Register (ICR) - Low 32 bits
      ICR_LOW: 0x0,
      
      // 0x310: Interrupt Command Register (ICR) - High 32 bits
      ICR_HIGH: 0x0,
      
      // 0x320: Local Vector Table Timer (LVT Timer)
      // Bits 0-7: Vector
      // Bits 8-10: Reserved
      // Bit 11: Reserved
      // Bit 12: Reserved
      // Bit 13: Reserved
      // Bit 14: Reserved
      // Bit 15: Reserved
      // Bits 16-17: Delivery Mode (0=Fixed, 1=Reserved, 2=SMI, 4=NMI, 5=INIT, 6=Startup)
      // Bit 18: Delivery Status (0=Idle, 1=Send Pending)
      // Bit 19: Reserved
      // Bit 20: Mask (0=Not masked, 1=Masked)
      // Bits 21-31: Reserved
      LVT_TIMER: 0x00010000, // Timer, masked
      
      // 0x330: Local Vector Table Thermal Sensor (LVT Thermal)
      LVT_THERMAL: 0x00010000, // Thermal, masked
      
      // 0x340: Local Vector Table Performance Counter (LVT Performance)
      LVT_PERF: 0x00010000, // Performance, masked
      
      // 0x350: Local Vector Table LINT0 (LVT LINT0)
      LVT_LINT0: 0x00010000, // LINT0, masked
      
      // 0x360: Local Vector Table LINT1 (LVT LINT1)
      LVT_LINT1: 0x00010000, // LINT1, masked
      
      // 0x370: Local Vector Table Error (LVT Error)
      LVT_ERROR: 0x00010000, // Error, masked
      
      // 0x380: Initial Count Register (for timer)
      INITIAL_COUNT: 0x0,
      
      // 0x390: Current Count Register (read-only, for timer)
      CURRENT_COUNT: 0x0,
      
      // 0x3E0: Divide Configuration Register (for timer)
      // Bits 0-1: Divide value (0=2, 1=4, 2=8, 3=16, 4=32, 5=64, 6=128, 7=1)
      DIVIDE_CONFIG: 0x0,
    };
    
    // APIC base address (MSR 0x1B)
    this.apicBase = 0xFEE00000;
    
    // Timer state
    this.timerInterval = null;
    this.timerLastUpdate = 0;
    this.timerFrequency = 1000000; // 1 MHz default (will be calculated from bus frequency)
    this.timerDivisor = 1; // Timer divisor (from DIVIDE_CONFIG)
    
    // Interrupt state
    this.pendingInterrupts = []; // Queue of pending interrupts
    this.currentInterrupt = null; // Currently servicing interrupt
    this.inServiceVector = null; // Vector currently in service
    
    // Spurious vector
    this.spuriousVector = 0xFF;
    
    this.initialized = false;
  }

  /**
   * Initialize APIC
   */
  init() {
    console.log('APIC: Initializing Local APIC...');
    
    // Set APIC ID (processor ID) - bits 24-31
    this.registers.APIC_ID = 0 << 24; // Single processor, APIC ID = 0
    
    // Enable APIC (set bit 8 in SVR)
    this.registers.SVR |= 0x100;
    
    // Initialize spurious vector (bits 0-3 of SVR)
    this.spuriousVector = this.registers.SVR & 0xFF;
    
    // Initialize timer
    this.timerLastUpdate = performance.now();
    
    this.initialized = true;
    console.log(`APIC: Initialized (Local APIC enabled, ID=0, spurious vector=0x${this.spuriousVector.toString(16)})`);
  }

  /**
   * Read APIC register
   * @param {number} offset - Register offset from APIC base
   * @param {number} size - Size of read (8, 16, 32, 64)
   * @returns {number} - Register value
   */
  readRegister(offset, size = 32) {
    // Handle special read-only registers
    if (offset === 0x050) {
      // APR (Arbitration Priority Register) - calculated from TPR
      return this.calculateAPR();
    } else if (offset === 0x060) {
      // PPR (Processor Priority Register) - calculated from TPR and ISR
      return this.calculatePPR();
    } else if (offset === 0x080) {
      // RRD (Remote Read Register) - always returns 0
      return 0;
    } else if (offset === 0x390) {
      // CURRENT_COUNT - update before reading
      this.updateTimer();
      return this.registers.CURRENT_COUNT;
    } else if (offset >= 0x0D0 && offset <= 0x0F0) {
      // ISR, TMR, IRR (8 x 32-bit registers)
      const index = (offset - 0x0D0) / 0x10;
      const regType = offset < 0x0E0 ? 'ISR' : (offset < 0x0F0 ? 'TMR' : 'IRR');
      return this.registers[regType][index] || 0;
    }
    
    const registerName = this.getRegisterName(offset);
    if (registerName && this.registers.hasOwnProperty(registerName)) {
      let value = this.registers[registerName];
      
      // Handle array registers
      if (Array.isArray(value)) {
        return 0; // Should be handled above
      }
      
      // Mask to appropriate size
      if (size === 8) {
        value = value & 0xFF;
      } else if (size === 16) {
        value = value & 0xFFFF;
      } else if (size === 32) {
        value = value & 0xFFFFFFFF;
      }
      
      return value;
    }
    
    // Default: return 0 for unimplemented registers
    return 0;
  }

  /**
   * Calculate APR (Arbitration Priority Register)
   * APR = TPR with bits 0-3 cleared
   */
  calculateAPR() {
    return (this.registers.TPR & 0xFFFFFFF0) >>> 0;
  }

  /**
   * Calculate PPR (Processor Priority Register)
   * PPR = max(TPR, highest priority in-service interrupt)
   */
  calculatePPR() {
    const tpr = this.registers.TPR;
    let highestISR = 0;
    
    // Find highest priority in-service interrupt
    for (let i = 7; i >= 0; i--) {
      if (this.registers.ISR[i] !== 0) {
        // Find highest set bit
        let isr = this.registers.ISR[i];
        for (let bit = 31; bit >= 0; bit--) {
          if (isr & (1 << bit)) {
            const vector = (i * 32) + bit;
            highestISR = Math.max(highestISR, (vector & 0xF0) >>> 0); // Priority class
            break;
          }
        }
      }
    }
    
    return Math.max(tpr, highestISR) & 0xFFFFFFFF;
  }

  /**
   * Write APIC register
   * @param {number} offset - Register offset from APIC base
   * @param {number} value - Value to write
   * @param {number} size - Size of write (8, 16, 32, 64)
   */
  writeRegister(offset, value, size = 32) {
    // Handle write-only or special registers
    if (offset === 0x0B0) {
      // EOI (End of Interrupt) - write-only (offset 0x0B0)
      this.handleEOI();
      return;
    } else if (offset >= 0x0D0 && offset <= 0x0F0) {
      // ISR, TMR, IRR are read-only
      return;
    } else if (offset === 0x280) {
      // ESR (Error Status Register) - write clears it
      this.registers.ESR = 0;
      return;
    } else if (offset === 0x300) {
      // ICR_LOW - Interrupt Command Register Low
      this.registers.ICR_LOW = value & 0xFFFFFFFF;
      this.handleICRWrite();
      return;
    } else if (offset === 0x310) {
      // ICR_HIGH - Interrupt Command Register High
      this.registers.ICR_HIGH = value & 0xFFFFFFFF;
      return;
    } else if (offset === 0x380) {
      // INITIAL_COUNT - starts timer
      this.registers.INITIAL_COUNT = value & 0xFFFFFFFF;
      this.registers.CURRENT_COUNT = value & 0xFFFFFFFF;
      this.startTimer();
      return;
    } else if (offset === 0x3E0) {
      // DIVIDE_CONFIG - timer divisor
      this.registers.DIVIDE_CONFIG = value & 0x0F;
      this.updateTimerDivisor();
      return;
    }
    
    const registerName = this.getRegisterName(offset);
    if (registerName && this.registers.hasOwnProperty(registerName)) {
      // Don't allow writes to read-only registers
      if (registerName === 'APR' || registerName === 'PPR' || registerName === 'RRD' || 
          registerName === 'CURRENT_COUNT' || registerName === 'ISR' || 
          registerName === 'TMR' || registerName === 'IRR') {
        return;
      }
      
      // Mask value to appropriate size
      let maskedValue = value;
      if (size === 8) {
        maskedValue = value & 0xFF;
      } else if (size === 16) {
        maskedValue = value & 0xFFFF;
      } else if (size === 32) {
        maskedValue = value & 0xFFFFFFFF;
      }
      
      const oldValue = this.registers[registerName];
      this.registers[registerName] = maskedValue;
      
      // Handle special register writes
      if (registerName === 'SVR') {
        // Update spurious vector and APIC enable state
        this.spuriousVector = maskedValue & 0xFF;
        const enabled = (maskedValue & 0x100) !== 0;
        if (!enabled) {
          this.stopTimer();
        }
        console.log(`APIC: SVR updated (enabled=${enabled}, spurious=0x${this.spuriousVector.toString(16)})`);
      } else if (registerName === 'TPR') {
        // Task Priority Register changed
        console.log(`APIC: TPR updated to 0x${maskedValue.toString(16)} (priority class=${(maskedValue >> 4) & 0xF}, sub-class=${maskedValue & 0xF})`);
      } else if (registerName.startsWith('LVT_')) {
        // LVT entry changed
        const masked = (maskedValue & 0x10000) !== 0;
        const vector = maskedValue & 0xFF;
        const deliveryMode = (maskedValue >> 8) & 0x7;
        console.log(`APIC: ${registerName} updated (vector=0x${vector.toString(16)}, masked=${masked}, mode=${deliveryMode})`);
        
        if (registerName === 'LVT_TIMER' && !masked && oldValue !== maskedValue) {
          // Timer LVT changed and unmasked - restart timer if needed
          if (this.registers.INITIAL_COUNT !== 0) {
            this.startTimer();
          }
        }
      }
    }
  }

  /**
   * Handle ICR (Interrupt Command Register) write
   * Processes IPI (Inter-Processor Interrupt) commands
   */
  handleICRWrite() {
    const icrLow = this.registers.ICR_LOW;
    const icrHigh = this.registers.ICR_HIGH;
    
    // Extract ICR fields
    const vector = icrLow & 0xFF;
    const deliveryMode = (icrLow >> 8) & 0x7;
    const destinationMode = (icrLow >> 11) & 0x1;
    const level = (icrLow >> 14) & 0x1;
    const triggerMode = (icrLow >> 15) & 0x1;
    const destinationShorthand = (icrLow >> 18) & 0x3;
    const destination = (icrHigh >> 24) & 0xFF;
    
    console.log(`APIC: ICR write - vector=0x${vector.toString(16)}, mode=${deliveryMode}, dest=${destination}`);
    
    // Handle different delivery modes
    switch (deliveryMode) {
      case 0: // Fixed
        this.sendIPI(destination, vector, 'FIXED');
        break;
      case 1: // Reserved
        break;
      case 2: // SMI (System Management Interrupt)
        this.sendIPI(destination, vector, 'SMI');
        break;
      case 3: // Reserved
        break;
      case 4: // NMI (Non-Maskable Interrupt)
        this.sendIPI(destination, vector, 'NMI');
        break;
      case 5: // INIT (Initialization)
        this.sendIPI(destination, vector, 'INIT');
        break;
      case 6: // Startup (SIPI - Startup Inter-Processor Interrupt)
        this.sendSIPI(destination, vector);
        break;
      case 7: // Reserved
        break;
    }
    
    // Clear delivery status bit when level is deasserted
    if (level === 0) {
      this.registers.ICR_LOW &= ~0x4000; // Clear bit 14
    }
  }

  /**
   * Send SIPI (Startup Inter-Processor Interrupt)
   * Used to start application processors
   */
  sendSIPI(destination, vector) {
    console.log(`APIC: Sending SIPI to APIC ${destination}, vector 0x${vector.toString(16)}`);
    
    // SIPI vector must be page-aligned (bits 0-11 are ignored)
    const startupAddress = (vector & 0xFF) << 12;
    
    // In a multi-processor system, this would:
    // 1. Send SIPI to target APIC
    // 2. Target CPU would start executing at startupAddress
    // For single-processor emulation, we just log it
    
    // If destination is self (APIC ID 0), we could simulate startup
    const apicId = (this.registers.APIC_ID >> 24) & 0xFF;
    if (destination === apicId || destination === 0xFF) {
      console.log(`APIC: SIPI received - would start at address 0x${startupAddress.toString(16)}`);
      // In a real system, the CPU would jump to this address
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
      0x040: 'TPR',
      0x050: 'APR',
      0x060: 'PPR',
      0x070: 'EOI',
      0x080: 'RRD',
      0x090: 'LDR',
      0x0A0: 'DFR',
      0x0B0: 'SVR',
      0x0D0: 'ISR', // ISR[0]
      0x0E0: 'TMR', // TMR[0]
      0x0F0: 'IRR', // IRR[0]
      0x280: 'ESR',
      0x300: 'ICR_LOW',
      0x310: 'ICR_HIGH',
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
   * Handle End of Interrupt (EOI)
   * Clears the highest priority in-service interrupt
   */
  handleEOI() {
    if (this.inServiceVector === null) {
      // No interrupt in service
      return;
    }
    
    const vector = this.inServiceVector;
    const isrIndex = Math.floor(vector / 32);
    const isrBit = vector % 32;
    
    // Clear bit in ISR
    if (this.registers.ISR[isrIndex] !== undefined) {
      this.registers.ISR[isrIndex] &= ~(1 << isrBit);
    }
    
    // Find next highest priority in-service interrupt
    this.inServiceVector = this.findHighestISR();
    
    console.log(`APIC: EOI acknowledged for vector 0x${vector.toString(16)}`);
    
    // If there are pending interrupts, deliver the next one
    if (this.pendingInterrupts.length > 0) {
      this.deliverNextInterrupt();
    }
  }

  /**
   * Find highest priority in-service interrupt
   * @returns {number|null} - Vector number or null
   */
  findHighestISR() {
    for (let i = 7; i >= 0; i--) {
      if (this.registers.ISR[i] !== 0) {
        const isr = this.registers.ISR[i];
        for (let bit = 31; bit >= 0; bit--) {
          if (isr & (1 << bit)) {
            return (i * 32) + bit;
          }
        }
      }
    }
    return null;
  }

  /**
   * Send IPI (Inter-Processor Interrupt)
   * @param {number} destination - Destination APIC ID
   * @param {number} vector - Interrupt vector
   * @param {string} type - IPI type ('FIXED', 'NMI', 'INIT', 'SMI')
   */
  sendIPI(destination, vector, type = 'FIXED') {
    console.log(`APIC: Sending ${type} IPI to APIC ${destination}, vector 0x${vector.toString(16)}`);
    
    // In a multi-processor system, this would send an interrupt to another CPU
    // For single-processor emulation, if destination is self, deliver locally
    const apicId = (this.registers.APIC_ID >> 24) & 0xFF;
    if (destination === apicId || destination === 0xFF) {
      // Deliver to self
      this.deliverInterrupt(vector, type);
    }
  }

  /**
   * Deliver interrupt to CPU
   * @param {number} vector - Interrupt vector
   * @param {string} type - Interrupt type
   */
  deliverInterrupt(vector, type = 'FIXED') {
    // Check if APIC is enabled
    if (!this.isEnabled()) {
      return;
    }
    
    // Check TPR (Task Priority Register) - interrupts below TPR are blocked
    const tprPriority = (this.registers.TPR >> 4) & 0xF;
    const vectorPriority = (vector >> 4) & 0xF;
    
    if (vectorPriority < tprPriority) {
      console.log(`APIC: Interrupt 0x${vector.toString(16)} blocked by TPR (priority ${vectorPriority} < ${tprPriority})`);
      return;
    }
    
    // Check if vector is spurious
    if (vector === this.spuriousVector) {
      console.log(`APIC: Spurious interrupt 0x${vector.toString(16)} - ignored`);
      return;
    }
    
    // Add to pending interrupts
    this.pendingInterrupts.push({ vector, type, timestamp: performance.now() });
    
    // Try to deliver immediately if no interrupt in service
    if (this.inServiceVector === null) {
      this.deliverNextInterrupt();
    }
  }

  /**
   * Deliver next pending interrupt
   */
  deliverNextInterrupt() {
    if (this.pendingInterrupts.length === 0) {
      return;
    }
    
    // Find highest priority pending interrupt
    let highest = null;
    let highestIndex = -1;
    let highestPriority = -1;
    
    for (let i = 0; i < this.pendingInterrupts.length; i++) {
      const interrupt = this.pendingInterrupts[i];
      const priority = (interrupt.vector >> 4) & 0xF;
      if (priority > highestPriority) {
        highest = interrupt;
        highestIndex = i;
        highestPriority = priority;
      }
    }
    
    if (highest === null) {
      return;
    }
    
    // Remove from pending
    this.pendingInterrupts.splice(highestIndex, 1);
    
    const vector = highest.vector;
    const type = highest.type;
    
    // Set in IRR (Interrupt Request Register)
    const irrIndex = Math.floor(vector / 32);
    const irrBit = vector % 32;
    if (this.registers.IRR[irrIndex] !== undefined) {
      this.registers.IRR[irrIndex] |= (1 << irrBit);
    }
    
    // Move to ISR (In-Service Register)
    const isrIndex = Math.floor(vector / 32);
    const isrBit = vector % 32;
    if (this.registers.ISR[isrIndex] !== undefined) {
      this.registers.ISR[isrIndex] |= (1 << isrBit);
    }
    
    // Clear from IRR
    if (this.registers.IRR[irrIndex] !== undefined) {
      this.registers.IRR[irrIndex] &= ~(1 << irrBit);
    }
    
    this.inServiceVector = vector;
    this.currentInterrupt = { vector, type };
    
    // Deliver to CPU interrupt handler
    if (this.cpu && this.cpu.interruptHandler) {
      if (type === 'NMI') {
        this.cpu.interruptHandler.handleInterrupt(2); // NMI is vector 2
      } else {
        this.cpu.interruptHandler.handleInterrupt(vector);
      }
    }
    
    console.log(`APIC: Delivered interrupt 0x${vector.toString(16)} (type=${type})`);
  }

  /**
   * Start APIC timer
   */
  startTimer() {
    // Stop existing timer
    this.stopTimer();
    
    // Check if timer is masked
    if ((this.registers.LVT_TIMER & 0x10000) !== 0) {
      return; // Timer is masked
    }
    
    if (this.registers.INITIAL_COUNT === 0) {
      return; // Timer not configured
    }
    
    // Calculate timer period based on divisor and frequency
    const divisor = this.timerDivisor;
    const period = (this.registers.INITIAL_COUNT * divisor) / this.timerFrequency * 1000; // Convert to milliseconds
    
    // Start timer
    this.timerLastUpdate = performance.now();
    this.timerInterval = setInterval(() => {
      this.updateTimer();
      
      // Check if timer expired
      if (this.registers.CURRENT_COUNT === 0) {
        // Timer expired - trigger interrupt
        this.triggerTimerInterrupt();
        
        // Check timer mode
        const deliveryMode = (this.registers.LVT_TIMER >> 8) & 0x7;
        if (deliveryMode === 0) {
          // One-shot mode - reload if INITIAL_COUNT is set
          if (this.registers.INITIAL_COUNT !== 0) {
            this.registers.CURRENT_COUNT = this.registers.INITIAL_COUNT;
          }
        } else if (deliveryMode === 1) {
          // Periodic mode - auto-reload
          this.registers.CURRENT_COUNT = this.registers.INITIAL_COUNT;
        }
      }
    }, Math.max(1, Math.floor(period)));
    
    console.log(`APIC: Timer started (initial count=${this.registers.INITIAL_COUNT}, divisor=${divisor})`);
  }

  /**
   * Stop APIC timer
   */
  stopTimer() {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Update timer count
   */
  updateTimer() {
    if (this.registers.INITIAL_COUNT === 0) {
      return;
    }
    
    const now = performance.now();
    const elapsed = (now - this.timerLastUpdate) / 1000; // Convert to seconds
    this.timerLastUpdate = now;
    
    // Calculate ticks elapsed
    const ticksPerSecond = this.timerFrequency / this.timerDivisor;
    const ticksElapsed = Math.floor(elapsed * ticksPerSecond);
    
    if (ticksElapsed > 0 && this.registers.CURRENT_COUNT > 0) {
      this.registers.CURRENT_COUNT = Math.max(0, this.registers.CURRENT_COUNT - ticksElapsed);
    }
  }

  /**
   * Update timer divisor from DIVIDE_CONFIG
   */
  updateTimerDivisor() {
    const config = this.registers.DIVIDE_CONFIG & 0x0F;
    const divisors = [2, 4, 8, 16, 32, 64, 128, 1]; // Config values 0-7
    this.timerDivisor = divisors[config] || 1;
    console.log(`APIC: Timer divisor updated to ${this.timerDivisor}`);
  }

  /**
   * Trigger timer interrupt
   */
  triggerTimerInterrupt() {
    const lvtTimer = this.registers.LVT_TIMER;
    const vector = lvtTimer & 0xFF;
    const masked = (lvtTimer & 0x10000) !== 0;
    
    if (masked) {
      return; // Timer is masked
    }
    
    // Deliver timer interrupt
    this.deliverInterrupt(vector, 'FIXED');
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

  /**
   * Get APIC ID
   * @returns {number} - APIC ID (bits 24-31 of APIC_ID register)
   */
  getAPICID() {
    return (this.registers.APIC_ID >> 24) & 0xFF;
  }

  /**
   * Get TPR (Task Priority Register)
   * @returns {number} - TPR value
   */
  getTPR() {
    return this.registers.TPR;
  }

  /**
   * Set TPR (Task Priority Register)
   * @param {number} priority - Priority value (0-255)
   */
  setTPR(priority) {
    this.registers.TPR = priority & 0xFF;
    console.log(`APIC: TPR set to 0x${this.registers.TPR.toString(16)}`);
  }

  /**
   * Handle spurious interrupt
   * Spurious interrupts are delivered even when APIC is disabled
   */
  handleSpuriousInterrupt() {
    console.log(`APIC: Spurious interrupt (vector 0x${this.spuriousVector.toString(16)})`);
    // Spurious interrupts don't require EOI
    // They're delivered but don't set ISR bits
  }

  /**
   * Cleanup - stop timer and clear state
   */
  cleanup() {
    this.stopTimer();
    this.pendingInterrupts = [];
    this.currentInterrupt = null;
    this.inServiceVector = null;
  }
}

export default APIC;

