import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// IndexedDB helper for storing VM state
const getDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CloudPCsDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('vmStates')) {
        db.createObjectStore('vmStates', { keyPath: 'pcId' });
      }
    };
  });
};

const saveVMState = async (pcId, state) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['vmStates'], 'readwrite');
    const store = transaction.objectStore('vmStates');
    await store.put({ pcId, state, timestamp: Date.now() });
  } catch (err) {
    console.error('Failed to save VM state:', err);
  }
};

const loadVMState = async (pcId) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['vmStates'], 'readonly');
    const store = transaction.objectStore('vmStates');
    return new Promise((resolve, reject) => {
      const request = store.get(pcId);
      request.onsuccess = () => resolve(request.result?.state || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to load VM state:', err);
    return null;
  }
};

function Windows11Emulator() {
  const { pcId } = useParams();
  const { user } = useAuth();
  const screenRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booting, setBooting] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [hasSavedState, setHasSavedState] = useState(false);
  const [checkingState, setCheckingState] = useState(true);
  const emulatorRef = useRef(null);
  const saveIntervalRef = useRef(null);

  // Check for saved state when password is verified
  useEffect(() => {
    if (passwordVerified && pcId) {
      checkForSavedState();
    }
  }, [passwordVerified, pcId]);

  // Load v86.js and initialize emulator
  useEffect(() => {
    if (!passwordVerified || checkingState) return;

    // Load v86.js from CDN
    if (!window.V86Starter) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/copy/v86@master/build/libv86.js';
      script.async = true;
      script.onload = () => {
        initializeEmulator();
      };
      script.onerror = () => {
        setError('Failed to load v86.js emulator library');
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      initializeEmulator();
    }

    return () => {
      // Cleanup emulator on unmount
      if (emulatorRef.current) {
        try {
          // Stop observer if it exists
          if (emulatorRef.current._observer) {
            emulatorRef.current._observer.disconnect();
          }
          // Save state before destroying
          saveCurrentState();
          emulatorRef.current.destroy();
        } catch (e) {
          console.error('Error destroying emulator:', e);
        }
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [passwordVerified, checkingState, hasSavedState]);

  const checkForSavedState = async () => {
    setCheckingState(true);
    try {
      const savedState = await loadVMState(pcId);
      if (savedState) {
        setHasSavedState(true);
      } else {
        setHasSavedState(false);
      }
    } catch (err) {
      console.error('Error checking for saved state:', err);
      setHasSavedState(false);
    } finally {
      setCheckingState(false);
    }
  };

  const saveCurrentState = async () => {
    if (!emulatorRef.current || !pcId) return;
    try {
      const state = emulatorRef.current.save_state();
      await saveVMState(pcId, state);
      console.log('VM state saved');
    } catch (err) {
      console.error('Failed to save VM state:', err);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    try {
      await api.post(`/api/cloud-pcs/${pcId}/verify-password`, { password });
      setPasswordVerified(true);
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Incorrect password');
    }
  };

  const initializeEmulator = async () => {
    if (!window.V86Starter || !screenRef.current) {
      setError('Emulator library not loaded');
      setLoading(false);
      return;
    }

    setBooting(true);
    setLoading(true);

    try {
      // Windows 11 ISO URL from archive.org
      const windows11IsoUrl = 'https://archive.org/download/windows-11-24h2-iso_202501/Win11_24H2_English_x64.iso';

      // Try to load saved state first
      let savedState = null;
      if (hasSavedState) {
        savedState = await loadVMState(pcId);
      }

      // Create v86 emulator instance
      const emulatorConfig = {
        screen_container: screenRef.current,
        memory_size: 512 * 1024 * 1024, // 512 MB RAM
        vga_memory_size: 8 * 1024 * 1024, // 8 MB VGA memory
        autostart: true,
        bios: {
          url: 'https://cdn.jsdelivr.net/gh/copy/v86@master/bios/seabios.bin',
        },
        vga_bios: {
          url: 'https://cdn.jsdelivr.net/gh/copy/v86@master/bios/vgabios.bin',
        },
        network_relay_url: 'wss://relay.widgetry.org/',
      };

      // Only add CDROM if we don't have a saved state
      if (!savedState) {
        emulatorConfig.cdrom = {
          url: windows11IsoUrl,
          async: true,
        };
      }

      emulatorRef.current = new window.V86Starter(emulatorConfig);

      // Restore saved state if available
      if (savedState) {
        try {
          emulatorRef.current.restore_state(savedState);
          console.log('Restored VM state from previous session');
          setBooting(false);
          setLoading(false);
        } catch (restoreErr) {
          console.error('Failed to restore state, booting from ISO:', restoreErr);
          // If restore fails, boot from ISO
          if (!emulatorConfig.cdrom) {
            emulatorConfig.cdrom = {
              url: windows11IsoUrl,
              async: true,
            };
            emulatorRef.current.destroy();
            emulatorRef.current = new window.V86Starter(emulatorConfig);
          }
        }
      }

      emulatorRef.current.add_listener('emulator-ready', () => {
        setBooting(false);
        setLoading(false);
        
        // Constrain any canvas elements created by v86
        if (screenRef.current) {
          const constrainElements = () => {
            // Constrain all canvases
            const canvases = screenRef.current.querySelectorAll('canvas');
            canvases.forEach(canvas => {
              canvas.style.position = 'relative';
              canvas.style.maxWidth = '100%';
              canvas.style.maxHeight = '100%';
              canvas.style.width = '100%';
              canvas.style.height = '100%';
              canvas.style.display = 'block';
              canvas.style.left = 'auto';
              canvas.style.top = 'auto';
              canvas.style.right = 'auto';
              canvas.style.bottom = 'auto';
            });
            
            // Constrain all divs
            const divs = screenRef.current.querySelectorAll('div');
            divs.forEach(div => {
              if (div.style.position === 'fixed' || div.style.position === 'absolute') {
                div.style.position = 'relative';
                div.style.left = 'auto';
                div.style.top = 'auto';
                div.style.right = 'auto';
                div.style.bottom = 'auto';
              }
            });
            
            // Check for any elements outside the container that might be from v86
            const allCanvases = document.querySelectorAll('canvas');
            allCanvases.forEach(canvas => {
              if (!screenRef.current.contains(canvas)) {
                const style = window.getComputedStyle(canvas);
                if (style.position === 'fixed' || style.position === 'absolute') {
                  canvas.style.display = 'none';
                }
              }
            });
          };
          
          constrainElements();
          // Re-constrain after delays in case v86 creates elements asynchronously
          setTimeout(constrainElements, 100);
          setTimeout(constrainElements, 500);
          setTimeout(constrainElements, 1000);
          
          // Use MutationObserver to catch elements as they're created
          const observer = new MutationObserver(() => {
            constrainElements();
          });
          observer.observe(screenRef.current, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
          });
          
          // Store observer for cleanup
          if (!emulatorRef.current._observer) {
            emulatorRef.current._observer = observer;
          }
        }
        
        // Start auto-saving state every 30 seconds
        saveIntervalRef.current = setInterval(() => {
          saveCurrentState();
        }, 30000);
      });

      emulatorRef.current.add_listener('screen-update', () => {
        // Screen updated
      });

      emulatorRef.current.add_listener('download-progress', (progress) => {
        // Show download progress
        console.log('Download progress:', progress);
      });

      emulatorRef.current.add_listener('error', (error) => {
        console.error('Emulator error:', error);
        setError(`Emulator error: ${error.message || 'Unknown error'}`);
        setLoading(false);
        setBooting(false);
      });

      // Save state before page unload
      window.addEventListener('beforeunload', saveCurrentState);
    } catch (err) {
      console.error('Failed to initialize emulator:', err);
      setError(`Failed to initialize emulator: ${err.message}`);
      setLoading(false);
      setBooting(false);
    }
  };

  const styles = {
    container: {
      width: '100%',
      height: '100%',
      minHeight: 'calc(100vh - 0px)',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: 'Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      maxWidth: '100%',
      boxSizing: 'border-box',
      zIndex: 1,
    },
    passwordScreen: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 0px)',
      backgroundColor: '#1a1a1a',
      padding: '2rem',
    },
    passwordForm: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      padding: '2rem',
      backgroundColor: '#2d2d2d',
      borderRadius: '10px',
      minWidth: '300px',
    },
    input: {
      padding: '0.75rem',
      fontSize: '1rem',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      border: '1px solid #404040',
      borderRadius: '5px',
    },
    button: {
      padding: '0.75rem',
      fontSize: '1rem',
      backgroundColor: '#667eea',
      color: '#fff',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
    },
    error: {
      color: '#f44336',
      fontSize: '0.9rem',
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 0px)',
      backgroundColor: '#000',
      gap: '1rem',
      padding: '2rem',
    },
    screen: {
      width: '100%',
      height: '100%',
      flex: 1,
      backgroundColor: '#000',
      overflow: 'hidden',
    },
    booting: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 0px)',
      backgroundColor: '#000',
      gap: '1rem',
      padding: '2rem',
    },
  };

  if (!passwordVerified) {
    return (
      <div style={styles.passwordScreen}>
        <h2>Windows 11 Cloud PC</h2>
        <form onSubmit={handlePasswordSubmit} style={styles.passwordForm}>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoFocus
          />
          {passwordError && <div style={styles.error}>{passwordError}</div>}
          <button type="submit" style={styles.button}>
            Boot Windows 11
          </button>
        </form>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.loading}>
        <h2>Error</h2>
        <p>{error}</p>
        <button
          onClick={() => {
            setError(null);
            setBooting(false);
            setLoading(true);
            if (emulatorRef.current) {
              try {
                emulatorRef.current.destroy();
              } catch (e) {
                console.error('Error destroying emulator:', e);
              }
            }
            initializeEmulator();
          }}
          style={styles.button}
        >
          Retry
        </button>
      </div>
    );
  }

  if (checkingState) {
    return (
      <div style={styles.booting}>
        <h2>Checking for saved state...</h2>
        <p>Looking for previous session...</p>
      </div>
    );
  }

  if (booting || loading) {
    return (
      <div style={styles.booting}>
        <h2>{hasSavedState ? 'Resuming Windows 11...' : 'Booting To Install Recovery'}</h2>
        <p>
          {hasSavedState
            ? 'Loading your previous session...'
            : 'Downloading and initializing Windows 11 ISO...'}
        </p>
        {!hasSavedState && (
          <p style={{ fontSize: '0.9rem', color: '#888' }}>
            This may take a few minutes. Please be patient.
          </p>
        )}
      </div>
    );
  }

  // Add CSS to constrain v86.js canvas elements and prevent fullscreen
  useEffect(() => {
    const styleId = 'v86-screen-constraints';
    // Remove existing style if any
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Constrain the container and all its children */
      #v86-screen-container {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      
      #v86-screen-container * {
        position: relative !important;
        max-width: 100% !important;
        max-height: 100% !important;
        box-sizing: border-box !important;
      }
      
      #v86-screen-container canvas {
        position: relative !important;
        max-width: 100% !important;
        max-height: 100% !important;
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        box-sizing: border-box !important;
      }
      
      /* Prevent v86 from creating fixed/absolute positioned elements outside container */
      body > canvas[style*="position: fixed"],
      body > canvas[style*="position:absolute"],
      body > div[style*="position: fixed"] {
        display: none !important;
      }
      
      /* Ensure no element breaks out of the container */
      .windows11-emulator-container {
        position: relative !important;
        overflow: hidden !important;
        max-width: 100% !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, []);

  return (
    <div style={styles.container} className="windows11-emulator-container">
      <div ref={screenRef} style={styles.screen} id="v86-screen-container"></div>
    </div>
  );
}

export default Windows11Emulator;

