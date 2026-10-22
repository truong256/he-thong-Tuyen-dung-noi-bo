import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UnauthorizedPage from '../pages/UnauthorizedPage';

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
}) => {
  const {
    hasAnyRole,
    isLoading,
    isAuthenticated,
  } = useAuth();

  // Đang kiểm tra đăng nhập
  if (isLoading) {
    return null;
  }

  // Chưa đăng nhập
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập nhưng không đủ quyền
  if (!hasAnyRole(allowedRoles)) {
    return <UnauthorizedPage />;
  }

  // Có quyền
  return <>{children}</>;
};

export default RoleGuard;