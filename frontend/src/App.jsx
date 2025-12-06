import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import MobileNavBar from './components/MobileNavBar';
import { useMobile } from './utils/useMobile';
import Login from './components/auth/Login';
import BrowserCheck from './components/BrowserCheck';

// Lazy load all route components for code splitting
const TodoList = lazy(() => import('./components/todo/TodoList'));
const Paint = lazy(() => import('./components/paint/Paint'));
const Members = lazy(() => import('./components/members/Members'));
const Messages = lazy(() => import('./components/messages/Messages'));
const VideoGallery = lazy(() => import('./components/video/VideoGallery'));
const VideoPlayer = lazy(() => import('./components/video/VideoPlayer'));
const AiChat = lazy(() => import('./components/ai/AiChat'));
const AiDocs = lazy(() => import('./components/ai/AiDocs'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AiTraining = lazy(() => import('./components/admin/AiTraining'));
const Blog = lazy(() => import('./components/blog/Blog'));
const Roles = lazy(() => import('./components/roles/Roles'));
const RoleAssignment = lazy(() => import('./components/roles/RoleAssignment'));
const CloudPCs = lazy(() => import('./components/cloudpc/CloudPCs'));
const CloudPCViewer = lazy(() => import('./components/cloudpc/CloudPCViewer'));
const AppTour = lazy(() => import('./components/AppTour'));
const BugReporter = lazy(() => import('./components/bugs/BugReporter'));
const ResearchList = lazy(() => import('./components/research/ResearchList'));
const ResearchViewer = lazy(() => import('./components/research/ResearchViewer'));
const CreateResearch = lazy(() => import('./components/research/CreateResearch'));
const ResearchData = lazy(() => import('./components/research/ResearchData'));
const Reminders = lazy(() => import('./components/reminders/Reminders'));

// Loading component for lazy routes
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  }}>
    <div style={{ 
      color: 'white', 
      fontSize: '1.2rem',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
      <div>Loading...</div>
    </div>
  </div>
);
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
  const [iosWait, setIosWait] = useState(false);
  const waitTimerRef = useRef(null);
  const hasWaitedRef = useRef(false);
  
  // On iOS, give extra time for auth to complete (cookie might be delayed)
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  
  useEffect(() => {
    // If user exists, no need to wait
    if (user) {
      setIosWait(true);
      hasWaitedRef.current = true;
      return;
    }
    
    // If not iOS, proceed immediately
    if (!isIOS) {
      setIosWait(true);
      hasWaitedRef.current = true;
      return;
    }
    
    // On iOS, if loading finished but no user, wait a bit more before redirecting
    // But only wait once - don't re-wait on re-renders
    if (isIOS && !loading && !user && !hasWaitedRef.current) {
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
      waitTimerRef.current = setTimeout(() => {
        setIosWait(true);
        hasWaitedRef.current = true;
      }, 2000); // Give 2 seconds for cookie to be recognized
      return () => {
        if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
      };
    } else if (isIOS && !loading && !user && hasWaitedRef.current) {
      // Already waited, proceed
      setIosWait(true);
    }
  }, [loading, user, isIOS]);
  
  // Show loading only if actually loading or waiting on iOS
  if (loading || (isIOS && !user && !iosWait)) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }
  
  // Only redirect if we've waited and still no user
  if (!user && (iosWait || !isIOS)) {
    return <Navigate to="/" replace />;
  }

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
  const isMobile = useMobile();
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
        {user && (isMobile ? <MobileNavBar /> : <NavBar />)}
        <div style={{ 
          marginLeft: user && !isMobile ? '250px' : '0', 
          marginTop: user && isMobile ? '60px' : '0',
          marginBottom: user && isMobile ? '70px' : '0',
          minHeight: '100vh',
          padding: isMobile ? '0.5rem' : '0',
        }}>
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
                    <Suspense fallback={<LoadingSpinner />}>
                      <Blog />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/blog/:blogId"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="blog" fallback="/videos">
                    <Suspense fallback={<LoadingSpinner />}>
                      <Blog />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/todos"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="todos" fallback="/videos">
                    <Suspense fallback={<LoadingSpinner />}>
                      <TodoList />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/paint"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="paint" fallback="/videos">
                    <Suspense fallback={<LoadingSpinner />}>
                      <Paint />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="members" fallback="/videos">
                    <Suspense fallback={<LoadingSpinner />}>
                      <Members />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="messages" fallback="/videos">
                    <Suspense fallback={<LoadingSpinner />}>
                      <Messages />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/videos"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="videos" fallback="/blog">
                    <Suspense fallback={<LoadingSpinner />}>
                      <VideoGallery />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/video-player/:videoId"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="videos" fallback="/blog">
                    <Suspense fallback={<LoadingSpinner />}>
                      <VideoPlayer />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-chat"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="ai-chat" fallback="/videos">
                    <Suspense fallback={<LoadingSpinner />}>
                      <AiChat />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/docs"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="docs" fallback="/videos">
                    <Suspense fallback={<LoadingSpinner />}>
                      <AiDocs />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminDashboard />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai-training"
              element={
                <ProtectedRoute requireAdmin>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AiTraining />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Roles />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/role-assignment"
              element={
                <ProtectedRoute requireAdmin>
                  <Suspense fallback={<LoadingSpinner />}>
                    <RoleAssignment />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cloud-pcs"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <CloudPCs />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cloud-pcs/:pcId"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <CloudPCViewer />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/report-bug"
              element={
                <ProtectedRoute>
                  <FeatureGuard feature="bugs" fallback="/videos">
                    <Suspense fallback={<LoadingSpinner />}>
                      <BugReporter />
                    </Suspense>
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/research"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <ResearchList />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/research/create"
              element={
                <ProtectedRoute requireAdmin>
                  <Suspense fallback={<LoadingSpinner />}>
                    <CreateResearch />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/research/:researchId"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <ResearchViewer />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/research-data"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <ResearchData />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reminders"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Reminders />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        {user && (
          <Suspense fallback={null}>
            <AppTour />
          </Suspense>
        )}
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