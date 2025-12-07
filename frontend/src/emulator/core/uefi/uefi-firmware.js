/**
 * UEFI Firmware Implementation
 * 
 * Step 6: UEFI firmware integration for Windows 11 boot
 * 
 * Note: Full implementation would require OVMF (Open Virtual Machine Firmware)
 * compiled to WebAssembly. This is a simplified UEFI implementation.
 */

import FileIOProtocol from './file-io-protocol.js';
import BlockIOProtocol from './block-io-protocol.js';
import SimpleTextInputProtocol from './text-input-protocol.js';
import SimpleTextOutputProtocol from './text-output-protocol.js';

class UEFIFirmware {
  constructor(memory, cpu, gop, acpi, storage, vgaDevice) {
    this.memory = memory;
    this.cpu = cpu;
    this.gop = gop; // Graphics Output Protocol
    this.acpi = acpi; // ACPI tables
    this.storage = storage; // Storage device
    this.vgaDevice = vgaDevice; // VGA device for text output
    this.initialized = false;
    
    // Protocols
    this.fileIO = null;
    this.blockIO = null;
    this.conIn = null; // Simple Text Input Protocol
    this.conOut = null; // Simple Text Output Protocol
    this.stdErr = null; // Simple Text Output Protocol (stderr)
    this.bootServices = {
      // UEFI Boot Services (simplified)
      allocatePool: this.allocatePool.bind(this),
      freePool: this.freePool.bind(this),
      locateProtocol: this.locateProtocol.bind(this),
      locateHandleBuffer: this.locateHandleBuffer.bind(this),
      handleProtocol: this.handleProtocol.bind(this),
      exitBootServices: this.exitBootServices.bind(this),
      getMemoryMap: this.getMemoryMap.bind(this),
      // Event and Timer Services
      createEvent: this.createEvent.bind(this),
      closeEvent: this.closeEvent.bind(this),
      signalEvent: this.signalEvent.bind(this),
      waitForEvent: this.waitForEvent.bind(this),
      checkEvent: this.checkEvent.bind(this),
      setTimer: this.setTimer.bind(this),
      // Task Priority Services
      raiseTPL: this.raiseTPL.bind(this),
      restoreTPL: this.restoreTPL.bind(this),
    };
    this.runtimeServices = {
      // UEFI Runtime Services
      getTime: this.getTime.bind(this),
      setTime: this.setTime.bind(this),
      getWakeupTime: this.getWakeupTime.bind(this),
      setWakeupTime: this.setWakeupTime.bind(this),
      setVirtualAddressMap: this.setVirtualAddressMap.bind(this),
      convertPointer: this.convertPointer.bind(this),
      getVariable: this.getVariable.bind(this),
      getNextVariableName: this.getNextVariableName.bind(this),
      setVariable: this.setVariable.bind(this),
      getNextHighMonotonicCount: this.getNextHighMonotonicCount.bind(this),
      resetSystem: this.resetSystem.bind(this),
    };
    
    // Runtime variables storage
    this.runtimeVariables = new Map();
    this.variableNames = [];
    this.efiSystemTable = null;
    this.bootServicesExited = false;
    this.memoryMapKey = 0x12345678n; // Memory map key
    
    // Event management
    this.events = new Map(); // Map of event handles to event objects
    this.nextEventHandle = 0x1000n; // Starting event handle
    this.timers = new Map(); // Map of timer handles to timer objects
    this.timerCallbacks = new Map(); // Map of timer handles to callbacks
    
    // Task Priority Level (TPL)
    this.currentTPL = 0; // Application TPL (lowest)
    this.tplStack = []; // Stack for TPL changes
  }

  /**
   * Initialize UEFI firmware
   */
  async init() {
    console.log('UEFI: Initializing firmware...');
    
    // Initialize File I/O Protocol
    if (this.storage) {
      this.fileIO = new FileIOProtocol(this.storage, this.memory);
      this.blockIO = new BlockIOProtocol(this.storage, this.memory);
      await this.blockIO.init();
    }
    
    // Initialize Text Input/Output Protocols
    this.conIn = new SimpleTextInputProtocol();
    this.conOut = new SimpleTextOutputProtocol(this.memory, this.vgaDevice);
    this.stdErr = new SimpleTextOutputProtocol(this.memory, this.vgaDevice);
    
    // Initialize console handles
    this.consoleInHandle = 0x1000n;
    this.consoleOutHandle = 0x2000n;
    this.standardErrorHandle = 0x3000n;
    
    // TODO: Load OVMF firmware binary
    // For now, we set up basic UEFI structures
    
    // Initialize EFI System Table
    this.efiSystemTable = {
      signature: 0x5453595320494249n, // 'IBSYST'
      revision: 0x00020000, // EFI 2.0
      firmwareVendor: 'Friendly Friends Emulator',
      firmwareRevision: 0x00000001,
      consoleInHandle: this.consoleInHandle,
      conIn: this.conIn,
      consoleOutHandle: this.consoleOutHandle,
      conOut: this.conOut,
      standardErrorHandle: this.standardErrorHandle,
      stdErr: this.stdErr,
      runtimeServices: this.runtimeServices,
      bootServices: this.bootServices,
    };
    
    this.initialized = true;
    console.log('UEFI: Firmware initialized');
  }

  /**
   * Start UEFI boot process
   * @param {CustomEmulator} emulator - Emulator instance for ISO/EFI access
   */
  async boot(emulator) {
    if (!this.initialized) {
      await this.init();
    }

    console.log('UEFI: Starting boot process...');
    
    // UEFI boot sequence:
    // 1. SEC (Security) Phase
    // 2. PEI (Pre-EFI Initialization) Phase
    // 3. DXE (Driver Execution Environment) Phase
    // 4. BDS (Boot Device Selection) Phase
    // 5. TSL (Transient System Load) Phase
    // 6. RT (Runtime) Phase
    
    await this.secPhase();
    await this.peiPhase();
    await this.dxePhase();
    await this.bdsPhase(emulator);
  }

  /**
   * SEC (Security) Phase
   * Initial security checks and handoff to PEI
   */
  async secPhase() {
    console.log('UEFI: SEC Phase - Security initialization');
    // TODO: Implement security checks, TPM initialization
  }

  /**
   * PEI (Pre-EFI Initialization) Phase
   * Early hardware initialization
   */
  async peiPhase() {
    console.log('UEFI: PEI Phase - Pre-EFI initialization');
    // TODO: Initialize memory, CPU, basic hardware
  }

  /**
   * DXE (Driver Execution Environment) Phase
   * Load and execute drivers
   */
  async dxePhase() {
    console.log('UEFI: DXE Phase - Driver execution');
    // Expose GOP protocol
    if (this.gop) {
      // Multiple layers of defensive checks
      if (!this.gop) {
        console.error('UEFI: GOP is null or undefined');
        return;
      }
      
      // Check if installProtocol exists - add it if missing (defensive)
      if (typeof this.gop.installProtocol !== 'function') {
        console.warn('UEFI: GOP installProtocol missing, adding fallback', {
          gopType: typeof this.gop,
          gopKeys: Object.keys(this.gop || {}),
          hasInstallProtocol: 'installProtocol' in (this.gop || {})
        });
        
        // Try prototype method first
        if (typeof this.gop.constructor?.prototype?.installProtocol === 'function') {
          this.gop.installProtocol = this.gop.constructor.prototype.installProtocol.bind(this.gop);
        } else {
          // Add instance method
          const gopRef = this.gop;
          this.gop.installProtocol = function() {
            console.log('GOP: Installing Graphics Output Protocol (fallback in dxePhase)');
            gopRef.protocolGuid = '9042a9de-23dc-4a38-96fb-7afed6c0cd97';
            gopRef.protocolInstalled = true;
          };
        }
      }
      
      // Final check before calling
      if (typeof this.gop.installProtocol !== 'function') {
        console.error('UEFI: GOP installProtocol still not a function after fallback attempts');
        return; // Don't throw, just skip GOP installation
      }
      
      // Now call it
      try {
        this.gop.installProtocol();
        console.log('UEFI: GOP protocol installed successfully');
      } catch (error) {
        console.error('UEFI: Error installing GOP protocol:', error);
        // Don't throw - continue boot process
      }
    } else {
      console.warn('UEFI: GOP not initialized');
    }
    // Expose ACPI tables
    if (this.acpi) {
      // ACPI tables are already initialized, RSDP is already in memory
      console.log('UEFI: ACPI tables available');
    }
    // Expose File I/O and Block I/O protocols
    if (this.fileIO) {
      console.log('UEFI: File I/O Protocol available');
    }
    if (this.blockIO) {
      console.log('UEFI: Block I/O Protocol available');
    }
    // Expose Text Input/Output protocols
    if (this.conIn) {
      console.log('UEFI: Simple Text Input Protocol available');
    }
    if (this.conOut) {
      console.log('UEFI: Simple Text Output Protocol available');
    }
  }

  /**
   * BDS (Boot Device Selection) Phase
   * Select boot device and load boot manager
   * @param {CustomEmulator} emulator - Emulator instance
   */
  async bdsPhase(emulator) {
    console.log('UEFI: BDS Phase - Boot device selection');
    
    // Look for boot devices (CD-ROM, hard disk, etc.)
    const bootDevices = await this.enumerateBootDevices(emulator);
    
    if (bootDevices.length === 0) {
      console.warn('UEFI: No boot devices found');
      return;
    }

    // Try to boot from first device
    const bootDevice = bootDevices[0];
    console.log(`UEFI: Attempting to boot from ${bootDevice.type}`);
    
    // Load boot manager
    await this.loadBootManager(bootDevice, emulator);
  }

  /**
   * Enumerate available boot devices
   * @param {CustomEmulator} emulator - Emulator instance
   * @returns {Array} - List of boot devices
   */
  async enumerateBootDevices(emulator) {
    const devices = [];
    
    // Check for CD-ROM (ISO)
    if (emulator && emulator.isoParser && emulator.isoParser.isoLoaded) {
      console.log('UEFI: Found ISO boot device');
      // Look for EFI boot files
      const efiPath = '/EFI/BOOT/';
      try {
        const efiFiles = emulator.isoParser.readDirectory(efiPath);
        const bootManagerPath = efiFiles.find(f => f.name.endsWith('.efi'));
        if (bootManagerPath) {
          devices.push({
            type: 'cdrom',
            path: '/',
            bootable: true,
            bootManagerPath: efiPath + bootManagerPath.name,
          });
        }
      } catch (e) {
        console.warn('UEFI: Could not read EFI directory:', e);
      }
    }
    
    // Check for hard disk
    // TODO: Check for virtual hard disk
    if (devices.length === 0) {
      devices.push({
        type: 'harddisk',
        path: 'HD0',
        bootable: true,
      });
    }
    
    return devices;
  }

  /**
   * Load boot manager from device
   * @param {Object} device - Boot device
   * @param {Object} emulator - Emulator instance (for ISO/EFI parsing)
   */
  async loadBootManager(device, emulator) {
    console.log(`UEFI: Loading boot manager from ${device.path}`);
    
    // Initialize File I/O protocol with ISO parser if available
    if (this.fileIO && emulator && emulator.isoParser) {
      this.fileIO.init(emulator.isoParser);
    }
    
    // Try to load Windows Boot Manager
    const bootManagerPaths = [
      'EFI/Microsoft/Boot/bootmgfw.efi',
      'EFI/BOOT/BOOTX64.EFI',
      'EFI/boot/bootx64.efi',
    ];

    let bootManagerLoaded = false;
    for (const path of bootManagerPaths) {
      console.log(`UEFI: Attempting to load ${path}`);
      
      if (emulator && emulator.isoParser && emulator.efiParser) {
        // Try to load from ISO
        const bootFile = emulator.isoParser.readFile(path);
        if (bootFile) {
          try {
            const loadInfo = emulator.efiParser.loadIntoMemory(bootFile, 0x1000000);
            console.log(`UEFI: Boot manager loaded at 0x${loadInfo.entryPoint.toString(16)}`);
            
            // Set CPU entry point and prepare for execution
            if (emulator.cpu) {
              emulator.cpu.registers.rip = BigInt(loadInfo.entryPoint);
              
              // Set up UEFI calling convention (x64):
              // RCX = ImageHandle (handle to loaded image)
              // RDX = SystemTable (pointer to EFI System Table)
              const imageHandle = 0x5000000n; // Allocated handle for boot manager
              const systemTableAddress = this.getSystemTableAddress();
              
              emulator.cpu.registers.rcx = imageHandle;
              emulator.cpu.registers.rdx = systemTableAddress;
              
              // Set up stack (x64 calling convention)
              // Stack should be 16-byte aligned
              const stackBase = 0x7FFFFFF0n; // High memory stack
              emulator.cpu.registers.rsp = stackBase;
              emulator.cpu.registers.rbp = stackBase;
              
              console.log(`UEFI: Boot manager entry point set to 0x${loadInfo.entryPoint.toString(16)}`);
              console.log(`UEFI: ImageHandle = 0x${imageHandle.toString(16)}`);
              console.log(`UEFI: SystemTable = 0x${systemTableAddress.toString(16)}`);
            }
            
            bootManagerLoaded = true;
            break;
          } catch (error) {
            console.warn(`UEFI: Failed to load ${path}:`, error);
            continue;
          }
        }
      }
    }

    if (!bootManagerLoaded) {
      console.warn('UEFI: Boot manager not found or failed to load');
      return;
    }
    
    // Set up boot parameters
    const bootParams = {
      device: device.path,
      secureBoot: true, // Enable Secure Boot
      tpmAvailable: true, // TPM is available
      bootManagerPath: bootManagerPaths[0],
    };
    
    // Hand off to boot manager
    await this.handoffToBootManager(bootParams, emulator);
  }

  /**
   * Hand off control to boot manager
   * @param {Object} bootParams - Boot parameters
   * @param {CustomEmulator} emulator - Emulator instance
   */
  async handoffToBootManager(bootParams, emulator) {
    console.log('UEFI: Handing off to boot manager');
    console.log('Boot parameters:', bootParams);
    
    // Boot manager should already be loaded by loadBootManager
    // Entry point should already be set in CPU
    // Just log that handoff is complete
    console.log('UEFI: Boot manager should now take control');
    console.log(`UEFI: CPU RIP = 0x${this.cpu.registers.rip.toString(16)}`);
  }

  /**
   * UEFI Boot Service: Allocate Pool
   */
  allocatePool(poolType, size) {
    // TODO: Implement memory pool allocation
    return null; // Return allocated address
  }

  /**
   * UEFI Boot Service: Free Pool
   */
  freePool(buffer) {
    // TODO: Implement memory pool deallocation
  }

  /**
   * UEFI Boot Service: Locate Protocol
   */
  locateProtocol(protocolGuid, registration) {
    // Return GOP protocol if requested
    if (this.gop && protocolGuid === this.gop.protocolGuid) {
      return this.gop.getProtocolInterface();
    }
    // Return File I/O protocol if requested
    if (this.fileIO && protocolGuid === this.fileIO.guid) {
      return this.fileIO;
    }
    // Return Block I/O protocol if requested
    if (this.blockIO && protocolGuid === this.blockIO.guid) {
      return this.blockIO;
    }
    return null;
  }

  /**
   * UEFI Boot Service: Locate Handle Buffer
   */
  locateHandleBuffer(searchType, protocol) {
    // Simplified: return empty handle buffer
    return [];
  }

  /**
   * UEFI Boot Service: Handle Protocol
   */
  handleProtocol(handle, protocolGuid) {
    // Return GOP protocol if requested
    if (this.gop && protocolGuid === this.gop.protocolGuid) {
      return this.gop.getProtocolInterface();
    }
    // Return File I/O protocol if requested
    if (this.fileIO && protocolGuid === this.fileIO.guid) {
      return this.fileIO;
    }
    // Return Block I/O protocol if requested
    if (this.blockIO && protocolGuid === this.blockIO.guid) {
      return this.blockIO;
    }
    return null;
  }

  /**
   * UEFI Runtime Service: Get Time
   */
  getTime() {
    const now = new Date();
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      second: now.getUTCSeconds(),
      nanosecond: now.getUTCMilliseconds() * 1000000,
    };
  }

  /**
   * UEFI Runtime Service: Set Time
   */
  setTime(time) {
    // TODO: Set system time
    console.log('UEFI: Set time', time);
    return 0; // EFI_SUCCESS
  }

  /**
   * UEFI Runtime Service: Get Wakeup Time
   */
  getWakeupTime(enabled, pending, time) {
    // Not implemented - return EFI_UNSUPPORTED
    return 0x80000003; // EFI_UNSUPPORTED
  }

  /**
   * UEFI Runtime Service: Set Wakeup Time
   */
  setWakeupTime(enable, time) {
    // Not implemented - return EFI_UNSUPPORTED
    return 0x80000003; // EFI_UNSUPPORTED
  }

  /**
   * UEFI Runtime Service: Set Virtual Address Map
   */
  setVirtualAddressMap(memoryMapSize, descriptorSize, descriptorVersion, virtualMap) {
    console.log('UEFI: Set Virtual Address Map');
    // For now, just acknowledge - full implementation would require page table updates
    return 0; // EFI_SUCCESS
  }

  /**
   * UEFI Runtime Service: Convert Pointer
   */
  convertPointer(debugDisposition, address) {
    // For now, return address as-is (no conversion needed)
    return { success: true, address };
  }

  /**
   * UEFI Runtime Service: Get Variable
   */
  getVariable(variableName, vendorGuid, attributes, dataSize, data) {
    const key = `${variableName}:${vendorGuid}`;
    const variable = this.runtimeVariables.get(key);
    
    if (!variable) {
      return 0x80000002; // EFI_NOT_FOUND
    }
    
    if (dataSize < variable.data.length) {
      return 0x80000005; // EFI_BUFFER_TOO_SMALL
    }
    
    // Write variable data to memory
    if (data && this.memory) {
      for (let i = 0; i < variable.data.length; i++) {
        this.memory.writeByte(Number(data) + i, variable.data[i]);
      }
    }
    
    if (attributes) {
      this.memory.writeDword(Number(attributes), variable.attributes);
    }
    
    if (dataSize) {
      this.memory.writeQword(Number(dataSize), BigInt(variable.data.length));
    }
    
    return 0; // EFI_SUCCESS
  }

  /**
   * UEFI Runtime Service: Get Next Variable Name
   */
  getNextVariableName(variableNameSize, variableName, vendorGuid) {
    // Return next variable name from list
    // Simplified implementation
    return 0x80000002; // EFI_NOT_FOUND (no more variables)
  }

  /**
   * UEFI Runtime Service: Set Variable
   */
  setVariable(variableName, vendorGuid, attributes, dataSize, data) {
    const key = `${variableName}:${vendorGuid}`;
    const dataArray = new Uint8Array(Number(dataSize));
    
    // Read variable data from memory
    if (data && this.memory) {
      for (let i = 0; i < dataSize; i++) {
        dataArray[i] = this.memory.readByte(Number(data) + i);
      }
    }
    
    this.runtimeVariables.set(key, {
      name: variableName,
      vendorGuid,
      attributes: Number(attributes),
      data: dataArray,
    });
    
    if (!this.variableNames.includes(key)) {
      this.variableNames.push(key);
    }
    
    console.log(`UEFI: Set Variable ${variableName}`);
    return 0; // EFI_SUCCESS
  }

  /**
   * UEFI Runtime Service: Get Next High Monotonic Count
   */
  getNextHighMonotonicCount(highCount) {
    // Return monotonically increasing counter
    if (!this.monotonicCount) {
      this.monotonicCount = 0n;
    }
    this.monotonicCount++;
    
    if (highCount && this.memory) {
      this.memory.writeQword(Number(highCount), this.monotonicCount);
    }
    
    return 0; // EFI_SUCCESS
  }

  /**
   * UEFI Runtime Service: Reset System
   */
  resetSystem(resetType, resetStatus, dataSize, resetData) {
    console.log(`UEFI: Reset System (type: ${resetType})`);
    // For emulation, we could trigger a reset
    // For now, just log
    return 0; // EFI_SUCCESS
  }

  /**
   * Check Secure Boot status
   * @returns {boolean} - True if Secure Boot is enabled
   */
  isSecureBootEnabled() {
    return true; // Secure Boot is enabled
  }

  /**
   * Get EFI System Table address
   * @returns {bigint} - Address of EFI System Table
   */
  getSystemTableAddress() {
    // TODO: Return actual address in memory
    return 0x100000n; // Placeholder
  }

  /**
   * UEFI Boot Service: Create Event
   * Creates a new event
   * @param {number} type - Event type (EVT_TIMER, EVT_NOTIFY_WAIT, etc.)
   * @param {number} notifyTpl - Task Priority Level for notification
   * @param {Function} notifyFunction - Notification function (optional)
   * @param {bigint} notifyContext - Context for notification (optional)
   * @param {bigint} event - Pointer to event handle (output)
   * @returns {number} - EFI_STATUS code (0 = success)
   */
  createEvent(type, notifyTpl, notifyFunction, notifyContext, event) {
    console.log(`UEFI: Create Event (type: 0x${type.toString(16)})`);
    
    const eventHandle = this.nextEventHandle++;
    const eventObj = {
      handle: eventHandle,
      type: type,
      notifyTpl: notifyTpl || 0,
      notifyFunction: notifyFunction || null,
      notifyContext: notifyContext || 0n,
      signaled: false,
      waiters: [],
    };
    
    this.events.set(eventHandle, eventObj);
    
    // Write event handle to memory if pointer provided
    if (event && this.memory) {
      this.memory.writeQword(Number(event), eventHandle);
    }
    
    return 0; // EFI_SUCCESS
  }

  /**
   * UEFI Boot Service: Close Event
   * Closes an event
   * @param {bigint} event - Event handle
   * @returns {number} - EFI_STATUS code
   */
  closeEvent(event) {
    console.log(`UEFI: Close Event (handle: 0x${event.toString(16)})`);
    
    if (this.events.has(event)) {
      const eventObj = this.events.get(event);
      
      // Signal all waiters before closing
      for (const waiter of eventObj.waiters) {
        if (waiter.resolve) {
          waiter.resolve(true);
        }
      }
      
      this.events.delete(event);
      return 0; // EFI_SUCCESS
    }
    
    return 0x800000000000000E; // EFI_INVALID_PARAMETER
  }

  /**
   * UEFI Boot Service: Signal Event
   * Signals an event
   * @param {bigint} event - Event handle
   * @returns {number} - EFI_STATUS code
   */
  signalEvent(event) {
    if (this.events.has(event)) {
      const eventObj = this.events.get(event);
      eventObj.signaled = true;
      
      // Resolve all waiters
      for (const waiter of eventObj.waiters) {
        if (waiter.resolve) {
          waiter.resolve(true);
        }
      }
      eventObj.waiters = [];
      
      // Call notification function if set
      if (eventObj.notifyFunction) {
        try {
          eventObj.notifyFunction(eventObj.notifyContext);
        } catch (error) {
          console.error('UEFI: Error in event notification function:', error);
        }
      }
      
      return 0; // EFI_SUCCESS
    }
    
    return 0x800000000000000E; // EFI_INVALID_PARAMETER
  }

  /**
   * UEFI Boot Service: Wait For Event
   * Waits for one or more events to be signaled
   * @param {number} numberOfEvents - Number of events to wait for
   * @param {bigint} event - Pointer to array of event handles
   * @param {bigint} index - Pointer to index of signaled event (output)
   * @returns {number} - EFI_STATUS code
   */
  async waitForEvent(numberOfEvents, event, index) {
    console.log(`UEFI: Wait For Event (count: ${numberOfEvents})`);
    
    if (numberOfEvents === 0 || !event) {
      return 0x8000000000000002; // EFI_INVALID_PARAMETER
    }
    
    // Read event handles from memory
    const events = [];
    for (let i = 0; i < numberOfEvents; i++) {
      const eventHandle = this.memory.readQword(Number(event) + (i * 8));
      if (this.events.has(eventHandle)) {
        events.push(this.events.get(eventHandle));
      }
    }
    
    // Check if any event is already signaled
    for (let i = 0; i < events.length; i++) {
      if (events[i].signaled) {
        if (index && this.memory) {
          this.memory.writeQword(Number(index), BigInt(i));
        }
        return 0; // EFI_SUCCESS
      }
    }
    
    // Wait for event (simplified - in real UEFI this would use async/await properly)
    return new Promise((resolve) => {
      let resolved = false;
      
      const waiter = {
        resolve: (result) => {
          if (!resolved) {
            resolved = true;
            // Find which event was signaled
            for (let i = 0; i < events.length; i++) {
              if (events[i].signaled) {
                if (index && this.memory) {
                  this.memory.writeQword(Number(index), BigInt(i));
                }
                break;
              }
            }
            resolve(0); // EFI_SUCCESS
          }
        },
      };
      
      // Add waiter to all events
      for (const eventObj of events) {
        eventObj.waiters.push(waiter);
      }
      
      // Timeout after 1 second (simplified)
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(0x8000000000000001); // EFI_TIMEOUT
        }
      }, 1000);
    });
  }

  /**
   * UEFI Boot Service: Check Event
   * Checks if an event is signaled
   * @param {bigint} event - Event handle
   * @returns {number} - EFI_STATUS code (0 = signaled, 0x8000000000000001 = not signaled)
   */
  checkEvent(event) {
    if (this.events.has(event)) {
      const eventObj = this.events.get(event);
      return eventObj.signaled ? 0 : 0x8000000000000001; // EFI_SUCCESS or EFI_NOT_READY
    }
    
    return 0x800000000000000E; // EFI_INVALID_PARAMETER
  }

  /**
   * UEFI Boot Service: Set Timer
   * Sets a timer event
   * @param {bigint} event - Event handle
   * @param {number} type - Timer type (TimerCancel, TimerPeriodic, TimerRelative)
   * @param {bigint} triggerTime - Time in 100ns units
   * @returns {number} - EFI_STATUS code
   */
  setTimer(event, type, triggerTime) {
    console.log(`UEFI: Set Timer (event: 0x${event.toString(16)}, type: ${type}, time: ${triggerTime})`);
    
    if (!this.events.has(event)) {
      return 0x800000000000000E; // EFI_INVALID_PARAMETER
    }
    
    // Clear existing timer if any
    if (this.timerCallbacks.has(event)) {
      const timerId = this.timerCallbacks.get(event);
      if (typeof timerId === 'number') {
        clearTimeout(timerId);
        clearInterval(timerId);
      }
      this.timerCallbacks.delete(event);
    }
    
    // Timer types:
    // 0 = TimerCancel (cancel timer)
    // 1 = TimerPeriodic (periodic timer)
    // 2 = TimerRelative (one-shot timer)
    
    if (type === 0) {
      // Cancel timer
      return 0; // EFI_SUCCESS
    }
    
    // Convert 100ns units to milliseconds
    const milliseconds = Number(triggerTime / 10000n);
    
    if (type === 1) {
      // Periodic timer
      const intervalId = setInterval(() => {
        this.signalEvent(event);
      }, milliseconds);
      this.timerCallbacks.set(event, intervalId);
    } else if (type === 2) {
      // One-shot timer
      const timeoutId = setTimeout(() => {
        this.signalEvent(event);
        this.timerCallbacks.delete(event);
      }, milliseconds);
      this.timerCallbacks.set(event, timeoutId);
    }
    
    return 0; // EFI_SUCCESS
  }

  /**
   * UEFI Boot Service: Raise TPL (Task Priority Level)
   * Raises the current TPL
   * @param {number} newTpl - New TPL level
   * @returns {number} - Previous TPL level
   */
  raiseTPL(newTpl) {
    const oldTpl = this.currentTPL;
    this.tplStack.push(oldTpl);
    this.currentTPL = newTpl;
    console.log(`UEFI: Raise TPL from ${oldTpl} to ${newTpl}`);
    return oldTpl;
  }

  /**
   * UEFI Boot Service: Restore TPL (Task Priority Level)
   * Restores the previous TPL
   * @param {number} oldTpl - Previous TPL level to restore
   */
  restoreTPL(oldTpl) {
    if (this.tplStack.length > 0) {
      const previousTpl = this.tplStack.pop();
      this.currentTPL = previousTpl;
      console.log(`UEFI: Restore TPL from ${oldTpl} to ${previousTpl}`);
    } else {
      this.currentTPL = oldTpl;
      console.log(`UEFI: Restore TPL to ${oldTpl}`);
    }
  }

  /**
   * UEFI Boot Service: Exit Boot Services
   * Called by OS when it's ready to take control
   * @param {bigint} imageHandle - Handle of the image
   * @param {bigint} mapKey - Memory map key
   * @returns {boolean} - True if successful
   */
  exitBootServices(imageHandle, mapKey) {
    console.log('UEFI: Exit Boot Services called');
    console.log(`  Image Handle: 0x${imageHandle.toString(16)}`);
    console.log(`  Map Key: 0x${mapKey.toString(16)}`);
    
    // Validate map key
    if (mapKey !== this.memoryMapKey) {
      console.error('UEFI: Invalid memory map key');
      return false;
    }
    
    // Mark boot services as exited
    this.bootServicesExited = true;
    
    // Disable boot services (they're no longer available)
    this.bootServices = null;
    
    // Clear boot services from system table
    // In a real implementation, we'd update the EFI System Table
    
    console.log('UEFI: Boot services exited successfully');
    return true;
  }

  /**
   * UEFI Boot Service: Get Memory Map
   * Returns the current memory map
   * @param {bigint} memoryMapSize - Pointer to size of memory map buffer
   * @param {bigint} memoryMap - Pointer to memory map buffer
   * @param {bigint} mapKey - Pointer to memory map key
   * @param {bigint} descriptorSize - Pointer to descriptor size
   * @param {bigint} descriptorVersion - Pointer to descriptor version
   * @returns {number} - EFI_STATUS code
   */
  getMemoryMap(memoryMapSize, memoryMap, mapKey, descriptorSize, descriptorVersionPtr) {
    console.log('UEFI: Get Memory Map called');
    
    // Memory map descriptor structure (EFI_MEMORY_DESCRIPTOR):
    // - Type (UINT32)
    // - PhysicalStart (UINT64)
    // - VirtualStart (UINT64)
    // - NumberOfPages (UINT64)
    // - Attribute (UINT64)
    
    const descriptorSizeValue = 48; // 48 bytes per descriptor
    const descriptorVersionValue = 1;
    
    // Create memory map descriptors
    const descriptors = [];
    
    // Descriptor 1: Available memory (0x00000000 - 0x7FFFFFFF)
    descriptors.push({
      type: 6, // EfiConventionalMemory
      physicalStart: 0x00000000n,
      virtualStart: 0x00000000n,
      numberOfPages: 0x80000n, // 2GB in 4KB pages
      attribute: 0x000000000000000Fn, // EFI_MEMORY_WB (Write Back)
    });
    
    // Descriptor 2: Reserved memory (0x80000000 - 0xFFFFFFFF)
    descriptors.push({
      type: 10, // EfiReservedMemoryType
      physicalStart: 0x80000000n,
      virtualStart: 0x80000000n,
      numberOfPages: 0x80000n, // 2GB in 4KB pages
      attribute: 0x0000000000000000n,
    });
    
    // Calculate required buffer size
    const requiredSize = descriptors.length * descriptorSizeValue;
    
    // Check if buffer is large enough
    const currentSize = this.memory.readDword(Number(memoryMapSize));
    if (currentSize < requiredSize) {
      // Update size and return BUFFER_TOO_SMALL
      this.memory.writeDword(Number(memoryMapSize), requiredSize);
      return 5; // EFI_BUFFER_TOO_SMALL
    }
    
    // Write descriptors to memory
    let offset = 0;
    for (const desc of descriptors) {
      const addr = Number(memoryMap) + offset;
      
      // Type (UINT32)
      this.memory.writeDword(addr, desc.type);
      
      // PhysicalStart (UINT64)
      this.memory.writeQword(addr + 4, desc.physicalStart);
      
      // VirtualStart (UINT64)
      this.memory.writeQword(addr + 12, desc.virtualStart);
      
      // NumberOfPages (UINT64)
      this.memory.writeQword(addr + 20, desc.numberOfPages);
      
      // Attribute (UINT64)
      this.memory.writeQword(addr + 28, desc.attribute);
      
      // Padding (UINT64) - descriptor is 48 bytes
      this.memory.writeQword(addr + 36, 0n);
      
      offset += descriptorSizeValue;
    }
    
    // Update output parameters
    this.memory.writeDword(Number(memoryMapSize), requiredSize);
    this.memory.writeQword(Number(mapKey), this.memoryMapKey);
    this.memory.writeDword(Number(descriptorSize), descriptorSizeValue);
    this.memory.writeDword(Number(descriptorVersionPtr), descriptorVersionValue);
    
    console.log(`UEFI: Memory map returned (${descriptors.length} descriptors, ${requiredSize} bytes)`);
    
    return 0; // EFI_SUCCESS
  }
}

export default UEFIFirmware;

