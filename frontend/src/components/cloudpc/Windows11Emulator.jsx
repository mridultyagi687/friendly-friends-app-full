import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

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
  const emulatorRef = useRef(null);

  useEffect(() => {
    // Load v86.js from CDN
    if (!window.V86Starter) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/copy/v86@master/build/libv86.js';
      script.async = true;
      script.onload = () => {
        if (passwordVerified) {
          initializeEmulator();
        }
      };
      script.onerror = () => {
        setError('Failed to load v86.js emulator library');
        setLoading(false);
      };
      document.head.appendChild(script);
    } else if (passwordVerified) {
      initializeEmulator();
    }

    return () => {
      // Cleanup emulator on unmount
      if (emulatorRef.current) {
        try {
          emulatorRef.current.destroy();
        } catch (e) {
          console.error('Error destroying emulator:', e);
        }
      }
    };
  }, [passwordVerified]);

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

  const initializeEmulator = () => {
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

      // Create v86 emulator instance
      emulatorRef.current = new window.V86Starter({
        screen_container: screenRef.current,
        memory_size: 512 * 1024 * 1024, // 512 MB RAM
        vga_memory_size: 8 * 1024 * 1024, // 8 MB VGA memory
        cdrom: {
          url: windows11IsoUrl,
          async: true,
        },
        autostart: true,
        bios: {
          url: 'https://cdn.jsdelivr.net/gh/copy/v86@master/bios/seabios.bin',
        },
        vga_bios: {
          url: 'https://cdn.jsdelivr.net/gh/copy/v86@master/bios/vgabios.bin',
        },
        network_relay_url: 'wss://relay.widgetry.org/',
      });

      emulatorRef.current.add_listener('emulator-ready', () => {
        setBooting(false);
        setLoading(false);
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
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: 'Arial, sans-serif',
    },
    passwordScreen: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1a1a1a',
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
      height: '100vh',
      backgroundColor: '#000',
      gap: '1rem',
    },
    screen: {
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
    },
    booting: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#000',
      gap: '1rem',
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

  if (booting || loading) {
    return (
      <div style={styles.booting}>
        <h2>Booting Windows 11...</h2>
        <p>Downloading and initializing Windows 11 ISO...</p>
        <p style={{ fontSize: '0.9rem', color: '#888' }}>
          This may take a few minutes. Please be patient.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div ref={screenRef} style={styles.screen}></div>
    </div>
  );
}

export default Windows11Emulator;

