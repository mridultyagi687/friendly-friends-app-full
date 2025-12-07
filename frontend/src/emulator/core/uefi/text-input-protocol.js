/**
 * UEFI Simple Text Input Protocol
 * 
 * Provides text input capabilities for UEFI boot
 */

class SimpleTextInputProtocol {
  constructor() {
    this.reset = this.reset.bind(this);
    this.readKeyStroke = this.readKeyStroke.bind(this);
    this.waitForKey = this.waitForKey.bind(this);
    
    this.keyQueue = [];
    this.waitForEvent = null;
  }

  /**
   * Reset input device
   */
  reset(extendedVerification = false) {
    this.keyQueue = [];
    return { success: true };
  }

  /**
   * Read key stroke (non-blocking)
   */
  readKeyStroke() {
    if (this.keyQueue.length > 0) {
      return {
        key: this.keyQueue.shift(),
        success: true,
      };
    }
    return {
      key: null,
      success: false,
    };
  }

  /**
   * Wait for key event
   */
  waitForKey() {
    return this.waitForEvent;
  }

  /**
   * Add key to queue (called by keyboard handler)
   */
  addKey(key) {
    this.keyQueue.push(key);
    if (this.waitForEvent) {
      // Signal event if waiting
      this.waitForEvent();
      this.waitForEvent = null;
    }
  }

  /**
   * Set wait event callback
   */
  setWaitEvent(callback) {
    this.waitForEvent = callback;
  }
}

export default SimpleTextInputProtocol;

