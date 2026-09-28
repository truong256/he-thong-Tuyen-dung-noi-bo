import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import HeroPanel from '../components/auth/HeroPanel';
import LoginForm from '../components/auth/LoginForm';

export const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  return (
    <div className="auth-split-layout">
      {/* Left Column: Visual & Brand Hero */}
      <HeroPanel />

      {/* Right Column: Clean Authentication Form */}
      <main className="auth-form-panel" aria-label="Khu vực đăng nhập">
        <LoginForm onSuccessRedirect={redirectPath} />
      </main>
    </div>
  );
};

export default LoginPage;
