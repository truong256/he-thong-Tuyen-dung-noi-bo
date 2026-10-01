import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, ArrowLeft, Check, X, AlertCircle } from 'lucide-react';
import authApi from '../api/auth';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, [searchParams]);

  const isMinLength = newPassword.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const calculateStrength = (): { text: string; color: string; percent: number } => {
    if (!newPassword) return { text: '', color: '', percent: 0 };
    let score = 0;
    if (newPassword.length >= 6) score += 25;
    if (newPassword.length >= 8) score += 25;
    if (hasLetter) score += 25;
    if (hasNumber) score += 25;

    if (score <= 50) return { text: 'Yếu', color: '#ef4444', percent: 35 };
    if (score <= 75) return { text: 'Trung bình', color: '#f59e0b', percent: 65 };
    return { text: 'Mạnh', color: '#10b981', percent: 100 };
  };

  const strength = calculateStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setMessage({ text: 'Vui lòng cung cấp mã token đặt lại mật khẩu.', isError: true });
      return;
    }
    if (!isMinLength) {
      setMessage({ text: 'Mật khẩu mới phải có ít nhất 6 ký tự.', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Mật khẩu xác nhận không khớp.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await authApi.resetPassword({
        token: token.trim(),
        newPassword,
        confirmPassword,
      });
      setMessage({ text: res.message || 'Đặt lại mật khẩu thành công! Đang chuyển hướng...', isError: false });
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.';
      setMessage({ text: msg, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-simple-page" data-testid="reset-password-page">
      <div className="auth-card">
        <div className="card-header">
          <div className="auth-card-icon-wrap" aria-hidden="true">
            <ShieldCheck size={28} className="auth-card-icon" />
          </div>
          <h2>Đặt lại mật khẩu</h2>
          <p>Nhập mật khẩu mới an toàn cho tài khoản của bạn</p>
        </div>

        {message && (
          <div className={`alert-box ${message.isError ? 'error' : 'success'}`} role="alert">
            {message.isError ? (
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
            ) : (
              <Check size={16} style={{ flexShrink: 0 }} />
            )}
            <div>{message.text}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {!searchParams.get('token') && (
            <div className="form-group">
              <label htmlFor="token">
                Mã Token đặt lại mật khẩu <span className="text-danger">*</span>
              </label>
              <input
                id="token"
                type="text"
                required
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (message) setMessage(null);
                }}
                placeholder="Dán mã token khôi phục vào đây..."
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* New Password */}
          <div className="form-group">
            <label htmlFor="newPassword">
              Mật khẩu mới <span className="text-danger">*</span>
            </label>
            <div className="input-with-eye">
              <Lock size={16} className="input-icon-left" aria-hidden="true" />
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (message) setMessage(null);
                }}
                placeholder="Tối thiểu 6 ký tự..."
                disabled={isSubmitting}
                autoComplete="new-password"
                className="has-left-icon"
              />
              <button
                type="button"
                className="eye-toggle-btn"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength meter bar */}
            {newPassword && (
              <div className="pwd-strength-container">
                <div className="pwd-strength-bar-bg">
                  <div
                    className="pwd-strength-bar"
                    style={{ width: `${strength.percent}%`, backgroundColor: strength.color }}
                  />
                </div>
                <span className="pwd-strength-text" style={{ color: strength.color }}>
                  Độ mạnh: {strength.text}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">
              Xác nhận mật khẩu mới <span className="text-danger">*</span>
            </label>
            <div className="input-with-eye">
              <Lock size={16} className="input-icon-left" aria-hidden="true" />
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (message) setMessage(null);
                }}
                placeholder="Nhập lại mật khẩu mới..."
                disabled={isSubmitting}
                autoComplete="new-password"
                className="has-left-icon"
              />
              <button
                type="button"
                className="eye-toggle-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && (
              <div className={`pwd-match-indicator ${isMatch ? 'match' : 'mismatch'}`}>
                {isMatch ? (
                  <>
                    <Check size={14} /> <span>Mật khẩu xác nhận khớp</span>
                  </>
                ) : (
                  <>
                    <X size={14} /> <span>Mật khẩu xác nhận chưa khớp</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Criteria Checklist */}
          <div className="pwd-criteria-list">
            <span className="pwd-criteria-title">Yêu cầu bảo mật:</span>
            <div className={`pwd-criteria-item ${isMinLength ? 'met' : ''}`}>
              {isMinLength ? <Check size={13} /> : <span className="dot" />}
              <span>Ít nhất 6 ký tự</span>
            </div>
            <div className={`pwd-criteria-item ${hasLetter && hasNumber ? 'met' : ''}`}>
              {hasLetter && hasNumber ? <Check size={13} /> : <span className="dot" />}
              <span>Khuyến nghị gồm cả chữ cái và số</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={isSubmitting || !isMinLength || (confirmPassword.length > 0 && !isMatch)}
            style={{ marginTop: '16px' }}
          >
            {isSubmitting ? (
              <span className="auth-btn-loading">
                <span className="auth-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                <span>Đang cập nhật...</span>
              </span>
            ) : (
              <span>Xác nhận đặt lại mật khẩu</span>
            )}
          </button>
        </form>

        <div className="auth-card-footer">
          <Link to="/login" className="auth-back-link">
            <ArrowLeft size={15} />
            <span>Quay lại Đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
