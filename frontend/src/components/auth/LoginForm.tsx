import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordField from './PasswordField';
import { useAuth } from '../../hooks/useAuth';

interface LoginFormProps {
  onSuccessRedirect?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccessRedirect = '/dashboard' }) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  // Countdown timer for 423 Locked state
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

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (lockCountdown !== null && lockCountdown > 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
      if (remember) {
        localStorage.setItem('rememberEmail', email.trim());
      } else {
        localStorage.removeItem('rememberEmail');
      }
      navigate(onSuccessRedirect, { replace: true });
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

  const isLocked = lockCountdown !== null && lockCountdown > 0;

  return (
    <div className="login-card-container">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">Chào mừng trở lại</h2>
          <p className="login-subtitle">Đăng nhập để tiếp tục vào hệ thống tuyển dụng nội bộ.</p>
        </div>

        {errorMessage && (
          <div className="login-error-banner" role="alert">
            <span className="error-text">{errorMessage}</span>
            {isLocked && (
              <span className="countdown-text">
                Thời gian mở khóa: {formatCountdown(lockCountdown)}
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form-inner" noValidate={false}>
          {/* Email field */}
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email công ty
            </label>
            <div className="input-container">
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                disabled={isLocked || isSubmitting}
                autoComplete="email"
                className="clean-input"
              />
            </div>
          </div>

          {/* Password field with clean text toggle */}
          <PasswordField
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLocked || isSubmitting}
            required
            placeholder="••••••••••••"
          />

          {/* Options: Remember Me & Forgot Password */}
          <div className="form-meta-row">
            <label className="remember-checkbox-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isLocked || isSubmitting}
                className="clean-checkbox"
              />
              <span>Ghi nhớ tài khoản</span>
            </label>

            <Link to="/forgot-password" className="forgot-password-link">
              Quên mật khẩu?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-login-btn"
            disabled={isSubmitting || isLocked}
          >
            {isSubmitting ? (
              <span className="btn-loading-state">Đang đăng nhập...</span>
            ) : isLocked ? (
              <span>Khóa ({formatCountdown(lockCountdown)})</span>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
