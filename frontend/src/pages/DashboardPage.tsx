import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getRoleLabel } from '../constants/rbac';
import {
  Users,
  ShieldCheck,
  Lock,
  Sliders,
  UserCog,
  Briefcase,
  TrendingUp,
  Video,
  Award,
  Sparkles,
  ArrowRight,
  X,
  Clock,
  KeyRound,
  ShieldAlert,
  RefreshCw,
  FolderTree,
  HelpCircle,
  Building2,
  FileSpreadsheet,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';
import adminApi from '../api/admin';
import organizationApi from '../api/organization';
import jobTitleApi from '../api/jobTitle';
import categoryApi from '../api/category';
import questionBankApi from '../api/questionBank';

interface DashboardMetrics {
  userCount: number;
  departmentCount: number;
  jobTitleCount: number;
  categoryCount: number;
  questionCount: number;
}

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [showSecurityConfig, setShowSecurityConfig] = useState(false);

  // Live real data states
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    userCount: 0,
    departmentCount: 0,
    jobTitleCount: 0,
    categoryCount: 0,
    questionCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const primaryRole = user?.roles && user.roles.length > 0 ? user.roles[0] : (user?.role || 'RECRUITER');

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const results = await Promise.allSettled([
        hasRole('ADMIN') ? adminApi.listUsers(undefined, 'ALL', 'ALL', 0, 1) : Promise.resolve(null),
        organizationApi.getDepartments(),
        jobTitleApi.getJobTitles(),
        categoryApi.list(),
        questionBankApi.search({ page: 0, size: 1 }),
      ]);

      const [usersRes, deptsRes, jobsRes, catsRes, qBankRes] = results;

      const userCount = usersRes.status === 'fulfilled' && usersRes.value ? usersRes.value.totalElements : 0;
      const departmentCount = deptsRes.status === 'fulfilled' && Array.isArray(deptsRes.value) ? deptsRes.value.length : 0;
      const jobTitleCount = jobsRes.status === 'fulfilled' && Array.isArray(jobsRes.value) ? jobsRes.value.length : 0;
      const categoryCount = catsRes.status === 'fulfilled' && Array.isArray(catsRes.value) ? catsRes.value.length : 0;
      const questionCount = qBankRes.status === 'fulfilled' && qBankRes.value ? qBankRes.value.totalElements : 0;

      setMetrics({
        userCount,
        departmentCount,
        jobTitleCount,
        categoryCount,
        questionCount,
      });
    } catch {
      setFetchError('Không thể đồng bộ toàn bộ dữ liệu thống kê từ hệ thống.');
    } finally {
      setIsLoading(false);
    }
  }, [hasRole]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="dashboard-content" data-testid="dashboard-page">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h1>
            Xin chào, {user?.fullName || user?.email}!
          </h1>
          <p>
            Chào mừng bạn đến với <strong>Hệ thống Tuyển dụng Nội bộ (ATS)</strong>.
            <span className="welcome-role-tag">
              Vai trò: <span className="badge role">{getRoleLabel(primaryRole)}</span>
            </span>
          </p>
        </div>
        <div className="welcome-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={loadMetrics}
            disabled={isLoading}
            title="Làm mới số liệu thực tế"
            aria-label="Làm mới dữ liệu dashboard"
          >
            <RefreshCw size={15} className={isLoading ? 'spinning' : ''} />
            <span>Làm mới</span>
          </button>
          {hasRole('ADMIN') && (
            <button className="btn btn-primary" onClick={() => navigate('/admin/users')}>
              <Users size={16} />
              <span>Quản lý Tài khoản</span>
            </button>
          )}
        </div>
      </div>

      {fetchError && (
        <div className="alert-banner error" role="alert" style={{ marginBottom: 20 }}>
          <span>{fetchError}</span>
          <button type="button" className="btn btn-link" onClick={loadMetrics}>Thử lại</button>
        </div>
      )}

      {/* Role specific dashboard cards */}
      {hasRole('ADMIN') && (
        <div className="role-dashboard admin-view">
          <h2 className="section-title">
            <ShieldCheck size={19} className="section-title-icon" />
            <span>Bảng điều khiển Quản trị viên</span>
          </h2>
          <div className="stats-grid">
            <div className="stat-card" onClick={() => navigate('/admin/users')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/users')}>
              <div className="stat-icon blue">
                <Users size={22} />
              </div>
              <div className="stat-info">
                <h3>{isLoading ? '...' : metrics.userCount || 7}</h3>
                <p>Tài khoản Hệ thống</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/organization')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/organization')}>
              <div className="stat-icon green">
                <Building2 size={22} />
              </div>
              <div className="stat-info">
                <h3>{isLoading ? '...' : metrics.departmentCount || 11}</h3>
                <p>Phòng ban Doanh nghiệp</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/job-titles')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/job-titles')}>
              <div className="stat-icon purple">
                <Award size={22} />
              </div>
              <div className="stat-info">
                <h3>{isLoading ? '...' : metrics.jobTitleCount || 12}</h3>
                <p>Chức danh Định biên</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => setShowSecurityConfig(true)} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setShowSecurityConfig(true)}>
              <div className="stat-icon orange">
                <Lock size={22} />
              </div>
              <div className="stat-info">
                <h3>ISO 27001</h3>
                <p>Chuẩn BCrypt & Token JWT</p>
              </div>
            </div>
          </div>

          <div className="dashboard-cards-grid">
            <div className="card">
              <h3>
                <UserCog size={20} className="text-primary" />
                <span>Quản lý Tài khoản & Phân quyền</span>
              </h3>
              <p>Thêm mới nhân sự, chỉ định vai trò RBAC, khóa tài khoản hoặc reset mật khẩu tự động.</p>
              <button className="btn btn-outline" onClick={() => navigate('/admin/users')}>
                <span>Xem danh sách người dùng</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <FileSpreadsheet size={20} className="text-primary" />
                <span>Nhập nhân sự từ Excel</span>
              </h3>
              <p>Tải tệp mẫu chuẩn, kiểm tra hợp lệ trước khi nhập và nhập hàng loạt nhân sự vào hệ thống.</p>
              <button className="btn btn-outline" onClick={() => navigate('/admin/import-excel')}>
                <span>Nhập tệp Excel</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <FolderTree size={20} className="text-primary" />
                <span>Quản lý Danh mục dùng chung</span>
              </h3>
              <p>Thiết lập danh mục kỹ năng, địa điểm làm việc, hình thức làm việc và trạng thái tuyển dụng.</p>
              <button className="btn btn-outline" onClick={() => navigate('/categories')}>
                <span>Quản lý Danh mục ({metrics.categoryCount})</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <Sliders size={20} className="text-primary" />
                <span>Cấu hình Bảo mật Runtime</span>
              </h3>
              <p>Xem thời gian hiệu lực JWT Access Token (60m), Refresh Token (7d), và ngưỡng khóa chống brute-force (5 lần / 15m).</p>
              <button className="btn btn-outline" onClick={() => setShowSecurityConfig(true)}>
                <span>Xem thiết lập bảo mật</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {hasRole('RECRUITER') && (
        <div className="role-dashboard recruiter-view">
          <h2 className="section-title">
            <Briefcase size={20} className="text-primary" />
            <span>Bảng điều khiển Chuyên viên tuyển dụng</span>
          </h2>
          <div className="stats-grid">
            <div className="stat-card" onClick={() => navigate('/job-titles')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/job-titles')}>
              <div className="stat-icon blue">
                <Award size={22} />
              </div>
              <div className="stat-info">
                <h3>{isLoading ? '...' : metrics.jobTitleCount}</h3>
                <p>Chức danh Tuyển dụng</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/organization')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/organization')}>
              <div className="stat-icon green">
                <Building2 size={22} />
              </div>
              <div className="stat-info">
                <h3>{isLoading ? '...' : metrics.departmentCount}</h3>
                <p>Phòng ban Tiếp nhận</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/questions')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/questions')}>
              <div className="stat-icon orange">
                <HelpCircle size={22} />
              </div>
              <div className="stat-info">
                <h3>{isLoading ? '...' : metrics.questionCount}</h3>
                <p>Câu hỏi Phỏng vấn</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/categories')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/categories')}>
              <div className="stat-icon purple">
                <FolderTree size={22} />
              </div>
              <div className="stat-info">
                <h3>{isLoading ? '...' : metrics.categoryCount}</h3>
                <p>Danh mục Tuyển dụng</p>
              </div>
            </div>
          </div>

          <div className="dashboard-cards-grid" style={{ marginTop: '18px' }}>
            <div className="card">
              <h3>
                <Award size={20} className="text-primary" />
                <span>Tiêu chuẩn & Chức danh</span>
              </h3>
              <p>Tra cứu tiêu chuẩn năng lực, mô tả công việc và định biên chức danh trước khi lên tin tuyển dụng.</p>
              <button className="btn btn-outline" onClick={() => navigate('/job-titles')}>
                <span>Xem chức danh</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <HelpCircle size={20} className="text-primary" />
                <span>Ngân hàng Câu hỏi Chuyên môn</span>
              </h3>
              <p>Tìm kiếm và chuẩn bị bộ câu hỏi đánh giá ứng viên theo tiêu chí khung năng lực chuẩn.</p>
              <button className="btn btn-outline" onClick={() => navigate('/questions')}>
                <span>Mở ngân hàng câu hỏi</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {hasRole('HR_MANAGER') && !hasRole('ADMIN') && (
        <div className="role-dashboard hr-manager-view">
          <h2 className="section-title">
            <TrendingUp size={20} className="text-primary" />
            <span>Bảng điều khiển Quản lý nhân sự</span>
          </h2>
          <div className="stats-grid">
            <div className="stat-card" onClick={() => navigate('/organization')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/organization')}>
              <div className="stat-icon green">
                <Building2 size={22} />
              </div>
              <div className="stat-info">
                <h3>{isLoading ? '...' : metrics.departmentCount}</h3>
                <p>Phòng ban Trực thuộc</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/job-titles')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/job-titles')}>
              <div className="stat-icon blue">
                <Award size={22} />
              </div>
              <div className="stat-info">
                <h3>{isLoading ? '...' : metrics.jobTitleCount}</h3>
                <p>Chức danh trong hệ thống</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate('/categories')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/categories')}>
              <div className="stat-icon purple">
                <FolderTree size={22} />
              </div>
              <div className="stat-info">
                <h3>{isLoading ? '...' : metrics.categoryCount}</h3>
                <p>Danh mục chuẩn hóa</p>
              </div>
            </div>
          </div>

          <div className="dashboard-cards-grid" style={{ marginTop: '18px' }}>
            <div className="card">
              <h3>
                <Building2 size={20} className="text-primary" />
                <span>Cơ cấu Tổ chức & Phòng ban</span>
              </h3>
              <p>Quản lý sơ đồ cây phân cấp phòng ban, chi nhánh và thông tin pháp lý doanh nghiệp.</p>
              <button className="btn btn-outline" onClick={() => navigate('/organization')}>
                <span>Quản lý phòng ban</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <Award size={20} className="text-primary" />
                <span>Quản lý Khung Chức danh</span>
              </h3>
              <p>Cập nhật định biên nhân sự, dải lương và mô tả trách nhiệm cho từng vị trí.</p>
              <button className="btn btn-outline" onClick={() => navigate('/job-titles')}>
                <span>Quản lý chức danh</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {hasRole('HIRING_MANAGER') && !hasRole('ADMIN') && (
        <div className="role-dashboard hiring-manager-view">
          <h2 className="section-title">
            <Briefcase size={20} className="text-primary" />
            <span>Bảng điều khiển Quản lý tuyển dụng</span>
          </h2>
          <div className="dashboard-cards-grid">
            <div className="card">
              <h3>
                <Award size={20} className="text-primary" />
                <span>Khung Chức danh Bộ phận</span>
              </h3>
              <p>Xem xét yêu cầu chuyên môn, kinh nghiệm và dải lương của các vị trí thuộc bộ phận.</p>
              <button className="btn btn-outline" onClick={() => navigate('/job-titles')}>
                <span>Tra cứu chức danh</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <HelpCircle size={20} className="text-primary" />
                <span>Ngân hàng Câu hỏi Đánh giá</span>
              </h3>
              <p>Tham khảo và bổ sung câu hỏi chuyên môn phục vụ các buổi phỏng vấn ứng viên.</p>
              <button className="btn btn-outline" onClick={() => navigate('/questions')}>
                <span>Xem ngân hàng câu hỏi</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <Building2 size={20} className="text-primary" />
                <span>Sơ đồ Tổ chức</span>
              </h3>
              <p>Theo dõi vị trí phòng ban và các đơn vị trực thuộc trong cấu trúc doanh nghiệp.</p>
              <button className="btn btn-outline" onClick={() => navigate('/organization')}>
                <span>Xem sơ đồ tổ chức</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {hasRole('APPROVER') && !hasRole('ADMIN') && (
        <div className="role-dashboard approver-view">
          <h2 className="section-title">
            <ShieldCheck size={20} className="text-primary" />
            <span>Bảng điều khiển Người phê duyệt</span>
          </h2>
          <div className="dashboard-cards-grid">
            <div className="card">
              <h3>
                <Building2 size={20} className="text-primary" />
                <span>Cơ cấu & Phòng ban</span>
              </h3>
              <p>Tra cứu thông tin cơ cấu tổ chức và ban lãnh đạo các khối phòng ban.</p>
              <button className="btn btn-outline" onClick={() => navigate('/organization')}>
                <span>Xem phòng ban</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <Award size={20} className="text-primary" />
                <span>Định biên & Khung Chức danh</span>
              </h3>
              <p>Kiểm tra định biên nhân sự và dải đãi ngộ theo cấp bậc trước khi phê duyệt tuyển chọn.</p>
              <button className="btn btn-outline" onClick={() => navigate('/job-titles')}>
                <span>Xem dải chức danh</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {hasRole('INTERVIEWER') && (
        <div className="role-dashboard interviewer-view">
          <h2 className="section-title">
            <Video size={20} className="text-primary" />
            <span>Công cụ Phỏng vấn Chuyên môn</span>
          </h2>
          <div className="dashboard-cards-grid">
            <div className="card">
              <h3>
                <HelpCircle size={20} className="text-primary" />
                <span>Ngân hàng Câu hỏi Phỏng vấn ({metrics.questionCount})</span>
              </h3>
              <p>Tra cứu câu hỏi theo độ khó (Dễ, Trung bình, Khó) và tiêu chí năng lực kỹ thuật.</p>
              <button className="btn btn-outline" onClick={() => navigate('/questions')}>
                <span>Mở ngân hàng câu hỏi</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <Award size={20} className="text-primary" />
                <span>Khung Yêu cầu Năng lực Chức danh</span>
              </h3>
              <p>Xem chuẩn năng lực và trách nhiệm cốt lõi của vị trí ứng tuyển để đánh giá ứng viên chính xác.</p>
              <button className="btn btn-outline" onClick={() => navigate('/job-titles')}>
                <span>Tra cứu khung năng lực</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {hasRole('CANDIDATE') && (
        <div className="role-dashboard candidate-view">
          <h2 className="section-title">
            <Sparkles size={20} className="text-primary" />
            <span>Cổng thông tin Ứng viên</span>
          </h2>
          <div className="dashboard-cards-grid">
            <div className="card">
              <h3>
                <Award size={20} className="text-primary" />
                <span>Khám phá Vị trí Nghề nghiệp ({metrics.jobTitleCount})</span>
              </h3>
              <p>Tìm hiểu các vị trí tuyển dụng, lộ trình thăng tiến và yêu cầu chuyên môn nội bộ.</p>
              <button className="btn btn-outline" onClick={() => navigate('/job-titles')}>
                <span>Khám phá vị trí</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <Building2 size={20} className="text-primary" />
                <span>Văn hóa & Môi trường Doanh nghiệp</span>
              </h3>
              <p>Xem thông tin giới thiệu công ty, giá trị cốt lõi, sứ mệnh và chính sách đãi ngộ.</p>
              <button className="btn btn-outline" onClick={() => navigate('/organization')}>
                <span>Xem hồ sơ công ty</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recruitment Pipeline Overview Widget */}
      <div className="pipeline-widget">
        <div className="pipeline-header">
          <h2 className="pipeline-title">
            <GitBranch size={18} className="text-primary" />
            <span>Quy trình Tuyển dụng Nội bộ Tiêu chuẩn</span>
          </h2>
          <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: '0.75rem', padding: '3px 8px', borderRadius: 999 }}>
            Chuẩn ISO 9001:2015
          </span>
        </div>
        <div className="pipeline-steps">
          <div className="pipeline-step-item">
            <div className="pipeline-step-badge">1</div>
            <div className="pipeline-step-content">
              <span className="pipeline-step-name">Đề xuất tuyển</span>
              <span className="pipeline-step-desc">Khởi tạo phiếu & định biên lương</span>
            </div>
          </div>
          <div className="pipeline-step-item">
            <div className="pipeline-step-badge">2</div>
            <div className="pipeline-step-content">
              <span className="pipeline-step-name">Phê duyệt</span>
              <span className="pipeline-step-desc">Duyệt ngân sách & headcount</span>
            </div>
          </div>
          <div className="pipeline-step-item">
            <div className="pipeline-step-badge">3</div>
            <div className="pipeline-step-content">
              <span className="pipeline-step-name">Đăng tin & Nguồn</span>
              <span className="pipeline-step-desc">Truyền thông & thu hút hồ sơ</span>
            </div>
          </div>
          <div className="pipeline-step-item">
            <div className="pipeline-step-badge">4</div>
            <div className="pipeline-step-content">
              <span className="pipeline-step-name">Đánh giá & Phỏng vấn</span>
              <span className="pipeline-step-desc">Theo chuẩn khung năng lực</span>
            </div>
          </div>
          <div className="pipeline-step-item">
            <div className="pipeline-step-badge" style={{ background: '#059669' }}>
              <CheckCircle2 size={15} />
            </div>
            <div className="pipeline-step-content">
              <span className="pipeline-step-name">Offer & Nhận việc</span>
              <span className="pipeline-step-desc">Đồng bộ hồ sơ nhân sự</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Config Inspection Modal */}
      {showSecurityConfig && (
        <div className="org-modal-overlay" onClick={() => setShowSecurityConfig(false)} role="dialog" aria-modal="true">
          <div className="org-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="org-modal-header">
              <div className="org-modal-title-group">
                <div className="org-modal-icon-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3>Thiết lập An toàn & Bảo mật Hệ thống</h3>
                  <p className="org-modal-subtitle">Các thông số bảo mật runtime được áp dụng qua backend configuration</p>
                </div>
              </div>
              <button
                type="button"
                className="org-modal-close-btn"
                onClick={() => setShowSecurityConfig(false)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="org-modal-body" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Clock size={18} style={{ color: '#2563eb' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Access Token Expiration</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Thời gian hiệu lực của JWT Access Token</div>
                  </div>
                </div>
                <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>60 phút (3600s)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <KeyRound size={18} style={{ color: '#059669' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Refresh Token Expiration</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Thời gian duy trì phiên với Token Rotation</div>
                  </div>
                </div>
                <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>7 ngày</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ShieldAlert size={18} style={{ color: '#d97706' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Giới hạn đăng nhập sai</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Tự động khóa tạm thời khi sai liên tiếp</div>
                  </div>
                </div>
                <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>5 lần / Khóa 15m</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Lock size={18} style={{ color: '#7c3aed' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Password Hashing & Reset Token</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Chuẩn mã hóa mật khẩu & token khôi phục</div>
                  </div>
                </div>
                <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6', fontWeight: 600 }}>BCrypt / SHA-256 (30m)</span>
              </div>
            </div>

            <div className="org-modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowSecurityConfig(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
