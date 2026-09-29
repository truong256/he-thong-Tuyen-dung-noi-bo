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
    <main className="auth-split-viewport">
      {/* ========================================================
          LEFT COLUMN: RECRUITMENT VISUAL / ILLUSTRATION (55% - 60%)
          ======================================================== */}
      <section className="auth-left-visual-column" aria-label="Không gian tuyển dụng doanh nghiệp">
        <div className="auth-visual-image-container">
          <img
            src="/images/auth/login-recruitment.webp"
            alt="Hệ thống quản lý và tuyển dụng nội bộ doanh nghiệp"
            className="auth-visual-image"
            loading="eager"
          />
          {/* Subtle gradient overlay */}
          <div className="auth-visual-overlay" />

          {/* Hero text positioned bottom-left */}
          <div className="auth-visual-caption-block">
            <div className="auth-visual-badge">HỆ THỐNG ATS DOANH NGHIỆP</div>
            <h2 className="auth-visual-heading">Hệ thống tuyển dụng nội bộ</h2>
            <p className="auth-visual-subtitle">
              Quản lý ứng viên, quy trình tuyển dụng và nhân sự trên một nền tảng tập trung.
            </p>
            <div className="auth-visual-tagline">
              <span style={{ color: '#60A5FA' }}>Tuyển đúng người. Xây dựng đội ngũ</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          RIGHT COLUMN: MODERN LOGIN FORM (40% - 45%)
          ======================================================== */}
      <section className="auth-right-form-column" aria-label="Khu vực đăng nhập">
        <div className="auth-right-form-container">
          <LoginCard onSuccessRedirect={redirectPath} />
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
