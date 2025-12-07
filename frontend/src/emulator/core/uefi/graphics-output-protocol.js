/**
 * UEFI Graphics Output Protocol (GOP)
 * 
 * Provides graphics output capabilities for UEFI boot
 * This allows the boot manager to initialize and use graphics
 */

class GraphicsOutputProtocol {
  constructor(memory, vgaDevice) {
    this.memory = memory;
    this.vga = vgaDevice;
    this.mode = 0;
    this.info = null;
    this.framebufferAddress = 0xB8000; // Standard VGA text mode address
    this.graphicsFramebufferAddress = 0xE0000000; // Graphics framebuffer address
    this.protocolGuid = null;
    this.protocolInstalled = false;
    
    // Define installProtocol as instance method immediately - use arrow function to preserve 'this'
    // Also define as a regular function property to ensure it's always available
    const self = this;
    this.installProtocol = function installProtocol() {
      console.log('GOP: Installing Graphics Output Protocol');
      self.protocolGuid = '9042a9de-23dc-4a38-96fb-7afed6c0cd97';
      self.protocolInstalled = true;
    };
    
    // Also add it to the prototype as a backup (though instance method should take precedence)
    if (!GraphicsOutputProtocol.prototype.installProtocol) {
      GraphicsOutputProtocol.prototype.installProtocol = function() {
        console.log('GOP: Installing Graphics Output Protocol (prototype fallback)');
        this.protocolGuid = '9042a9de-23dc-4a38-96fb-7afed6c0cd97';
        this.protocolInstalled = true;
      };
    }
    
    this.currentMode = {
      maxMode: 1,
      mode: 0,
      info: {
        version: 0,
        horizontalResolution: 640,
        verticalResolution: 480,
        pixelFormat: 1, // PixelBlueGreenRedReserved8BitPerColor
        pixelInformation: {
          redMask: 0x000000FF,
          greenMask: 0x0000FF00,
          blueMask: 0x00FF0000,
          reservedMask: 0xFF000000,
        },
        pixelsPerScanLine: 640,
      },
      sizeOfInfo: 40,
      frameBufferBase: this.graphicsFramebufferAddress,
      frameBufferSize: 640 * 480 * 4, // RGBA
    };
  }

  /**
   * Initialize Graphics Output Protocol
   */
  init() {
    console.log('GOP: Initializing Graphics Output Protocol...');
    
    // Ensure installProtocol method exists (defensive) - multiple fallback strategies
    if (typeof this.installProtocol !== 'function') {
      console.warn('GOP: installProtocol missing in init(), adding fallback');
      const self = this;
      this.installProtocol = function() {
        console.log('GOP: Installing Graphics Output Protocol (fallback in init)');
        self.protocolGuid = '9042a9de-23dc-4a38-96fb-7afed6c0cd97';
        self.protocolInstalled = true;
      };
    }
    
    // Verify it's actually a function
    if (typeof this.installProtocol !== 'function') {
      console.error('GOP: installProtocol still not a function after fallback!');
      // Last resort: assign directly
      const self = this;
      this.installProtocol = () => {
        console.log('GOP: Installing Graphics Output Protocol (last resort)');
        self.protocolGuid = '9042a9de-23dc-4a38-96fb-7afed6c0cd97';
        self.protocolInstalled = true;
      };
    }
    
    // Set up initial graphics mode
    this.setMode(0);
    
    // Initialize framebuffer
    this.initializeFramebuffer();
    
    console.log('GOP: Initialized successfully');
  }

  /**
   * Query available modes
   * @returns {number} - Number of available modes
   */
  queryMode(mode) {
    if (mode >= this.currentMode.maxMode) {
      return { error: 'Invalid mode' };
    }
    return {
      info: this.currentMode.info,
      sizeOfInfo: this.currentMode.sizeOfInfo,
    };
  }

  /**
   * Set graphics mode
   * @param {number} mode - Mode number
   * @param {number} width - Width (optional)
   * @param {number} height - Height (optional)
   */
  setMode(mode, width = 640, height = 480) {
    console.log(`GOP: Setting mode ${mode} (${width}x${height})`);
    
    this.mode = mode;
    this.currentMode.mode = mode;
    this.currentMode.info.horizontalResolution = width;
    this.currentMode.info.verticalResolution = height;
    this.currentMode.info.pixelsPerScanLine = width;
    this.currentMode.frameBufferSize = width * height * 4;
    
    // Update VGA device
    if (this.vga) {
      this.vga.width = width;
      this.vga.height = height;
      if (this.vga.canvas) {
        this.vga.canvas.width = width;
        this.vga.canvas.height = height;
      }
      this.vga.setMode('graphics');
      this.vga.init(); // Reinitialize with new dimensions
    }
    
    // Initialize framebuffer
    this.initializeFramebuffer();
    
    // Draw a test pattern to show it's working
    this.drawTestPattern();
    
    return { success: true };
  }

  /**
   * Initialize framebuffer
   */
  initializeFramebuffer() {
    const { width, height } = this.currentMode.info;
    const framebufferSize = width * height * 4;
    
    // Clear framebuffer (fill with black)
    for (let i = 0; i < framebufferSize; i += 4) {
      this.memory.writeByte(this.graphicsFramebufferAddress + i, 0);     // R
      this.memory.writeByte(this.graphicsFramebufferAddress + i + 1, 0); // G
      this.memory.writeByte(this.graphicsFramebufferAddress + i + 2, 0); // B
      this.memory.writeByte(this.graphicsFramebufferAddress + i + 3, 255); // A
    }
    
    // Also update VGA framebuffer
    if (this.vga && this.vga.framebuffer) {
      this.vga.framebuffer.fill(0);
    }
    
    console.log(`GOP: Framebuffer initialized at 0x${this.graphicsFramebufferAddress.toString(16)} (${width}x${height})`);
  }

  /**
   * Draw a test pattern to verify graphics are working
   */
  drawTestPattern() {
    const { width, height } = this.currentMode.info;
    
    // Draw a simple test pattern: gradient from black to white
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Create a gradient pattern
        const r = Math.floor((x / width) * 255);
        const g = Math.floor((y / height) * 255);
        const b = 128;
        
        // Write to memory framebuffer
        const index = (y * width + x) * 4;
        this.memory.writeByte(this.graphicsFramebufferAddress + index, b);     // B (little-endian BGR)
        this.memory.writeByte(this.graphicsFramebufferAddress + index + 1, g); // G
        this.memory.writeByte(this.graphicsFramebufferAddress + index + 2, r); // R
        this.memory.writeByte(this.graphicsFramebufferAddress + index + 3, 255); // A
        
        // Also update VGA framebuffer for rendering
        if (this.vga) {
          this.vga.setPixel(x, y, r, g, b);
        }
      }
    }
    
    // Render to canvas
    if (this.vga) {
      this.vga.render();
    }
    
    console.log('GOP: Test pattern drawn');
  }

  /**
   * Blit (copy) framebuffer from memory to VGA device
   */
  blit() {
    if (!this.vga || !this.vga.framebuffer) {
      return;
    }
    
    const { width, height } = this.currentMode.info;
    
    // Copy from memory framebuffer to VGA framebuffer
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const memIndex = (y * width + x) * 4;
        const r = this.memory.readByte(this.graphicsFramebufferAddress + memIndex + 2);
        const g = this.memory.readByte(this.graphicsFramebufferAddress + memIndex + 1);
        const b = this.memory.readByte(this.graphicsFramebufferAddress + memIndex);
        
        this.vga.setPixel(x, y, r, g, b);
      }
    }
    
    this.vga.render();
  }

  /**
   * Get current mode information
   */
  getMode() {
    return {
      mode: this.currentMode.mode,
      info: this.currentMode.info,
      sizeOfInfo: this.currentMode.sizeOfInfo,
      frameBufferBase: this.currentMode.frameBufferBase,
      frameBufferSize: this.currentMode.frameBufferSize,
    };
  }

  /**
   * Get framebuffer address
   */
  getFramebufferAddress() {
    return this.graphicsFramebufferAddress;
  }

  /**
   * Install protocol (register with UEFI system)
   * This makes the protocol available via locateProtocol
   * Note: Defined in constructor as arrow function to ensure it's always available
   */

  /**
   * Get protocol interface (for locateProtocol)
   */
  getProtocolInterface() {
    return {
      queryMode: this.queryMode.bind(this),
      setMode: this.setMode.bind(this),
      blt: this.blit.bind(this),
      mode: this.getMode.bind(this),
    };
  }
}

export default GraphicsOutputProtocol;

