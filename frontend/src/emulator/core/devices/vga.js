/**
 * VGA Graphics Device Emulation
 * 
 * Step 4: Basic device emulation - VGA
 */

class VGADevice {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.width = 640;
    this.height = 480;
    this.framebuffer = null;
    this.mode = 'text'; // 'text' or 'graphics'
    
    if (canvas) {
      canvas.width = this.width;
      canvas.height = this.height;
    }
  }

  /**
   * Initialize VGA device
   */
  init() {
    console.log('VGA: Initializing graphics device...');
    this.framebuffer = new Uint8Array(this.width * this.height * 4); // RGBA
    this.framebuffer.fill(0);
  }

  /**
   * Set graphics mode
   * @param {string} mode - 'text' or 'graphics'
   */
  setMode(mode) {
    this.mode = mode;
    console.log(`VGA: Mode set to ${mode}`);
  }

  /**
   * Write pixel to framebuffer
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} r - Red component (0-255)
   * @param {number} g - Green component (0-255)
   * @param {number} b - Blue component (0-255)
   */
  setPixel(x, y, r, g, b) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    
    const index = (y * this.width + x) * 4;
    this.framebuffer[index] = r;
    this.framebuffer[index + 1] = g;
    this.framebuffer[index + 2] = b;
    this.framebuffer[index + 3] = 255; // Alpha
  }

  /**
   * Render framebuffer to canvas
   */
  render() {
    if (!this.ctx || !this.framebuffer) {
      return;
    }

    const imageData = this.ctx.createImageData(this.width, this.height);
    imageData.data.set(this.framebuffer);
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Clear screen
   * @param {number} r - Red component
   * @param {number} g - Green component
   * @param {number} b - Blue component
   */
  clear(r = 0, g = 0, b = 0) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.setPixel(x, y, r, g, b);
      }
    }
    this.render();
  }

  /**
   * Handle VGA memory-mapped I/O writes
   * @param {number} address - Memory address
   * @param {number} value - Value to write
   */
  writeIO(address, value) {
    // TODO: Implement VGA register writes
    // This will handle mode changes, palette updates, etc.
    console.log(`VGA: IO write at 0x${address.toString(16)}: 0x${value.toString(16)}`);
  }

  /**
   * Handle VGA memory-mapped I/O reads
   * @param {number} address - Memory address
   * @returns {number} - Read value
   */
  readIO(address) {
    // TODO: Implement VGA register reads
    return 0;
  }
}

export default VGADevice;

