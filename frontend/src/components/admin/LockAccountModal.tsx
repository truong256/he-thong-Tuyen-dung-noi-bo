import React, { useState } from 'react';
import { Lock, Unlock, AlertTriangle, X } from 'lucide-react';
import { UserSummary } from '../../types/user';
import adminApi from '../../api/admin';

interface LockAccountModalProps {
  isOpen: boolean;
  user: UserSummary | null;
  onClose: () => void;
  onSuccess: (updatedUser: UserSummary, newStatus: string) => void;
  onError: (msg: string) => void;
}

const LOCK_REASONS = [
  'Vi phạm chính sách bảo mật thông tin nội bộ',
  'Tạm dừng công tác / Đã chấm dứt hợp đồng lao động',
  'Phát hiện dấu hiệu xâm nhập tài khoản bất thường',
  'Yêu cầu bảo mật từ Quản trị viên hệ thống',
  'Khác (ghi rõ trong ghi chú)',
];

export const LockAccountModal: React.FC<LockAccountModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
  onError,
}) => {
  const [reason, setReason] = useState(LOCK_REASONS[0]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const isLocking = user.status !== 'LOCKED';
  const nextStatus = isLocking ? 'LOCKED' : 'ACTIVE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        status: nextStatus,
        reason: isLocking ? reason : undefined,
        note: isLocking && note.trim() ? note.trim() : undefined,
      };
      const updated = await adminApi.updateStatus(user.id, payload);
      onSuccess(updated, nextStatus);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || `Không thể ${isLocking ? 'khóa' : 'mở khóa'} tài khoản. Vui lòng thử lại.`;
      onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="lock-modal-title">
      <div className="modal-box lock-modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className={`modal-title-icon ${isLocking ? 'warning' : 'success'}`}>
              {isLocking ? <Lock size={20} /> : <Unlock size={20} />}
            </div>
            <h3 id="lock-modal-title">
              {isLocking ? 'Xác nhận Khóa tài khoản' : 'Xác nhận Mở khóa tài khoản'}
            </h3>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isLocking ? (
            <>
              <div className="alert-box error" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>
                  Tài khoản <strong>{user.email}</strong> sẽ bị thu hồi quyền đăng nhập ngay lập tức sau khi khóa.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="lock-reason">
                  Lý do khóa tài khoản <span className="text-danger">*</span>
                </label>
                <select
                  id="lock-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                >
                  {LOCK_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="lock-note">Ghi chú bổ sung (tùy chọn)</label>
                <textarea
                  id="lock-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập thông tin chi tiết hoặc số quyết định..."
                  disabled={isSubmitting}
                />
              </div>
            </>
          ) : (
            <div className="alert-box info" style={{ marginBottom: '16px' }}>
              <Unlock size={18} style={{ flexShrink: 0 }} />
              <span>
                Bạn có chắc chắn muốn mở khóa cho tài khoản <strong>{user.email}</strong>? Người dùng sẽ có thể đăng nhập lại vào hệ thống.
              </span>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '24px' }}>
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
              className={`btn ${isLocking ? 'btn-danger' : 'btn-success'}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="auth-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                  <span>{isLocking ? 'Đang khóa...' : 'Đang mở khóa...'}</span>
                </>
              ) : (
                <>
                  {isLocking ? <Lock size={16} /> : <Unlock size={16} />}
                  <span>{isLocking ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LockAccountModal;
