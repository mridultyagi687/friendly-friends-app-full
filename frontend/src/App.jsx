import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Login from './components/auth/Login';
import TodoList from './components/todo/TodoList';
import Paint from './components/paint/Paint';
import Members from './components/members/Members';
import Messages from './components/messages/Messages';
import VideoGallery from './components/video/VideoGallery';
import AiChat from './components/ai/AiChat';
import AiDocs from './components/ai/AiDocs';
import AdminDashboard from './components/admin/AdminDashboard';
import AiTraining from './components/admin/AiTraining';
import Blog from './components/blog/Blog';
import Roles from './components/roles/Roles';
import RoleAssignment from './components/roles/RoleAssignment';
import CloudPCs from './components/cloudpc/CloudPCs';
import CloudPCViewer from './components/cloudpc/CloudPCViewer';
import AppTour from './components/AppTour';
import BugReporter from './components/bugs/BugReporter';
import ResearchList from './components/research/ResearchList';
import ResearchViewer from './components/research/ResearchViewer';
import CreateResearch from './components/research/CreateResearch';
import Reminders from './components/reminders/Reminders';
import BrowserCheck from './components/BrowserCheck';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CallProvider } from './contexts/CallContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { hasRole, hasAnyRole } from './utils/roleUtils';
import { canAccessFeature } from './utils/roleEnforcement';
import api from './services/api';

function FeatureGuard({ children, feature, fallback = '/videos' }) {
  const { user } = useAuth();
  if (!canAccessFeature(user, feature)) {
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function ProtectedRoute({ children, allowedRoles, denyRoles = [], requireAdmin = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;

  // Check for denied roles (new role system)
  if (denyRoles.length > 0 && hasAnyRole(user, denyRoles)) {
    // Check if user has any denied role
    const hasDeniedRole = denyRoles.some(role => hasRole(user, role));
    if (hasDeniedRole) {
      // Redirect based on user's first role or default
      const userRoles = user.roles || [];
      if (userRoles.length > 0) {
        return <Navigate to="/videos" replace />;
      }
      return <Navigate to="/videos" replace />;
    }
  }

  // Check admin requirement
  if (requireAdmin && !user.is_admin) {
    return <Navigate to="/videos" replace />;
  }
  
  // Check allowed roles (new role system)
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = hasAnyRole(user, allowedRoles);
    if (!hasAllowedRole) {
      // User doesn't have any of the required roles
      return <Navigate to={user.is_admin ? '/admin' : '/videos'} replace />;
    }
  }
  
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const theme = useTheme();
  const [bugNotifications, setBugNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      setBugNotifications([]);
      return;
    }

    let isMounted = true;
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/api/bugs/notifications');
        if (!isMounted) return;
        const list = Array.isArray(data?.notifications) ? data.notifications : [];
        if (list.length > 0) {
          setBugNotifications(list);
        }
      } catch (err) {
        console.error('Failed to load bug notifications:', err.response?.data || err.message);
      } finally {
        // no-op
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const handleDismissNotification = async (bugId) => {
    const remaining = bugNotifications.filter((bug) => bug.id !== bugId);
    setBugNotifications(remaining);
    try {
      await api.post('/api/bugs/notifications/ack', { ids: [bugId] });
    } catch (err) {
      console.error('Failed to acknowledge bug notification:', err.response?.data || err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  // Get base path for GitHub Pages (e.g., /repo-name/)
  // This is set by Vite during build via import.meta.env.BASE_URL
  const basename = import.meta.env.BASE_URL || '/';

  return (
    <Router basename={basename} future={{ v7_relativeSplatPath: true }}>
      <div className="app">
        {user && <NavBar />}
        <div style={{ marginLeft: user ? '250px' : '0', minHeight: '100vh' }}>
          <Routes>
            <Route
              path="/"
              element={
                user
                  ? (canAccessFeature(user, 'blog') && !canAccessFeature(user, 'members')
                      ? <Navigate to="/blog" replace />
                      : (user.is_admin ? <Navigate to="/admin" replace /> : <Navigate to="/members" replace />))
                  : <Login />
              }
            />
            <Route
              path="/blog"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="blog" fallback="/videos">
                    <Blog />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/blog/:blogId"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="blog" fallback="/videos">
                    <Blog />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/todos"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="todos" fallback="/videos">
                    <TodoList />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/paint"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="paint" fallback="/videos">
                    <Paint />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="members" fallback="/videos">
                    <Members />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="messages" fallback="/videos">
                    <Messages />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/videos"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="videos" fallback="/blog">
                    <VideoGallery />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-chat"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="ai-chat" fallback="/videos">
                    <AiChat />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/docs"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="docs" fallback="/videos">
                    <AiDocs />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>}
            />
            <Route
              path="/admin/ai-training"
              element={<ProtectedRoute requireAdmin><AiTraining /></ProtectedRoute>}
            />
            <Route
              path="/roles"
              element={<ProtectedRoute><Roles /></ProtectedRoute>}
            />
            <Route
              path="/admin/role-assignment"
              element={<ProtectedRoute requireAdmin><RoleAssignment /></ProtectedRoute>}
            />
            <Route
              path="/cloud-pcs"
              element={
                <ProtectedRoute>
                  <CloudPCs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cloud-pcs/:pcId"
              element={
                <ProtectedRoute>
                  <CloudPCViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report-bug"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="bugs" fallback="/videos">
                    <BugReporter />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/research"
              element={
                <ProtectedRoute>
                  <ResearchList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/research/create"
              element={
                <ProtectedRoute requireAdmin>
                  <CreateResearch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/research/:researchId"
              element={
                <ProtectedRoute>
                  <ResearchViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reminders"
              element={
                <ProtectedRoute>
                  <Reminders />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        {user && <AppTour />}
        {user && bugNotifications.length > 0 && (() => {
          const notificationStyles = {
            overlay: {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: theme.isDarkMode ? 'rgba(15, 23, 42, 0.65)' : 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: '1rem',
            },
            card: {
              background: theme.colors.cardBackground,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              boxShadow: theme.isDarkMode ? '0 20px 60px rgba(0, 0, 0, 0.5)' : '0 20px 60px rgba(0, 0, 0, 0.3)',
              textAlign: 'center',
            },
            title: {
              marginTop: 0,
              fontSize: '1.75rem',
              color: theme.colors.text,
              background: theme.isDarkMode 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #000000 0%, #333333 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            },
            message: {
              fontSize: '1rem',
              color: theme.colors.text,
              lineHeight: 1.6,
            },
            context: {
              fontSize: '0.95rem',
              color: theme.colors.textSecondary,
              marginTop: '1rem',
            },
            button: {
              marginTop: '1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              padding: '0.85rem 1.5rem',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
            },
          };
          return (
            <div style={notificationStyles.overlay}>
              <div style={notificationStyles.card}>
                <h3 style={notificationStyles.title}>🎉 Thanks for reporting!</h3>
                <p style={notificationStyles.message}>
                  Thanks for reporting the bug: <strong>{bugNotifications[0].title || 'Bug'}</strong>.{" "}
                  This bug has been resolved successfully—your single bug report helps the entire Friendly Friends community!
                </p>
                {bugNotifications[0].description && (
                  <p style={notificationStyles.context}>
                    <em>{bugNotifications[0].description}</em>
                  </p>
                )}
                <button
                  style={notificationStyles.button}
                  onClick={() => handleDismissNotification(bugNotifications[0].id)}
                >
                  Awesome! Keep building 🚀
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </Router>
  );
}

const styles = {
  notificationOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '1rem',
  },
  notificationCard: {
    background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.98) 0%, rgba(30, 30, 60, 0.98) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '20px',
    maxWidth: '480px',
    width: '100%',
    padding: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
  },
  notificationTitle: {
    marginTop: 0,
    fontSize: '1.75rem',
    color: '#0f172a',
  },
  notificationMessage: {
    fontSize: '1rem',
    color: '#1f2937',
    lineHeight: 1.6,
  },
  notificationContext: {
    fontSize: '0.95rem',
    color: '#475569',
    marginTop: '1rem',
  },
  notificationButton: {
    marginTop: '1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    padding: '0.85rem 1.5rem',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600,
    boxShadow: '0 12px 24px rgba(102, 126, 234, 0.35)',
  },
};

export default function App() {
  return (
    <BrowserCheck>
      <ThemeProvider>
        <AuthProvider>
          <CallProvider>
            <AppRoutes />
          </CallProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserCheck>
  );
}