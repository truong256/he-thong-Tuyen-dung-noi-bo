import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Briefcase,
  User,
  Mail,
  Phone,
  Link,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { ReferralActivePosition, ReferralCreatePayload } from '../../types/referral';
import referralApi from '../../api/referral';
import { useAuth } from '../../hooks/useAuth';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialJobPostingId?: number;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialJobPostingId,
}) => {
  const { user } = useAuth();

  const [positions, setPositions] = useState<ReferralActivePosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const [selectedPositionKey, setSelectedPositionKey] = useState<string>('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [relationship, setRelationship] = useState('Đồng nghiệp cũ');
  const [cvUrl, setCvUrl] = useState('');
  const [referralNotes, setReferralNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadActivePositions();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCandidateName('');
    setCandidateEmail('');
    setCandidatePhone('');
    setRelationship('Đồng nghiệp cũ');
    setCvUrl('');
    setReferralNotes('');
    setErrors({});
    setServerError(null);
  };

  const loadActivePositions = async () => {
    setLoadingPositions(true);
    try {
      const data = await referralApi.getActivePositions();
      setPositions(data);
      if (initialJobPostingId) {
        const found = data.find((p) => p.jobPostingId === initialJobPostingId);
        if (found) {
          setSelectedPositionKey(
            found.jobPostingId ? `jp_${found.jobPostingId}` : `req_${found.requisitionId}`
          );
        } else if (data.length > 0) {
          const first = data[0];
          setSelectedPositionKey(
            first.jobPostingId ? `jp_${first.jobPostingId}` : `req_${first.requisitionId}`
          );
        }
      } else if (data.length > 0) {
        const first = data[0];
        setSelectedPositionKey(
          first.jobPostingId ? `jp_${first.jobPostingId}` : `req_${first.requisitionId}`
        );
      }
    } catch {
      // Fallback empty
    } finally {
      setLoadingPositions(false);
    }
  };

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!selectedPositionKey) {
      errs.position = 'Vui lòng chọn vị trí việc làm cần giới thiệu';
    }

    if (!candidateName.trim()) {
      errs.candidateName = 'Vui lòng nhập họ và tên ứng viên';
    } else if (candidateName.trim().length > 150) {
      errs.candidateName = 'Họ tên không được vượt quá 150 ký tự';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!candidateEmail.trim()) {
      errs.candidateEmail = 'Vui lòng nhập email của ứng viên';
    } else if (!emailRegex.test(candidateEmail.trim())) {
      errs.candidateEmail = 'Định dạng email không hợp lệ';
    }

    if (candidatePhone && candidatePhone.trim().length > 20) {
      errs.candidatePhone = 'Số điện thoại không hợp lệ (tối đa 20 ký tự)';
    }

    if (!referralNotes.trim()) {
      errs.referralNotes = 'Vui lòng nhập ghi chú giới thiệu (kinh nghiệm, lý do đề xuất tuyển dụng)';
    } else if (referralNotes.trim().length < 10) {
      errs.referralNotes = 'Ghi chú giới thiệu nên tối thiểu 10 ký tự';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    let jobPostingId: number | undefined;
    let requisitionId: number | undefined;

    if (selectedPositionKey.startsWith('jp_')) {
      jobPostingId = Number(selectedPositionKey.replace('jp_', ''));
      const pos = positions.find((p) => p.jobPostingId === jobPostingId);
      if (pos?.requisitionId) {
        requisitionId = pos.requisitionId;
      }
    } else if (selectedPositionKey.startsWith('req_')) {
      requisitionId = Number(selectedPositionKey.replace('req_', ''));
    }

    const payload: ReferralCreatePayload = {
      jobPostingId,
      requisitionId,
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim(),
      candidatePhone: candidatePhone.trim() || undefined,
      relationship: relationship.trim() || undefined,
      cvUrl: cvUrl.trim() || undefined,
      referralNotes: referralNotes.trim(),
    };

    setIsSubmitting(true);
    try {
      await referralApi.submit(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message ||
          'Không thể nộp hồ sơ giới thiệu. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ref-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ref-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ref-modal-header">
          <h2>
            <UserCheck size={22} style={{ color: 'var(--primary)' }} />
            <span>Giới thiệu ứng viên nội bộ</span>
          </h2>
          <button
            type="button"
            className="ref-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng biểu mẫu"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="ref-modal-body">
            {/* Automatic Referrer Identity Banner */}
            <div className="ref-info-banner">
              <CheckCircle size={18} className="ref-info-banner-icon" />
              <div>
                <strong>Hồ sơ sẽ tự động gắn nhãn nguồn:</strong> Giới thiệu nội bộ (<code>INTERNAL_REFERRAL</code>)
                <br />
                <strong>Người giới thiệu:</strong> {user?.fullName || 'Nhân viên nội bộ'} ({user?.email || ''})
                <br />
                <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                  Bạn có thể theo dõi tiến trình và trạng thái xử lý tổng quát tại mục &quot;Hồ sơ của tôi&quot;.
                </span>
              </div>
            </div>

            {serverError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={18} />
                <span>{serverError}</span>
              </div>
            )}

            {/* Position Select */}
            <div className="ref-form-group">
              <label htmlFor="ref-position-select">
                Vị trí tuyển dụng đang mở <span className="required">*</span>
              </label>
              <select
                id="ref-position-select"
                className={`ref-form-select ${errors.position ? 'error' : ''}`}
                value={selectedPositionKey}
                onChange={(e) => setSelectedPositionKey(e.target.value)}
                disabled={loadingPositions}
              >
                <option value="">-- Chọn vị trí tuyển dụng --</option>
                {positions.map((p) => {
                  const key = p.jobPostingId ? `jp_${p.jobPostingId}` : `req_${p.requisitionId}`;
                  const dept = p.departmentName ? ` [${p.departmentName}]` : '';
                  const code = p.jobCode ? ` (${p.jobCode})` : '';
                  return (
                    <option key={key} value={key}>
                      {p.title}
                      {code}
                      {dept}
                    </option>
                  );
                })}
              </select>
              {errors.position && <div className="ref-form-error-msg">{errors.position}</div>}
            </div>

            {/* Candidate Name & Email */}
            <div className="ref-form-row">
              <div className="ref-form-group">
                <label htmlFor="ref-cand-name">
                  Họ và tên ứng viên <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="ref-cand-name"
                    type="text"
                    className={`ref-form-input ${errors.candidateName ? 'error' : ''}`}
                    placeholder="VD: Nguyễn Văn An"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                  />
                </div>
                {errors.candidateName && (
                  <div className="ref-form-error-msg">{errors.candidateName}</div>
                )}
              </div>

              <div className="ref-form-group">
                <label htmlFor="ref-cand-email">
                  Email ứng viên <span className="required">*</span>
                </label>
                <input
                  id="ref-cand-email"
                  type="email"
                  className={`ref-form-input ${errors.candidateEmail ? 'error' : ''}`}
                  placeholder="VD: an.nguyen@example.com"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                />
                {errors.candidateEmail && (
                  <div className="ref-form-error-msg">{errors.candidateEmail}</div>
                )}
              </div>
            </div>

            {/* Candidate Phone & Relationship */}
            <div className="ref-form-row">
              <div className="ref-form-group">
                <label htmlFor="ref-cand-phone">Số điện thoại liên hệ</label>
                <input
                  id="ref-cand-phone"
                  type="tel"
                  className="ref-form-input"
                  placeholder="VD: 0912 345 678"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                />
              </div>

              <div className="ref-form-group">
                <label htmlFor="ref-relationship">Mối quan hệ với người giới thiệu</label>
                <select
                  id="ref-relationship"
                  className="ref-form-select"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                >
                  <option value="Đồng nghiệp cũ">Đồng nghiệp cũ</option>
                  <option value="Bạn học / Bạn bè">Bạn học / Bạn bè</option>
                  <option value="Người thân trong gia đình">Người thân trong gia đình</option>
                  <option value="Đối tác / Khách hàng quen biết">Đối tác / Khách hàng quen biết</option>
                  <option value="Người quen khác">Người quen khác</option>
                </select>
              </div>
            </div>

            {/* CV Link */}
            <div className="ref-form-group">
              <label htmlFor="ref-cv-url">Link CV / Hồ sơ đính kèm (Google Drive, LinkedIn, Portfolio...)</label>
              <input
                id="ref-cv-url"
                type="url"
                className="ref-form-input"
                placeholder="https://drive.google.com/file/d/.../view hoặc link CV trực tuyến"
                value={cvUrl}
                onChange={(e) => setCvUrl(e.target.value)}
              />
              <div className="ref-form-hint">
                Vui lòng đảm bảo link có quyền xem để bộ phận tuyển dụng tiếp cận hồ sơ nhanh chóng.
              </div>
            </div>

            {/* Referral Notes (Bắt buộc theo AC) */}
            <div className="ref-form-group">
              <label htmlFor="ref-notes">
                Ghi chú giới thiệu & Nhận xét ban đầu <span className="required">*</span>
              </label>
              <textarea
                id="ref-notes"
                className={`ref-form-textarea ${errors.referralNotes ? 'error' : ''}`}
                rows={4}
                placeholder="Nhận xét tóm tắt về năng lực chuyên môn, số năm kinh nghiệm, các dự án tiêu biểu, tính cách và lý do bạn tin rằng ứng viên này sẽ phù hợp với công ty..."
                value={referralNotes}
                onChange={(e) => setReferralNotes(e.target.value)}
              />
              {errors.referralNotes && (
                <div className="ref-form-error-msg">{errors.referralNotes}</div>
              )}
            </div>
          </div>

          <div className="ref-modal-footer">
            <button
              type="button"
              className="ref-btn ref-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="ref-btn ref-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang gửi hồ sơ...' : 'Nộp hồ sơ giới thiệu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReferralModal;
