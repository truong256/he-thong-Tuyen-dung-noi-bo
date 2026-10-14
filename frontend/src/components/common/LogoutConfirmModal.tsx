import React from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  userEmail?: string;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  userEmail,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="logout-title">
      <div className="modal-box modal-confirm-box">
        <div className="modal-confirm-icon-wrap warning">
          <AlertTriangle size={32} />
        </div>

        <div className="modal-confirm-body">
          <h3 id="logout-title">Xác nhận đăng xuất</h3>
          <p>
            Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?
            {userEmail && (
              <span className="modal-confirm-user-info">
                Tài khoản: <strong>{userEmail}</strong>
              </span>
            )}
          </p>
        </div>

        <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="auth-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                <span>Đang đăng xuất...</span>
              </>
            ) : (
              <>
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
