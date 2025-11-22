import React, { useState, useEffect } from 'react';

function BrowserCheck({ children }) {
  const [isChrome, setIsChrome] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if browser is Chrome
    const checkBrowser = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      // Chrome detection: must contain 'chrome' but not 'edg' (Edge) or 'opr' (Opera)
      const isChromeBrowser = 
        userAgent.includes('chrome') && 
        !userAgent.includes('edg') && 
        !userAgent.includes('opr') &&
        !userAgent.includes('safari') || 
        (userAgent.includes('chrome') && userAgent.includes('safari') && !userAgent.includes('edg') && !userAgent.includes('opr'));
      
      // More accurate Chrome detection
      const isActuallyChrome = 
        (window.chrome && window.chrome.runtime) ||
        (userAgent.includes('chrome') && !userAgent.includes('edg') && !userAgent.includes('opr'));
      
      setIsChrome(isActuallyChrome || isChromeBrowser);
      setIsChecking(false);
    };

    checkBrowser();
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
              href="https://www.google.com/chrome/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={styles.downloadButton}
            >
              Download Chrome
            </a>
            <button 
              onClick={() => window.location.reload()} 
              style={styles.retryButton}
            >
              Retry Anyway
            </button>
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
  retryButton: {
    padding: '1rem 2rem',
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  note: {
    fontSize: '0.9rem',
    color: '#999',
    fontStyle: 'italic',
    marginTop: '1rem',
  },
};

export default BrowserCheck;

