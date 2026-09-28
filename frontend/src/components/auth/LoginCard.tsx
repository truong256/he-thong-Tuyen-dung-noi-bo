import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    <div className="soft-card-wrapper">
      <div className="neumorphic-login-card">
        {/* Circular Avatar / Badge with HR */}
        <div className="neumorphic-avatar-circle" aria-label="Logo HR Recruit">
          HR
        </div>

        {/* Title and Subtitle */}
        <div className="neumorphic-header-text">
          <h1 className="neumorphic-title">Chào mừng trở lại</h1>
          <p className="neumorphic-subtitle">Đăng nhập để tiếp tục</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="neumorphic-form-body" noValidate>
          {/* Email Field */}
          <div className="neumorphic-form-group">
            <div className="neumorphic-input-wrap">
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="Email công ty"
                disabled={isLocked || isSubmitting}
                autoComplete="email"
                className="neumorphic-input"
                aria-label="Email công ty"
              />
            </div>
            {emailError && <span className="field-inline-error">{emailError}</span>}
          </div>

          {/* Password Field with Text Toggle */}
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

          {/* Options Row: Remember Me & Forgot Password */}
          <div className="neumorphic-meta-row">
            <label className="neumorphic-remember-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isLocked || isSubmitting}
                className="neumorphic-checkbox"
                aria-label="Ghi nhớ tài khoản"
              />
              <span>Ghi nhớ tài khoản</span>
            </label>

            <Link to="/forgot-password" className="neumorphic-forgot-link">
              Quên mật khẩu?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="neumorphic-submit-btn"
            disabled={isSubmitting || isLocked}
            aria-label="Đăng nhập"
          >
            {isSubmitting ? (
              <span className="btn-pulse-text">Đang đăng nhập...</span>
            ) : isLocked ? (
              <span>Khóa ({formatCountdown(lockCountdown)})</span>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>

          {/* Error Banner */}
          {errorMessage && (
            <div className="neumorphic-error-banner" role="alert">
              <span>{errorMessage}</span>
              {isLocked && (
                <span className="lock-timer-text">
                  Thời gian mở khóa: {formatCountdown(lockCountdown)}
                </span>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Brand Subtitle Below Card */}
      <div className="neumorphic-footer-brand">
        <span>HR Recruit ATS</span>
      </div>
    </div>
  );
};

export default LoginCard;
