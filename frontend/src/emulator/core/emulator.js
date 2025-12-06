/**
 * Main Emulator Class
 * 
 * Coordinates all emulator components
 */

import CPU from './cpu/cpu.js';
import MemoryManager from './memory/memory.js';
import TPMEmulator from './tpm/tpm-emulator.js';
import TPMDevice from './devices/tpm-device.js';
import UEFIFirmware from './uefi/uefi-firmware.js';
import SecureBoot from './uefi/secure-boot.js';
import VGADevice from './devices/vga.js';
import KeyboardDevice from './devices/keyboard.js';
import MouseDevice from './devices/mouse.js';
import StorageDevice from './devices/storage.js';
import DiskController from './devices/disk-controller.js';
import APIC from './devices/apic.js';
import ISOParser from './boot/iso-parser.js';
import EFIParser from './boot/efi-parser.js';
import ACPITables from './acpi/acpi-tables.js';
import GraphicsOutputProtocol from './uefi/graphics-output-protocol.js';

class CustomEmulator {
  constructor(canvas = null) {
    this.cpu = new CPU();
    this.memory = new MemoryManager();
    this.tpm = new TPMEmulator();
    this.tpmDevice = new TPMDevice(this.tpm);
    this.uefi = null; // Will be initialized after memory and CPU
    this.secureBoot = new SecureBoot();
    this.vga = new VGADevice(canvas);
    this.keyboard = new KeyboardDevice();
    this.mouse = new MouseDevice();
    this.storage = new StorageDevice(); // 55TB storage device
    this.diskController = new DiskController(this.storage, this.memory);
    this.apic = new APIC(this.memory, this.cpu);
    this.isoParser = new ISOParser(this.memory);
    this.efiParser = new EFIParser(this.memory);
    this.acpi = new ACPITables(this.memory);
    this.gop = null; // Will be initialized after VGA
    
    this.initialized = false;
    this.running = false;
  }

  /**
   * Initialize emulator
   */
  async init() {
    console.log('Emulator: Initializing...');
    
    // Initialize components in order
    this.memory.init();
    this.cpu.memory = this.memory;
    this.cpu.init();
    
    this.vga.init();
    this.keyboard.init();
    this.mouse.init();
    await this.storage.init(); // Initialize 55TB storage device
    this.diskController.init(); // Initialize disk controller
    this.apic.init(); // Initialize APIC
    
    // Initialize Graphics Output Protocol (needs VGA)
    this.gop = new GraphicsOutputProtocol(this.memory, this.vga);
    this.gop.init();
    
    // Initialize ACPI tables (needs memory)
    this.acpi.init();
    
    // Initialize UEFI firmware (needs memory, CPU, GOP, ACPI, storage)
    this.uefi = new UEFIFirmware(this.memory, this.cpu, this.gop, this.acpi, this.storage);
    await this.uefi.init();
    
    await this.tpm.init();
    this.tpmDevice.init();
    await this.secureBoot.init();
    
    this.initialized = true;
    console.log('Emulator: Initialized successfully');
  }

  /**
   * Start emulator
   */
  async start() {
    if (!this.initialized) {
      await this.init();
    }
    
    console.log('Emulator: Starting...');
    this.running = true;
    
    // Initialize graphics early (before boot manager)
    if (this.gop) {
      this.gop.setMode(0, 640, 480);
      // Draw initial screen (not just black)
      this.gop.drawTestPattern();
    }
    
    // Start UEFI boot process (pass emulator instance for ISO/EFI access)
    await this.uefi.boot(this);
    
    // After UEFI hands off to boot manager, start CPU execution
    // TODO: Run in Web Worker for better performance
    this.cpu.run();
    
    // Set up periodic framebuffer blit
    this.setupFramebufferBlit();
  }

  /**
   * Stop emulator
   */
  stop() {
    console.log('Emulator: Stopping...');
    this.running = false;
    this.cpu.stop();
    if (this.blitInterval) {
      clearInterval(this.blitInterval);
    }
  }

  /**
   * Set up periodic framebuffer blit (copy from memory to VGA)
   */
  setupFramebufferBlit() {
    // Blit framebuffer every frame (60 FPS = ~16ms)
    this.blitInterval = setInterval(() => {
      if (this.gop && this.running) {
        this.gop.blit();
      }
    }, 16);
  }

  /**
   * Render current frame (for React component rendering loop)
   */
  render() {
    // Render VGA device
    if (this.vga) {
      this.vga.render();
    }
    
    // Blit GOP framebuffer if available
    if (this.gop && this.running) {
      this.gop.blit();
    }
  }

  /**
   * Handle keyboard input
   */
  handleKeyboard(event) {
    if (this.keyboard) {
      this.keyboard.handleKeyEvent(event);
    }
  }

  /**
   * Handle mouse input
   */
  handleMouse(event) {
    if (this.mouse) {
      this.mouse.handleMouseEvent(event);
    }
  }

  /**
   * Save emulator state
   * @returns {Object} - Serialized state
   */
  saveState() {
    return {
      cpu: this.cpu.getState(),
      memory: this.memory.getSnapshot(),
      tpm: this.tpm.saveState(),
      vga: {
        mode: this.vga.mode,
        framebuffer: Array.from(this.vga.framebuffer),
      },
      storage: {
        stats: this.storage.getStats(),
      },
      // TODO: Add other component states
    };
  }

  /**
   * Restore emulator state
   * @param {Object} state - Serialized state
   */
  restoreState(state) {
    this.cpu.setState(state.cpu);
    this.memory.restoreSnapshot(state.memory);
    this.tpm.restoreState(state.tpm);
    // TODO: Restore other component states
  }

  /**
   * Load ISO file
   * @param {ArrayBuffer} isoData - ISO file data
   */
  async loadISO(isoData) {
    console.log('Emulator: Loading ISO...');
    
    // Parse ISO file system
    this.isoParser.loadISO(isoData);
    
    // Try to find and load boot files
    const bootFiles = [
      'EFI/BOOT/BOOTX64.EFI',
      'EFI/Microsoft/Boot/bootmgfw.efi',
      'EFI/boot/bootx64.efi',
    ];

    for (const bootPath of bootFiles) {
      const bootFile = this.isoParser.readFile(bootPath);
      if (bootFile) {
        console.log(`Emulator: Found boot file: ${bootPath}`);
        
        try {
          // Parse and load EFI file
          const loadInfo = this.efiParser.loadIntoMemory(bootFile, 0x1000000);
          
          console.log(`Emulator: EFI file loaded successfully`);
          console.log(`Emulator: Entry point: 0x${loadInfo.entryPoint.toString(16)}`);
          
          // Set CPU entry point
          if (this.cpu) {
            this.cpu.registers.rip = BigInt(loadInfo.entryPoint);
            console.log(`Emulator: CPU entry point set to 0x${loadInfo.entryPoint.toString(16)}`);
          }
          
          return {
            success: true,
            loadInfo,
            bootFile,
          };
        } catch (error) {
          console.error(`Emulator: Failed to parse EFI file:`, error);
          // Try next boot file
          continue;
        }
      }
    }

    console.warn('Emulator: No boot file found in ISO');
    return { success: false, error: 'No boot file found' };
  }

  /**
   * Handle keyboard input
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyboard(event) {
    if (event.type === 'keydown') {
      this.keyboard.handleKeyDown(event);
    } else if (event.type === 'keyup') {
      this.keyboard.handleKeyUp(event);
    }
  }

  /**
   * Handle mouse input
   * @param {MouseEvent} event - Mouse event
   */
  handleMouse(event) {
    if (event.type === 'mousemove') {
      const rect = this.vga.canvas?.getBoundingClientRect();
      if (rect) {
        const deltaX = event.movementX || 0;
        const deltaY = event.movementY || 0;
        this.mouse.handleMove(deltaX, deltaY);
      }
    } else if (event.type === 'mousedown') {
      const button = event.button === 0 ? 'left' : event.button === 2 ? 'right' : 'middle';
      this.mouse.handleButtonDown(button);
    } else if (event.type === 'mouseup') {
      const button = event.button === 0 ? 'left' : event.button === 2 ? 'right' : 'middle';
      this.mouse.handleButtonUp(button);
    }
  }

  /**
   * Render VGA output
   */
  render() {
    this.vga.render();
  }
}

export default CustomEmulator;

