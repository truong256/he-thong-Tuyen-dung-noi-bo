import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Mail } from 'lucide-react';
import PasswordField from './PasswordField';
import { useAuth } from '../../hooks/useAuth';

interface LoginCardProps {
  onSuccessRedirect?: string;
}

export const LoginCard: React.FC<LoginCardProps> = ({ onSuccessRedirect = '/dashboard' }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(() => {
    const isStateExpired = (location.state as any)?.sessionExpired;
    const isStorageExpired =
      typeof window !== 'undefined' && sessionStorage.getItem('ats:session_expired') === '1';

    if (isStateExpired || isStorageExpired) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('ats:session_expired');
      }
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    return null;
  });
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for session expired notification
  useEffect(() => {
    const isSessionExpiredFromState = (location.state as any)?.sessionExpired;
    const isSessionExpiredFromStorage =
      typeof window !== 'undefined' && sessionStorage.getItem('ats:session_expired') === '1';

    if (isSessionExpiredFromState || isSessionExpiredFromStorage) {
      setSessionExpiredMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('ats:session_expired');
      }
    }
  }, [location]);

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
    setSessionExpiredMessage(null);
    setRemainingAttempts(null);

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
        setRemainingAttempts(0);
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
        const remaining = data?.remainingAttempts;
        if (typeof remaining === 'number') {
          setRemainingAttempts(remaining);
        } else {
          setRemainingAttempts(null);
        }
        setErrorMessage(data?.message || 'Email hoặc mật khẩu không chính xác.');
      } else {
        setRemainingAttempts(null);
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
          <User size={22} className="auth-avatar-icon" strokeWidth={1.75} />
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="auth-header-block">
        <h1 className="auth-form-title">Chào mừng trở lại</h1>
        <p className="auth-form-subtitle">
          <span>Đăng nhập để tiếp tục</span>
          <br />
          vào hệ thống tuyển dụng nội bộ.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
        {/* Email Field - No external label */}
        <div className="auth-field-group">
          <div className="auth-input-wrapper">
            <Mail size={18} className="auth-input-leading-icon" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
                if (errorMessage) {
                  setErrorMessage(null);
                  setRemainingAttempts(null);
                }
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
            if (errorMessage) {
              setErrorMessage(null);
              setRemainingAttempts(null);
            }
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
        {(errorMessage || sessionExpiredMessage) && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-text">{errorMessage || sessionExpiredMessage}</span>
            {remainingAttempts !== null && remainingAttempts > 0 && !isLocked && (
              <div className="auth-remaining-badge">
                <span className="auth-remaining-dot" aria-hidden="true" />
                <span>Số lượt thử còn lại: <strong>{remainingAttempts} / 5</strong></span>
              </div>
            )}
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
