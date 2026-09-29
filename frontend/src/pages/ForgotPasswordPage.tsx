import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authApi from '../api/auth';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await authApi.forgotPassword(email.trim());
      setMessage(res.message || 'Nếu email tồn tại, hướng dẫn khôi phục mật khẩu đã được gửi.');
    } catch {
      setMessage('Nếu email tồn tại, hướng dẫn khôi phục mật khẩu đã được gửi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-simple-page">
      <div className="auth-card">
        <div className="card-header">
          <i className="bi bi-key-fill" style={{ fontSize: '2rem', color: '#102b86' }}></i>
          <h2>Quên mật khẩu</h2>
          <p>Nhập email đăng ký để nhận liên kết khôi phục mật khẩu</p>
        </div>

        {message && (
          <div className="alert-box info">
            <i className="bi bi-info-circle-fill"></i>
            <div>{message}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
              />
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu khôi phục'}
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

export default ForgotPasswordPage;
