import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  // Lock countdown timer
  useEffect(() => {
    if (lockCountdown === null || lockCountdown <= 0) return;

    const timer = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setErrorMessage(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    if (lockCountdown !== null && lockCountdown > 0) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
      if (remember) {
        localStorage.setItem('rememberEmail', email.trim());
      } else {
        localStorage.removeItem('rememberEmail');
      }
      navigate('/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 423) {
        const lockedUntilStr = data?.lockedUntil;
        if (lockedUntilStr) {
          const lockedUntilMs = new Date(lockedUntilStr).getTime();
          const remainingSecs = Math.max(0, Math.ceil((lockedUntilMs - Date.now()) / 1000));
          setLockCountdown(remainingSecs);
          setErrorMessage(`Tài khoản tạm thời bị khóa. Vui lòng thử lại sau ${remainingSecs} giây.`);
        } else {
          setErrorMessage(data?.message || 'Tài khoản tạm thời bị khóa trong 15 phút.');
        }
      } else if (status === 401) {
        setErrorMessage(data?.message || 'Email hoặc mật khẩu không chính xác.');
      } else {
        setErrorMessage(data?.message || 'Đăng nhập không thành công. Vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="login-page">
      {/* Left hero */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="brand">
            <i className="bi bi-briefcase-fill" style={{ fontSize: '1.8rem', marginRight: '10px' }}></i>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>HR Recruit ATS</span>
          </div>

          <div className="hero-intro">
            <h1>Hệ thống Tuyển dụng Nội bộ Toàn diện</h1>
            <p className="hero-desc">
              Quản lý trọn vẹn quy trình tuyển dụng từ phê duyệt yêu cầu, nguồn ứng viên,
              phỏng vấn đánh giá đến gửi đề nghị nhận việc và hội nhập nhân sự.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <i className="bi bi-shield-check"></i>
                <span>Bảo mật cấp doanh nghiệp với xác thực JWT & phân quyền 7 vai trò</span>
              </div>
              <div className="feature-item">
                <i className="bi bi-kanban"></i>
                <span>Quy trình ứng viên (Pipeline) minh bạch, kết nối nhà tuyển dụng & ứng viên</span>
              </div>
              <div className="feature-item">
                <i className="bi bi-clock-history"></i>
                <span>Chống tấn công Brute-force: Khóa tài khoản an toàn ở cấp độ Database</span>
              </div>
            </div>
          </div>

          <div className="hero-footer">
            <span>© 2026 HR Recruit ATS. Tiêu chuẩn bảo mật ISO 27001.</span>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="login-section">
        <div className="login-card">
          <div className="login-header">
            <h2>Đăng nhập hệ thống</h2>
            <p>Truy cập cổng dữ liệu tuyển dụng nội bộ</p>
          </div>

          {errorMessage && (
            <div className="error-alert">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <div>
                {errorMessage}
                {lockCountdown !== null && lockCountdown > 0 && (
                  <div style={{ marginTop: '5px', fontWeight: 700 }}>
                    Thời gian còn lại: {formatCountdown(lockCountdown)}
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email công ty</label>
              <div className="input-wrap">
                <i className="bi bi-envelope input-icon"></i>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhanvien@company.com"
                  disabled={lockCountdown !== null && lockCountdown > 0}
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password">Mật khẩu</label>
                <Link to="/forgot-password" className="forgot-link">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="input-wrap">
                <i className="bi bi-lock input-icon"></i>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  disabled={lockCountdown !== null && lockCountdown > 0}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-wrap">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Ghi nhớ tài khoản</span>
              </label>
            </div>

            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting || (lockCountdown !== null && lockCountdown > 0)}
            >
              {isSubmitting ? (
                <span><i className="bi bi-arrow-repeat spin"></i> Đang xác thực...</span>
              ) : lockCountdown !== null && lockCountdown > 0 ? (
                `Khóa (${formatCountdown(lockCountdown)})`
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="dev-accounts-hint">
            <strong>Tài khoản mẫu thử nghiệm (Mật khẩu: Password123@):</strong>
            <ul>
              <li><code>admin@company.com</code> (Admin)</li>
              <li><code>recruiter@company.com</code> (Recruiter)</li>
              <li><code>hr_manager@company.com</code> (HR Manager)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
