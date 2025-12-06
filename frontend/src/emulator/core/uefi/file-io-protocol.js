/**
 * UEFI File I/O Protocol
 * 
 * Allows boot loaders to read files from storage devices
 */

class FileIOProtocol {
  constructor(storage, memory) {
    this.storage = storage; // Storage device
    this.memory = memory; // Memory manager
    this.guid = '09576E91-6D3F-11D2-8E39-00A0C969723B'; // EFI_FILE_IO_INTERFACE_GUID
    
    // Protocol revision
    this.revision = 0x00010000; // EFI 1.0
    
    // File system structure (simplified - just a flat file system for now)
    this.files = new Map(); // path -> { offset, size, data }
    this.rootHandle = null;
  }

  /**
   * Initialize file system
   * @param {Object} isoParser - ISO parser for reading files from ISO
   */
  init(isoParser = null) {
    console.log('FileIO: Initializing File I/O Protocol...');
    
    // If we have an ISO parser, index files from it
    if (isoParser && isoParser.isoLoaded) {
      this.indexISOFiles(isoParser);
    }
    
    // Create root handle
    this.rootHandle = {
      isDirectory: true,
      isOpen: true,
      position: 0,
      size: 0,
    };
    
    console.log(`FileIO: Initialized with ${this.files.size} files`);
  }

  /**
   * Index files from ISO
   * @param {Object} isoParser - ISO parser
   */
  indexISOFiles(isoParser) {
    // For now, just index a few key files
    const keyFiles = [
      'EFI/Microsoft/Boot/bootmgfw.efi',
      'EFI/BOOT/BOOTX64.EFI',
      'EFI/boot/bootx64.efi',
      'boot/bcd',
      'boot/boot.sdi',
    ];
    
    for (const filePath of keyFiles) {
      try {
        const fileData = isoParser.readFile(filePath);
        if (fileData) {
          this.files.set(filePath.toLowerCase(), {
            path: filePath,
            data: fileData,
            size: fileData.length,
          });
          console.log(`FileIO: Indexed ${filePath} (${fileData.length} bytes)`);
        }
      } catch (e) {
        // File not found, skip
      }
    }
  }

  /**
   * Open a file
   * @param {string} filePath - Path to file
   * @param {number} openMode - Open mode (read, write, etc.)
   * @returns {Object|null} - File handle or null
   */
  open(filePath, openMode = 1) { // 1 = EFI_FILE_MODE_READ
    const normalizedPath = filePath.toLowerCase();
    const file = this.files.get(normalizedPath);
    
    if (!file) {
      console.warn(`FileIO: File not found: ${filePath}`);
      return null;
    }
    
    const handle = {
      isDirectory: false,
      isOpen: true,
      position: 0,
      size: file.size,
      data: file.data,
      path: filePath,
    };
    
    console.log(`FileIO: Opened ${filePath} (${file.size} bytes)`);
    return handle;
  }

  /**
   * Read from file
   * @param {Object} handle - File handle
   * @param {number} bufferSize - Size to read
   * @returns {Uint8Array} - Data read
   */
  read(handle, bufferSize) {
    if (!handle || !handle.isOpen) {
      return new Uint8Array(0);
    }
    
    const remaining = handle.size - handle.position;
    const toRead = Math.min(bufferSize, remaining);
    
    if (toRead <= 0) {
      return new Uint8Array(0);
    }
    
    const data = handle.data.slice(handle.position, handle.position + toRead);
    handle.position += toRead;
    
    return data;
  }

  /**
   * Write to file
   * @param {Object} handle - File handle
   * @param {Uint8Array} data - Data to write
   * @returns {number} - Bytes written
   */
  write(handle, data) {
    if (!handle || !handle.isOpen) {
      return 0;
    }
    
    // For now, just append to data
    if (!handle.data) {
      handle.data = new Uint8Array(0);
    }
    
    const newData = new Uint8Array(handle.data.length + data.length);
    newData.set(handle.data);
    newData.set(data, handle.data.length);
    handle.data = newData;
    handle.size = handle.data.length;
    handle.position += data.length;
    
    return data.length;
  }

  /**
   * Close file
   * @param {Object} handle - File handle
   */
  close(handle) {
    if (handle) {
      handle.isOpen = false;
    }
  }

  /**
   * Get file info
   * @param {Object} handle - File handle
   * @returns {Object} - File info
   */
  getInfo(handle) {
    if (!handle) {
      return null;
    }
    
    return {
      size: handle.size,
      fileSize: handle.size,
      physicalSize: handle.size,
      createTime: Date.now(),
      lastAccessTime: Date.now(),
      modificationTime: Date.now(),
      attribute: 0, // Normal file
    };
  }

  /**
   * Set file position
   * @param {Object} handle - File handle
   * @param {number} position - New position
   */
  setPosition(handle, position) {
    if (handle) {
      handle.position = Math.max(0, Math.min(position, handle.size));
    }
  }

  /**
   * Get root directory handle
   * @returns {Object} - Root handle
   */
  getRoot() {
    if (!this.rootHandle) {
      // Initialize root handle if not already done
      this.rootHandle = {
        isDirectory: true,
        isOpen: true,
        position: 0,
        size: 0,
      };
    }
    return this.rootHandle;
  }
}

export default FileIOProtocol;

