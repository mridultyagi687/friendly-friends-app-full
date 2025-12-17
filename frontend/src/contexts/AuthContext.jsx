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
      // Debug: Log the session token being used
      const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('session_token') : null;
      if (import.meta.env.DEV) {
        console.log('Checking auth with token:', sessionToken ? 'present' : 'missing');
      }
      
      // If no session token, user is not logged in
      if (!sessionToken) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      const res = await api.get('/api/me');
      if (res.data && res.data.ok && res.data.user) {
        setUser(res.data.user);
        setError(null);
      } else {
        setUser(null);
        // Clear invalid session token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('session_token');
        }
      }
    } catch (err) {
      // Don't set error for 401 (unauthorized) - user is just not logged in
      // Also don't show errors for network issues on initial load
      if (err.response) {
        if (err.response.status === 401) {
          // Not logged in - clear session token
          if (typeof window !== 'undefined') {
            localStorage.removeItem('session_token');
          }
          setError(null);
          setUser(null);
        } else if (err.response.status === 500) {
          // Server error - log but don't block the app
          console.error('Server error during auth check:', err.response.data);
          setError(null); // Don't show error on initial load
          setUser(null);
        } else {
          // For other errors, clear session and don't block
          if (typeof window !== 'undefined') {
            localStorage.removeItem('session_token');
          }
          setError(null);
          setUser(null);
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
    
    // Single retry after 1 second for all platforms (in case of network delay)
    // With proper cookie configuration, this should work by default
    const retryTimeout = setTimeout(() => {
      checkAuth();
    }, 1000);
    
    return () => clearTimeout(retryTimeout);
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
      
      // Check if response has the expected structure
      if (res.data) {
        if (res.data.ok && res.data.user && res.data.session_token) {
          // Store session token in localStorage FIRST before setting user
          localStorage.setItem('session_token', res.data.session_token);
          
          // Set user immediately
          setUser(res.data.user);
          setError(null); // Clear any previous errors
          
          // Verify session is working by calling checkAuth after a short delay
          setTimeout(async () => {
            try {
              await checkAuth();
            } catch (e) {
              // If checkAuth fails, log but don't block - user is already logged in
              if (import.meta.env.DEV) {
                console.warn('Session verification failed after login:', e);
              }
            }
          }, 300);
          
          return true;
        } else if (res.data.error) {
          // Server returned an error
          setError(new Error(res.data.error));
          // Clear any existing session token on login failure
          if (typeof window !== 'undefined') {
            localStorage.removeItem('session_token');
          }
          return false;
        }
      }
      
      // Unexpected response format
      setError(new Error('Invalid response from server'));
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session_token');
      }
      return false;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Login failed. Please try again.';
      setError(new Error(errorMessage));
      // Clear any existing session token on login failure
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session_token');
      }
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
        
        // Store session token in localStorage for persistent login
        if (res.data.session_token) {
          localStorage.setItem('session_token', res.data.session_token);
        }
        
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
    // Always clear local state first, regardless of API call result
    if (typeof window !== 'undefined') {
      localStorage.removeItem('session_token');
    }
    setUser(null);
    setError(null);
    
    // Try to call logout API, but don't block on errors
    try {
      await api.post('/api/logout');
    } catch (err) {
      // Log error but don't block logout - local state is already cleared
      if (import.meta.env.DEV) {
        console.warn('Logout API call failed, but user is logged out locally:', err);
      }
    }
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
