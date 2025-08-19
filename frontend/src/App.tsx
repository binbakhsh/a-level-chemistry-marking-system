import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from '@/stores/auth';
import { authService } from '@/services/auth';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import SubmissionPage from '@/pages/SubmissionPage';
import ResultsPage from '@/pages/ResultsPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import AdminPapersPage from '@/pages/AdminPapersPage';
import CreatePaperPage from '@/pages/CreatePaperPage';
import PaperDetailsPage from '@/pages/PaperDetailsPage';
import UploadMarkschemeForPaperPage from '@/pages/UploadMarkschemeForPaperPage';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProtectedRoute from '@/components/ProtectedRoute';
import OpenAITestPage from '@/components/OpenAITestPage';
import MarkschemeUpload from '@/components/MarkschemeUpload';

function App() {
  const { isAuthenticated, isLoading, setLoading, login, logout } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      const token = useAuthStore.getState().token;
      
      if (token) {
        try {
          setLoading(true);
          const user = await authService.getCurrentUser();
          login({ user, token, expiresAt: '' });
        } catch (error) {
          console.error('Auth initialization failed:', error);
          logout();
        } finally {
          setLoading(false);
        }
      }
    };

    initializeAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
      />
      
      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            <Layout>
              <DashboardPage />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/submit"
        element={
          isAuthenticated ? (
            <Layout>
              <SubmissionPage />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/results/:id"
        element={
          isAuthenticated ? (
            <Layout>
              <ResultsPage />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/profile"
        element={
          isAuthenticated ? (
            <Layout>
              <ProfilePage />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <Layout>
              <AdminDashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/papers"
        element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <Layout>
              <AdminPapersPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/papers/new"
        element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <Layout>
              <CreatePaperPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/papers/:paperId"
        element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <Layout>
              <PaperDetailsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/papers/:paperId/upload-markscheme"
        element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <Layout>
              <UploadMarkschemeForPaperPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/legacy"
        element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <Layout>
              <AdminPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-openai"
        element={<OpenAITestPage />}
      />
      <Route
        path="/upload-markscheme"
        element={
          isAuthenticated ? (
            <Layout>
              <MarkschemeUpload />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;