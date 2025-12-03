import axios from 'axios';

// When using Vite proxy, use relative URLs (Vite will proxy /api to backend)
// If VITE_API_URL is set, use that instead (for production builds)
// In Electron, use localhost:5002 for backend
const isElectron = typeof window !== 'undefined' && window.electronAPI;
const DEFAULT_API_ORIGIN = 'https://friendly-friends-app-full.onrender.com';
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  (isElectron
    ? 'http://localhost:5002'
    : DEFAULT_API_ORIGIN);

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  // For iOS Safari: increase timeout and ensure credentials are sent
  timeout: 30000, // 30 second timeout
});

// iOS workaround (Safari and Chrome on iOS): Ensure credentials are always sent
// Chrome on iOS uses WebKit and has the same cookie restrictions as Safari
const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
if (isIOS) {
  // Force credentials on iOS (works for both Safari and Chrome on iOS)
  api.defaults.withCredentials = true;
  // Increase timeout for iOS cookie handling
  api.defaults.timeout = 30000;
}

// Add request interceptor to log requests and ensure correct URL
api.interceptors.request.use(
  (config) => {
    // In production, ensure we always use the configured backend URL
    // Don't allow relative URLs in production builds
    if (!config.baseURL || config.baseURL === '' || config.baseURL === window.location.origin) {
      config.baseURL = DEFAULT_API_ORIGIN;
    }
    
    // Add session token from localStorage to Authorization header
    if (typeof window !== 'undefined') {
      const sessionToken = localStorage.getItem('session_token');
      if (sessionToken) {
        config.headers['Authorization'] = `Bearer ${sessionToken}`;
      }
    }
    
    // Remove Content-Type header for FormData - axios will set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    // Only log in development (not in production)
    if (import.meta.env.DEV) {
      console.log('Making request to:', config.url);
      if (typeof window !== 'undefined') {
        console.log('Full URL will be:', window.location.origin + config.baseURL + config.url);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add error interceptor for better debugging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only log detailed errors in development
    if (import.meta.env.DEV) {
      if (error.response) {
        // Only log 500 errors or other serious errors, skip 401/404 in production-like scenarios
        if (error.response.status >= 500) {
          console.error('API Error Details:', {
            message: error.message,
            code: error.code,
            response: error.response?.data || '(empty response)',
            status: error.response?.status,
            statusText: error.response?.statusText,
          });
        }
      } else {
        // Network error - no response from server
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          console.error('Network Error:', {
            message: error.message,
            code: error.code,
            backendURL: BASE_URL || 'using proxy',
          });
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
