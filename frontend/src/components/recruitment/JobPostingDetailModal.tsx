import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  CheckCircle,
  XCircle,
  Globe,
  Clock,
  Building,
  MapPin,
  DollarSign,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
  Send,
  Lock,
} from 'lucide-react';
import { JobPosting } from '../../types/jobPosting';
import jobPostingApi from '../../api/jobPosting';
import { useAuth } from '../../hooks/useAuth';

interface JobPostingDetailModalProps {
  isOpen: boolean;
  initialAction?: 'unpublish';
  jobPostingId: number | null;
  onClose: () => void;
  onActionSuccess: () => void;
}

export const JobPostingDetailModal: React.FC<JobPostingDetailModalProps> = ({
  isOpen,
  initialAction,
  jobPostingId,
  onClose,
  onActionSuccess,
}) => {
  const { hasRole, hasPermission } = useAuth();
  const canUnpublish = hasRole('HR_MANAGER') || hasRole('ADMIN') || hasRole('RECRUITER') || Boolean(hasPermission?.('JOB_MANAGE'));
  const isHrManager = hasRole('HR_MANAGER');

  const [activeTab, setActiveTab] = useState<'preview' | 'details' | 'audit'>('preview');
  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal confirm states
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showUnpublishInput, setShowUnpublishInput] = useState(false);
  const [unpublishReason, setUnpublishReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  useEffect(() => {
    if (isOpen && jobPostingId) {
      loadPostingDetail(jobPostingId);
      setActiveTab('preview');
      setError(null);
      setSuccessMessage(null);
      setShowRejectInput(false);
      setShowUnpublishInput(initialAction === 'unpublish');
      setRejectReason('');
      setUnpublishReason('');
      setApprovalNotes('');
    } else {
      setPosting(null);
    }
  }, [isOpen, jobPostingId, initialAction]);

  const loadPostingDetail = async (id: number) => {
    setLoading(true);
    try {
      const data = await jobPostingApi.getDetail(id);
      setPosting(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải chi tiết tin tuyển dụng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionLoading) { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(document.querySelectorAll<HTMLElement>(
        '.jp-detail-modal button:not(:disabled), .jp-detail-modal textarea:not(:disabled), .jp-detail-modal input:not(:disabled), .jp-detail-modal select:not(:disabled), .jp-detail-modal a[href]'
      )).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keyboard);
      previousFocus?.focus();
    };
  }, [isOpen, actionLoading, onClose]);

  if (!isOpen) return null;

  const formatCurrency = (amount?: number, currency = 'VND') => {
    if (amount === undefined || amount === null) return '0';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ' + currency;
  };

  const getSalaryDisplay = () => {
    if (!posting) return 'Thỏa thuận';
    if (!posting.salaryVisible) return 'Thỏa thuận';
    if (posting.salaryMin && posting.salaryMax) {
      return `${formatCurrency(posting.salaryMin, posting.currency)} - ${formatCurrency(posting.salaryMax, posting.currency)}`;
    }
    if (posting.salaryMin) {
      return `Từ ${formatCurrency(posting.salaryMin, posting.currency)}`;
    }
    if (posting.salaryMax) {
      return `Lên đến ${formatCurrency(posting.salaryMax, posting.currency)}`;
    }
    return 'Thỏa thuận';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="jp-badge jp-badge-draft">Bản nháp</span>;
      case 'PENDING_APPROVAL':
        return <span className="jp-badge jp-badge-pending">Chờ HR duyệt</span>;
      case 'APPROVED':
        return <span className="jp-badge jp-badge-approved">Đã duyệt</span>;
      case 'PUBLISHED':
        return <span className="jp-badge jp-badge-published">Đang xuất bản</span>;
      case 'UNPUBLISHED':
        return <span className="jp-badge jp-badge-unpublished">Đã gỡ tin</span>;
      case 'REJECTED':
        return <span className="jp-badge jp-badge-rejected">Từ chối duyệt</span>;
      case 'EXPIRED':
        return <span className="jp-badge jp-status-expired">Đã hết hạn nhận hồ sơ</span>;
      case 'CLOSED':
        return <span className="jp-badge jp-badge-closed">Đã đóng</span>;
      default:
        return <span className="jp-badge">{status}</span>;
    }
  };

  // =========================================================================
  // ACTIONS
  // =========================================================================

  const handleApprove = async () => {
    if (!posting) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await jobPostingApi.approve(posting.id, approvalNotes || undefined);
      setPosting(updated);
      setSuccessMessage('Phê duyệt tin tuyển dụng thành công! Tin đã đủ điều kiện để xuất bản.');
      onActionSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt tin tuyển dụng.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!posting) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await jobPostingApi.publish(posting.id, approvalNotes || undefined);
      setPosting(updated);
      setSuccessMessage('Xuất bản tin tuyển dụng thành công! Tin hiện đã công khai trên cổng việc làm.');
      onActionSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi xuất bản tin.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAndPublish = async () => {
    if (!posting) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await jobPostingApi.approveAndPublish(posting.id, approvalNotes || undefined);
      setPosting(updated);
      setSuccessMessage('Duyệt và xuất bản tin tuyển dụng thành công! Tin hiện đã công khai.');
      onActionSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi duyệt và xuất bản.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!posting) return;
    if (!rejectReason.trim()) {
      setError('Vui lòng nhập lý do từ chối phê duyệt.');
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await jobPostingApi.reject(posting.id, rejectReason.trim());
      setPosting(updated);
      setShowRejectInput(false);
      setSuccessMessage('Đã từ chối duyệt tin tuyển dụng. Lý do đã được lưu lại để chỉnh sửa.');
      onActionSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi từ chối tin tuyển dụng.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!posting) return;
    if (!unpublishReason.trim()) {
      setError('Vui lòng nhập lý do gỡ tin tuyển dụng.');
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await jobPostingApi.unpublish(posting.id, unpublishReason.trim());
      setPosting(updated);
      setShowUnpublishInput(false);
      setSuccessMessage('Đã gỡ tin tuyển dụng khỏi cổng công khai thành công.');
      onActionSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi gỡ tin tuyển dụng.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitApproval = async () => {
    if (!posting) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await jobPostingApi.submitApproval(posting.id);
      setPosting(updated);
      setSuccessMessage('Đã gửi tin tuyển dụng tới Trưởng phòng Nhân sự để phê duyệt.');
      onActionSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi gửi phê duyệt.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="jp-modal-overlay" role="dialog" aria-modal="true" aria-label="Chi tiết tin tuyển dụng">
      <div className="jp-modal-container jp-detail-modal">
        {/* Modal Header */}
        <div className="jp-modal-header">
          <div className="jp-modal-header-info">
            <div className="jp-modal-code-tag">
              <span>{posting?.jobCode || 'TIN TUYỂN DỤNG'}</span>
              {posting && getStatusBadge(posting.status)}
            </div>
            <h2 className="jp-modal-title">{posting?.title || 'Chi tiết tin tuyển dụng'}</h2>
          </div>
          <button
            type="button"
            className="jp-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="jp-modal-tabs">
          <button
            type="button"
            className={`jp-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={16} />
            <span>Xem trước công khai (Public Preview)</span>
          </button>
          <button
            type="button"
            className={`jp-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <FileText size={16} />
            <span>Nội dung & Thông số nội bộ</span>
          </button>
          <button
            type="button"
            className={`jp-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <Clock size={16} />
            <span>Nhật ký duyệt & xuất bản ({posting?.auditLogs?.length || 0})</span>
          </button>
        </div>

        {/* Notifications / Alerts */}
        {error && (
          <div className="jp-alert jp-alert-danger" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="jp-alert jp-alert-success" role="alert">
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="jp-modal-body">
          {loading ? (
            <div className="jp-loading-container">
              <div className="jp-spinner" />
              <p>Đang tải chi tiết tin tuyển dụng...</p>
            </div>
          ) : !posting ? (
            <div className="jp-empty-state">
              <AlertCircle size={32} />
              <p>Không tìm thấy thông tin tin tuyển dụng.</p>
            </div>
          ) : (
            <>
              {/* TAB 1: BẢN XEM TRƯỚC CÔNG KHAI (SCRUM-151) */}
              {activeTab === 'preview' && (
                <div className="jp-preview-wrapper">
                  <div className="jp-preview-notice">
                    <Globe size={16} />
                    <span>
                      <strong>Bản xem trước giao diện công khai:</strong> Nội dung dưới đây mô phỏng chính xác giao diện hiển thị trên Cổng tuyển dụng công ty dành cho ứng viên.
                    </span>
                  </div>

                  <article className="jp-public-preview-card">
                    {/* Header Banner */}
                    <div className="jp-public-hero">
                      <div className="jp-public-company-tag">HỆ THỐNG TUYỂN DỤNG DOANH NGHIỆP</div>
                      <h1 className="jp-public-title">{posting.title}</h1>
                      <div className="jp-public-quick-meta">
                        {posting.departmentName && (
                          <span className="jp-public-meta-pill">
                            <Building size={14} />
                            {posting.departmentName}
                          </span>
                        )}
                        {posting.workLocation && (
                          <span className="jp-public-meta-pill">
                            <MapPin size={14} />
                            {posting.workLocation}
                          </span>
                        )}
                        <span className="jp-public-meta-pill">
                          <Globe size={14} />
                          Hình thức: {posting.workingModel}
                        </span>
                        <span className="jp-public-meta-pill jp-public-salary-pill">
                          <DollarSign size={14} />
                          Mức lương: {getSalaryDisplay()}
                        </span>
                      </div>
                    </div>

                    {/* Quick highlights bar */}
                    <div className="jp-public-summary-bar">
                      <div className="jp-summary-item">
                        <span className="jp-summary-label">Số lượng tuyển</span>
                        <span className="jp-summary-val">{posting.quantity} người</span>
                      </div>
                      <div className="jp-summary-item">
                        <span className="jp-summary-label">Hạn nhận hồ sơ</span>
                        <span className="jp-summary-val">
                          {posting.applicationDeadline || 'Đến khi tuyển đủ'}
                        </span>
                      </div>
                      <div className="jp-summary-item">
                        <span className="jp-summary-label">Trạng thái công khai</span>
                        <span className="jp-summary-val">
                          {posting.status === 'PUBLISHED' ? (
                            <span style={{ color: 'var(--success)' }}>● Đang hiển thị trực tiếp</span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>○ Bản xem trước (Chưa công khai)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Public Content Sections */}
                    <div className="jp-public-content">
                      <section className="jp-content-section">
                        <h3 className="jp-section-heading">Mô tả công việc</h3>
                        <div className="jp-rich-text">
                          {posting.jobDescription ? (
                            <p style={{ whiteSpace: 'pre-line' }}>{posting.jobDescription}</p>
                          ) : (
                            <p className="jp-text-muted">Chưa có mô tả công việc.</p>
                          )}
                        </div>
                      </section>

                      <section className="jp-content-section">
                        <h3 className="jp-section-heading">Yêu cầu ứng viên</h3>
                        <div className="jp-rich-text">
                          {posting.requirements ? (
                            <p style={{ whiteSpace: 'pre-line' }}>{posting.requirements}</p>
                          ) : (
                            <p className="jp-text-muted">Chưa có yêu cầu chi tiết.</p>
                          )}
                        </div>
                      </section>

                      <section className="jp-content-section">
                        <h3 className="jp-section-heading">Quyền lợi & Chế độ đãi ngộ</h3>
                        <div className="jp-rich-text">
                          {posting.benefits ? (
                            <p style={{ whiteSpace: 'pre-line' }}>{posting.benefits}</p>
                          ) : (
                            <p className="jp-text-muted">Chưa có thông tin quyền lợi.</p>
                          )}
                        </div>
                      </section>
                    </div>

                    {/* Fake Apply Button in Preview */}
                    <div className="jp-preview-apply-box">
                      <button type="button" className="jp-btn-public-apply" disabled>
                        <span>Ứng tuyển ngay (Xem trước mẫu)</span>
                      </button>
                      <span className="jp-preview-apply-hint">
                        * Nút ứng tuyển sẽ hoạt động trên trang tuyển dụng công khai khi tin được xuất bản.
                      </span>
                    </div>
                  </article>
                </div>
              )}

              {/* TAB 2: NỘI DUNG & THÔNG SỐ NỘI BỘ */}
              {activeTab === 'details' && (
                <div className="jp-internal-details">
                  <div className="jp-grid-two-col">
                    <div className="jp-card-box">
                      <h4 className="jp-card-title">Thông tin chức danh & Đơn vị</h4>
                      <dl className="jp-detail-dl">
                        <div>
                          <dt>Mã tin tuyển dụng</dt>
                          <dd><strong>{posting.jobCode}</strong></dd>
                        </div>
                        <div>
                          <dt>Phòng ban</dt>
                          <dd>{posting.departmentName || 'Chưa chọn'}</dd>
                        </div>
                        <div>
                          <dt>Chức danh chuẩn</dt>
                          <dd>{posting.jobTitleName || 'Chưa chọn'}</dd>
                        </div>
                        <div>
                          <dt>Yêu cầu tuyển dụng liên kết</dt>
                          <dd>{posting.requisitionCode || 'Tạo trực tiếp'}</dd>
                        </div>
                        <div>
                          <dt>Địa điểm làm việc</dt>
                          <dd>{posting.workLocation || 'Tại văn phòng'}</dd>
                        </div>
                        <div>
                          <dt>Hình thức làm việc</dt>
                          <dd>{posting.workingModel}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="jp-card-box">
                      <h4 className="jp-card-title">Chính sách lương & Hạn nhận hồ sơ</h4>
                      <dl className="jp-detail-dl">
                        <div>
                          <dt>Hiển thị mức lương</dt>
                          <dd>{posting.salaryVisible ? 'Công khai mức lương' : 'Bảo mật (Hiển thị Thỏa thuận)'}</dd>
                        </div>
                        <div>
                          <dt>Dải lương nội bộ</dt>
                          <dd>
                            {posting.salaryMin && posting.salaryMax
                              ? `${formatCurrency(posting.salaryMin)} - ${formatCurrency(posting.salaryMax)}`
                              : 'Chưa đặt'}
                          </dd>
                        </div>
                        <div>
                          <dt>Số lượng tuyển dụng</dt>
                          <dd>{posting.quantity} người</dd>
                        </div>
                        <div>
                          <dt>Hạn nộp hồ sơ</dt>
                          <dd>{posting.applicationDeadline || 'Không giới hạn'}</dd>
                        </div>
                        <div>
                          <dt>Người soạn tin</dt>
                          <dd>{posting.createdByUserName || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt>Ngày tạo</dt>
                          <dd>{new Date(posting.createdAt).toLocaleString('vi-VN')}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Thông tin phê duyệt & xuất bản */}
                  <div className="jp-card-box" style={{ marginTop: '16px' }}>
                    <h4 className="jp-card-title">Truy vết Phê duyệt & Xuất bản (S3-10)</h4>
                    <div className="jp-audit-summary-grid">
                      <div className="jp-audit-box">
                        <span className="jp-audit-title">Người duyệt (HR Manager)</span>
                        <span className="jp-audit-val">{posting.approvedByUserName || 'Chưa phê duyệt'}</span>
                        <span className="jp-audit-sub">
                          {posting.approvedAt ? new Date(posting.approvedAt).toLocaleString('vi-VN') : '—'}
                        </span>
                        {posting.approvalNotes && (
                          <p className="jp-audit-note">Ghi chú: {posting.approvalNotes}</p>
                        )}
                      </div>

                      <div className="jp-audit-box">
                        <span className="jp-audit-title">Người xuất bản</span>
                        <span className="jp-audit-val">{posting.publishedByUserName || 'Chưa xuất bản'}</span>
                        <span className="jp-audit-sub">
                          {posting.publishedAt ? new Date(posting.publishedAt).toLocaleString('vi-VN') : '—'}
                        </span>
                      </div>

                      <div className="jp-audit-box">
                        <span className="jp-audit-title">Trạng thái gỡ tin</span>
                        <span className="jp-audit-val">{posting.unpublishedByUserName ? posting.unpublishedByUserName : 'Đang hoạt động'}</span>
                        <span className="jp-audit-sub">
                          {posting.unpublishedAt ? new Date(posting.unpublishedAt).toLocaleString('vi-VN') : '—'}
                        </span>
                        {posting.unpublishReason && (
                          <p className="jp-audit-note" style={{ color: 'var(--danger)' }}>
                            Lý do gỡ: {posting.unpublishReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: NHẬT KÝ KIỂM TOÁN (SCRUM-150) */}
              {activeTab === 'audit' && (
                <div className="jp-audit-timeline-container">
                  {(!posting.auditLogs || posting.auditLogs.length === 0) ? (
                    <div className="jp-empty-state">
                      <Clock size={32} />
                      <p>Chưa có ghi nhận nhật ký nào.</p>
                    </div>
                  ) : (
                    <div className="jp-timeline">
                      {posting.auditLogs.map((log) => (
                        <div key={log.id} className="jp-timeline-item">
                          <div className="jp-timeline-badge">
                            {log.action === 'APPROVE' && <CheckCircle size={14} />}
                            {log.action === 'PUBLISH' && <Globe size={14} />}
                            {log.action === 'APPROVE_AND_PUBLISH' && <ShieldCheck size={14} />}
                            {log.action === 'UNPUBLISH' && <XCircle size={14} />}
                            {log.action === 'REJECT' && <AlertCircle size={14} />}
                            {log.action === 'SUBMIT_APPROVAL' && <Send size={14} />}
                            {log.action === 'CREATE' && <FileText size={14} />}
                          </div>
                          <div className="jp-timeline-content">
                            <div className="jp-timeline-header">
                              <span className="jp-timeline-action">
                                {log.action === 'APPROVE' && 'Phê duyệt tin'}
                                {log.action === 'PUBLISH' && 'Xuất bản tin'}
                                {log.action === 'APPROVE_AND_PUBLISH' && 'Duyệt & Xuất bản tin'}
                                {log.action === 'UNPUBLISH' && 'Gỡ tin khỏi công khai'}
                                {log.action === 'REJECT' && 'Từ chối phê duyệt'}
                                {log.action === 'SUBMIT_APPROVAL' && 'Nộp chờ duyệt'}
                                {log.action === 'CREATE' && 'Tạo tin mới'}
                                {log.action === 'UPDATE' && 'Cập nhật tin'}
                              </span>
                              <span className="jp-timeline-time">
                                {new Date(log.createdAt).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <div className="jp-timeline-meta">
                              <User size={13} />
                              <span>{log.userName} ({log.userEmail})</span>
                              {log.toStatus && (
                                <span className="jp-timeline-status-tag">
                                  Trạng thái: {log.toStatus}
                                </span>
                              )}
                            </div>
                            {log.note && (
                              <div className="jp-timeline-note">
                                <em>"{log.note}"</em>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* INPUT PROMPTS CHO TỪ CHỐI HOẶC GỠ TIN */}
        {showRejectInput && (
          <div className="jp-action-prompt-box jp-prompt-reject">
            <div className="jp-prompt-header">
              <AlertCircle size={16} />
              <span>Nhập lý do từ chối duyệt tin tuyển dụng:</span>
            </div>
            <textarea
              className="jp-textarea"
              rows={3}
              placeholder="Ví dụ: Cần điều chỉnh lại yêu cầu bằng cấp và bổ sung quyền lợi bảo hiểm..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="jp-prompt-actions">
              <button
                type="button"
                className="jp-btn jp-btn-secondary"
                onClick={() => setShowRejectInput(false)}
                disabled={actionLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="jp-btn jp-btn-danger"
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận Từ chối'}
              </button>
            </div>
          </div>
        )}

        {showUnpublishInput && canUnpublish && posting && (posting.status === 'PUBLISHED' || posting.status === 'EXPIRED') && (
          <div className="jp-action-prompt-box jp-prompt-unpublish">
            <div className="jp-prompt-header">
              <Lock size={16} />
              <span>Nhập lý do gỡ tin tuyển dụng khỏi cổng công khai:</span>
            </div>
            <p>Tin sẽ được gỡ khỏi cổng công khai ngay sau khi xác nhận. Hồ sơ ứng viên và lịch sử tin vẫn được giữ lại.</p>
            <label htmlFor="jp-unpublish-reason">Lý do gỡ tin (bắt buộc)</label>
            <textarea
              id="jp-unpublish-reason"
              autoFocus
              maxLength={2000}
              className="jp-textarea"
              rows={3}
              placeholder="Ví dụ: Đã tuyển đủ headcount theo kế hoạch hoặc tạm hoãn đợt tuyển dụng..."
              value={unpublishReason}
              onChange={(e) => setUnpublishReason(e.target.value)}
            />
            <div className="jp-prompt-actions">
              <button
                type="button"
                className="jp-btn jp-btn-secondary"
                onClick={() => setShowUnpublishInput(false)}
                disabled={actionLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="jp-btn jp-btn-warning"
                onClick={handleUnpublish}
                disabled={actionLoading || !unpublishReason.trim()}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận Gỡ tin'}
              </button>
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="jp-modal-footer">
          <button
            type="button"
            className="jp-btn jp-btn-secondary"
            onClick={onClose}
            disabled={actionLoading}
          >
            Đóng
          </button>

          {posting && (
            <div className="jp-footer-action-group">
              {/* Recruiter / Admin: Submit for approval when DRAFT or REJECTED */}
              {(posting.status === 'DRAFT' || posting.status === 'REJECTED') && (
                <button
                  type="button"
                  className="jp-btn jp-btn-primary"
                  onClick={handleSubmitApproval}
                  disabled={actionLoading}
                >
                  <Send size={16} />
                  <span>{actionLoading ? 'Đang gửi...' : 'Gửi phê duyệt'}</span>
                </button>
              )}

                  {/* Unpublish button (when PUBLISHED) */}
                  {canUnpublish && (posting.status === 'PUBLISHED' || posting.status === 'EXPIRED') && !showUnpublishInput && (
                    <button
                      type="button"
                      className="jp-btn jp-btn-warning"
                      onClick={() => setShowUnpublishInput(true)}
                      disabled={actionLoading}
                    >
                      <Lock size={16} />
                      <span>Gỡ tin khỏi công khai</span>
                    </button>
                  )}
              {/* HR MANAGER ACTIONS (SCRUM-149) */}
              {isHrManager && (
                <>
                  {/* Reject button */}
                  {(posting.status === 'PENDING_APPROVAL' || posting.status === 'DRAFT') && !showRejectInput && (
                    <button
                      type="button"
                      className="jp-btn jp-btn-danger-outline"
                      onClick={() => setShowRejectInput(true)}
                      disabled={actionLoading}
                    >
                      <XCircle size={16} />
                      <span>Từ chối duyệt</span>
                    </button>
                  )}

                  {/* Approve button */}
                  {(posting.status === 'PENDING_APPROVAL' || posting.status === 'DRAFT') && (
                    <button
                      type="button"
                      className="jp-btn jp-btn-success"
                      onClick={handleApprove}
                      disabled={actionLoading}
                    >
                      <CheckCircle size={16} />
                      <span>Phê duyệt</span>
                    </button>
                  )}

                  {/* Approve & Publish in one step */}
                  {posting.status === 'PENDING_APPROVAL' && (
                    <button
                      type="button"
                      className="jp-btn jp-btn-primary"
                      onClick={handleApproveAndPublish}
                      disabled={actionLoading}
                    >
                      <ShieldCheck size={16} />
                      <span>Duyệt & Xuất bản</span>
                    </button>
                  )}

                  {/* Publish button (only allowed when APPROVED) */}
                  {posting.status === 'APPROVED' && (
                    <button
                      type="button"
                      className="jp-btn jp-btn-primary"
                      onClick={handlePublish}
                      disabled={actionLoading}
                    >
                      <Globe size={16} />
                      <span>Xuất bản công khai</span>
                    </button>
                  )}

                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobPostingDetailModal;
