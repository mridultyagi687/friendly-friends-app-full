import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Safari compatibility fixes
if (typeof window !== 'undefined') {
  // Detect Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Add Safari class to body for CSS targeting
  if (isSafari) {
    document.body.classList.add('safari');
  }
  
  // Polyfill for backdrop-filter in older Safari versions
  if (isSafari && !CSS.supports('backdrop-filter', 'blur(1px)') && !CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) {
    // Add fallback class
    document.body.classList.add('no-backdrop-filter');
  }
  
  // Ensure localStorage is available
  try {
    localStorage.setItem('__safari_test__', '1');
    localStorage.removeItem('__safari_test__');
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
