import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Building,
  MapPin,
  Globe,
  DollarSign,
  Calendar,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { JobPostingPublic } from '../types/jobPosting';
import jobPostingApi from '../api/jobPosting';
import '../styles/job-postings.css';

export const PublicCareerPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobPostingPublic[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters (S4-01 / SCRUM-154 & SCRUM-164)
  const [keyword, setKeyword] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('ALL');
  const [workLocation, setWorkLocation] = useState<string>('ALL');
  const [workingModel, setWorkingModel] = useState<string>('ALL');
  const [totalElements, setTotalElements] = useState(0);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const deptId = departmentId !== 'ALL' ? Number(departmentId) : undefined;
      const loc = workLocation !== 'ALL' ? workLocation : undefined;
      const res = await jobPostingApi.listPublic({
        departmentId: deptId,
        workLocation: loc,
        workingModel: workingModel !== 'ALL' ? workingModel : undefined,
        keyword: keyword.trim() || undefined,
        page: 0,
        size: 30,
      });
      setJobs(res.content || []);
      setTotalElements(res.totalElements || 0);
    } catch {
      setError('Không thể tải danh sách việc làm. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  }, [keyword, departmentId, workLocation, workingModel]);

  useEffect(() => {
    jobPostingApi.getPublicDepartments().then((data) => {
      if (Array.isArray(data)) setDepartments(data);
    }).catch(() => {});

    if (typeof jobPostingApi.getPublicLocations === 'function') {
      jobPostingApi.getPublicLocations().then((data) => {
        if (Array.isArray(data)) setLocations(data);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleClearFilters = () => {
    setKeyword('');
    setDepartmentId('ALL');
    setWorkLocation('ALL');
    setWorkingModel('ALL');
  };

  const hasActiveFilters = Boolean(
    keyword.trim() || departmentId !== 'ALL' || workLocation !== 'ALL' || workingModel !== 'ALL'
  );

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

      {/* Hero Banner */}
      <section className="jp-public-banner">
        <div className="jp-banner-content">
          <span className="jp-banner-badge">
            <Sparkles size={14} />
            Cơ hội nghề nghiệp rộng mở
          </span>
          <h1 className="jp-banner-title">Khám phá vị trí phù hợp với bạn</h1>
          <p className="jp-banner-sub">
            Gia nhập đội ngũ nhân sự tài năng, môi trường làm việc năng động và chế độ đãi ngộ vượt trội.
          </p>

          {/* Search bar inside hero - 3 filters according to S4-01 AC */}
          <div className="jp-banner-search-box">
            <div className="jp-search-field jp-flex-2">
              <Search size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm công việc theo chức danh, từ khóa..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                aria-label="Tìm kiếm theo từ khóa"
              />
            </div>

            <div className="jp-search-field jp-flex-1">
              <Building size={18} />
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                aria-label="Lọc theo phòng ban"
              >
                <option value="ALL">Tất cả phòng ban</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="jp-search-field jp-flex-1">
              <MapPin size={18} />
              <select
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                aria-label="Lọc theo địa điểm"
              >
                <option value="ALL">Tất cả địa điểm</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="jp-search-field jp-flex-1">
              <Globe size={18} />
              <select
                value={workingModel}
                onChange={(e) => setWorkingModel(e.target.value)}
                aria-label="Lọc theo hình thức làm việc"
              >
                <option value="ALL">Mọi hình thức</option>
                <option value="ONSITE">Tại văn phòng</option>
                <option value="HYBRID">Linh hoạt (Hybrid)</option>
                <option value="REMOTE">Làm việc từ xa</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Job list container */}
      <main className="jp-public-main-content">
        <div className="jp-public-header-row">
          <h2>Các vị trí đang mở tuyển ({totalElements})</h2>
          <span className="jp-text-muted">Chỉ hiển thị các tin tuyển dụng đã phê duyệt và còn hạn nhận hồ sơ</span>
        </div>

        {loading ? (
          <div className="jp-loading-container" role="status">
            <div className="jp-spinner" />
            <p>Đang tìm kiếm cơ hội nghề nghiệp...</p>
          </div>
        ) : error ? (
          <div className="jp-empty-state jp-public-empty jp-public-error-card" role="alert">
            <AlertCircle size={48} className="jp-error-icon" />
            <h3>Đã xảy ra lỗi khi tải danh sách việc làm</h3>
            <p>{error}</p>
            <button
              type="button"
              className="jp-btn jp-btn-primary jp-retry-btn"
              onClick={() => loadJobs()}
            >
              <RefreshCw size={16} />
              <span>Thử lại</span>
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="jp-empty-state jp-public-empty">
            <Briefcase size={48} />
            <h3>Hiện chưa có vị trí phù hợp với tìm kiếm của bạn</h3>
            <p>Hãy thử thay đổi từ khóa hoặc bộ lọc phòng ban, địa điểm, hình thức làm việc để xem thêm các cơ hội khác.</p>
            {hasActiveFilters && (
              <button
                type="button"
                className="jp-btn jp-btn-outline jp-clear-filters-btn"
                onClick={handleClearFilters}
              >
                Xóa bộ lọc tìm kiếm
              </button>
            )}
          </div>
        ) : (
          <div className="jp-public-job-grid">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="jp-public-job-card"
                onClick={() => navigate(`/careers/${job.id}`)}
              >
                <div className="jp-job-card-top">
                  <span className="jp-job-card-dept">{job.departmentName || 'Doanh nghiệp'}</span>
                  <span className="jp-job-card-model">{job.workingModel}</span>
                </div>

                <h3 className="jp-job-card-title">{job.title}</h3>

                <div className="jp-job-card-meta">
                  {job.workLocation && (
                    <span className="jp-job-meta-item">
                      <MapPin size={14} />
                      {job.workLocation}
                    </span>
                  )}
                  <span className="jp-job-meta-item jp-job-salary-tag">
                    <DollarSign size={14} />
                    {job.salaryDisplay}
                  </span>
                  {job.applicationDeadline && (
                    <span className="jp-job-meta-item">
                      <Calendar size={14} />
                      Hạn nộp: {job.applicationDeadline}
                    </span>
                  )}
                </div>

                <div className="jp-job-card-footer">
                  <span className="jp-job-card-link">
                    <span>Xem chi tiết công việc</span>
                    <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicCareerPage;
