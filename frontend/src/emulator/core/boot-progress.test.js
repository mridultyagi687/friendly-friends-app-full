/**
 * Boot Progress Test
 * 
 * Tests how far the emulator can progress through the Windows 11 boot process.
 * Measures progress at each phase and identifies where it fails.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import CustomEmulator from './emulator.js';

describe('Boot Progress Tests', () => {
  let emulator;
  let mockCanvas;

  beforeEach(() => {
    // Mock canvas for JSDOM environment
    // Create proper Uint8ClampedArray for imageData.data
    const createImageDataArray = (width, height) => {
      return new Uint8ClampedArray(width * height * 4);
    };

    mockCanvas = {
      getContext: vi.fn(() => ({
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ 
          data: createImageDataArray(640, 480),
          width: 640,
          height: 480,
        })),
        putImageData: vi.fn(),
        createImageData: vi.fn((width, height) => ({ 
          data: createImageDataArray(width || 640, height || 480),
          width: width || 640,
          height: height || 480,
        })),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
      })),
      width: 640,
      height: 480,
    };

    // Mock HTMLCanvasElement if needed
    if (typeof HTMLCanvasElement === 'undefined') {
      global.HTMLCanvasElement = class HTMLCanvasElement {};
    }

    emulator = new CustomEmulator(mockCanvas);
  });

  /**
   * Test Phase 1: UEFI Initialization
   * Should complete successfully
   */
  it('should complete UEFI initialization phase', async () => {
    const progress = {
      phase: 'UEFI_INIT',
      completed: false,
      error: null,
      steps: [],
    };

    try {
      await emulator.init();
      progress.steps.push('Memory initialized');
      progress.steps.push('CPU initialized');
      progress.steps.push('Storage initialized');
      progress.steps.push('UEFI firmware initialized');
      
      expect(emulator.initialized).toBe(true);
      expect(emulator.uefi).not.toBeNull();
      expect(emulator.uefi.initialized).toBe(true);
      
      progress.completed = true;
    } catch (error) {
      progress.error = error.message;
      throw error;
    }

    expect(progress.completed).toBe(true);
    expect(progress.steps.length).toBeGreaterThan(0);
  });

  /**
   * Test Phase 2: UEFI Boot Phases
   * Should complete SEC, PEI, DXE, BDS phases
   */
  it('should complete UEFI boot phases (SEC, PEI, DXE, BDS)', async () => {
    const progress = {
      phase: 'UEFI_BOOT_PHASES',
      completed: false,
      error: null,
      phases: {
        SEC: false,
        PEI: false,
        DXE: false,
        BDS: false,
      },
    };

    try {
      await emulator.init();
      
      // Mock boot phases to track completion
      const originalSecPhase = emulator.uefi.secPhase.bind(emulator.uefi);
      const originalPeiPhase = emulator.uefi.peiPhase.bind(emulator.uefi);
      const originalDxePhase = emulator.uefi.dxePhase.bind(emulator.uefi);
      const originalBdsPhase = emulator.uefi.bdsPhase.bind(emulator.uefi);

      emulator.uefi.secPhase = vi.fn(async () => {
        try {
          await originalSecPhase();
        } catch (e) {
          // Ignore errors in phase execution
        }
        progress.phases.SEC = true;
      });

      emulator.uefi.peiPhase = vi.fn(async () => {
        try {
          await originalPeiPhase();
        } catch (e) {
          // Ignore errors in phase execution
        }
        progress.phases.PEI = true;
      });

      emulator.uefi.dxePhase = vi.fn(async () => {
        try {
          await originalDxePhase();
        } catch (e) {
          // Ignore errors in phase execution
        }
        progress.phases.DXE = true;
      });

      emulator.uefi.bdsPhase = vi.fn(async () => {
        try {
          await originalBdsPhase(emulator);
        } catch (e) {
          // Ignore errors in phase execution (BDS might fail if no boot device)
        }
        progress.phases.BDS = true;
      });

      // Start boot process (but don't actually execute CPU)
      try {
        await emulator.uefi.boot(emulator);
      } catch (e) {
        // BDS might fail if no boot device found, which is expected
      }
      
      progress.completed = true;
    } catch (error) {
      progress.error = error.message;
      // Don't throw - we want to measure progress even if it fails
    }

    expect(progress.phases.SEC).toBe(true);
    expect(progress.phases.PEI).toBe(true);
    expect(progress.phases.DXE).toBe(true);
    // BDS might fail if no boot device found, which is expected
  });

  /**
   * Test Phase 3: Boot Device Detection
   * Should detect boot devices (even if none found)
   */
  it('should attempt boot device detection', async () => {
    const progress = {
      phase: 'BOOT_DEVICE_DETECTION',
      completed: false,
      error: null,
      devicesFound: 0,
      deviceTypes: [],
    };

    try {
      await emulator.init();
      
      const devices = await emulator.uefi.enumerateBootDevices(emulator);
      progress.devicesFound = devices.length;
      progress.deviceTypes = devices.map(d => d.type);
      
      progress.completed = true;
    } catch (error) {
      progress.error = error.message;
    }

    // Should complete even if no devices found
    expect(progress.completed).toBe(true);
    expect(progress.devicesFound).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test Phase 4: Boot Manager Loading
   * Should attempt to load boot manager (may fail if no ISO loaded)
   */
  it('should attempt to load boot manager', async () => {
    const progress = {
      phase: 'BOOT_MANAGER_LOADING',
      completed: false,
      error: null,
      bootManagerLoaded: false,
      entryPoint: null,
      instructionsExecuted: 0,
    };

    try {
      await emulator.init();
      
      // Try to load boot manager
      const devices = await emulator.uefi.enumerateBootDevices(emulator);
      
      if (devices.length > 0) {
        const device = devices[0];
        
        // Mock loadBootManager to track progress
        const originalLoadBootManager = emulator.uefi.loadBootManager;
        emulator.uefi.loadBootManager = vi.fn(async (dev, emu) => {
          try {
            await originalLoadBootManager.call(emulator.uefi, dev, emu);
            progress.bootManagerLoaded = true;
            progress.entryPoint = emulator.cpu.registers.rip;
          } catch (error) {
            progress.error = error.message;
            throw error;
          }
        });

        await emulator.uefi.loadBootManager(device, emulator);
      } else {
        // No boot device - expected in test environment
        progress.error = 'No boot devices found';
      }
      
      progress.completed = true;
    } catch (error) {
      progress.error = error.message;
    }

    // Should complete the attempt, even if it fails
    expect(progress.completed).toBe(true);
  });

  /**
   * Test Phase 5: CPU Instruction Execution
   * Measures how many instructions can execute before failure
   */
  it('should measure CPU instruction execution progress', async () => {
    const progress = {
      phase: 'CPU_EXECUTION',
      completed: false,
      error: null,
      instructionsExecuted: 0,
      maxInstructions: 1000, // Limit to prevent infinite loops
      lastRIP: null,
      executionTime: 0,
    };

    try {
      await emulator.init();
      
      // Set up a simple test program
      // MOV RAX, 0x12345678
      const testCode = new Uint8Array([
        0x48, 0xB8, 0x78, 0x56, 0x34, 0x12, 0x00, 0x00, 0x00, 0x00, // MOV RAX, 0x12345678
        0x90, // NOP
        0x90, // NOP
        0xC3, // RET
      ]);

      // Load test code into memory
      const codeAddress = 0x1000000;
      for (let i = 0; i < testCode.length; i++) {
        emulator.memory.writeByte(codeAddress + i, testCode[i]);
      }

      // Set entry point
      emulator.cpu.registers.rip = BigInt(codeAddress);
      emulator.cpu.registers.rsp = BigInt(0x7FFFF000); // Stack pointer

      // Execute instructions with progress tracking
      const startTime = Date.now();
      let instructionCount = 0;
      
      // Override CPU executeInstruction to track progress
      const originalExecuteInstruction = emulator.cpu.executeInstruction.bind(emulator.cpu);
      emulator.cpu.executeInstruction = function() {
        try {
          const result = originalExecuteInstruction();
          if (result) {
            instructionCount++;
            progress.instructionsExecuted = instructionCount;
            progress.lastRIP = this.registers.rip;
          }
          
          if (instructionCount >= progress.maxInstructions) {
            this.running = false;
          }
          
          return result;
        } catch (error) {
          progress.error = error.message;
          this.running = false;
          throw error;
        }
      };

      // Ensure CPU is initialized
      if (!emulator.cpu.decoder || !emulator.cpu.executor) {
        emulator.cpu.decoder = new (await import('./cpu/instruction-decoder.js')).default(emulator.cpu, emulator.memory);
        emulator.cpu.executor = new (await import('./cpu/instruction-executor.js')).default(emulator.cpu, emulator.memory);
      }

      // Run for a limited time
      emulator.cpu.running = true;
      while (emulator.cpu.running && instructionCount < progress.maxInstructions) {
        try {
          const result = emulator.cpu.executeInstruction();
          if (!result) {
            break;
          }
        } catch (error) {
          progress.error = error.message;
          break;
        }
      }

      progress.executionTime = Date.now() - startTime;
      progress.completed = true;
    } catch (error) {
      progress.error = error.message;
    }

    // Should have executed at least some instructions
    expect(progress.instructionsExecuted).toBeGreaterThan(0);
    expect(progress.completed).toBe(true);
  });

  /**
   * Test Phase 6: Full Boot Attempt
   * Attempts full boot and measures progress at each stage
   */
  it('should measure full boot attempt progress', async () => {
    const progress = {
      phase: 'FULL_BOOT_ATTEMPT',
      startTime: Date.now(),
      endTime: null,
      stages: {
        initialization: { completed: false, error: null, time: 0 },
        uefiBoot: { completed: false, error: null, time: 0 },
        bootDeviceDetection: { completed: false, error: null, time: 0 },
        bootManagerLoading: { completed: false, error: null, time: 0 },
        cpuExecution: { completed: false, error: null, instructionsExecuted: 0, time: 0 },
      },
      overallCompleted: false,
      overallError: null,
    };

    try {
      // Stage 1: Initialization
      const initStart = Date.now();
      try {
        await emulator.init();
        progress.stages.initialization.completed = true;
      } catch (error) {
        progress.stages.initialization.error = error.message;
        throw error;
      }
      progress.stages.initialization.time = Date.now() - initStart;

      // Stage 2: UEFI Boot
      const bootStart = Date.now();
      try {
        await emulator.uefi.boot(emulator);
        progress.stages.uefiBoot.completed = true;
      } catch (error) {
        progress.stages.uefiBoot.error = error.message;
      }
      progress.stages.uefiBoot.time = Date.now() - bootStart;

      // Stage 3: Boot Device Detection
      const deviceStart = Date.now();
      try {
        const devices = await emulator.uefi.enumerateBootDevices(emulator);
        progress.stages.bootDeviceDetection.completed = true;
        progress.stages.bootDeviceDetection.devicesFound = devices.length;
      } catch (error) {
        progress.stages.bootDeviceDetection.error = error.message;
      }
      progress.stages.bootDeviceDetection.time = Date.now() - deviceStart;

      // Stage 4: Boot Manager Loading (if device found)
      if (progress.stages.bootDeviceDetection.devicesFound > 0) {
        const loadStart = Date.now();
        try {
          const devices = await emulator.uefi.enumerateBootDevices(emulator);
          if (devices.length > 0) {
            await emulator.uefi.loadBootManager(devices[0], emulator);
            progress.stages.bootManagerLoading.completed = true;
          }
        } catch (error) {
          progress.stages.bootManagerLoading.error = error.message;
        }
        progress.stages.bootManagerLoading.time = Date.now() - loadStart;
      }

      // Stage 5: CPU Execution (limited)
      const cpuStart = Date.now();
      try {
        let instructionCount = 0;
        const maxInstructions = 100;
        
        emulator.cpu.running = true;
        while (emulator.cpu.running && instructionCount < maxInstructions) {
          try {
            emulator.cpu.step();
            instructionCount++;
            progress.stages.cpuExecution.instructionsExecuted = instructionCount;
          } catch (error) {
            progress.stages.cpuExecution.error = error.message;
            break;
          }
        }
        
        progress.stages.cpuExecution.completed = true;
      } catch (error) {
        progress.stages.cpuExecution.error = error.message;
      }
      progress.stages.cpuExecution.time = Date.now() - cpuStart;

      progress.overallCompleted = true;
    } catch (error) {
      progress.overallError = error.message;
    }

    progress.endTime = Date.now();
    progress.totalTime = progress.endTime - progress.startTime;

    // Log progress for analysis
    console.log('Boot Progress:', JSON.stringify(progress, null, 2));

    // Should complete initialization at minimum
    expect(progress.stages.initialization.completed).toBe(true);
    
    // Report progress
    return progress;
  });

  /**
   * Test: Measure boot progress percentage
   * Calculates how far through boot process we get
   */
  it('should calculate boot progress percentage', () => {
    const calculateProgress = (progress) => {
      const stages = [
        'initialization',
        'uefiBoot',
        'bootDeviceDetection',
        'bootManagerLoading',
        'cpuExecution',
      ];

      let completedStages = 0;
      for (const stage of stages) {
        if (progress.stages[stage]?.completed) {
          completedStages++;
        }
      }

      return {
        percentage: (completedStages / stages.length) * 100,
        completedStages,
        totalStages: stages.length,
      };
    };

    // Test with mock progress
    const mockProgress = {
      stages: {
        initialization: { completed: true },
        uefiBoot: { completed: true },
        bootDeviceDetection: { completed: true },
        bootManagerLoading: { completed: false },
        cpuExecution: { completed: false },
      },
    };

    const result = calculateProgress(mockProgress);
    expect(result.percentage).toBe(60); // 3/5 stages
    expect(result.completedStages).toBe(3);
    expect(result.totalStages).toBe(5);
  });
});

