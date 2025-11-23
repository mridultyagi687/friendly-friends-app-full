import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/friendly-friends-logo.png';
import { isSafari } from '../../utils/safariCompat';

function Login() {
  const { login, register, error } = useAuth();
  const [mode, setMode] = useState('member'); // 'member' or 'viewer'
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleMemberLogin = async (e) => {
    e.preventDefault();
    const success = await login(formData.username, formData.password);
    if (success) {
      // Wait for cookie to be set and session to be established before navigating
      // This is especially important on iOS where cookie setting can be delayed
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const waitTime = isIOS ? 1000 : 300; // Longer wait on iOS
      
      // Wait for cookie to be set
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Verify session is established by checking auth multiple times on iOS
      if (isIOS) {
        // On iOS, verify multiple times to ensure cookie is accepted
        for (let i = 0; i < 3; i++) {
          await checkAuth();
          await new Promise(resolve => setTimeout(resolve, 400));
        }
        // Extra wait after verification
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        await checkAuth();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Use replace to avoid adding to history and prevent back button issues
      navigate('/', { replace: true });
    }
  };

  const handleViewerAction = async (e) => {
    e.preventDefault();
    if (isRegistering) {
      // Register as viewer with viewer role
      const success = await register(formData.username, formData.email, formData.password, 'Research Viewer');
      if (success) {
        // Wait for cookie to be set and session to be established
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const waitTime = isIOS ? 800 : 300;
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        await checkAuth();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Double-check user is set
        if (!user) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await checkAuth();
        }
        
        navigate('/blog'); // Redirect to blog after registration
      }
    } else {
      // Login as viewer
      const success = await login(formData.username, formData.password);
      if (success) {
        // Wait for cookie to be set and session to be established
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const waitTime = isIOS ? 800 : 300;
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        await checkAuth();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Double-check user is set
        if (!user) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await checkAuth();
        }
        
        navigate('/blog'); // Redirect to blog after login
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const switchToRegister = () => {
    setIsRegistering(true);
    setFormData({ username: '', email: '', password: '' });
  };

  const switchToLogin = () => {
    setIsRegistering(false);
    setFormData({ username: '', email: '', password: '' });
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .login-container {
          animation: gradientShift 15s ease infinite;
        }
        @media (max-width: 768px) {
          .login-box-mobile {
            padding: 1.5rem !important;
            margin: 1rem !important;
            max-width: calc(100% - 2rem) !important;
            border-radius: 15px !important;
          }
          .logo-mobile {
            width: 140px !important;
          }
          .mode-title-mobile {
            font-size: 1rem !important;
            margin-bottom: 1rem !important;
          }
          .mode-selector-mobile {
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
          .mode-button-mobile {
            font-size: 0.85rem !important;
            padding: 0.6rem !important;
          }
        }
        @media (max-width: 480px) {
          .login-box-mobile {
            padding: 1rem !important;
            margin: 0.5rem !important;
            max-width: calc(100% - 1rem) !important;
          }
          .logo-mobile {
            width: 120px !important;
          }
          .mode-title-mobile {
            font-size: 0.9rem !important;
          }
        }
      `}</style>
      <div style={styles.loginBox} className="login-box-mobile">
        <img src={logo} alt="Friendly Friends AI logo" style={styles.logo} className="logo-mobile" />
        <p style={styles.subtitle}>
          {mode === 'member' ? 'Research, Share, Connect, Enjoy' : 'Enjoy, Research'}
        </p>
        
        {/* Mode Selection */}
        <div style={styles.modeSelector} className="mode-selector-mobile">
          <button
            type="button"
            onClick={() => {
              setMode('member');
              setIsRegistering(false);
              setFormData({ username: '', email: '', password: '' });
            }}
            style={{
              ...styles.modeButton,
              ...(mode === 'member' ? styles.modeButtonActive : {})
            }}
            className="mode-button-mobile"
          >
            👥 Member Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('viewer');
              setIsRegistering(false);
              setFormData({ username: '', email: '', password: '' });
            }}
            style={{
              ...styles.modeButton,
              ...(mode === 'viewer' ? styles.modeButtonActive : {})
            }}
            className="mode-button-mobile"
          >
            📖 Research Viewer
          </button>
        </div>

        {mode === 'member' ? (
          <>
            <h2 style={styles.modeTitle} className="mode-title-mobile">Friendly Friends AI Member? - Login</h2>
            <form onSubmit={handleMemberLogin} style={styles.form}>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                style={styles.input}
                required
              />
              
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                style={styles.input}
                required
              />
              
              {error && <p style={styles.error}>{error.message}</p>}
              
              <button type="submit" style={styles.loginButton}>
                Login
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={styles.modeTitle} className="mode-title-mobile">
              Friendly Friends AI Research Viewer? - {isRegistering ? 'Register' : 'Login'}
            </h2>
            <form onSubmit={handleViewerAction} style={styles.form}>
              {isRegistering && (
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              )}
              
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                style={styles.input}
                required
              />
              
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                style={styles.input}
                required
              />
              
              {error && <p style={styles.error}>{error.message}</p>}
              
              <button type="submit" style={styles.loginButton}>
                {isRegistering ? 'Register' : 'Login'}
              </button>
              
              <div style={styles.switchContainer}>
                {isRegistering ? (
                  <p style={styles.switchText}>
                    Already have an account?{' '}
                    <button type="button" onClick={switchToLogin} style={styles.switchButton}>
                      Login
                    </button>
                  </p>
                ) : (
                  <p style={styles.switchText}>
                    New to Research Viewer?{' '}
                    <button type="button" onClick={switchToRegister} style={styles.switchButton}>
                      Register
                    </button>
                  </p>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 15s ease infinite',
    padding: '1rem', // Add padding for mobile
  },
  loginBox: {
    padding: '2rem',
    background: 'rgba(255, 255, 255, 0.95)',
    ...(isSafari() ? { WebkitBackdropFilter: 'blur(10px)' } : {}),
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '500px',
    border: '2px solid rgba(102, 126, 234, 0.4)',
    margin: '0 auto', // Center on mobile
  },
  logo: {
    width: '180px',
    height: 'auto',
    margin: '0 auto 0.5rem',
    display: 'block',
  },
  subtitle: {
    color: '#666',
    marginBottom: '1.5rem',
  },
  modeSelector: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  modeButton: {
    flex: 1,
    padding: '0.75rem',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#e0e7ff',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
    borderRadius: '8px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  modeButtonActive: {
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#667eea',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontWeight: '600',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  modeTitle: {
    fontSize: '1.2rem',
    color: '#333',
    marginBottom: '1.5rem',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1rem',
  },
  input: {
    padding: '0.75rem',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '8px',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    background: '#ffffff', // Force white background
    color: '#000000', // Black text color for username and password
    WebkitTextFillColor: '#000000', // iOS Safari fix
    transition: 'all 0.3s ease',
  },
  inputFocus: {
    border: '2px solid #667eea',
    outline: '2px solid rgba(102, 126, 234, 0.3)',
    outlineOffset: '2px',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
  loginButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%',
    marginTop: '0.5rem',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  error: {
    color: '#f44336',
    margin: '0.5rem 0',
    fontSize: '0.9rem',
  },
  switchContainer: {
    marginTop: '1rem',
  },
  switchText: {
    color: '#666',
    fontSize: '0.9rem',
    margin: 0,
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#2196f3',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '0.9rem',
    padding: 0,
    marginLeft: '0.25rem',
  },
};

export default Login;