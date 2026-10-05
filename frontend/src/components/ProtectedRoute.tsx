import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

import { isIdleExpired } from '../utils/idleTracker';
import { triggerIdleSessionExpired } from '../api/client';

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    if (isAuthenticated && isIdleExpired()) {
      triggerIdleSessionExpired();
      logout();
    }
  }, [isAuthenticated, logout]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f4f8fc' }}>
        <div style={{ textAlign: 'center', color: '#102b86', fontWeight: 600 }}>
          <i className="bi bi-arrow-repeat" style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}></i>
          <p style={{ marginTop: '10px' }}>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && isIdleExpired()) {
    triggerIdleSessionExpired();
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          sessionExpired: true,
          reason: 'idle',
          message: 'Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.',
        }}
        replace
      />
    );
  }

  if (!isAuthenticated) {
    const isExpired = typeof window !== 'undefined' && sessionStorage.getItem('ats:session_expired') === '1';
    const reason = typeof window !== 'undefined' ? sessionStorage.getItem('ats:session_expired_reason') : null;
    const notice = typeof window !== 'undefined' ? sessionStorage.getItem('ats:auth_notice') : null;

    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          sessionExpired: isExpired,
          reason,
          message: notice,
        }}
        replace
      />
    );
  }

  // First Login Password Change Guard:
  // If user is required to change their temporary password, strictly block access to all other pages.
  if (user?.mustChangePassword) {
    if (location.pathname !== '/first-login/change-password') {
      return <Navigate to="/first-login/change-password" replace />;
    }
  } else if (location.pathname === '/first-login/change-password') {
    // If password change is not required, prevent staying on the first-login change page.
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
