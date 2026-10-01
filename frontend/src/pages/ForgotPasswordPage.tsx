import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import authApi from '../api/auth';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    setEmailError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Vui lòng nhập địa chỉ email công ty.');
      return false;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(trimmed)) {
      setEmailError('Địa chỉ email không đúng định dạng.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSuccessInfo(null);
    setErrorMessage(null);

    try {
      const res = await authApi.forgotPassword(email.trim());
      setSuccessInfo(
        res.message ||
          'Nếu email tồn tại trong hệ thống, hướng dẫn khôi phục mật khẩu đã được gửi đến hòm thư của bạn.'
      );
    } catch {
      // Standard security practice: avoid email enumeration
      setSuccessInfo(
        'Nếu email tồn tại trong hệ thống, hướng dẫn khôi phục mật khẩu đã được gửi đến hòm thư của bạn.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-simple-page" data-testid="forgot-password-page">
      <div className="auth-card">
        <div className="card-header">
          <div className="auth-card-icon-wrap" aria-hidden="true">
            <KeyRound size={28} className="auth-card-icon" />
          </div>
          <h2>Quên mật khẩu</h2>
          <p>Nhập email đăng ký để nhận liên kết khôi phục mật khẩu tài khoản</p>
        </div>

        {successInfo ? (
          <div className="forgot-success-block" role="status">
            <div className="forgot-success-icon-wrap">
              <CheckCircle2 size={36} className="text-green" />
            </div>
            <h3>Yêu cầu đã được gửi</h3>
            <p className="forgot-success-text">{successInfo}</p>
            <p className="forgot-hint-text">
              Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam/Quảng cáo).
            </p>
            <div style={{ marginTop: '20px' }}>
              <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <ArrowLeft size={16} />
                <span>Quay lại trang Đăng nhập</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {errorMessage && (
              <div className="alert-box error" role="alert">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="forgot-email">
                Email công ty <span className="text-danger">*</span>
              </label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="nhanvien@company.com"
                  disabled={isSubmitting}
                  autoComplete="email"
                  className={emailError ? 'has-error' : ''}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error-text' : undefined}
                />
              </div>
              {emailError && (
                <span id="email-error-text" className="auth-field-error" role="alert">
                  {emailError}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
              style={{ marginTop: '16px' }}
            >
              {isSubmitting ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                  <span>Đang gửi yêu cầu...</span>
                </span>
              ) : (
                <span>Gửi yêu cầu khôi phục</span>
              )}
            </button>

            <div className="auth-card-footer">
              <Link to="/login" className="auth-back-link">
                <ArrowLeft size={15} />
                <span>Quay lại Đăng nhập</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
