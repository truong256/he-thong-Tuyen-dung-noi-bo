import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Save,
  HelpCircle,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { CandidateDetail } from '../../types/candidate';
import candidateApi from '../../api/candidate';

interface CvParsingConfirmModalProps {
  candidate: CandidateDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: CandidateDetail) => void;
}

export const CvParsingConfirmModal: React.FC<CvParsingConfirmModalProps> = ({
  candidate,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !candidate) return null;

  // Form states initialized with existing verified data
  const [fullName, setFullName] = useState<string>(candidate.fullName || '');
  const [email, setEmail] = useState<string>(candidate.email || '');
  const [phone, setPhone] = useState<string>(candidate.phone || '');
  const [stage, setStage] = useState<string>(candidate.stage || 'APPLIED');

  const [saving, setSaving] = useState<boolean>(false);
  const [reparsing, setReparsing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync state if candidate prop changes
  useEffect(() => {
    if (candidate) {
      setFullName(candidate.fullName || '');
      setEmail(candidate.email || '');
      setPhone(candidate.phone || '');
      setStage(candidate.stage || 'APPLIED');
      setErrorMsg(null);
      setSuccessToast(null);
    }
  }, [candidate]);

  const handleApplySingleField = (field: 'fullName' | 'email' | 'phone') => {
    if (field === 'fullName' && candidate.parsedFullName) {
      setFullName(candidate.parsedFullName);
    } else if (field === 'email' && candidate.parsedEmail) {
      setEmail(candidate.parsedEmail);
    } else if (field === 'phone' && candidate.parsedPhone) {
      setPhone(candidate.parsedPhone);
    }
  };

  const handleApplyAllSuggestions = () => {
    if (candidate.parsedFullName) setFullName(candidate.parsedFullName);
    if (candidate.parsedEmail) setEmail(candidate.parsedEmail);
    if (candidate.parsedPhone) setPhone(candidate.parsedPhone);
  };

  const handleConfirmAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Họ và tên ứng viên không được để trống.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email ứng viên không được để trống.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await candidateApi.confirmParsedInfo(candidate.id, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() ? phone.trim() : undefined,
        stage: stage,
      });
      setSuccessToast('Đã xác nhận và lưu thông tin ứng viên thành công!');
      setTimeout(() => {
        onSuccess(updated);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          'Không thể lưu thông tin xác nhận. Vui lòng thử lại.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReparseCv = async (newFile?: File) => {
    setReparsing(true);
    setErrorMsg(null);
    try {
      const reloaded = await candidateApi.reparseCv(candidate.id, newFile);
      setSuccessToast('Đã bóc tách lại CV thành công.');
      onSuccess(reloaded);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          'Lỗi khi bóc tách lại CV. Vui lòng kiểm tra tệp PDF.'
      );
    } finally {
      setReparsing(false);
    }
  };

  // Helper for status badge
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="badge-status badge-success">
            <CheckCircle size={12} /> Bóc tách thành công
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="badge-status badge-partial">
            <HelpCircle size={12} /> Bóc tách một phần
          </span>
        );
      case 'UNREADABLE_OR_EMPTY':
        return (
          <span className="badge-status badge-unreadable">
            <AlertTriangle size={12} /> Không có lớp văn bản
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge-status badge-failed">
            <AlertTriangle size={12} /> Lỗi bóc tách
          </span>
        );
      default:
        return <span className="badge-status badge-neutral">Chưa bóc tách</span>;
    }
  };

  const isFailedOrUnreadable =
    candidate.parsedStatus === 'FAILED' ||
    candidate.parsedStatus === 'UNREADABLE_OR_EMPTY';

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cv-confirm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cv-modal-header">
          <h2>
            <FileText size={20} className="text-blue-600" />
            Xác nhận thông tin ứng viên từ CV
          </h2>
          <button
            type="button"
            className="cv-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="cv-modal-body">
          {/* Notification when parsing failed or empty text layer (AC Requirement) */}
          {isFailedOrUnreadable && (
            <div className="cv-warning-banner" role="alert">
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Bóc tách tự động không khả dụng cho tệp này:</strong>
                <span>
                  {candidate.parsedMessage ||
                    'Tệp PDF không có lớp văn bản (dạng scan/ảnh) hoặc định dạng không nhận diện được. Không bắt buộc OCR; recruiter có thể nhập thông tin thủ công vào biểu mẫu bên phải.'}
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#78350f' }}>
                  * Lưu ý: Lỗi bóc tách không làm hỏng hồ sơ ứng tuyển, bạn có thể tiếp tục xử lý bình thường.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="cv-danger-banner" role="alert">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {successToast && (
            <div className="cv-warning-banner" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
              <CheckCircle size={18} style={{ flexShrink: 0 }} />
              <div>{successToast}</div>
            </div>
          )}

          {/* Side-by-side comparison grid */}
          <div className="cv-comparison-grid">
            {/* Left Column: Suggested values extracted from CV */}
            <div className="cv-comparison-card suggested-card">
              <div className="cv-card-header">
                <span className="cv-card-title">
                  <FileText size={16} /> Gợi ý bóc tách từ CV
                </span>
                {renderStatusBadge(candidate.parsedStatus)}
              </div>

              {/* Action bar for suggestions */}
              {candidate.parsedStatus === 'SUCCESS' || candidate.parsedStatus === 'PARTIAL' ? (
                <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Nhấn để tự động điền giá trị gợi ý:
                  </span>
                  <button
                    type="button"
                    className="btn-apply-val"
                    onClick={handleApplyAllSuggestions}
                  >
                    Áp dụng tất cả gợi ý <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </button>
                </div>
              ) : null}

              {/* Suggested Full Name */}
              <div className="suggestion-field-row">
                <div className="suggestion-field-label">Họ và tên gợi ý</div>
                <div className="suggestion-field-value">
                  <span>{candidate.parsedFullName || <em style={{ color: '#94a3b8' }}>Chưa nhận diện được</em>}</span>
                  {candidate.parsedFullName && (
                    <button
                      type="button"
                      className="btn-apply-val"
                      onClick={() => handleApplySingleField('fullName')}
                      title="Áp dụng họ tên này"
                    >
                      Áp dụng
                    </button>
                  )}
                </div>
              </div>

              {/* Suggested Email */}
              <div className="suggestion-field-row">
                <div className="suggestion-field-label">Email gợi ý</div>
                <div className="suggestion-field-value">
                  <span>{candidate.parsedEmail || <em style={{ color: '#94a3b8' }}>Chưa nhận diện được</em>}</span>
                  {candidate.parsedEmail && (
                    <button
                      type="button"
                      className="btn-apply-val"
                      onClick={() => handleApplySingleField('email')}
                      title="Áp dụng email này"
                    >
                      Áp dụng
                    </button>
                  )}
                </div>
              </div>

              {/* Suggested Phone */}
              <div className="suggestion-field-row">
                <div className="suggestion-field-label">Số điện thoại gợi ý</div>
                <div className="suggestion-field-value">
                  <span>{candidate.parsedPhone || <em style={{ color: '#94a3b8' }}>Chưa nhận diện được</em>}</span>
                  {candidate.parsedPhone && (
                    <button
                      type="button"
                      className="btn-apply-val"
                      onClick={() => handleApplySingleField('phone')}
                      title="Áp dụng số điện thoại này"
                    >
                      Áp dụng
                    </button>
                  )}
                </div>
              </div>

              {/* File details & Re-parse button */}
              <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    Tệp CV: <strong>{candidate.cvFileName || 'candidate_cv.pdf'}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {candidate.cvUrl && (
                      <a
                        href={candidate.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-reparse"
                        style={{ textDecoration: 'none' }}
                      >
                        <ExternalLink size={13} /> Xem CV
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-reparse"
                      disabled={reparsing}
                      onClick={() => handleReparseCv()}
                    >
                      <RefreshCw size={13} className={reparsing ? 'spin' : ''} />
                      {reparsing ? 'Đang đọc...' : 'Bóc tách lại'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Editable form for Recruiter confirmation */}
            <form className="cv-comparison-card" onSubmit={handleConfirmAndSave}>
              <div className="cv-card-header">
                <span className="cv-card-title">
                  <CheckCircle size={16} /> Thông tin hồ sơ (Cần xác nhận)
                </span>
                {candidate.isParsedConfirmed ? (
                  <span className="badge-status badge-confirmed">Đã xác nhận</span>
                ) : (
                  <span className="badge-status badge-partial">Chờ xác nhận</span>
                )}
              </div>

              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 0, marginBottom: '14px' }}>
                Recruiter có thể chỉnh sửa các trường trước khi lưu. Dữ liệu gốc sẽ chỉ cập nhật khi bấm <strong>Xác nhận & Lưu</strong>.
              </p>

              <div className="cv-form-group">
                <label htmlFor="confirmFullName">
                  Họ và tên ứng viên <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="confirmFullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  required
                />
              </div>

              <div className="cv-form-group">
                <label htmlFor="confirmEmail">
                  Email liên hệ <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="confirmEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email..."
                  required
                />
              </div>

              <div className="cv-form-group">
                <label htmlFor="confirmPhone">Số điện thoại</label>
                <input
                  id="confirmPhone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nhập số điện thoại..."
                />
              </div>

              <div className="cv-form-group">
                <label htmlFor="confirmStage">Giai đoạn ứng tuyển</label>
                <select
                  id="confirmStage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  <option value="APPLIED">Ứng tuyển (Applied)</option>
                  <option value="SCREENING">Sàng lọc hồ sơ (Screening)</option>
                  <option value="INTERVIEWING">Phỏng vấn (Interviewing)</option>
                  <option value="OFFERED">Đề nghị nhận việc (Offered)</option>
                  <option value="HIRED">Đã tuyển dụng (Hired)</option>
                  <option value="REJECTED">Từ chối (Rejected)</option>
                </select>
              </div>

              {candidate.confirmedAt && (
                <div style={{ marginTop: 'auto', paddingTop: '10px', fontSize: '0.75rem', color: '#64748b' }}>
                  Xác nhận lần gần nhất: {new Date(candidate.confirmedAt).toLocaleString('vi-VN')}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer (Cancel keeps data intact, Confirm saves) */}
        <div className="cv-modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Hủy thao tác (Giữ nguyên dữ liệu)
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirmAndSave}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Đang lưu...' : 'Xác nhận & Lưu thông tin'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CvParsingConfirmModal;
