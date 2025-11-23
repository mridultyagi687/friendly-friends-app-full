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
  
  // iOS/Mobile font color fix - Optimized to reduce performance impact
  const isMobile = window.innerWidth <= 768;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isMobile || isIOS) {
    let lastRunTime = 0;
    const THROTTLE_MS = 100; // Throttle to max once per 100ms
    
    const forceInputColors = () => {
      const now = Date.now();
      if (now - lastRunTime < THROTTLE_MS) return;
      lastRunTime = now;
      
      const inputs = document.querySelectorAll('input, textarea, select');
      const length = inputs.length;
      if (length === 0) return;
      
      // Batch DOM updates for better performance
      for (let i = 0; i < length; i++) {
        const input = inputs[i];
        // Only update if not already set
        if (!input.dataset.colorFixed) {
          input.style.setProperty('color', '#000000', 'important');
          input.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
          input.dataset.colorFixed = 'true';
          
          const bg = window.getComputedStyle(input).backgroundColor;
          const isDark = bg.includes('rgba(0') || bg.includes('rgb(0') || 
                        bg.includes('rgba(255, 255, 255, 0.1') || 
                        bg.includes('rgba(255, 255, 255, 0.05');
          if (!isDark) {
            input.style.setProperty('background-color', '#ffffff', 'important');
          }
        }
      }
    };
    
    // Run on initial load (deferred to not block rendering)
    requestAnimationFrame(() => {
      forceInputColors();
      setTimeout(forceInputColors, 200);
    });
    
    // Throttled observer for DOM changes
    const observer = new MutationObserver(() => {
      requestAnimationFrame(forceInputColors);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Throttled event listeners
    const handleInputEvent = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        requestAnimationFrame(forceInputColors);
      }
    };
    
    document.addEventListener('focusin', handleInputEvent, true);
    document.addEventListener('click', handleInputEvent, true);
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
