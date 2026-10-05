import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, Lock, Check, X, AlertCircle, LogOut, User } from 'lucide-react';
import authApi from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { validatePasswordPolicy } from '../utils/passwordPolicy';

export const FirstLoginChangePasswordPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const policy = validatePasswordPolicy(newPassword);
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isDifferentFromCurrent = currentPassword.length > 0 && newPassword.length > 0 && newPassword !== currentPassword;
  const strength = policy.strength;

  // Validation rules specifically for first login
  const isFormValid =
    currentPassword.trim().length > 0 &&
    policy.hasMinLength &&
    policy.hasLetter &&
    policy.hasNumber &&
    policy.hasUpper &&
    policy.hasLower &&
    isDifferentFromCurrent &&
    isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu tạm thời hiện tại.');
      return;
    }
    if (!policy.hasMinLength) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (!policy.hasUpper || !policy.hasLower || !policy.hasNumber) {
      setErrorMessage('Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage('Mật khẩu mới không được trùng với mật khẩu tạm thời.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword,
        confirmPassword,
      });

      // Successful first login change password
      sessionStorage.setItem(
        'ats:auth_notice',
        'Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.'
      );

      // Session revoked on backend, skip duplicate revoke call and clear local session
      await logout(true);
      navigate('/login', { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Không thể cập nhật mật khẩu. Vui lòng kiểm tra lại thông tin và thử lại.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const userRolesDisplay =
    user?.roles && user.roles.length > 0
      ? user.roles.join(', ')
      : user?.role || 'Người dùng';

  return (
    <div className="auth-simple-page" data-testid="first-login-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="card-header">
          <div className="auth-card-icon-wrap" aria-hidden="true" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
            <KeyRound size={28} className="auth-card-icon" style={{ color: '#d97706' }} />
          </div>
          <h2>Đổi mật khẩu lần đầu</h2>
          <p style={{ maxWidth: 380, color: '#475569', fontSize: '0.9rem' }}>
            Đây là lần đăng nhập đầu tiên của bạn. Vui lòng đổi mật khẩu để bảo vệ tài khoản và tiếp tục sử dụng hệ thống.
          </p>
        </div>

        {/* User Account Info Chip */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              marginBottom: 20,
              fontSize: '0.85rem',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <User size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.fullName || user.email}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email} • <span style={{ color: '#2563eb' }}>{userRolesDisplay}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-box error" role="alert" style={{ marginBottom: 18 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Temporary / Current Password */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label htmlFor="first-login-current-pwd">
              Mật khẩu tạm thời <span className="text-danger">*</span>
            </label>
            <div className="input-with-eye">
              <Lock size={16} className="input-icon-left" aria-hidden="true" />
              <input
                id="first-login-current-pwd"
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Nhập mật khẩu tạm thời được cấp..."
                disabled={isSubmitting || isLoggingOut}
                autoComplete="current-password"
                className="has-left-icon"
              />
              <button
                type="button"
                className="eye-toggle-btn"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label htmlFor="first-login-new-pwd">
              Mật khẩu mới <span className="text-danger">*</span>
            </label>
            <div className="input-with-eye">
              <Lock size={16} className="input-icon-left" aria-hidden="true" />
              <input
                id="first-login-new-pwd"
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Tối thiểu 8 ký tự (hoa, thường, số)..."
                disabled={isSubmitting || isLoggingOut}
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
              <div className="pwd-strength-container" style={{ marginTop: 8 }}>
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

          {/* Confirm New Password */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label htmlFor="first-login-confirm-pwd">
              Xác nhận mật khẩu mới <span className="text-danger">*</span>
            </label>
            <div className="input-with-eye">
              <Lock size={16} className="input-icon-left" aria-hidden="true" />
              <input
                id="first-login-confirm-pwd"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Nhập lại mật khẩu mới..."
                disabled={isSubmitting || isLoggingOut}
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
              <div className={`pwd-match-indicator ${isMatch ? 'match' : 'mismatch'}`} style={{ marginTop: 6 }}>
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
          <div className="pwd-criteria-list" style={{ marginTop: 12, marginBottom: 20 }}>
            <span className="pwd-criteria-title">Yêu cầu bảo mật mật khẩu mới:</span>
            <div className={`pwd-criteria-item ${policy.hasMinLength ? 'met' : ''}`}>
              {policy.hasMinLength ? <Check size={13} /> : <span className="dot" />}
              <span>Tối thiểu 8 ký tự</span>
            </div>
            <div className={`pwd-criteria-item ${policy.hasUpper ? 'met' : ''}`}>
              {policy.hasUpper ? <Check size={13} /> : <span className="dot" />}
              <span>Có ít nhất 1 chữ cái viết hoa (A-Z)</span>
            </div>
            <div className={`pwd-criteria-item ${policy.hasLower ? 'met' : ''}`}>
              {policy.hasLower ? <Check size={13} /> : <span className="dot" />}
              <span>Có ít nhất 1 chữ cái viết thường (a-z)</span>
            </div>
            <div className={`pwd-criteria-item ${policy.hasNumber ? 'met' : ''}`}>
              {policy.hasNumber ? <Check size={13} /> : <span className="dot" />}
              <span>Có ít nhất 1 chữ số (0-9)</span>
            </div>
            {currentPassword && newPassword && (
              <div className={`pwd-criteria-item ${isDifferentFromCurrent ? 'met' : ''}`}>
                {isDifferentFromCurrent ? <Check size={13} /> : <span className="dot" />}
                <span>Không trùng với mật khẩu tạm thời</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="submit"
              id="first-login-submit-btn"
              className="btn-submit"
              disabled={isSubmitting || isLoggingOut || !isFormValid}
            >
              {isSubmitting ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                  <span>Đang cập nhật mật khẩu...</span>
                </span>
              ) : (
                <span>Đổi mật khẩu</span>
              )}
            </button>

            <button
              type="button"
              id="first-login-logout-btn"
              onClick={handleLogout}
              disabled={isSubmitting || isLoggingOut}
              style={{
                width: '100%',
                height: 44,
                background: '#f8fafc',
                color: '#64748b',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                fontWeight: 500,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#334155';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FirstLoginChangePasswordPage;
