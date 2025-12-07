/**
 * UEFI Simple Text Output Protocol
 * 
 * Provides text output capabilities for UEFI boot
 */

class SimpleTextOutputProtocol {
  constructor(memory, vgaDevice) {
    this.memory = memory;
    this.vga = vgaDevice;
    this.mode = 0;
    this.attribute = 0x07; // White on black
    this.cursorColumn = 0;
    this.cursorRow = 0;
    this.maxColumn = 80;
    this.maxRow = 25;
    
    this.reset = this.reset.bind(this);
    this.outputString = this.outputString.bind(this);
    this.testString = this.testString.bind(this);
    this.queryMode = this.queryMode.bind(this);
    this.setMode = this.setMode.bind(this);
    this.setAttribute = this.setAttribute.bind(this);
    this.clearScreen = this.clearScreen.bind(this);
    this.setCursorPosition = this.setCursorPosition.bind(this);
    this.enableCursor = this.enableCursor.bind(this);
    
    this.textModeAddress = 0xB8000; // VGA text mode address
  }

  /**
   * Reset output device
   */
  reset(extendedVerification = false) {
    this.clearScreen();
    this.setCursorPosition(0, 0);
    this.setAttribute(0x07); // White on black
    return { success: true };
  }

  /**
   * Output string
   */
  outputString(string) {
    for (let i = 0; i < string.length; i++) {
      const char = string[i];
      if (char === '\n') {
        this.cursorRow++;
        this.cursorColumn = 0;
        if (this.cursorRow >= this.maxRow) {
          this.scroll();
          this.cursorRow = this.maxRow - 1;
        }
      } else if (char === '\r') {
        this.cursorColumn = 0;
      } else {
        this.outputChar(char);
        this.cursorColumn++;
        if (this.cursorColumn >= this.maxColumn) {
          this.cursorColumn = 0;
          this.cursorRow++;
          if (this.cursorRow >= this.maxRow) {
            this.scroll();
            this.cursorRow = this.maxRow - 1;
          }
        }
      }
    }
    
    // Update VGA if available
    if (this.vga) {
      this.vga.render();
    }
    
    return { success: true };
  }

  /**
   * Output single character
   */
  outputChar(char) {
    const offset = (this.cursorRow * this.maxColumn + this.cursorColumn) * 2;
    const charCode = char.charCodeAt(0);
    
    // Write character and attribute to VGA text mode memory
    this.memory.writeByte(this.textModeAddress + offset, charCode);
    this.memory.writeByte(this.textModeAddress + offset + 1, this.attribute);
    
    // Update VGA device if available
    if (this.vga) {
      this.vga.writeChar(this.cursorColumn, this.cursorRow, charCode, this.attribute);
    }
  }

  /**
   * Test string (check if all characters are supported)
   */
  testString(string) {
    // For simplicity, assume all ASCII characters are supported
    return { success: true };
  }

  /**
   * Query mode information
   */
  queryMode(modeNumber) {
    if (modeNumber >= 1) {
      return { success: false, error: 'Invalid mode' };
    }
    
    return {
      success: true,
      mode: modeNumber,
      attribute: this.attribute,
      cursorColumn: this.cursorColumn,
      cursorRow: this.cursorRow,
    };
  }

  /**
   * Set text mode
   */
  setMode(modeNumber) {
    if (modeNumber >= 1) {
      return { success: false, error: 'Invalid mode' };
    }
    
    this.mode = modeNumber;
    this.reset();
    return { success: true };
  }

  /**
   * Set text attribute (foreground/background color)
   */
  setAttribute(attribute) {
    this.attribute = attribute;
    return { success: true };
  }

  /**
   * Clear screen
   */
  clearScreen() {
    // Fill text mode memory with spaces
    for (let row = 0; row < this.maxRow; row++) {
      for (let col = 0; col < this.maxColumn; col++) {
        const offset = (row * this.maxColumn + col) * 2;
        this.memory.writeByte(this.textModeAddress + offset, 0x20); // Space
        this.memory.writeByte(this.textModeAddress + offset + 1, this.attribute);
      }
    }
    
    // Clear VGA if available
    if (this.vga) {
      this.vga.clear();
    }
    
    this.cursorColumn = 0;
    this.cursorRow = 0;
  }

  /**
   * Set cursor position
   */
  setCursorPosition(column, row) {
    if (column >= this.maxColumn || row >= this.maxRow) {
      return { success: false, error: 'Invalid position' };
    }
    
    this.cursorColumn = column;
    this.cursorRow = row;
    
    // Update VGA cursor if available
    if (this.vga && this.vga.setCursor) {
      this.vga.setCursor(column, row);
    }
    
    return { success: true };
  }

  /**
   * Enable/disable cursor
   */
  enableCursor(visible) {
    // Update VGA cursor visibility if available
    if (this.vga && this.vga.enableCursor) {
      this.vga.enableCursor(visible);
    }
    return { success: true };
  }

  /**
   * Scroll screen up
   */
  scroll() {
    // Move all rows up by one
    for (let row = 1; row < this.maxRow; row++) {
      for (let col = 0; col < this.maxColumn; col++) {
        const srcOffset = (row * this.maxColumn + col) * 2;
        const dstOffset = ((row - 1) * this.maxColumn + col) * 2;
        const char = this.memory.readByte(this.textModeAddress + srcOffset);
        const attr = this.memory.readByte(this.textModeAddress + srcOffset + 1);
        this.memory.writeByte(this.textModeAddress + dstOffset, char);
        this.memory.writeByte(this.textModeAddress + dstOffset + 1, attr);
      }
    }
    
    // Clear bottom row
    const bottomRow = this.maxRow - 1;
    for (let col = 0; col < this.maxColumn; col++) {
      const offset = (bottomRow * this.maxColumn + col) * 2;
      this.memory.writeByte(this.textModeAddress + offset, 0x20); // Space
      this.memory.writeByte(this.textModeAddress + offset + 1, this.attribute);
    }
    
    // Update VGA if available
    if (this.vga) {
      this.vga.render();
    }
  }
}

export default SimpleTextOutputProtocol;

