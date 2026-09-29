import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { hasAnyRole, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyRole(allowedRoles)) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <i className="bi bi-shield-lock" style={{ fontSize: '3rem', color: '#e63946' }}></i>
          <h2 style={{ margin: '15px 0 10px', color: '#1e293b' }}>Truy cập bị từ chối</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Tài khoản của bạn không có vai trò phù hợp để truy cập chức năng này.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
