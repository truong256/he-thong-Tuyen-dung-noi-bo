import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginCard from '../components/auth/LoginCard';
import '../styles/login.css';

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
    <div className="soft-login-viewport">
      {/* Subtle Ambient Glowing Orbs for Depth */}
      <div className="soft-ambient-orb-1" aria-hidden="true" />
      <div className="soft-ambient-orb-2" aria-hidden="true" />

      {/* Main Centered Neumorphic Card */}
      <LoginCard onSuccessRedirect={redirectPath} />
    </div>
  );
};

export default LoginPage;
