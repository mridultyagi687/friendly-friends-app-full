/**
 * Virtual Memory Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import MemoryManager from './memory.js';
import VirtualMemoryManager from './virtual-memory.js';

describe('Virtual Memory Tests', () => {
  let memory;
  let vmm;

  beforeEach(() => {
    memory = new MemoryManager(1024 * 1024 * 1024); // 1GB for testing
    memory.init();
    vmm = memory.getVirtualMemory();
  });

  it('should initialize virtual memory', () => {
    expect(vmm).toBeDefined();
    expect(vmm.getCR3()).toBe(0n);
  });

  it('should set and get CR3', () => {
    const cr3 = 0x1000000n;
    vmm.setCR3(cr3);
    expect(vmm.getCR3()).toBe(cr3 & 0xFFFFFFFFFFFFF000n); // Should be page-aligned
  });

  it('should translate address with paging disabled (identity mapping)', () => {
    const virtualAddr = 0x1000n;
    const physical = vmm.translateAddress(virtualAddr, false);
    expect(physical).toBe(virtualAddr);
  });

  it('should setup identity mapping', () => {
    const cr3 = 0x1000000n;
    vmm.setCR3(cr3);
    
    // Setup identity mapping for first 1MB
    vmm.setupIdentityMapping(0n, 0x100000n, vmm.PTE_PRESENT | vmm.PTE_WRITABLE);
    
    // Test translation
    const virtualAddr = 0x5000n;
    const physical = vmm.translateAddress(virtualAddr, false);
    expect(physical).toBe(virtualAddr); // Identity mapping
  });

  it('should invalidate TLB', () => {
    vmm.invalidateTLB();
    expect(vmm.tlb.size).toBe(0);
  });

  it('should handle page table index extraction', () => {
    const addr = 0x1234567890ABCDEFn;
    const pml4Index = vmm.getPageTableIndex(addr, 0);
    const pdptIndex = vmm.getPageTableIndex(addr, 1);
    const pdIndex = vmm.getPageTableIndex(addr, 2);
    const ptIndex = vmm.getPageTableIndex(addr, 3);
    
    expect(pml4Index).toBeGreaterThanOrEqual(0);
    expect(pml4Index).toBeLessThan(512);
    expect(pdptIndex).toBeGreaterThanOrEqual(0);
    expect(pdptIndex).toBeLessThan(512);
    expect(pdIndex).toBeGreaterThanOrEqual(0);
    expect(pdIndex).toBeLessThan(512);
    expect(ptIndex).toBeGreaterThanOrEqual(0);
    expect(ptIndex).toBeLessThan(512);
  });
});

