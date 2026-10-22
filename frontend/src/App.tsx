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
