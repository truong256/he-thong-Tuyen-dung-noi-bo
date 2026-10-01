import React from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onLoginAgain: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onLoginAgain,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="session-expired-title">
      <div className="modal-box modal-confirm-box">
        <div className="modal-confirm-icon-wrap error">
          <ShieldAlert size={34} />
        </div>

        <div className="modal-confirm-body">
          <h3 id="session-expired-title">Phiên đăng nhập đã hết hạn</h3>
          <p>
            Phiên làm việc của bạn đã hết thời gian hiệu lực vì lý do an toàn bảo mật. Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.
          </p>
        </div>

        <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onLoginAgain}
            style={{ width: '100%' }}
          >
            <span>Đăng nhập lại</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
