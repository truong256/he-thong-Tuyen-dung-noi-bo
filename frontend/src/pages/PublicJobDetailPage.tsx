import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  Send,
  Upload,
  RefreshCw,
  FileText,
  User,
  Mail,
  Phone,
  Link as LinkIcon,
} from 'lucide-react';
import { JobPostingPublic } from '../types/jobPosting';
import jobPostingApi from '../api/jobPosting';
import { useAuth } from '../hooks/useAuth';
import '../styles/job-postings.css';

export const PublicJobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState<JobPostingPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cvFileUrl, setCvFileUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);

  // Form submission states
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const applySectionRef = useRef<HTMLDivElement>(null);
  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadJobDetail(Number(id));
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      if (user.fullName) setFullName((prev) => prev || user.fullName || '');
      if (user.email) setEmail((prev) => prev || user.email || '');
    }
  }, [user]);

  const loadJobDetail = async (jobId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await jobPostingApi.getPublicDetail(jobId);
      setJob(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Tin tuyển dụng không tồn tại, chưa được công khai hoặc đã được gỡ xuống.'
      );
    } finally {
      setLoading(false);
    }
  };

  const scrollToApplyForm = () => {
    if (applySectionRef.current) {
      applySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        fullNameInputRef.current?.focus();
      }, 400);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedFileName(file.name);
      if (!cvFileUrl) {
        setCvFileUrl(`https://storage.local/cv/${encodeURIComponent(file.name)}`);
      }
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!job) return;

    if (job.expired) {
      setSubmitError('Tin tuyển dụng này đã hết hạn nhận hồ sơ, không thể gửi đơn ứng tuyển.');
      return;
    }

    if (!fullName.trim()) {
      setSubmitError('Vui lòng nhập họ và tên của bạn.');
      fullNameInputRef.current?.focus();
      return;
    }

    if (!email.trim()) {
      setSubmitError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setSubmitError('Địa chỉ email không đúng định dạng.');
      return;
    }

    if (!phone.trim()) {
      setSubmitError('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }

    setSubmitting(true);
    try {
      await jobPostingApi.applyPublic(job.id, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        coverLetter: coverLetter.trim(),
        cvFileUrl: cvFileUrl.trim() || (attachedFileName ? `https://storage.local/cv/${attachedFileName}` : undefined),
      });

      setApplied(true);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ||
          'Không thể gửi đơn ứng tuyển. Vui lòng kiểm tra lại thông tin hoặc thử lại sau.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isJobExpired = Boolean(job?.expired);

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
          aria-label="Quay lại danh sách việc làm"
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách việc làm</span>
        </button>

        {loading ? (
          <div className="jp-loading-container" style={{ minHeight: '340px' }} role="status">
            <div className="jp-spinner" />
            <p>Đang tải thông tin chi tiết tin tuyển dụng...</p>
          </div>
        ) : error || !job ? (
          <div className="jp-empty-state jp-public-error-card" role="alert">
            <AlertCircle size={48} className="jp-error-icon" style={{ color: 'var(--danger, #EF4444)' }} />
            <h3>Tin tuyển dụng không khả dụng</h3>
            <p>{error || 'Vị trí này không tồn tại, chưa được công khai hoặc đã được gỡ xuống bởi nhà tuyển dụng.'}</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                className="jp-btn jp-btn-primary"
                onClick={() => navigate('/careers')}
              >
                Xem các việc làm đang mở khác
              </button>
              {id && (
                <button
                  type="button"
                  className="jp-btn jp-btn-outline"
                  onClick={() => loadJobDetail(Number(id))}
                >
                  <RefreshCw size={15} style={{ marginRight: '6px' }} />
                  Thử lại
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="jp-public-detail-grid">
            {/* Left Content Column */}
            <article className="jp-public-detail-main">
              {/* Header Box */}
              <div className="jp-detail-header-card">
                <div className="jp-detail-header-top">
                  <span className="jp-detail-dept-badge">
                    {job.departmentName || 'Bộ phận tuyển dụng'}
                  </span>
                  {isJobExpired ? (
                    <span className="jp-status-pill jp-status-pill-expired" role="status">
                      <Clock size={13} />
                      <span>Đã hết hạn nhận hồ sơ</span>
                    </span>
                  ) : (
                    <span className="jp-status-pill jp-status-pill-open" role="status">
                      <CheckCircle size={13} />
                      <span>Đang tiếp nhận hồ sơ</span>
                    </span>
                  )}
                </div>

                <h1 className="jp-detail-title">{job.title}</h1>

                <div className="jp-detail-tags">
                  <span className="jp-detail-tag">
                    <Building size={14} />
                    {job.departmentName || 'Doanh nghiệp'}
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
                  <span className="jp-detail-tag">
                    <Briefcase size={14} />
                    Số lượng: {job.quantity} người
                  </span>
                </div>

                {/* Quick Info Bar on Mobile/Tablet */}
                <div className="jp-detail-quick-meta">
                  <div className="jp-quick-meta-item">
                    <Calendar size={16} />
                    <div>
                      <span className="jp-quick-meta-label">Hạn nhận hồ sơ:</span>
                      <strong className={`jp-quick-meta-value ${isJobExpired ? 'jp-text-expired' : ''}`}>
                        {job.applicationDeadline || 'Tuyển liên tục đến khi đủ'}
                      </strong>
                    </div>
                  </div>
                  <div className="jp-quick-meta-item">
                    <div className="jp-quick-salary-wrapper">
                      <span className="jp-quick-meta-label">Mức thu nhập:</span>
                      <strong className="jp-quick-meta-value jp-text-salary">{job.salaryDisplay}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Groups of Information according to AC */}
              <div className="jp-detail-content-card">
                {/* 1. Mô tả công việc */}
                <section className="jp-content-section" aria-labelledby="heading-job-desc">
                  <div className="jp-section-header">
                    <div className="jp-section-icon-badge">1</div>
                    <h2 id="heading-job-desc" className="jp-section-heading">Mô tả công việc</h2>
                  </div>
                  <div className="jp-rich-text">
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {job.jobDescription || 'Thông tin chi tiết về nhiệm vụ sẽ được trao đổi trực tiếp trong buổi phỏng vấn.'}
                    </p>
                  </div>
                </section>

                {/* 2. Yêu cầu công việc */}
                <section className="jp-content-section" aria-labelledby="heading-requirements">
                  <div className="jp-section-header">
                    <div className="jp-section-icon-badge">2</div>
                    <h2 id="heading-requirements" className="jp-section-heading">Yêu cầu công việc</h2>
                  </div>
                  <div className="jp-rich-text">
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {job.requirements || 'Trao đổi cụ thể dựa trên năng lực và kinh nghiệm thực tế của ứng viên.'}
                    </p>
                  </div>
                </section>

                {/* 3. Quyền lợi & Đãi ngộ */}
                <section className="jp-content-section" aria-labelledby="heading-benefits">
                  <div className="jp-section-header">
                    <div className="jp-section-icon-badge">3</div>
                    <h2 id="heading-benefits" className="jp-section-heading">Quyền lợi & Đãi ngộ</h2>
                  </div>
                  <div className="jp-rich-text">
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {job.benefits || 'Môi trường làm việc năng động, chuyên nghiệp cùng chế độ phúc lợi cạnh tranh.'}
                    </p>
                  </div>
                </section>

                {/* 4. Hạn nộp & Biểu mẫu ứng tuyển (hoặc Thông báo hết hạn theo AC) */}
                <section
                  className="jp-content-section jp-apply-container-section"
                  ref={applySectionRef}
                  id="apply-section"
                  aria-labelledby="heading-apply"
                >
                  <div className="jp-section-header">
                    <div className="jp-section-icon-badge">4</div>
                    <h2 id="heading-apply" className="jp-section-heading">Hạn nộp & Ứng tuyển</h2>
                  </div>

                  {isJobExpired ? (
                    /* S4-02 AC: Tin đã hết hạn hiển thị thông báo thay vì biểu mẫu ứng tuyển */
                    <div className="jp-expired-notice-card" role="alert">
                      <div className="jp-expired-icon-wrapper">
                        <Clock size={36} />
                      </div>
                      <div className="jp-expired-text-content">
                        <h3 className="jp-expired-heading">Tin tuyển dụng này đã hết hạn nhận hồ sơ</h3>
                        <p className="jp-expired-desc">
                          Thời hạn nhận hồ sơ cho vị trí <strong>{job.title}</strong> đã kết thúc vào ngày{' '}
                          <span className="jp-expired-date-highlight">{job.applicationDeadline}</span>.
                          Hệ thống hiện tại đã ngừng tiếp nhận thêm đơn ứng tuyển cho vị trí này.
                        </p>
                        <p className="jp-expired-subdesc">
                          Bạn có thể khám phá thêm các cơ hội nghề nghiệp hấp dẫn khác đang mở tại công ty chúng tôi.
                        </p>
                        <button
                          type="button"
                          className="jp-btn jp-btn-primary jp-btn-see-other-jobs"
                          onClick={() => navigate('/careers')}
                        >
                          Khám phá các việc làm đang mở khác
                        </button>
                      </div>
                    </div>
                  ) : applied ? (
                    /* Trạng thái đã nộp hồ sơ thành công */
                    <div className="jp-application-success-card" role="status">
                      <div className="jp-success-icon-wrapper">
                        <CheckCircle size={44} />
                      </div>
                      <h3>Nộp hồ sơ ứng tuyển thành công!</h3>
                      <p>
                        Cảm ơn bạn <strong>{fullName}</strong> đã quan tâm và ứng tuyển cho vị trí{' '}
                        <strong>{job.title}</strong> (Mã tin: <code>{job.jobCode}</code>).
                      </p>
                      <p className="jp-success-note">
                        Bộ phận Tuyển dụng đã nhận được thông tin và sẽ phản hồi tới email{' '}
                        <strong>{email}</strong> trong thời gian sớm nhất.
                      </p>
                      <div className="jp-success-actions">
                        <button
                          type="button"
                          className="jp-btn jp-btn-outline"
                          onClick={() => {
                            setApplied(false);
                            setAttachedFileName(null);
                          }}
                        >
                          Nộp thêm hồ sơ khác
                        </button>
                        <button
                          type="button"
                          className="jp-btn jp-btn-primary"
                          onClick={() => navigate('/careers')}
                        >
                          Xem các việc làm khác
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Biểu mẫu nộp hồ sơ ứng tuyển trực tuyến */
                    <div className="jp-apply-form-card">
                      <div className="jp-apply-form-intro">
                        <h3>Biểu mẫu nộp hồ sơ ứng tuyển trực tuyến</h3>
                        <p>
                          Hạn chót nhận hồ sơ:{' '}
                          <strong className="jp-deadline-highlight">
                            {job.applicationDeadline || 'Tuyển liên tục'}
                          </strong>
                          . Vui lòng điền thông tin chính xác để nhà tuyển dụng liên hệ với bạn.
                        </p>
                      </div>

                      {submitError && (
                        <div className="jp-form-error-alert" role="alert">
                          <AlertCircle size={18} />
                          <span>{submitError}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmitApplication} className="jp-application-form" noValidate>
                        <div className="jp-form-row">
                          <div className="jp-form-group">
                            <label htmlFor="applicant-fullname" className="jp-form-label">
                              Họ và tên <span className="jp-required">*</span>
                            </label>
                            <div className="jp-input-with-icon">
                              <User size={16} className="jp-field-icon" />
                              <input
                                id="applicant-fullname"
                                ref={fullNameInputRef}
                                type="text"
                                className="jp-form-input"
                                placeholder="Ví dụ: Nguyễn Văn An"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="jp-form-group">
                            <label htmlFor="applicant-email" className="jp-form-label">
                              Địa chỉ Email <span className="jp-required">*</span>
                            </label>
                            <div className="jp-input-with-icon">
                              <Mail size={16} className="jp-field-icon" />
                              <input
                                id="applicant-email"
                                type="email"
                                className="jp-form-input"
                                placeholder="Ví dụ: an.nguyen@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div className="jp-form-row">
                          <div className="jp-form-group">
                            <label htmlFor="applicant-phone" className="jp-form-label">
                              Số điện thoại liên hệ <span className="jp-required">*</span>
                            </label>
                            <div className="jp-input-with-icon">
                              <Phone size={16} className="jp-field-icon" />
                              <input
                                id="applicant-phone"
                                type="tel"
                                className="jp-form-input"
                                placeholder="Ví dụ: 0912 345 678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="jp-form-group">
                            <label htmlFor="applicant-cv-link" className="jp-form-label">
                              Đường dẫn CV online / Portfolio
                            </label>
                            <div className="jp-input-with-icon">
                              <LinkIcon size={16} className="jp-field-icon" />
                              <input
                                id="applicant-cv-link"
                                type="url"
                                className="jp-form-input"
                                placeholder="Link Google Drive, LinkedIn hoặc website của bạn..."
                                value={cvFileUrl}
                                onChange={(e) => setCvFileUrl(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="jp-form-group">
                          <label className="jp-form-label">
                            Đính kèm tệp CV (PDF / DOCX)
                          </label>
                          <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                          />
                          <div className="jp-file-upload-box" onClick={() => fileInputRef.current?.click()}>
                            <Upload size={20} className="jp-upload-icon" />
                            <div className="jp-upload-prompt">
                              {attachedFileName ? (
                                <span className="jp-file-chosen-text">
                                  <FileText size={16} />
                                  <strong>{attachedFileName}</strong> (Đã chọn tệp)
                                </span>
                              ) : (
                                <span>
                                  Nhấp để tải lên tệp CV từ thiết bị của bạn <span className="jp-upload-sub">(Tối đa 10MB)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="jp-form-group">
                          <label htmlFor="applicant-cover-letter" className="jp-form-label">
                            Thư giới thiệu / Lời nhắn tới nhà tuyển dụng
                          </label>
                          <textarea
                            id="applicant-cover-letter"
                            rows={4}
                            className="jp-form-textarea"
                            placeholder="Giới thiệu ngắn gọn về kinh nghiệm, kỹ năng thế mạnh hoặc lý do bạn mong muốn làm việc tại vị trí này..."
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                          />
                        </div>

                        <div className="jp-form-actions-row">
                          <button
                            type="submit"
                            className="jp-btn jp-btn-primary jp-submit-apply-btn"
                            disabled={submitting}
                          >
                            {submitting ? (
                              <>
                                <RefreshCw size={18} className="jp-spin-icon" />
                                <span>Đang gửi hồ sơ...</span>
                              </>
                            ) : (
                              <>
                                <Send size={18} />
                                <span>Nộp hồ sơ ứng tuyển</span>
                              </>
                            )}
                          </button>
                          <p className="jp-apply-privacy-hint">
                            Bằng việc gửi hồ sơ, bạn đồng ý để nhà tuyển dụng xử lý thông tin cá nhân phục vụ quy trình tuyển dụng nội bộ.
                          </p>
                        </div>
                      </form>
                    </div>
                  )}
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
                    <Calendar size={18} className="jp-sidebar-icon" />
                    <div>
                      <span>Hạn nhận hồ sơ</span>
                      <strong className={isJobExpired ? 'jp-text-expired' : ''}>
                        {job.applicationDeadline || 'Tuyển liên tục'}
                      </strong>
                    </div>
                  </div>

                  <div className="jp-sidebar-meta-row">
                    <Briefcase size={18} className="jp-sidebar-icon" />
                    <div>
                      <span>Số lượng tuyển</span>
                      <strong>{job.quantity} người</strong>
                    </div>
                  </div>

                  <div className="jp-sidebar-meta-row">
                    <Globe size={18} className="jp-sidebar-icon" />
                    <div>
                      <span>Mã tin tuyển dụng</span>
                      <strong>{job.jobCode}</strong>
                    </div>
                  </div>

                  <div className="jp-sidebar-meta-row">
                    <Building size={18} className="jp-sidebar-icon" />
                    <div>
                      <span>Hình thức làm việc</span>
                      <strong>{job.workingModel}</strong>
                    </div>
                  </div>

                  {job.workLocation && (
                    <div className="jp-sidebar-meta-row">
                      <MapPin size={18} className="jp-sidebar-icon" />
                      <div>
                        <span>Địa điểm</span>
                        <strong>{job.workLocation}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prominent Apply Button / Expired Notice in Sidebar */}
                {isJobExpired ? (
                  <div className="jp-sidebar-expired-indicator">
                    <Clock size={18} />
                    <span>Vị trí này đã dừng nhận hồ sơ</span>
                  </div>
                ) : applied ? (
                  <div className="jp-applied-success-box">
                    <CheckCircle size={22} style={{ color: 'var(--success, #16A34A)' }} />
                    <p>Hồ sơ ứng tuyển đã được ghi nhận!</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="jp-btn-sidebar-apply"
                    onClick={scrollToApplyForm}
                    id="sidebar-apply-button"
                  >
                    <span>Ứng tuyển ngay</span>
                    <Send size={16} />
                  </button>
                )}

                <p className="jp-sidebar-safe-hint">
                  Hồ sơ của bạn được bảo mật tuyệt đối và gửi trực tiếp đến Bộ phận Tuyển dụng nội bộ.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Floating/Sticky Mobile Action Bar (for 360px & small phones) */}
      {!loading && job && !isJobExpired && !applied && (
        <aside className="jp-mobile-bottom-bar" aria-label="Thanh thao tác nhanh trên điện thoại">
          <div className="jp-mobile-bar-info">
            <span className="jp-mobile-bar-label">Mức lương:</span>
            <strong className="jp-mobile-bar-val">{job.salaryDisplay}</strong>
          </div>
          <button
            type="button"
            className="jp-btn-mobile-apply"
            onClick={scrollToApplyForm}
            id="mobile-bottom-apply-btn"
          >
            <span>Ứng tuyển ngay</span>
            <Send size={15} />
          </button>
        </aside>
      )}
    </div>
  );
};

export default PublicJobDetailPage;
