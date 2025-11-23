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
  
  // iOS/Mobile font color fix - AGGRESSIVE force black text on all inputs
  const forceInputColors = () => {
    const isMobile = window.innerWidth <= 768;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isMobile || isIOS) {
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input) => {
        // Force black text on ALL inputs on mobile/iOS
        input.style.setProperty('color', '#000000', 'important');
        input.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
        input.style.setProperty('text-fill-color', '#000000', 'important');
        
        // Force white background if it's not explicitly dark
        const bg = window.getComputedStyle(input).backgroundColor;
        const isDark = bg.includes('rgba(0') || bg.includes('rgb(0') || 
                      bg.includes('rgba(255, 255, 255, 0.1') || 
                      bg.includes('rgba(255, 255, 255, 0.05');
        if (!isDark) {
          input.style.setProperty('background-color', '#ffffff', 'important');
        }
      });
    }
  };
  
  // Run immediately and multiple times to catch all inputs
  forceInputColors();
  setTimeout(forceInputColors, 100);
  setTimeout(forceInputColors, 500);
  setTimeout(forceInputColors, 1000);
  setTimeout(forceInputColors, 2000);
  
  // Run on any DOM changes (for dynamically added inputs)
  const observer = new MutationObserver(() => {
    forceInputColors();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Also run when inputs are focused/clicked
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      forceInputColors();
      setTimeout(forceInputColors, 50);
    }
  }, true);
  
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      setTimeout(forceInputColors, 50);
    }
  }, true);
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
