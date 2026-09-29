import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail } from 'lucide-react';
import PasswordField from './PasswordField';
import { useAuth } from '../../hooks/useAuth';

interface LoginCardProps {
  onSuccessRedirect?: string;
}

export const LoginCard: React.FC<LoginCardProps> = ({ onSuccessRedirect = '/dashboard' }) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore saved email from localStorage
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

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const validate = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Vui lòng nhập email.');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Email không đúng định dạng.');
        isValid = false;
      }
    }

    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockCountdown !== null && lockCountdown > 0) return;

    if (!validate()) return;

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
    <div className="auth-form-card">
      {/* User Avatar Circle */}
      <div className="auth-avatar-container">
        <div className="auth-avatar-circle" aria-hidden="true">
          <User size={19} className="auth-avatar-icon" strokeWidth={1.6} />
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="auth-header-block">
        <h1 className="auth-form-title">Chào mừng trở lại</h1>
        <p className="auth-form-subtitle">
          <span>Đăng nhập để tiếp tục</span> vào hệ thống tuyển dụng nội bộ.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
        {/* Email Field - No external label */}
        <div className="auth-field-group">
          <div className="auth-input-wrapper">
            <Mail size={16} className="auth-input-leading-icon" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              placeholder="Email hoặc tài khoản"
              disabled={isLocked || isSubmitting}
              autoComplete="email"
              className={`auth-text-input has-leading-icon ${emailError ? 'has-error' : ''}`}
              aria-label="Email"
            />
          </div>
          {emailError && <span className="auth-field-error" role="alert">{emailError}</span>}
        </div>

        {/* Password Field - No external label */}
        <PasswordField
          id="login-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError(null);
          }}
          disabled={isLocked || isSubmitting}
          required
          placeholder="Mật khẩu"
          error={passwordError}
        />

        {/* Remember & Forgot Row */}
        <div className="auth-options-row">
          <label className="auth-remember-label">
            <input
              type="checkbox"
              id="remember-me"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={isLocked || isSubmitting}
              className="auth-checkbox"
              aria-label="Ghi nhớ tài khoản"
            />
            <span>Ghi nhớ tài khoản</span>
          </label>

          <Link to="/forgot-password" className="auth-forgot-link">
            Quên mật khẩu?
          </Link>
        </div>

        {/* Submit Button - Soft White/Grey Button */}
        <button
          type="submit"
          id="login-submit-btn"
          className="auth-submit-btn"
          disabled={isSubmitting || isLocked}
          aria-label="Đăng nhập"
        >
          {isSubmitting ? (
            <span className="auth-btn-loading">
              <span className="auth-spinner" aria-hidden="true" />
              <span>Đang đăng nhập...</span>
            </span>
          ) : isLocked ? (
            <span>Khóa ({formatCountdown(lockCountdown)})</span>
          ) : (
            <span>Đăng nhập</span>
          )}
        </button>

        {/* Error Banner */}
        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-text">{errorMessage}</span>
            {isLocked && (
              <span className="auth-lock-timer">
                Thời gian mở khóa: {formatCountdown(lockCountdown)}
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default LoginCard;
