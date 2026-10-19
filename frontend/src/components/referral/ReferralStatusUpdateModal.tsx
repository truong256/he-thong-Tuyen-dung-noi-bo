import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { Referral, GeneralStatus } from '../../types/referral';
import referralApi from '../../api/referral';

interface ReferralStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: Referral | null;
  onSuccess: () => void;
}

const STATUS_OPTIONS: Array<{ value: GeneralStatus; label: string }> = [
  { value: 'SUBMITTED', label: 'Đã tiếp nhận hồ sơ' },
  { value: 'SCREENING', label: 'Đang sàng lọc hồ sơ' },
  { value: 'INTERVIEW', label: 'Đang phỏng vấn' },
  { value: 'OFFER', label: 'Đã gửi đề xuất (Offer)' },
  { value: 'HIRED', label: 'Đã tuyển dụng thành công' },
  { value: 'REJECTED', label: 'Chưa phù hợp (Từ chối)' },
];

export const ReferralStatusUpdateModal: React.FC<ReferralStatusUpdateModalProps> = ({
  isOpen,
  onClose,
  referral,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<GeneralStatus>(
    referral?.generalStatus || 'SUBMITTED'
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !referral) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await referralApi.updateGeneralStatus(referral.id, {
        generalStatus: selectedStatus,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Không thể cập nhật trạng thái hồ sơ giới thiệu.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ref-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="ref-modal-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ref-modal-header">
          <h2>
            <RefreshCw size={20} style={{ color: 'var(--primary)' }} />
            <span>Cập nhật trạng thái tổng quát</span>
          </h2>
          <button
            type="button"
            className="ref-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ref-modal-body">
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#475569' }}>
                Ứng viên: <strong>{referral.candidateName}</strong>
              </p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                Vị trí: {referral.jobTitle || 'N/A'} (Người giới thiệu: {referral.referrerName})
              </p>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#b91c1c',
                  fontSize: '0.8125rem',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="ref-form-group">
              <label htmlFor="ref-update-status-select">
                Trạng thái tổng quát mới <span className="required">*</span>
              </label>
              <select
                id="ref-update-status-select"
                className="ref-form-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as GeneralStatus)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.value})
                  </option>
                ))}
              </select>
            </div>

            <div className="ref-form-group">
              <label htmlFor="ref-update-notes">Ghi chú cập nhật (Tùy chọn)</label>
              <textarea
                id="ref-update-notes"
                className="ref-form-textarea"
                rows={3}
                placeholder="Ghi chú lý do chuyển trạng thái..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="ref-modal-footer">
            <button
              type="button"
              className="ref-btn ref-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button type="submit" className="ref-btn ref-btn-primary" disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Lưu trạng thái'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReferralStatusUpdateModal;
