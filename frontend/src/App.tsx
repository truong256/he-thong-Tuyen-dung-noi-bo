import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionGuard from './components/PermissionGuard';
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
import RequisitionManagementPage from './pages/RequisitionManagementPage';
import RecruitmentRequestPage from './pages/RecruitmentRequestPage';
import CompetencyFrameworkPage from './pages/CompetencyFrameworkPage';

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

            {/* Dashboard – tất cả authenticated users */}
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Profile – tất cả authenticated users (PROFILE_READ base permission) */}
            <Route path="profile" element={<ProfilePage />} />

            {/*
              Organization & Company Profile – CATALOG_READ
              Roles: HR_MANAGER (F), RECRUITER (R), HIRING_MANAGER (R), INTERVIEWER (R), APPROVER (R)
              ADMIN (F via catalog), CANDIDATE (–)
            */}
            <Route
              path="organization"
              element={
                <PermissionGuard requiredPermissions={['CATALOG_READ']}>
                  <OrganizationManagementPage />
                </PermissionGuard>
              }
            />

            {/*
              Job Titles – CATALOG_READ
              Roles: HR_MANAGER (F), ADMIN (F), RECRUITER (R), HIRING_MANAGER (R), APPROVER (R), INTERVIEWER (R)
            */}
            <Route
              path="job-titles"
              element={
                <PermissionGuard requiredPermissions={['CATALOG_READ']}>
                  <JobTitleManagementPage />
                </PermissionGuard>
              }
            />

            {/*
              Categories – CATALOG_READ
              Roles: HR_MANAGER (F), ADMIN (F), RECRUITER (R), HIRING_MANAGER (R), INTERVIEWER (R)
              NOTE: CANDIDATE and APPROVER do NOT have CATALOG_READ
            */}
            <Route
              path="categories"
              element={
                <PermissionGuard requiredPermissions={['CATALOG_READ']}>
                  <CategoryManagementPage />
                </PermissionGuard>
              }
            />
            <Route
              path="admin/categories"
              element={
                <PermissionGuard requiredPermissions={['CATALOG_READ']}>
                  <CategoryManagementPage />
                </PermissionGuard>
              }
            />

            {/*
              Question Bank – CATALOG_READ
              Roles: HR_MANAGER (F), ADMIN (F), RECRUITER (R), HIRING_MANAGER (R), INTERVIEWER (R)
            */}
            <Route
              path="questions"
              element={
                <PermissionGuard requiredPermissions={['CATALOG_READ']}>
                  <QuestionBankPage />
                </PermissionGuard>
              }
            />
            <Route
              path="admin/questions"
              element={
                <PermissionGuard requiredPermissions={['CATALOG_READ']}>
                  <QuestionBankPage />
                </PermissionGuard>
              }
            />

            {/*
              Competency Frameworks (S2-06) – CATALOG_READ
              Roles: HR_MANAGER (F), ADMIN (F), RECRUITER (R), HIRING_MANAGER (R), INTERVIEWER (R)
            */}
            <Route
              path="competencies"
              element={
                <PermissionGuard requiredPermissions={['CATALOG_READ']}>
                  <CompetencyFrameworkPage />
                </PermissionGuard>
              }
            />
            <Route
              path="competency-frameworks"
              element={<Navigate to="/competencies" replace />}
            />
            <Route
              path="admin/competencies"
              element={
                <PermissionGuard requiredPermissions={['CATALOG_READ']}>
                  <CompetencyFrameworkPage />
                </PermissionGuard>
              }
            />

            {/*
              Requisitions – S2-10 (REQUISITION_CREATE, REQUISITION_READ_OWN, REQUISITION_READ_ALL)
              Roles: HIRING_MANAGER (W*), HR_MANAGER (F), ADMIN (F)
            */}
            <Route
              path="recruitment/requisitions"
              element={
                <PermissionGuard
                  requiredPermissions={['REQUISITION_CREATE', 'REQUISITION_READ_OWN', 'REQUISITION_READ_ALL']}
                  requireAny
                >
                  <RequisitionManagementPage />
                </PermissionGuard>
              }
            />
            <Route
              path="recruitment/create"
              element={
                <PermissionGuard
                  requiredPermissions={['REQUISITION_CREATE', 'REQUISITION_READ_OWN', 'REQUISITION_READ_ALL']}
                  requireAny
                >
                  <RecruitmentRequestPage />
                </PermissionGuard>
              }
            />
            <Route
              path="requisitions"
              element={<Navigate to="/recruitment/requisitions" replace />}
            />
            <Route
              path="recruitment-requests"
              element={<Navigate to="/recruitment/requisitions" replace />}
            />

            {/* Legacy redirects */}
            <Route
              path="excel-import"
              element={<Navigate to="/admin/import-excel" replace />}
            />
            <Route
              path="users"
              element={<Navigate to="/admin/users" replace />}
            />
            <Route
              path="users/import-excel"
              element={<Navigate to="/admin/import-excel" replace />}
            />

            {/*
              Excel Import – USER_MANAGE (ADMIN only)
              HR_MANAGER has USER_READ but NOT USER_MANAGE → cannot import
            */}
            <Route
              path="admin/import-excel"
              element={
                <PermissionGuard requiredPermissions={['USER_MANAGE']}>
                  <ExcelImportPage />
                </PermissionGuard>
              }
            />

            {/*
              User Management – USER_READ (ADMIN=F, HR_MANAGER=R)
              S1-08: HR_MANAGER can view user list/details but cannot create/lock/assign roles.
              The UserManagementPage component should conditionally render action buttons
              based on hasPermission('USER_MANAGE') and hasPermission('ROLE_MANAGE').
            */}
            <Route
              path="admin/users"
              element={
                <PermissionGuard requiredPermissions={['USER_READ']}>
                  <UserManagementPage />
                </PermissionGuard>
              }
            />

            {/*
              Organization (admin path) – HR_MANAGER has DEPARTMENT_MANAGE + CATALOG_MANAGE
              ADMIN has CATALOG_MANAGE
            */}
            <Route
              path="admin/organization"
              element={
                <PermissionGuard requiredPermissions={['CATALOG_READ']}>
                  <OrganizationManagementPage />
                </PermissionGuard>
              }
            />

            {/*
              Job Titles (admin path) – HR_MANAGER and ADMIN both have CATALOG_MANAGE
            */}
            <Route
              path="admin/job-titles"
              element={
                <PermissionGuard requiredPermissions={['CATALOG_READ']}>
                  <JobTitleManagementPage />
                </PermissionGuard>
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