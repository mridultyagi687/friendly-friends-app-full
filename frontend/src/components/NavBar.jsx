import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppTour } from './AppTour';
import { hasRole } from '../utils/roleUtils';
import { canAccessFeature } from '../utils/roleEnforcement';
import SidebarAiChat from './ai/SidebarAiChat';
import logo from '../assets/friendly-friends-logo.png';

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const { startTour, hasCompletedTour } = useAppTour();
  const [showAiChat, setShowAiChat] = useState(false);
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      window.location.reload(); // Force reload to clear state
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleAiChat = () => {
    setShowAiChat(prev => !prev);
  };

  // If AI chat is shown, render only the AI chat component
  if (showAiChat) {
    return <SidebarAiChat onClose={toggleAiChat} />;
  }

  const sidebarStyle = {
    ...styles.sidebar,
    background: colors.sidebarBackground,
    color: isDarkMode ? 'white' : '#000000',
  };

  const linkStyle = {
    ...styles.link,
    color: isDarkMode ? 'white' : '#000000',
  };

  const activeLinkStyle = {
    ...styles.activeLink,
    background: isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.1)',
  };

  const adminLinkStyle = {
    ...styles.adminLink,
    color: isDarkMode ? 'white' : '#000000',
    background: isDarkMode ? 'rgba(102, 126, 234, 0.2)' : 'rgba(102, 126, 234, 0.1)',
  };

  return (
    <nav style={sidebarStyle}>
      <div style={styles.brand}>
        <img src={logo} alt="Friendly Friends AI logo" style={styles.brandImage} />
      </div>
      <button
        style={styles.aiHelpButton}
        onClick={toggleAiChat}
        title="AI Side Help"
      >
        🤖 AI Help
      </button>
      <div style={styles.links} className="sidebar-links" data-tour="sidebar">
        {/* Show navigation links based on role permissions */}
        {canAccessFeature(user, 'messages') && (
          <Link 
            to="/messages" 
            data-tour="messages"
            style={{
              ...linkStyle,
              ...(isActive('/messages') ? activeLinkStyle : {})
            }}
          >
            💬 Messages
          </Link>
        )}
        {canAccessFeature(user, 'members') && (
          <Link 
            to="/members" 
            data-tour="members"
            style={{
              ...linkStyle,
              ...(isActive('/members') ? activeLinkStyle : {})
            }}
          >
            👥 Members
          </Link>
        )}
        {canAccessFeature(user, 'todos') && (
          <Link 
            to="/todos" 
            data-tour="todos"
            style={{
              ...linkStyle,
              ...(isActive('/todos') ? activeLinkStyle : {})
            }}
          >
            📝 To-Do List
          </Link>
        )}
        {canAccessFeature(user, 'paint') && (
          <Link 
            to="/paint" 
            data-tour="paint"
            style={{
              ...linkStyle,
              ...(isActive('/paint') ? activeLinkStyle : {})
            }}
          >
            🎨 Paint
          </Link>
        )}
        {canAccessFeature(user, 'videos') && (
          <Link 
            to="/videos" 
            data-tour="videos"
            style={{
              ...linkStyle,
              ...(isActive('/videos') ? activeLinkStyle : {})
            }}
          >
            🎬 Videos
          </Link>
        )}
        {canAccessFeature(user, 'ai-chat') && (
          <Link 
            to="/ai-chat" 
            data-tour="ai-chat"
            style={{
              ...linkStyle,
              ...(isActive('/ai-chat') ? activeLinkStyle : {})
            }}
          >
            🤖 AI Chat
          </Link>
        )}
        {canAccessFeature(user, 'docs') && (
          <Link 
            to="/docs" 
            data-tour="docs"
            style={{
              ...linkStyle,
              ...(isActive('/docs') ? activeLinkStyle : {})
            }}
          >
            📄🖼️ My Docs and Images
          </Link>
        )}
        {canAccessFeature(user, 'bugs') && (
          <Link 
            to="/report-bug" 
            data-tour="bugs"
            style={{
              ...linkStyle,
              ...(isActive('/report-bug') ? activeLinkStyle : {})
            }}
          >
            🐞 Report Bugs
          </Link>
        )}
        {canAccessFeature(user, 'blog') && (
          <Link 
            to="/blog" 
            data-tour="blog"
            style={{
              ...linkStyle,
              ...(isActive('/blog') ? activeLinkStyle : {})
            }}
          >
            📝 Blog
          </Link>
        )}
        <Link 
          to="/research" 
          data-tour="research"
          style={{
            ...linkStyle,
            ...(isActive('/research') ? activeLinkStyle : {})
          }}
        >
          🔬 Live Research
        </Link>
        <Link 
          to="/reminders" 
          data-tour="reminders"
          style={{
            ...linkStyle,
            ...(isActive('/reminders') ? activeLinkStyle : {})
          }}
        >
          ⏰ Reminders
        </Link>
        <Link 
          to="/roles" 
          data-tour="roles"
          style={{
            ...linkStyle,
            ...(isActive('/roles') ? activeLinkStyle : {})
          }}
        >
          🎭 Roles
        </Link>
        <Link 
          to="/cloud-pcs" 
          data-tour="cloud-pcs"
          style={{
            ...linkStyle,
            ...(isActive('/cloud-pcs') ? activeLinkStyle : {})
          }}
        >
          💻 My Cloud PCs
        </Link>
        {user?.is_admin && (
          <>
            <Link 
              to="/admin" 
              data-tour="admin"
              style={{
                ...adminLinkStyle,
                ...(isActive('/admin') ? activeLinkStyle : {})
              }}
            >
              ⚙️ Admin
            </Link>
            <Link 
              to="/admin/ai-training" 
              data-tour="ai-training"
              style={{
                ...adminLinkStyle,
                ...(isActive('/admin/ai-training') ? activeLinkStyle : {})
              }}
            >
              🎓 Train AI
            </Link>
            <Link 
              to="/admin/role-assignment" 
              data-tour="role-assignment"
              style={{
                ...adminLinkStyle,
                ...(isActive('/admin/role-assignment') ? activeLinkStyle : {})
              }}
            >
              🎯 Assign Roles
            </Link>
          </>
        )}
      </div>
      <div style={styles.user}>
        <div style={styles.userInfo}>
          <span style={{ ...styles.welcome, color: isDarkMode ? 'white' : '#000000' }}>👤 {user?.username}</span>
          {user?.is_admin && <span style={styles.adminBadge}>Admin</span>}
        </div>
        {hasCompletedTour() && (
          <button onClick={startTour} style={styles.tourButton} title="Start app tour">
            🎯 Start Tour
          </button>
        )}
        <button onClick={toggleTheme} style={styles.themeToggleButton} title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {isDarkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>
    </nav>
  );
}

const styles = {
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    width: '250px',
    background: 'linear-gradient(180deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 0',
    boxShadow: '2px 0 15px rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
    overflow: 'hidden', // Prevent sidebar itself from scrolling
  },
  brand: {
    padding: '0 1.5rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  brandImage: {
    width: '120px',
    height: 'auto',
    display: 'inline-block',
  },
  aiHelpButton: {
    margin: '0 1rem 1rem',
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: 'calc(100% - 2rem)',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: 1,
    padding: '0 1rem',
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0, // Important for flex scrolling
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    transition: 'all 0.2s',
    display: 'block',
    fontSize: '1rem',
  },
  activeLink: {
    background: 'rgba(255, 255, 255, 0.25)',
    fontWeight: '600',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
  },
  adminLink: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    transition: 'all 0.2s',
    display: 'block',
    fontSize: '1rem',
    background: 'rgba(102, 126, 234, 0.2)',
    border: '1px solid rgba(102, 126, 234, 0.4)',
    backdropFilter: 'blur(10px)',
  },
  user: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid rgba(102, 126, 234, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  welcome: {
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  adminBadge: {
    fontSize: '0.75rem',
    backgroundColor: '#ff9800',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    width: 'fit-content',
  },
  tourButton: {
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    width: '100%',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  themeToggleButton: {
    padding: '0.5rem 1rem',
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    width: '100%',
    transition: 'all 0.3s ease',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(102, 126, 234, 0.15) 100%)',
    color: 'white',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    width: '100%',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
};

export default NavBar;