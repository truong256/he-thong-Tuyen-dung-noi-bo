import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getRoleLabel } from '../constants/rbac';
import {
  Users,
  ShieldCheck,
  Database,
  Lock,
  Sliders,
  UserCog,
  Briefcase,
  FileText,
  Calendar,
  Send,
  CheckCircle,
  TrendingUp,
  Video,
  Award,
  ClipboardList,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const primaryRole = user?.roles && user.roles.length > 0 ? user.roles[0] : (user?.role || 'RECRUITER');

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
        <div className="welcome-actions">
          {hasRole('ADMIN') && (
            <button className="btn btn-primary" onClick={() => navigate('/admin/users')}>
              <Users size={16} />
              <span>Quản lý Tài khoản & Phân quyền</span>
            </button>
          )}
        </div>
      </div>

      {/* Role specific dashboard cards */}
      {hasRole('ADMIN') && (
        <div className="role-dashboard admin-view">
          <h2 className="section-title">
            <ShieldCheck size={19} className="section-title-icon" />
            <span>Bảng điều khiển Quản trị viên</span>
          </h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <Users size={22} />
              </div>
              <div className="stat-info">
                <h3>7</h3>
                <p>Tài khoản Hệ thống</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <ShieldCheck size={22} />
              </div>
              <div className="stat-info">
                <h3>7</h3>
                <p>Vai trò phân quyền (RBAC)</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">
                <Database size={22} />
              </div>
              <div className="stat-info">
                <h3>PostgreSQL</h3>
                <p>Cơ sở dữ liệu hoạt động</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">
                <Lock size={22} />
              </div>
              <div className="stat-info">
                <h3>ISO 27001</h3>
                <p>Tiêu chuẩn mã hóa BCrypt & JWT</p>
              </div>
            </div>
          </div>

          <div className="dashboard-cards-grid">
            <div className="card">
              <h3>
                <UserCog size={20} className="text-primary" />
                <span>Quản lý Tài khoản</span>
              </h3>
              <p>Thêm mới nhân sự, chỉ định vai trò RBAC, khóa tài khoản hoặc reset mật khẩu.</p>
              <button className="btn btn-outline" onClick={() => navigate('/admin/users')}>
                <span>Xem danh sách người dùng</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="card">
              <h3>
                <Sliders size={20} className="text-primary" />
                <span>Cấu hình Hệ thống</span>
              </h3>
              <p>Thiết lập thời gian hết hạn Access Token (60m), Refresh Token (7d), và ngưỡng khóa (5 lần / 15m).</p>
              <button className="btn btn-outline" onClick={() => alert('Cấu hình đang được áp dụng qua backend properties.')}>
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
            <div className="stat-card">
              <div className="stat-icon blue">
                <FileText size={22} />
              </div>
              <div className="stat-info">
                <h3>12</h3>
                <p>Tin tuyển dụng đang mở</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <Users size={22} />
              </div>
              <div className="stat-info">
                <h3>48</h3>
                <p>Hồ sơ ứng viên mới</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">
                <Calendar size={22} />
              </div>
              <div className="stat-info">
                <h3>6</h3>
                <p>Phỏng vấn hôm nay</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">
                <Send size={22} />
              </div>
              <div className="stat-info">
                <h3>3</h3>
                <p>Đề nghị nhận việc (Offer)</p>
              </div>
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
            <div className="stat-card">
              <div className="stat-icon green">
                <ClipboardList size={22} />
              </div>
              <div className="stat-info">
                <h3>5</h3>
                <p>Yêu cầu tuyển dụng cần duyệt</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">
                <TrendingUp size={22} />
              </div>
              <div className="stat-info">
                <h3>85%</h3>
                <p>Tiến độ KPI Tuyển dụng</p>
              </div>
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
                <FileText size={20} className="text-primary" />
                <span>Tạo yêu cầu tuyển dụng</span>
              </h3>
              <p>Đề xuất nhu cầu tuyển dụng bổ sung cho đội ngũ của bộ phận.</p>
            </div>
            <div className="card">
              <h3>
                <Users size={20} className="text-primary" />
                <span>Ứng viên Bộ phận</span>
              </h3>
              <p>Xem xét hồ sơ đã qua vòng lọc của Recruiter.</p>
            </div>
            <div className="card">
              <h3>
                <CheckCircle size={20} className="text-primary" />
                <span>Quyết định Tuyển chọn</span>
              </h3>
              <p>Gửi phản hồi chấp thuận hoặc từ chối sau phỏng vấn.</p>
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
                <CheckCircle size={20} className="text-primary" />
                <span>Duyệt yêu cầu tuyển dụng</span>
              </h3>
              <p>Phê duyệt hoặc từ chối yêu cầu tuyển dụng mới từ các phòng ban.</p>
            </div>
            <div className="card">
              <h3>
                <Award size={20} className="text-primary" />
                <span>Duyệt đề xuất tuyển dụng</span>
              </h3>
              <p>Xem xét các gói đãi ngộ đặc biệt cho ứng viên tiềm năng.</p>
            </div>
          </div>
        </div>
      )}

      {hasRole('INTERVIEWER') && (
        <div className="role-dashboard interviewer-view">
          <h2 className="section-title">
            <Video size={20} className="text-primary" />
            <span>Lịch phỏng vấn</span>
          </h2>
          <div className="card">
            <p>Bạn có <strong>2 buổi phỏng vấn</strong> cần đánh giá trong tuần này.</p>
          </div>
        </div>
      )}

      {hasRole('CANDIDATE') && (
        <div className="role-dashboard candidate-view">
          <h2 className="section-title">
            <Sparkles size={20} className="text-primary" />
            <span>Cổng thông tin Ứng viên</span>
          </h2>
          <div className="card">
            <p>Khám phá các vị trí tuyển dụng đang mở và theo dõi tiến trình hồ sơ của bạn.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
