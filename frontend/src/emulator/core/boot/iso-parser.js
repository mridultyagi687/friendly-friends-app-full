/**
 * ISO 9660 Parser
 * 
 * Parses ISO 9660 file system to load boot files
 */

class ISOParser {
  constructor(memory) {
    this.memory = memory;
    this.isoData = null;
    this.primaryVolumeDescriptor = null;
    this.rootDirectory = null;
  }

  /**
   * Load ISO file
   * @param {ArrayBuffer} isoData - ISO file data
   */
  loadISO(isoData) {
    this.isoData = new Uint8Array(isoData);
    console.log(`ISO Parser: Loaded ISO file (${this.isoData.length} bytes)`);
    
    // Find Primary Volume Descriptor (starts at sector 16, 2048 bytes per sector)
    this.parseVolumeDescriptors();
  }

  /**
   * Parse volume descriptors
   */
  parseVolumeDescriptors() {
    // Volume descriptors start at sector 16 (offset 16 * 2048 = 32768)
    let offset = 16 * 2048;

    while (offset < this.isoData.length) {
      const type = this.isoData[offset];
      
      if (type === 0) {
        // Boot Record
        console.log('ISO Parser: Found Boot Record');
      } else if (type === 1) {
        // Primary Volume Descriptor
        this.primaryVolumeDescriptor = this.parsePrimaryVolumeDescriptor(offset);
        console.log('ISO Parser: Found Primary Volume Descriptor');
        console.log('Volume ID:', this.primaryVolumeDescriptor.volumeId);
      } else if (type === 2) {
        // Supplementary Volume Descriptor
        console.log('ISO Parser: Found Supplementary Volume Descriptor');
      } else if (type === 255) {
        // Volume Descriptor Set Terminator
        break;
      }

      offset += 2048; // Next sector
    }

    if (this.primaryVolumeDescriptor) {
      this.parseRootDirectory();
    }
  }

  /**
   * Parse Primary Volume Descriptor
   */
  parsePrimaryVolumeDescriptor(offset) {
    const pvd = {
      type: this.isoData[offset],
      standardId: this.readString(offset + 1, 5),
      version: this.isoData[offset + 6],
      volumeId: this.readString(offset + 40, 32).trim(),
      rootDirectoryRecord: this.parseDirectoryRecord(offset + 156),
    };

    return pvd;
  }

  /**
   * Parse directory record
   */
  parseDirectoryRecord(offset) {
    const length = this.isoData[offset];
    if (length === 0) {
      return null;
    }

    const record = {
      length: length,
      extendedAttributeLength: this.isoData[offset + 1],
      lba: this.readLittleEndian(offset + 2, 4),
      dataLength: this.readLittleEndian(offset + 10, 4),
      dateTime: this.readDateTime(offset + 18),
      flags: this.isoData[offset + 25],
      fileUnitSize: this.isoData[offset + 26],
      interleaveGapSize: this.isoData[offset + 27],
      volumeSequenceNumber: this.readLittleEndian(offset + 28, 2),
      identifierLength: this.isoData[offset + 32],
    };

    const identifierOffset = offset + 33;
    record.identifier = this.readString(identifierOffset, record.identifierLength);
    
    // Remove version suffix (;1)
    if (record.identifier.endsWith(';1')) {
      record.identifier = record.identifier.slice(0, -2);
    }

    return record;
  }

  /**
   * Parse root directory
   */
  parseRootDirectory() {
    if (!this.primaryVolumeDescriptor) {
      return;
    }

    const rootRecord = this.primaryVolumeDescriptor.rootDirectoryRecord;
    const rootLBA = rootRecord.lba;
    const rootOffset = rootLBA * 2048;

    console.log(`ISO Parser: Root directory at LBA ${rootLBA} (offset ${rootOffset})`);
    
    // Parse directory entries
    this.rootDirectory = this.parseDirectory(rootOffset, rootRecord.dataLength);
  }

  /**
   * Parse directory entries
   */
  parseDirectory(offset, length) {
    const entries = [];
    let currentOffset = offset;

    while (currentOffset < offset + length) {
      const record = this.parseDirectoryRecord(currentOffset);
      if (!record || record.length === 0) {
        break;
      }

      entries.push(record);
      currentOffset += record.length;

      // Align to even byte boundary
      if (currentOffset % 2 !== 0) {
        currentOffset++;
      }
    }

    return entries;
  }

  /**
   * Find file in ISO
   * @param {string} path - File path (e.g., "EFI/BOOT/BOOTX64.EFI")
   * @returns {Object|null} - Directory record or null
   */
  findFile(path) {
    if (!this.rootDirectory) {
      return null;
    }

    const parts = path.split('/').filter(p => p.length > 0);
    let currentEntries = this.rootDirectory;
    let currentLBA = this.primaryVolumeDescriptor.rootDirectoryRecord.lba;

    for (const part of parts) {
      const entry = currentEntries.find(e => 
        e.identifier.toUpperCase() === part.toUpperCase()
      );

      if (!entry) {
        return null;
      }

      if (entry.flags & 0x02) {
        // Directory
        const dirOffset = entry.lba * 2048;
        currentEntries = this.parseDirectory(dirOffset, entry.dataLength);
        currentLBA = entry.lba;
      } else {
        // File - return if this is the last part
        if (part === parts[parts.length - 1]) {
          return entry;
        }
        return null;
      }
    }

    return null;
  }

  /**
   * Read file from ISO
   * @param {string} path - File path
   * @returns {Uint8Array|null} - File data or null
   */
  readFile(path) {
    const entry = this.findFile(path);
    if (!entry) {
      return null;
    }

    const fileOffset = entry.lba * 2048;
    const fileData = this.isoData.slice(fileOffset, fileOffset + entry.dataLength);
    
    console.log(`ISO Parser: Read file ${path} (${fileData.length} bytes)`);
    return fileData;
  }

  /**
   * Helper: Read little-endian integer
   */
  readLittleEndian(offset, size) {
    let value = 0;
    for (let i = 0; i < size; i++) {
      value |= this.isoData[offset + i] << (i * 8);
    }
    return value;
  }

  /**
   * Helper: Read string
   */
  readString(offset, length) {
    const bytes = [];
    for (let i = 0; i < length; i++) {
      const byte = this.isoData[offset + i];
      if (byte === 0) break;
      bytes.push(byte);
    }
    return String.fromCharCode(...bytes);
  }

  /**
   * Helper: Read date/time
   */
  readDateTime(offset) {
    // ISO 9660 date/time format: "YYYYMMDDHHMMSS" + timezone
    const year = this.readString(offset, 4);
    const month = this.readString(offset + 4, 2);
    const day = this.readString(offset + 6, 2);
    const hour = this.readString(offset + 8, 2);
    const minute = this.readString(offset + 10, 2);
    const second = this.readString(offset + 12, 2);
    
    return {
      year, month, day, hour, minute, second,
    };
  }
}

export default ISOParser;

