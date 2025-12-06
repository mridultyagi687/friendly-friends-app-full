/**
 * Main Emulator Class
 * 
 * Coordinates all emulator components
 */

import CPU from './cpu/cpu.js';
import MemoryManager from './memory/memory.js';
import TPMEmulator from './tpm/tpm-emulator.js';
import SecureBoot from './uefi/secure-boot.js';
import VGADevice from './devices/vga.js';
import KeyboardDevice from './devices/keyboard.js';
import MouseDevice from './devices/mouse.js';

class CustomEmulator {
  constructor(canvas = null) {
    this.cpu = new CPU();
    this.memory = new MemoryManager();
    this.tpm = new TPMEmulator();
    this.secureBoot = new SecureBoot();
    this.vga = new VGADevice(canvas);
    this.keyboard = new KeyboardDevice();
    this.mouse = new MouseDevice();
    
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
    
    await this.tpm.init();
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
    
    // Start CPU execution
    // TODO: Run in Web Worker for better performance
    this.cpu.run();
  }

  /**
   * Stop emulator
   */
  stop() {
    console.log('Emulator: Stopping...');
    this.running = false;
    this.cpu.stop();
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
  loadISO(isoData) {
    // TODO: Parse ISO and load into memory/emulated CD-ROM
    console.log('Emulator: Loading ISO...');
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

