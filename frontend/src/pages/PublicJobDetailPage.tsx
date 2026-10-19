import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  MapPin,
  Globe,
  Calendar,
  Briefcase,
  AlertCircle,
  CheckCircle,
  Upload,
  X,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { JobPostingPublic } from '../types/jobPosting';
import jobPostingApi from '../api/jobPosting';
import candidateApi from '../api/candidate';
import '../styles/job-postings.css';
import '../styles/candidate-management.css';

export const PublicJobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobPostingPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  // S4-04: Candidate application & CV upload states
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyFullName, setApplyFullName] = useState('');
  const [applyEmail, setApplyEmail] = useState('');
  const [applyPhone, setApplyPhone] = useState('');
  const [applyFile, setApplyFile] = useState<File | null>(null);
  const [isParsingCv, setIsParsingCv] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadJobDetail(Number(id));
    }
  }, [id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setApplyError('Chỉ chấp nhận tệp định dạng PDF.');
      return;
    }
    setApplyFile(file);
    setApplyError(null);
    setParseNotice(null);
    setIsParsingCv(true);

    try {
      const parsed = await candidateApi.parseCv(file);
      if (parsed.status === 'SUCCESS' || parsed.status === 'PARTIAL') {
        if (!applyFullName && parsed.fullName) setApplyFullName(parsed.fullName);
        if (!applyEmail && parsed.email) setApplyEmail(parsed.email);
        if (!applyPhone && parsed.phone) setApplyPhone(parsed.phone);
        setParseNotice('Hệ thống đã nhận diện thông tin cơ bản từ CV của bạn. Vui lòng kiểm tra lại trước khi gửi.');
      } else {
        setParseNotice('Tệp PDF không có lớp văn bản (dạng scan/ảnh) hoặc không thể bóc tách tự động. Bạn vẫn có thể điền thông tin bên dưới để nộp hồ sơ.');
      }
    } catch {
      setParseNotice('Không thể tự động bóc tách từ CV. Bạn có thể tự nhập thông tin để tiếp tục nộp hồ sơ.');
    } finally {
      setIsParsingCv(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyFullName.trim() || !applyEmail.trim()) {
      setApplyError('Vui lòng nhập họ và tên cùng email.');
      return;
    }

    setApplySubmitting(true);
    setApplyError(null);
    try {
      const formData = new FormData();
      formData.append('requisitionId', String(job?.requisitionId || job?.id || 1));
      formData.append('fullName', applyFullName.trim());
      formData.append('email', applyEmail.trim());
      if (applyPhone.trim()) formData.append('phone', applyPhone.trim());
      if (applyFile) formData.append('file', applyFile);

      await candidateApi.applyPublic(formData);
      setApplied(true);
      setIsApplyModalOpen(false);
    } catch (err: any) {
      setApplyError(err?.response?.data?.message || 'Có lỗi xảy ra khi nộp hồ sơ. Vui lòng thử lại.');
    } finally {
      setApplySubmitting(false);
    }
  };

  const loadJobDetail = async (jobId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await jobPostingApi.getPublicDetail(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Tin tuyển dụng không tồn tại, đã hết hạn hoặc đã được gỡ xuống.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jp-public-portal">
      {/* Public Top Navbar */}
      <header className="jp-public-navbar">
        <div className="jp-public-nav-container">
          <div className="jp-public-brand" onClick={() => navigate('/careers')}>
            <Briefcase size={22} className="jp-brand-icon" />
            <span className="jp-brand-text">CỔNG NGHỀ NGHIỆP & TUYỂN DỤNG</span>
          </div>
          <button
            type="button"
            className="jp-btn-portal-login"
            onClick={() => navigate('/login')}
          >
            Đăng nhập nội bộ
          </button>
        </div>
      </header>

      <main className="jp-public-detail-wrapper">
        <button
          type="button"
          className="jp-back-btn"
          onClick={() => navigate('/careers')}
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách việc làm</span>
        </button>

        {loading ? (
          <div className="jp-loading-container" style={{ minHeight: '300px' }}>
            <div className="jp-spinner" />
            <p>Đang tải thông tin chi tiết vị trí...</p>
          </div>
        ) : error || !job ? (
          <div className="jp-empty-state jp-public-error-card">
            <AlertCircle size={44} style={{ color: 'var(--danger)' }} />
            <h3>Tin tuyển dụng không khả dụng</h3>
            <p>{error || 'Vị trí này đã hết hạn nhận hồ sơ hoặc đã được gỡ xuống bởi nhà tuyển dụng.'}</p>
            <button
              type="button"
              className="jp-btn jp-btn-primary"
              onClick={() => navigate('/careers')}
              style={{ marginTop: '16px' }}
            >
              Xem các việc làm đang mở khác
            </button>
          </div>
        ) : (
          <div className="jp-public-detail-grid">
            {/* Left Content Column */}
            <article className="jp-public-detail-main">
              {/* Header Box */}
              <div className="jp-detail-header-card">
                <div className="jp-detail-dept-badge">{job.departmentName || 'Công ty TNHH Tuyển Dụng'}</div>
                <h1 className="jp-detail-title">{job.title}</h1>
                <div className="jp-detail-tags">
                  <span className="jp-detail-tag">
                    <Building size={14} />
                    {job.departmentName || 'Khối công nghệ'}
                  </span>
                  {job.workLocation && (
                    <span className="jp-detail-tag">
                      <MapPin size={14} />
                      {job.workLocation}
                    </span>
                  )}
                  <span className="jp-detail-tag">
                    <Globe size={14} />
                    Hình thức: {job.workingModel}
                  </span>
                </div>
              </div>

              {/* Job Content Sections */}
              <div className="jp-detail-content-card">
                <section className="jp-content-section">
                  <h2 className="jp-section-heading">Mô tả công việc</h2>
                  <div className="jp-rich-text">
                    <p style={{ whiteSpace: 'pre-line' }}>{job.jobDescription || 'Chi tiết trao đổi trong buổi phỏng vấn.'}</p>
                  </div>
                </section>

                <section className="jp-content-section">
                  <h2 className="jp-section-heading">Yêu cầu ứng viên</h2>
                  <div className="jp-rich-text">
                    <p style={{ whiteSpace: 'pre-line' }}>{job.requirements || 'Trao đổi cụ thể trong buổi phỏng vấn.'}</p>
                  </div>
                </section>

                <section className="jp-content-section">
                  <h2 className="jp-section-heading">Quyền lợi & Đãi ngộ</h2>
                  <div className="jp-rich-text">
                    <p style={{ whiteSpace: 'pre-line' }}>{job.benefits || 'Chế độ đãi ngộ cạnh tranh theo năng lực.'}</p>
                  </div>
                </section>
              </div>
            </article>

            {/* Right Sticky Sidebar */}
            <aside className="jp-public-detail-sidebar">
              <div className="jp-sidebar-apply-card">
                <div className="jp-sidebar-salary-box">
                  <span className="jp-sidebar-salary-label">Mức thu nhập</span>
                  <strong className="jp-sidebar-salary-val">{job.salaryDisplay}</strong>
                </div>

                <div className="jp-sidebar-meta-list">
                  <div className="jp-sidebar-meta-row">
                    <Calendar size={16} />
                    <div>
                      <span>Hạn nhận hồ sơ</span>
                      <strong>{job.applicationDeadline || 'Tuyển liên tục'}</strong>
                    </div>
                  </div>
                  <div className="jp-sidebar-meta-row">
                    <Briefcase size={16} />
                    <div>
                      <span>Số lượng tuyển</span>
                      <strong>{job.quantity} người</strong>
                    </div>
                  </div>
                  <div className="jp-sidebar-meta-row">
                    <Globe size={16} />
                    <div>
                      <span>Mã việc làm</span>
                      <strong>{job.jobCode}</strong>
                    </div>
                  </div>
                </div>

                {applied ? (
                  <div className="jp-applied-success-box">
                    <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                    <p>Hồ sơ ứng tuyển của bạn đã được tiếp nhận thành công!</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="jp-btn-sidebar-apply"
                    onClick={() => setIsApplyModalOpen(true)}
                  >
                    <span>Nộp hồ sơ ứng tuyển ngay</span>
                  </button>
                )}

                <p className="jp-sidebar-safe-hint">
                  Hồ sơ của bạn sẽ được bảo mật và chuyển trực tiếp tới Bộ phận Tuyển dụng nội bộ.
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* Public Apply Modal */}
        {isApplyModalOpen && (
          <div className="modal-overlay" onClick={() => setIsApplyModalOpen(false)}>
            <div
              className="cv-confirm-modal"
              style={{ maxWidth: '600px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cv-modal-header">
                <h2>
                  <FileText size={20} className="text-blue-600" />
                  Nộp hồ sơ ứng tuyển: {job?.title}
                </h2>
                <button
                  type="button"
                  className="cv-modal-close-btn"
                  onClick={() => setIsApplyModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleApplySubmit}>
                <div className="cv-modal-body">
                  {/* File upload input */}
                  <div className="cv-form-group">
                    <label>
                      Đính kèm CV (Định dạng PDF)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        disabled={isParsingCv || applySubmitting}
                      />
                    </div>
                    {isParsingCv && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#2563eb' }}>
                        Đang đọc thông tin từ CV...
                      </p>
                    )}
                  </div>

                  {parseNotice && (
                    <div className="cv-warning-banner">
                      <HelpCircle size={16} style={{ flexShrink: 0 }} />
                      <span>{parseNotice}</span>
                    </div>
                  )}

                  {applyError && (
                    <div className="cv-danger-banner">
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>{applyError}</span>
                    </div>
                  )}

                  <div className="cv-form-group">
                    <label>
                      Họ và tên của bạn <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={applyFullName}
                      onChange={(e) => setApplyFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="cv-form-group">
                    <label>
                      Email liên hệ <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="nguyen.vana@example.com"
                      value={applyEmail}
                      onChange={(e) => setApplyEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="cv-form-group">
                    <label>Số điện thoại</label>
                    <input
                      type="text"
                      placeholder="0912345678"
                      value={applyPhone}
                      onChange={(e) => setApplyPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="cv-modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsApplyModalOpen(false)}
                    disabled={applySubmitting}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={applySubmitting}
                  >
                    <Upload size={16} />
                    {applySubmitting ? 'Đang gửi...' : 'Gửi hồ sơ ứng tuyển'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicJobDetailPage;
