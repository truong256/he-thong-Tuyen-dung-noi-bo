import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PermissionGuard from "./components/PermissionGuard";
import RoleGuard from "./components/RoleGuard";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import UserManagementPage from "./pages/UserManagementPage";
import OrganizationManagementPage from "./pages/OrganizationManagementPage";
import JobTitleManagementPage from "./pages/JobTitleManagementPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFoundPage from "./pages/NotFoundPage";
import ExcelImportPage from "./pages/ExcelImportPage";
import FirstLoginChangePasswordPage from "./pages/FirstLoginChangePasswordPage";
import QuestionBankPage from "./pages/QuestionBankPage";
import CategoryManagementPage from "./pages/CategoryManagementPage";
import RequisitionManagementPage from "./pages/RequisitionManagementPage";
import RecruitmentRequestPage from "./pages/RecruitmentRequestPage";
import CompetencyFrameworkPage from "./pages/CompetencyFrameworkPage";
import ApprovalConfigurationPage from "./pages/ApprovalConfigurationPage";
import JobPostingManagementPage from "./pages/JobPostingManagementPage";
import PublicCareerPage from "./pages/PublicCareerPage";
import PublicJobDetailPage from "./pages/PublicJobDetailPage";
import PermissionMatrixPage from "./pages/PermissionMatrixPage";
import WithdrawApplicationPage from "./pages/WithdrawApplicationPage";
import CandidateApplicationsPage from "./pages/CandidateApplicationsPage";
import RecruitmentCandidatesPage from "./pages/RecruitmentCandidatesPage";
import CandidateApprovalsPage from "./pages/CandidateApprovalsPage";
import OffersPage from "./pages/OffersPage";
import CompanyProfilePreviewPage from "./pages/CompanyProfilePreviewPage";

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          
          <Route path="/careers" element={<PublicCareerPage />} />
          <Route path="/careers/:id" element={<PublicJobDetailPage />} />
          <Route path="/jobs" element={<Navigate to="/careers" replace />} />
          <Route
            path="/candidate/withdraw"
            element={<WithdrawApplicationPage />}
          />
          <Route path="/withdraw" element={<WithdrawApplicationPage />} />

          
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/403" element={<UnauthorizedPage statusCode={403} />} />
          <Route path="/401" element={<UnauthorizedPage statusCode={401} />} />

          
          <Route
            path="/first-login/change-password"
            element={
              <ProtectedRoute>
                <FirstLoginChangePasswordPage />
              </ProtectedRoute>
            }
          />

          
          {import.meta.env.DEV && (
            <>
              <Route
                path="/preview/import-excel"
                element={<ExcelImportPage />}
              />
              <Route
                path="/preview/company-profile"
                element={<CompanyProfilePreviewPage />}
              />
            </>
          )}

          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
