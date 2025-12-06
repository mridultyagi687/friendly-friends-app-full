/**
 * Mouse Device Emulation
 * 
 * Step 4: Basic device emulation - Mouse (PS/2)
 */

class MouseDevice {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.buttons = {
      left: false,
      right: false,
      middle: false
    };
    this.eventBuffer = [];
  }

  /**
   * Initialize mouse device
   */
  init() {
    console.log('Mouse: Initializing device...');
    this.x = 0;
    this.y = 0;
    this.buttons = { left: false, right: false, middle: false };
    this.eventBuffer = [];
  }

  /**
   * Handle mouse move
   * @param {number} deltaX - X movement delta
   * @param {number} deltaY - Y movement delta
   */
  handleMove(deltaX, deltaY) {
    this.x += deltaX;
    this.y += deltaY;
    
    // Clamp coordinates
    this.x = Math.max(0, Math.min(32767, this.x));
    this.y = Math.max(0, Math.min(32767, this.y));
    
    // Create PS/2 mouse packet
    const packet = this.createPacket(deltaX, deltaY);
    this.eventBuffer.push(packet);
  }

  /**
   * Handle mouse button press
   * @param {string} button - 'left', 'right', or 'middle'
   */
  handleButtonDown(button) {
    this.buttons[button] = true;
    const packet = this.createPacket(0, 0);
    this.eventBuffer.push(packet);
  }

  /**
   * Handle mouse button release
   * @param {string} button - 'left', 'right', or 'middle'
   */
  handleButtonUp(button) {
    this.buttons[button] = false;
    const packet = this.createPacket(0, 0);
    this.eventBuffer.push(packet);
  }

  /**
   * Create PS/2 mouse packet
   * @param {number} deltaX - X movement
   * @param {number} deltaY - Y movement
   * @returns {Uint8Array} - 3-byte PS/2 packet
   */
  createPacket(deltaX, deltaY) {
    const packet = new Uint8Array(3);
    
    // Byte 1: Status byte
    packet[0] = 0x08; // Always set bit 3
    if (this.buttons.left) packet[0] |= 0x01;
    if (this.buttons.right) packet[0] |= 0x02;
    if (this.buttons.middle) packet[0] |= 0x04;
    
    // Byte 2: X movement (signed 9-bit, but we use 8-bit)
    packet[1] = deltaX & 0xFF;
    
    // Byte 3: Y movement (signed 9-bit, but we use 8-bit)
    packet[2] = deltaY & 0xFF;
    
    return packet;
  }

  /**
   * Read mouse packet from buffer
   * @returns {Uint8Array|null} - Mouse packet or null if empty
   */
  readPacket() {
    return this.eventBuffer.shift() || null;
  }

  /**
   * Check if buffer has data
   * @returns {boolean}
   */
  hasData() {
    return this.eventBuffer.length > 0;
  }

  /**
   * Clear event buffer
   */
  clearBuffer() {
    this.eventBuffer = [];
  }
}

export default MouseDevice;

