import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import authApi from '../api/auth';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setMessage({ text: 'Vui lòng cung cấp mã token đặt lại mật khẩu.', isError: true });
      return;
    }
    if (newPassword.length < 6) {
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
      setMessage({ text: res.message || 'Đặt lại mật khẩu thành công!', isError: false });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.';
      setMessage({ text: msg, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-simple-page">
      <div className="auth-card">
        <div className="card-header">
          <i className="bi bi-shield-lock-fill" style={{ fontSize: '2rem', color: '#102b86' }}></i>
          <h2>Đặt lại mật khẩu</h2>
          <p>Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        {message && (
          <div className={`alert-box ${message.isError ? 'error' : 'success'}`}>
            <i className={`bi bi-${message.isError ? 'exclamation-circle' : 'check-circle'}-fill`}></i>
            <div>{message.text}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!searchParams.get('token') && (
            <div className="form-group">
              <label htmlFor="token">Mã Token</label>
              <input
                id="token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Dán mã token khôi phục vào đây..."
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword">Mật khẩu mới</label>
            <div className="input-wrap">
              <i className="bi bi-lock input-icon"></i>
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự..."
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

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
            <div className="input-wrap">
              <i className="bi bi-lock-fill input-icon"></i>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
              />
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang cập nhật...' : 'Xác nhận đặt lại mật khẩu'}
          </button>
        </form>

        <div className="auth-card-footer">
          <Link to="/login">
            <i className="bi bi-arrow-left"></i> Quay lại Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
