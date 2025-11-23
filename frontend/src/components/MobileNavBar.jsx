import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { canAccessFeature } from '../utils/roleEnforcement';
import SidebarAiChat from './ai/SidebarAiChat';
import logo from '../assets/friendly-friends-logo.png';

function MobileNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const [showAiChat, setShowAiChat] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      window.location.reload();
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

  const topBarStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    background: colors.sidebarBackground,
    borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1rem',
    zIndex: 1000,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  };

  const bottomNavStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70px',
    background: colors.sidebarBackground,
    borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 1000,
    boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  };

  const navItemStyle = (active) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '0.5rem',
    textDecoration: 'none',
    color: active 
      ? (isDarkMode ? '#667eea' : '#667eea')
      : (isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'),
    fontSize: '0.7rem',
    fontWeight: active ? '600' : '400',
    transition: 'all 0.2s ease',
    minHeight: '50px',
  });

  const iconStyle = {
    fontSize: '1.5rem',
    marginBottom: '0.25rem',
  };

  const menuButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: isDarkMode ? 'white' : '#000000',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.5rem',
  };

  const menuOverlayStyle = {
    position: 'fixed',
    top: '60px',
    left: 0,
    right: 0,
    bottom: '70px',
    background: isDarkMode ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    zIndex: 999,
    overflowY: 'auto',
    padding: '1rem',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };

  const menuLinkStyle = (active) => ({
    display: 'block',
    padding: '1rem',
    marginBottom: '0.5rem',
    borderRadius: '12px',
    textDecoration: 'none',
    color: isDarkMode ? 'white' : '#000000',
    background: active 
      ? (isDarkMode ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.1)')
      : 'transparent',
    fontSize: '1rem',
    fontWeight: active ? '600' : '400',
    transition: 'all 0.2s ease',
  });

  // Get main navigation items for bottom bar (most used)
  const mainNavItems = [];
  if (canAccessFeature(user, 'messages')) {
    mainNavItems.push({ path: '/messages', icon: '💬', label: 'Messages' });
  }
  if (canAccessFeature(user, 'members')) {
    mainNavItems.push({ path: '/members', icon: '👥', label: 'Members' });
  }
  if (canAccessFeature(user, 'videos')) {
    mainNavItems.push({ path: '/videos', icon: '🎬', label: 'Videos' });
  }
  if (canAccessFeature(user, 'ai-chat')) {
    mainNavItems.push({ path: '/ai-chat', icon: '🤖', label: 'AI Chat' });
  }

  // Limit to 4 items for bottom nav
  const bottomNavItems = mainNavItems.slice(0, 4);

  return (
    <>
      {/* Top Bar */}
      <div style={topBarStyle}>
        <img 
          src={logo} 
          alt="Friendly Friends AI" 
          style={{ height: '40px', width: 'auto' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            style={menuButtonStyle}
            onClick={toggleAiChat}
            title="AI Help"
          >
            🤖
          </button>
          <button
            style={menuButtonStyle}
            onClick={() => setShowMenu(!showMenu)}
            title="Menu"
          >
            {showMenu ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Menu Overlay */}
      {showMenu && (
        <div style={menuOverlayStyle} onClick={() => setShowMenu(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            {canAccessFeature(user, 'messages') && (
              <Link 
                to="/messages" 
                style={menuLinkStyle(isActive('/messages'))}
                onClick={() => setShowMenu(false)}
              >
                💬 Messages
              </Link>
            )}
            {canAccessFeature(user, 'members') && (
              <Link 
                to="/members" 
                style={menuLinkStyle(isActive('/members'))}
                onClick={() => setShowMenu(false)}
              >
                👥 Members
              </Link>
            )}
            {canAccessFeature(user, 'todos') && (
              <Link 
                to="/todos" 
                style={menuLinkStyle(isActive('/todos'))}
                onClick={() => setShowMenu(false)}
              >
                📝 To-Do List
              </Link>
            )}
            {canAccessFeature(user, 'paint') && (
              <Link 
                to="/paint" 
                style={menuLinkStyle(isActive('/paint'))}
                onClick={() => setShowMenu(false)}
              >
                🎨 Paint
              </Link>
            )}
            {canAccessFeature(user, 'videos') && (
              <Link 
                to="/videos" 
                style={menuLinkStyle(isActive('/videos'))}
                onClick={() => setShowMenu(false)}
              >
                🎬 Videos
              </Link>
            )}
            {canAccessFeature(user, 'ai-chat') && (
              <Link 
                to="/ai-chat" 
                style={menuLinkStyle(isActive('/ai-chat'))}
                onClick={() => setShowMenu(false)}
              >
                🤖 AI Chat
              </Link>
            )}
            {canAccessFeature(user, 'docs') && (
              <Link 
                to="/docs" 
                style={menuLinkStyle(isActive('/docs'))}
                onClick={() => setShowMenu(false)}
              >
                📄🖼️ My Docs and Images
              </Link>
            )}
            {canAccessFeature(user, 'bugs') && (
              <Link 
                to="/report-bug" 
                style={menuLinkStyle(isActive('/report-bug'))}
                onClick={() => setShowMenu(false)}
              >
                🐞 Report Bugs
              </Link>
            )}
            {canAccessFeature(user, 'blog') && (
              <Link 
                to="/blog" 
                style={menuLinkStyle(isActive('/blog'))}
                onClick={() => setShowMenu(false)}
              >
                📝 Blog
              </Link>
            )}
            <Link 
              to="/research" 
              style={menuLinkStyle(isActive('/research'))}
              onClick={() => setShowMenu(false)}
            >
              🔬 Live Research
            </Link>
            <Link 
              to="/reminders" 
              style={menuLinkStyle(isActive('/reminders'))}
              onClick={() => setShowMenu(false)}
            >
              ⏰ Reminders
            </Link>
            <Link 
              to="/roles" 
              style={menuLinkStyle(isActive('/roles'))}
              onClick={() => setShowMenu(false)}
            >
              🎭 Roles
            </Link>
            <Link 
              to="/cloud-pcs" 
              style={menuLinkStyle(isActive('/cloud-pcs'))}
              onClick={() => setShowMenu(false)}
            >
              💻 My Cloud PCs
            </Link>
            {user?.is_admin && (
              <>
                <Link 
                  to="/admin" 
                  style={menuLinkStyle(isActive('/admin'))}
                  onClick={() => setShowMenu(false)}
                >
                  ⚙️ Admin Dashboard
                </Link>
                <Link 
                  to="/admin/ai-training" 
                  style={menuLinkStyle(isActive('/admin/ai-training'))}
                  onClick={() => setShowMenu(false)}
                >
                  🎓 Train AI
                </Link>
                <Link 
                  to="/admin/role-assignment" 
                  style={menuLinkStyle(isActive('/admin/role-assignment'))}
                  onClick={() => setShowMenu(false)}
                >
                  🎯 Assign Roles
                </Link>
              </>
            )}
            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}>
              <button
                onClick={toggleTheme}
                style={{
                  ...menuLinkStyle(false),
                  background: 'transparent',
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </button>
              <button
                onClick={handleLogout}
                style={{
                  ...menuLinkStyle(false),
                  background: 'transparent',
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#ef4444',
                }}
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div style={bottomNavStyle}>
        {bottomNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={navItemStyle(isActive(item.path))}
          >
            <span style={iconStyle}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

export default MobileNavBar;

