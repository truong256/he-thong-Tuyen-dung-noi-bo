import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import authApi from '../api/auth';

export const AppLayout: React.FC = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalMessage, setModalMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setModalMessage({ text: 'Mật khẩu xác nhận không khớp.', isError: true });
      return;
    }
    if (newPassword.length < 6) {
      setModalMessage({ text: 'Mật khẩu mới phải có ít nhất 6 ký tự.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setModalMessage(null);
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      setModalMessage({ text: res.message || 'Đổi mật khẩu thành công!', isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.';
      setModalMessage({ text: msg, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <Header onChangePasswordClick={() => { setModalMessage(null); setShowPasswordModal(true); }} />
      <div className="app-body">
        <Sidebar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Đổi mật khẩu</h3>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              {modalMessage && (
                <div className={`alert-box ${modalMessage.isError ? 'error' : 'success'}`}>
                  {modalMessage.text}
                </div>
              )}
              <div className="form-group">
                <label>Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại..."
                />
              </div>
              <div className="form-group">
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                />
              </div>
              <div className="form-group">
                <label>Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
