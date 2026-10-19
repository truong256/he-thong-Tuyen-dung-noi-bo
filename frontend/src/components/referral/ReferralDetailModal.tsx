import React from 'react';
import {
  X,
  UserCheck,
  Building,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Tag,
  Clock,
  Briefcase,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Referral, GeneralStatus } from '../../types/referral';

interface ReferralDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: Referral | null;
}

const STAGES: Array<{ key: GeneralStatus; label: string; number: number }> = [
  { key: 'SUBMITTED', label: 'Tiếp nhận', number: 1 },
  { key: 'SCREENING', label: 'Sàng lọc', number: 2 },
  { key: 'INTERVIEW', label: 'Phỏng vấn', number: 3 },
  { key: 'OFFER', label: 'Đề xuất', number: 4 },
  { key: 'HIRED', label: 'Tuyển dụng', number: 5 },
];

export const ReferralDetailModal: React.FC<ReferralDetailModalProps> = ({
  isOpen,
  onClose,
  referral,
}) => {
  if (!isOpen || !referral) return null;

  const currentStatus = referral.generalStatus;
  const isRejected = currentStatus === 'REJECTED';

  const getStepClass = (stageKey: GeneralStatus, index: number) => {
    if (isRejected) {
      if (index === 0) return 'completed';
      return 'rejected';
    }

    const stageOrder: Record<GeneralStatus, number> = {
      SUBMITTED: 1,
      SCREENING: 2,
      INTERVIEW: 3,
      OFFER: 4,
      HIRED: 5,
      REJECTED: 0,
    };

    const currentOrder = stageOrder[currentStatus] || 1;
    const itemOrder = stageOrder[stageKey] || 1;

    if (itemOrder < currentOrder) return 'completed';
    if (itemOrder === currentOrder) return 'active';
    return '';
  };

  return (
    <div className="ref-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ref-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ref-modal-header">
          <h2>
            <UserCheck size={22} style={{ color: 'var(--primary)' }} />
            <span>Chi tiết hồ sơ giới thiệu #{referral.id}</span>
          </h2>
          <button
            type="button"
            className="ref-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ref-modal-body">
          {/* General Status Stepper */}
          <div style={{ marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Tiến trình xử lý hồ sơ (Tổng quát)
            </span>
          </div>

          <div className="ref-stepper">
            {STAGES.map((s, idx) => {
              const stepCls = getStepClass(s.key, idx);
              return (
                <div key={s.key} className={`ref-step-item ${stepCls}`}>
                  <div className="ref-step-circle">{s.number}</div>
                  <span className="ref-step-label">{s.label}</span>
                </div>
              );
            })}
          </div>

          {isRejected && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#b91c1c',
                fontSize: '0.8125rem',
              }}
            >
              <AlertCircle size={16} />
              <span>
                Trạng thái hiện tại: <strong>Chưa phù hợp (Từ chối)</strong>. Cảm ơn bạn đã giới thiệu ứng viên cho công ty.
              </span>
            </div>
          )}

          {/* Section 1: Candidate Info */}
          <div className="ref-detail-section">
            <div className="ref-detail-section-title">
              <UserCheck size={16} />
              <span>Thông tin ứng viên</span>
            </div>
            <div className="ref-detail-grid">
              <div className="ref-detail-item">
                <span className="ref-detail-label">Họ và tên</span>
                <span className="ref-detail-val">{referral.candidateName}</span>
              </div>
              <div className="ref-detail-item">
                <span className="ref-detail-label">Email</span>
                <span className="ref-detail-val">{referral.candidateEmail}</span>
              </div>
              <div className="ref-detail-item">
                <span className="ref-detail-label">Số điện thoại</span>
                <span className="ref-detail-val">{referral.candidatePhone || 'Chưa cập nhật'}</span>
              </div>
              <div className="ref-detail-item">
                <span className="ref-detail-label">Mối quan hệ</span>
                <span className="ref-detail-val">{referral.relationship || 'Đồng nghiệp / Người quen'}</span>
              </div>
              {referral.cvUrl && (
                <div className="ref-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="ref-detail-label">CV / Hồ sơ đính kèm</span>
                  <a
                    href={referral.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    <span>Mở xem tài liệu CV</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Position Info */}
          <div className="ref-detail-section">
            <div className="ref-detail-section-title">
              <Briefcase size={16} />
              <span>Vị trí tuyển dụng</span>
            </div>
            <div className="ref-detail-grid">
              <div className="ref-detail-item">
                <span className="ref-detail-label">Tên vị trí</span>
                <span className="ref-detail-val">{referral.jobTitle || 'Chưa xác định'}</span>
              </div>
              <div className="ref-detail-item">
                <span className="ref-detail-label">Phòng ban</span>
                <span className="ref-detail-val">{referral.departmentName || 'Công ty'}</span>
              </div>
              <div className="ref-detail-item">
                <span className="ref-detail-label">Mã tuyển dụng</span>
                <span className="ref-detail-val">
                  {referral.jobPostingCode || referral.requisitionCode || 'N/A'}
                </span>
              </div>
              <div className="ref-detail-item">
                <span className="ref-detail-label">Ngày giới thiệu</span>
                <span className="ref-detail-val">
                  {new Date(referral.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Referrer Info & Label */}
          <div className="ref-detail-section">
            <div className="ref-detail-section-title">
              <Tag size={16} />
              <span>Nguồn gốc & Người giới thiệu</span>
            </div>
            <div className="ref-detail-grid">
              <div className="ref-detail-item">
                <span className="ref-detail-label">Nhãn nguồn hồ sơ</span>
                <div>
                  <span className="ref-source-badge">
                    <Tag size={12} />
                    Giới thiệu nội bộ ({referral.source})
                  </span>
                </div>
              </div>
              <div className="ref-detail-item">
                <span className="ref-detail-label">Người giới thiệu</span>
                <span className="ref-detail-val">
                  {referral.referrerName} {referral.referrerEmail ? `(${referral.referrerEmail})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Referral Notes */}
          <div className="ref-detail-section">
            <div className="ref-detail-section-title">
              <Clock size={16} />
              <span>Ghi chú giới thiệu & Nhận xét</span>
            </div>
            <div className="ref-notes-text">{referral.referralNotes}</div>
          </div>
        </div>

        <div className="ref-modal-footer">
          <button type="button" className="ref-btn ref-btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralDetailModal;
