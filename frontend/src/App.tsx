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
import ExcelImportPage from './pages/ExcelImportPage';
import FirstLoginChangePasswordPage from './pages/FirstLoginChangePasswordPage';
import QuestionBankPage from './pages/QuestionBankPage';
import CategoryManagementPage from './pages/CategoryManagementPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Các trang đăng nhập */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/403" element={<UnauthorizedPage statusCode={403} />} />
          <Route path="/401" element={<UnauthorizedPage statusCode={401} />} />

          {/* Trang bắt buộc đổi mật khẩu lần đầu */}
          <Route
            path="/first-login/change-password"
            element={
              <ProtectedRoute>
                <FirstLoginChangePasswordPage />
              </ProtectedRoute>
            }
          />

          {/* Xem thử frontend Excel khi chạy môi trường phát triển */}
          {import.meta.env.DEV && (
            <Route
              path="/preview/import-excel"
              element={<ExcelImportPage />}
            />
          )}

          {/* Các trang yêu cầu đăng nhập */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="/dashboard" replace />}
            />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="organization" element={<OrganizationManagementPage />} />
            <Route path="job-titles" element={<JobTitleManagementPage />} />
            <Route
              path="categories"
              element={
                <RoleGuard allowedRoles={['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER']}>
                  <CategoryManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="admin/categories"
              element={
                <RoleGuard allowedRoles={['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER']}>
                  <CategoryManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="questions"
              element={
                <RoleGuard allowedRoles={['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER']}>
                  <QuestionBankPage />
                </RoleGuard>
              }
            />
            <Route
              path="admin/questions"
              element={
                <RoleGuard allowedRoles={['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER']}>
                  <QuestionBankPage />
                </RoleGuard>
              }
            />
            <Route
              path="excel-import"
              element={<Navigate to="/admin/import-excel" replace />}
            />
            <Route
              path="admin/import-excel"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <ExcelImportPage />
                </RoleGuard>
              }
            />

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

          {/* Trang không tìm thấy */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;