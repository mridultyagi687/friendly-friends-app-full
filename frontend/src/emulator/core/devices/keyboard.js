/**
 * Keyboard Device Emulation
 * 
 * Step 4: Basic device emulation - Keyboard
 */

class KeyboardDevice {
  constructor() {
    this.keyBuffer = [];
    this.scanCodeMap = this.createScanCodeMap();
    this.shiftPressed = false;
    this.ctrlPressed = false;
    this.altPressed = false;
  }

  /**
   * Create PS/2 scan code mapping
   */
  createScanCodeMap() {
    // Basic scan code map (PS/2 set 1)
    const map = new Map();
    
    // Letters
    for (let i = 0; i < 26; i++) {
      map.set(`Key${String.fromCharCode(65 + i)}`, 0x1E + i);
    }
    
    // Numbers
    for (let i = 0; i < 10; i++) {
      map.set(`Digit${i}`, 0x02 + i);
    }
    
    // Special keys
    map.set('Enter', 0x1C);
    map.set('Escape', 0x01);
    map.set('Backspace', 0x0E);
    map.set('Tab', 0x0F);
    map.set('Space', 0x39);
    map.set('ShiftLeft', 0x2A);
    map.set('ShiftRight', 0x36);
    map.set('ControlLeft', 0x1D);
    map.set('ControlRight', 0x1D);
    map.set('AltLeft', 0x38);
    map.set('AltRight', 0x38);
    
    return map;
  }

  /**
   * Initialize keyboard device
   */
  init() {
    console.log('Keyboard: Initializing device...');
    this.keyBuffer = [];
  }

  /**
   * Handle key press
   * @param {KeyboardEvent} event - Browser keyboard event
   */
  handleKeyDown(event) {
    const scanCode = this.scanCodeMap.get(event.code);
    if (scanCode) {
      // Track modifier keys
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        this.shiftPressed = true;
      } else if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
        this.ctrlPressed = true;
      } else if (event.code === 'AltLeft' || event.code === 'AltRight') {
        this.altPressed = true;
      }
      
      // Add scan code to buffer
      this.keyBuffer.push(scanCode);
      console.log(`Keyboard: Key pressed - ${event.code} (scan code: 0x${scanCode.toString(16)})`);
    }
  }

  /**
   * Handle key release
   * @param {KeyboardEvent} event - Browser keyboard event
   */
  handleKeyUp(event) {
    const scanCode = this.scanCodeMap.get(event.code);
    if (scanCode) {
      // Track modifier keys
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        this.shiftPressed = false;
      } else if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
        this.ctrlPressed = false;
      } else if (event.code === 'AltLeft' || event.code === 'AltRight') {
        this.altPressed = false;
      }
      
      // Add break code (scan code + 0x80)
      this.keyBuffer.push(scanCode | 0x80);
    }
  }

  /**
   * Read scan code from buffer
   * @returns {number|null} - Scan code or null if buffer empty
   */
  readScanCode() {
    return this.keyBuffer.shift() || null;
  }

  /**
   * Check if buffer has data
   * @returns {boolean}
   */
  hasData() {
    return this.keyBuffer.length > 0;
  }

  /**
   * Clear key buffer
   */
  clearBuffer() {
    this.keyBuffer = [];
  }
}

export default KeyboardDevice;

