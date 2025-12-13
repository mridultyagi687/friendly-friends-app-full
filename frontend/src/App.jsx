import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useMobile } from './utils/useMobile';
import NavBar from './components/NavBar';
import MobileNavBar from './components/MobileNavBar';
import BrowserCheck from './components/BrowserCheck';

// Lazy load components for better performance
const Messages = lazy(() => import('./components/messages/Messages'));
const Members = lazy(() => import('./components/members/Members'));
const TodoList = lazy(() => import('./components/todo/TodoList'));
const Paint = lazy(() => import('./components/paint/Paint'));
const VideoGallery = lazy(() => import('./components/video/VideoGallery'));
const AiChat = lazy(() => import('./components/ai/AiChat'));
const AiDocs = lazy(() => import('./components/ai/AiDocs'));
const BugReporter = lazy(() => import('./components/bugs/BugReporter'));
const Blog = lazy(() => import('./components/blog/Blog'));
const ResearchList = lazy(() => import('./components/research/ResearchList'));
const ResearchData = lazy(() => import('./components/research/ResearchData'));
const Reminders = lazy(() => import('./components/reminders/Reminders'));
const Roles = lazy(() => import('./components/roles/Roles'));
const CloudPCs = lazy(() => import('./components/cloudpc/CloudPCViewer'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AiTraining = lazy(() => import('./components/admin/AiTraining'));
const RoleAssignment = lazy(() => import('./components/roles/RoleAssignment'));
const Robots = lazy(() => import('./components/admin/Robots'));

const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
  }}>
    <div style={{ color: 'white', fontSize: '1.5rem' }}>Loading...</div>
  </div>
);

function AppContent() {
  const isMobile = useMobile();
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <NavBar />
      <MobileNavBar />
      <main style={{ 
        flex: 1, 
        marginLeft: isMobile ? '0' : '250px',
        paddingTop: isMobile ? '60px' : '0',
        paddingBottom: isMobile ? '70px' : '0'
      }}>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/messages" element={<Messages />} />
            <Route path="/members" element={<Members />} />
            <Route path="/todos" element={<TodoList />} />
            <Route path="/paint" element={<Paint />} />
            <Route path="/videos" element={<VideoGallery />} />
            <Route path="/ai-chat" element={<AiChat />} />
            <Route path="/docs" element={<AiDocs />} />
            <Route path="/report-bug" element={<BugReporter />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/research" element={<ResearchList />} />
            <Route path="/research-data" element={<ResearchData />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/cloud-pcs" element={<CloudPCs />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/ai-training" element={<AiTraining />} />
            <Route path="/admin/role-assignment" element={<RoleAssignment />} />
            <Route path="/admin/robots" element={<Robots />} />
            <Route path="/" element={<div style={{ padding: '2rem' }}>Welcome to Friendly Friends AI</div>} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <BrowserCheck>
            <AppContent />
          </BrowserCheck>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

