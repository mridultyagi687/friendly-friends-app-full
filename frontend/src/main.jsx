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
  
  // Mobile font color fix - force black text on all inputs
  const forceInputColors = () => {
    if (window.innerWidth <= 768) {
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input) => {
        const bg = window.getComputedStyle(input).backgroundColor;
        const isWhite = bg.includes('rgb(255') || bg.includes('#fff') || bg.includes('white');
        if (isWhite || !bg.includes('rgba')) {
          input.style.color = '#000000';
          input.style.webkitTextFillColor = '#000000';
        }
      });
    }
  };
  
  // Run on load and after a delay to catch dynamically added inputs
  forceInputColors();
  setTimeout(forceInputColors, 500);
  setTimeout(forceInputColors, 2000);
  
  // Also run when inputs are focused (common time for color issues)
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      setTimeout(forceInputColors, 100);
    }
  }, true);
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
