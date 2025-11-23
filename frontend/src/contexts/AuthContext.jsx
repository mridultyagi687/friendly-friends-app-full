import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/me');
      if (res.data && res.data.ok) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      // Don't set error for 401 (unauthorized) - user is just not logged in
      // Also don't show errors for network issues on initial load
      if (err.response) {
        if (err.response.status === 401) {
          // Not logged in - this is normal
          setError(null);
          setUser(null);
        } else if (err.response.status === 500) {
          // Server error - log but don't block the app
          console.error('Server error during auth check:', err.response.data);
          setError(null); // Don't show error on initial load
          setUser(null);
        } else {
          setError(err);
        }
      } else {
        // Network error - don't show on initial load
        console.warn('Network error during auth check (backend may be starting):', err.message);
        setError(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    
    // On iOS, retry auth check multiple times (iOS Safari cookie issues)
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // Retry auth check multiple times to handle iOS Safari cookie delays
      const retries = [1000, 2000, 3000, 5000]; // Retry at 1s, 2s, 3s, 5s
      const timeouts = retries.map(delay => 
        setTimeout(() => {
          checkAuth();
        }, delay)
      );
      
      return () => timeouts.forEach(clearTimeout);
    }
    
    // On Android, single retry
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      const retryTimeout = setTimeout(() => {
        checkAuth();
      }, 1000);
      
      return () => clearTimeout(retryTimeout);
    }
  }, [checkAuth]);

  // Global presence heartbeat while logged in (every 30s)
  useEffect(() => {
    if (user) {
      const sendHeartbeat = async () => {
        try {
          await api.post('/api/presence/update');
        } catch (e) {
          // ignore
        }
      };
      // send immediately then every 30s
      sendHeartbeat();
      const id = setInterval(() => {
        sendHeartbeat();
      }, 30000);
      return () => {
        clearInterval(id);
      };
    }
    return undefined;
  }, [user]);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/login', { username, password });
      if (res.data && res.data.ok) {
        setUser(res.data.user);
        setError(null); // Clear any previous errors
        
        // On iOS, retry auth check multiple times to ensure cookie is set
        // iOS Safari sometimes needs multiple attempts to accept the cookie
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        if (isIOS) {
          // Retry auth check immediately, then after delays
          const retryAuth = async (delay) => {
            await new Promise(resolve => setTimeout(resolve, delay));
            try {
              await checkAuth();
            } catch (e) {
              // Ignore errors - just trying to establish session
            }
          };
          
          // Retry immediately, then at 500ms, 1s, and 2s
          retryAuth(0);
          retryAuth(500);
          retryAuth(1000);
          retryAuth(2000);
        }
        
        return true;
      }
      setError(new Error(res.data?.error || 'Invalid credentials'));
      return false;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Request Failed';
      setError(new Error(errorMessage));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password, role = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/register', { username, email, password, role });
      if (res.data && res.data.ok) {
        setUser(res.data.user);
        setError(null); // Clear any previous errors
        return true;
      }
      setError(new Error(res.data?.error || 'Registration failed'));
      return false;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Registration failed';
      setError(new Error(errorMessage));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/logout');
    } catch (err) {
      // ignore
    }
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, checkAuth, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
