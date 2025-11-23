import React, { useState, useEffect, useRef } from 'react';

function BrowserCheck({ children }) {
  // Check if we've already verified browser (persist across navigation)
  const storageKey = 'browser_check_completed';
  const wasChecked = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(storageKey) === 'true';
  const [isChrome, setIsChrome] = useState(wasChecked ? true : true);
  const [isChecking, setIsChecking] = useState(wasChecked ? false : true);
  const hasCompletedRef = useRef(wasChecked);

  useEffect(() => {
    // If already checked, skip the check entirely and immediately render children
    if (wasChecked && hasCompletedRef.current) {
      setIsChecking(false);
      setIsChrome(true);
      return;
    }
    
    // Check if browser is Chrome with timeout
    const checkBrowser = () => {
      if (hasCompletedRef.current) return;
      
      try {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Chrome detection: 
        // 1. Must have window.chrome object (most reliable for desktop)
        // 2. User agent contains 'chrome' but not 'edg' (Edge) or 'opr' (Opera)
        // 3. For mobile Chrome, check for 'crios' (Chrome iOS) or Chrome Android
        const hasChromeObject = typeof window !== 'undefined' && window.chrome && (window.chrome.runtime || window.chrome.webstore);
        const hasChromeInUA = userAgent.includes('chrome');
        const isEdge = userAgent.includes('edg');
        const isOpera = userAgent.includes('opr');
        
        // Chrome iOS detection (CriOS)
        const isChromeIOS = userAgent.includes('crios');
        
        // Chrome Android detection - more lenient
        const isChromeAndroid = userAgent.includes('chrome') && 
                                userAgent.includes('android') && 
                                !isEdge && 
                                !isOpera &&
                                !userAgent.includes('samsungbrowser'); // Exclude Samsung Internet
        
        // Mobile Chrome detection (Chrome on mobile devices) - more lenient
        // On mobile, Chrome UA often includes both 'chrome' and 'safari'
        const isMobileChrome = (userAgent.includes('chrome') && 
                               (userAgent.includes('mobile') || userAgent.includes('android'))) && 
                               !isEdge && 
                               !isOpera &&
                               !userAgent.includes('samsungbrowser');
        
        // Desktop Chrome detection
        const isDesktopChrome = hasChromeObject && 
                                hasChromeInUA && 
                                !isEdge && 
                                !isOpera;
        
        // Pure Safari detection (Safari without Chrome)
        // Safari UA contains 'safari' but NOT 'chrome' or 'crios'
        const isPureSafari = userAgent.includes('safari') && 
                            !userAgent.includes('chrome') && 
                            !userAgent.includes('crios') &&
                            !isEdge &&
                            !isOpera;
        
        // Chrome is detected if:
        // - Desktop: Has chrome object AND user agent has chrome (not Edge/Opera)
        // - Mobile iOS: Has 'crios' in user agent (Chrome iOS)
        // - Mobile Android: Has 'chrome' and 'android' but not Edge/Opera/Samsung
        // - Mobile Chrome: Has 'chrome' and 'mobile/android' but not Edge/Opera/Samsung
        // OR
        // - User agent has chrome but not Edge/Opera and not pure Safari
        // IMPORTANT: On mobile Chrome, UA often has both 'chrome' and 'safari', so we prioritize chrome
        const isChromeBrowser = 
          isDesktopChrome ||
          isChromeIOS ||
          isChromeAndroid ||
          isMobileChrome ||
          (hasChromeInUA && !isEdge && !isOpera && !isPureSafari);
        
        hasCompletedRef.current = true;
        setIsChrome(isChromeBrowser);
        setIsChecking(false);
        // Store in sessionStorage to prevent re-checking on navigation
        sessionStorage.setItem(storageKey, 'true');
      } catch (error) {
        // If there's any error, allow the app to load (fail open)
        console.warn('Browser check error:', error);
        hasCompletedRef.current = true;
        setIsChrome(true);
        setIsChecking(false);
        // Store in sessionStorage to prevent re-checking on navigation
        sessionStorage.setItem(storageKey, 'true');
      }
    };

    // Run check immediately
    checkBrowser();
    
    // Timeout fallback - if check doesn't complete in 1 second, allow app to load
    const timeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        console.warn('Browser check timeout - allowing app to load');
        hasCompletedRef.current = true;
        setIsChrome(true);
        setIsChecking(false);
        // Store in sessionStorage to prevent re-checking on navigation
        sessionStorage.setItem(storageKey, 'true');
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  if (isChecking) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}>⏳</div>
        <p>Checking browser compatibility...</p>
      </div>
    );
  }

  if (!isChrome) {
    return (
      <div style={styles.container}>
        <div style={styles.messageBox}>
          <div style={styles.icon}>⚠️</div>
          <h1 style={styles.title}>Sorry, Your Browser Is Not Supported</h1>
          <p style={styles.message}>
            This application requires Google Chrome for the best experience.
          </p>
          <p style={styles.subMessage}>
            Please try again using Chrome browser.
          </p>
          <div style={styles.actions}>
            <a 
              href="https://dl.google.com/chrome/mac/universal/stable/GGRO/googlechrome.dmg" 
              target="_blank" 
              rel="noopener noreferrer"
              style={styles.downloadButton}
            >
              Download Chrome
            </a>
          </div>
          <p style={styles.note}>
            Note: Other browsers may not support all features of this application.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    backgroundSize: '400% 400%',
    padding: '2rem',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    color: 'white',
  },
  spinner: {
    fontSize: '3rem',
    marginBottom: '1rem',
    animation: 'spin 2s linear infinite',
  },
  messageBox: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '3rem',
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '2px solid rgba(102, 126, 234, 0.3)',
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#333',
    marginBottom: '1rem',
  },
  message: {
    fontSize: '1.2rem',
    color: '#666',
    marginBottom: '0.5rem',
    lineHeight: 1.6,
  },
  subMessage: {
    fontSize: '1rem',
    color: '#888',
    marginBottom: '2rem',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
  },
  downloadButton: {
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
    display: 'inline-block',
  },
  note: {
    fontSize: '0.9rem',
    color: '#999',
    fontStyle: 'italic',
    marginTop: '1rem',
  },
};

export default BrowserCheck;

