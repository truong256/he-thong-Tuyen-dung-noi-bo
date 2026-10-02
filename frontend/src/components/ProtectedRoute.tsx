import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

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

  if (!isAuthenticated) {
    const isExpired = typeof window !== 'undefined' && sessionStorage.getItem('ats:session_expired') === '1';
    return <Navigate to="/login" state={{ from: location, sessionExpired: isExpired }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
