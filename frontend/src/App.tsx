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
          >
            <Route index element={<Navigate to="/dashboard" replace />} />

            
            <Route path="dashboard" element={<DashboardPage />} />

            
            <Route path="profile" element={<ProfilePage />} />

            
            <Route
              path="candidate/applications"
              element={<CandidateApplicationsPage />}
            />
            <Route
              path="recruitment/candidates"
              element={
                <PermissionGuard requiredPermissions={["CANDIDATE_READ_ALL", "CANDIDATE_READ_ASSIGNED"]} requireAny>
                  <RecruitmentCandidatesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="recruitment/approvals"
              element={
                <PermissionGuard requiredPermissions={["CANDIDATE_READ_ALL", "CANDIDATE_READ_ASSIGNED"]} requireAny>
                  <CandidateApprovalsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="recruitment/offers"
              element={
                <PermissionGuard requiredPermissions={["CANDIDATE_READ_ALL"]}>
                  <OffersPage />
                </PermissionGuard>
              }
            />
            <Route
              path="my-applications"
              element={<Navigate to="/candidate/applications" replace />}
            />

            
            <Route
              path="organization"
              element={
                <PermissionGuard requiredPermissions={["CATALOG_READ"]}>
                  <OrganizationManagementPage />
                </PermissionGuard>
              }
            />

            
            <Route
              path="job-titles"
              element={
                <PermissionGuard requiredPermissions={["CATALOG_READ"]}>
                  <JobTitleManagementPage />
                </PermissionGuard>
              }
            />

            
            <Route
              path="categories"
              element={
                <PermissionGuard requiredPermissions={["CATALOG_READ"]}>
                  <CategoryManagementPage />
                </PermissionGuard>
              }
            />
            <Route
              path="admin/categories"
              element={
                <PermissionGuard requiredPermissions={["CATALOG_READ"]}>
                  <CategoryManagementPage />
                </PermissionGuard>
              }
            />

            
            <Route
              path="questions"
              element={
                <PermissionGuard requiredPermissions={["CATALOG_READ"]}>
                  <QuestionBankPage />
                </PermissionGuard>
              }
            />
            <Route
              path="admin/questions"
              element={
                <PermissionGuard requiredPermissions={["CATALOG_READ"]}>
                  <QuestionBankPage />
                </PermissionGuard>
              }
            />

            
            <Route
              path="competencies"
              element={
                <PermissionGuard requiredPermissions={["CATALOG_READ"]}>
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
                <PermissionGuard requiredPermissions={["CATALOG_READ"]}>
                  <CompetencyFrameworkPage />
                </PermissionGuard>
              }
            />

            
            <Route
              path="recruitment/requisitions"
              element={
                <PermissionGuard
                  requiredPermissions={[
                    "REQUISITION_CREATE",
                    "REQUISITION_READ_OWN",
                    "REQUISITION_READ_ALL",
                    "REQUISITION_APPROVE",
                  ]}
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
                  requiredPermissions={[
                    "REQUISITION_CREATE",
                    "REQUISITION_READ_OWN",
                    "REQUISITION_READ_ALL",
                  ]}
                  requireAny
                >
                  <RecruitmentRequestPage />
                </PermissionGuard>
              }
            />
            <Route
              path="recruitment/approval-configurations"
              element={
                <RoleGuard allowedRoles={["HR_MANAGER"]}>
                  <ApprovalConfigurationPage />
                </RoleGuard>
              }
            />
            
            <Route
              path="recruitment/job-postings"
              element={
                <PermissionGuard requiredPermissions={["JOB_MANAGE"]}>
                  <JobPostingManagementPage />
                </PermissionGuard>
              }
            />
            <Route
              path="recruitment/jobs"
              element={<Navigate to="/recruitment/job-postings" replace />}
            />
            <Route
              path="requisitions"
              element={<Navigate to="/recruitment/requisitions" replace />}
            />
            <Route
              path="recruitment-requests"
              element={<Navigate to="/recruitment/requisitions" replace />}
            />

            
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

            
            <Route
              path="admin/import-excel"
              element={
                <PermissionGuard requiredPermissions={["USER_MANAGE"]}>
                  <ExcelImportPage />
                </PermissionGuard>
              }
            />

            
            <Route
              path="admin/users"
              element={
                <PermissionGuard requiredPermissions={["USER_READ"]}>
                  <UserManagementPage />
                </PermissionGuard>
              }
            />

            
            <Route
              path="admin/permission-matrix"
              element={
                <PermissionGuard requiredPermissions={["ROLE_READ"]}>
                  <PermissionMatrixPage />
                </PermissionGuard>
              }
            />

            
            <Route
              path="admin/organization"
              element={
                <PermissionGuard requiredPermissions={["CATALOG_READ"]}>
                  <OrganizationManagementPage />
                </PermissionGuard>
              }
            />

            
            <Route
              path="admin/job-titles"
              element={
                <PermissionGuard requiredPermissions={["CATALOG_READ"]}>
                  <JobTitleManagementPage />
                </PermissionGuard>
              }
            />
          </Route>

          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
