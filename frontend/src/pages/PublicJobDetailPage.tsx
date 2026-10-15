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
} from 'lucide-react';
import { JobPostingPublic } from '../types/jobPosting';
import jobPostingApi from '../api/jobPosting';
import '../styles/job-postings.css';

export const PublicJobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobPostingPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (id) {
      loadJobDetail(Number(id));
    }
  }, [id]);

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
                    <p>Hồ sơ ứng tuyển của bạn đã được tiếp nhận!</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="jp-btn-sidebar-apply"
                    onClick={() => setApplied(true)}
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
      </main>
    </div>
  );
};

export default PublicJobDetailPage;
