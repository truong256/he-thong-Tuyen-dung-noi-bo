import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Check, X, ShieldCheck } from 'lucide-react';
import authApi from '../../api/auth';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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

  const handleReset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (!isMinLength) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccessMsg(res.message || 'Đổi mật khẩu thành công!');
      handleReset();
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đổi mật khẩu không thành công. Vui lòng kiểm tra lại mật khẩu hiện tại.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="change-pwd-title">
      <div className="modal-box change-pwd-modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="modal-title-icon">
              <KeyRound size={20} />
            </div>
            <h3 id="change-pwd-title">Đổi mật khẩu</h3>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {errorMsg && (
            <div className="alert-box error" role="alert">
              <X size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box success" role="alert">
              <ShieldCheck size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="form-group">
            <label htmlFor="currentPassword">Mật khẩu hiện tại <span className="text-danger">*</span></label>
            <div className="input-with-eye">
              <input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Nhập mật khẩu hiện tại..."
                disabled={isSubmitting}
                autoComplete="current-password"
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
          <div className="form-group">
            <label htmlFor="newPassword">Mật khẩu mới <span className="text-danger">*</span></label>
            <div className="input-with-eye">
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Tối thiểu 6 ký tự..."
                disabled={isSubmitting}
                autoComplete="new-password"
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

          {/* Confirm New Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu mới <span className="text-danger">*</span></label>
            <div className="input-with-eye">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Nhập lại mật khẩu mới..."
                disabled={isSubmitting}
                autoComplete="new-password"
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

          {/* Password checklist criteria */}
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

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !isMinLength || (confirmPassword.length > 0 && !isMatch)}
            >
              {isSubmitting ? (
                <>
                  <span className="auth-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <span>Lưu mật khẩu</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
