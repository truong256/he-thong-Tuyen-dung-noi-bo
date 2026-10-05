import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import UserManagementPage from './pages/UserManagementPage';
import OrganizationManagementPage from './pages/OrganizationManagementPage';
import JobTitleManagementPage from './pages/JobTitleManagementPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/403" element={<UnauthorizedPage statusCode={403} />} />
          <Route path="/401" element={<UnauthorizedPage statusCode={401} />} />

          {/* Authenticated application layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="organization" element={<OrganizationManagementPage />} />
            <Route path="job-titles" element={<JobTitleManagementPage />} />

            {/* Admin only route */}
            <Route
              path="admin/users"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <UserManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="admin/organization"
              element={
                <RoleGuard allowedRoles={['ADMIN', 'HR_MANAGER']}>
                  <OrganizationManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="admin/job-titles"
              element={
                <RoleGuard allowedRoles={['ADMIN', 'HR_MANAGER']}>
                  <JobTitleManagementPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
