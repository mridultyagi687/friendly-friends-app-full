/**
 * TPM Device Interface
 * 
 * Step 5: TPM device that interfaces with the emulator
 * This handles memory-mapped I/O and TPM command processing
 */

class TPMDevice {
  constructor(tpmEmulator) {
    this.tpm = tpmEmulator;
    this.commandBuffer = [];
    this.responseBuffer = [];
    this.locality = 0; // TPM locality (0-4)
    this.status = {
      tpmGo: false,
      commandReady: false,
      dataAvailable: false,
      expect: false,
    };
  }

  /**
   * Initialize TPM device
   */
  init() {
    console.log('TPM Device: Initializing...');
    this.commandBuffer = [];
    this.responseBuffer = [];
    this.locality = 0;
    this.status = {
      tpmGo: false,
      commandReady: false,
      dataAvailable: false,
      expect: false,
    };
  }

  /**
   * Read from TPM register (TIS - TPM Interface Specification)
   * @param {number} address - Register address
   * @returns {number} - Register value
   */
  readRegister(address) {
    const offset = address & 0xFF;
    
    switch (offset) {
      case 0x00: // TPM_ACCESS
        return this.getAccessRegister();
      case 0x08: // TPM_STS (Status)
        return this.getStatusRegister();
      case 0x18: // TPM_DATA_FIFO
        return this.readDataFIFO();
      case 0x24: // TPM_DID_VID
        return this.getDIDVID();
      default:
        console.warn(`TPM Device: Unhandled register read at 0x${offset.toString(16)}`);
        return 0;
    }
  }

  /**
   * Write to TPM register
   * @param {number} address - Register address
   * @param {number} value - Value to write
   */
  writeRegister(address, value) {
    const offset = address & 0xFF;
    
    switch (offset) {
      case 0x00: // TPM_ACCESS
        this.setAccessRegister(value);
        break;
      case 0x08: // TPM_STS (Status)
        this.setStatusRegister(value);
        break;
      case 0x18: // TPM_DATA_FIFO
        this.writeDataFIFO(value);
        break;
      default:
        console.warn(`TPM Device: Unhandled register write at 0x${offset.toString(16)}`);
    }
  }

  /**
   * Get TPM_ACCESS register value
   */
  getAccessRegister() {
    let value = 0;
    value |= 0x02; // TPM_ACCESS_VALID
    value |= 0x20; // TPM_ACCESS_ACTIVE_LOCALITY
    return value;
  }

  /**
   * Set TPM_ACCESS register
   */
  setAccessRegister(value) {
    if (value & 0x08) { // TPM_ACCESS_REQUEST_USE
      // Request locality
      this.locality = (value >> 8) & 0x07;
    }
  }

  /**
   * Get TPM_STS (Status) register value
   */
  getStatusRegister() {
    let value = 0;
    if (this.responseBuffer.length > 0) {
      value |= 0x01; // TPM_STS_DATA_AVAILABLE
    }
    if (this.commandBuffer.length > 0) {
      value |= 0x02; // TPM_STS_GO
    }
    value |= 0x08; // TPM_STS_VALID
    return value;
  }

  /**
   * Set TPM_STS register
   */
  setStatusRegister(value) {
    if (value & 0x20) { // TPM_STS_GO
      this.processCommand();
    }
  }

  /**
   * Read from TPM_DATA_FIFO
   */
  readDataFIFO() {
    if (this.responseBuffer.length > 0) {
      return this.responseBuffer.shift();
    }
    return 0;
  }

  /**
   * Write to TPM_DATA_FIFO
   */
  writeDataFIFO(value) {
    this.commandBuffer.push(value);
    this.status.commandReady = this.commandBuffer.length >= 10; // Minimum command size
  }

  /**
   * Process TPM command
   */
  async processCommand() {
    if (this.commandBuffer.length < 10) {
      return;
    }

    // Convert command buffer to Uint8Array
    const command = new Uint8Array(this.commandBuffer);
    this.commandBuffer = [];

    // Execute command via TPM emulator
    try {
      const response = await this.tpm.executeCommand(command);
      
      // Add response to buffer
      this.responseBuffer = Array.from(response);
      this.status.dataAvailable = true;
    } catch (error) {
      console.error('TPM Device: Command execution failed', error);
      // Create error response
      this.responseBuffer = [0x80, 0x02, 0x00, 0x00, 0x00, 0x0A, 0x00, 0x00, 0x00, 0x01]; // TPM_RC_FAILURE
    }
  }

  /**
   * Get TPM_DID_VID register (Device ID / Vendor ID)
   */
  getDIDVID() {
    // Return a fake vendor/device ID
    // Real TPM would return actual manufacturer ID
    return 0x00000000; // Placeholder
  }
}

export default TPMDevice;

