import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UnauthorizedPage from '../pages/UnauthorizedPage';

interface PermissionGuardProps {
  /** One or more permissions required (ALL must be present – AND logic) */
  requiredPermissions: string[];
  /** If true, only ONE permission needs to match (OR logic). Default: false (AND) */
  requireAny?: boolean;
  children: React.ReactNode;
}

/**
 * PermissionGuard – guards routes based on server-granted permissions (S1-05).
 *
 * Unlike RoleGuard which checks role names, PermissionGuard checks
 * the actual permission strings fetched from /api/auth/permissions.
 * This correctly handles multi-role users and prevents URL bypasses.
 *
 * NOTE: This is a UI-layer guard only. The backend enforces the same
 * permissions via @PreAuthorize annotations on every endpoint.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requiredPermissions,
  requireAny = false,
  children,
}) => {
  const { hasPermission, hasAnyPermission, isLoading, isAuthenticated } = useAuth();

  // Đang kiểm tra đăng nhập
  if (isLoading) {
    return null;
  }

  // Chưa đăng nhập
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra quyền
  const hasAccess = requireAny
    ? (typeof hasAnyPermission === 'function' ? hasAnyPermission(requiredPermissions) : false)
    : requiredPermissions.every((p) => (typeof hasPermission === 'function' ? hasPermission(p) : false));

  if (!hasAccess) {
    return <UnauthorizedPage statusCode={403} />;
  }

  return <>{children}</>;
};

export default PermissionGuard;
