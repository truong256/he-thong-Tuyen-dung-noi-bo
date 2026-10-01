import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const primaryRole = user?.roles && user.roles.length > 0 ? user.roles[0] : (user?.role || 'RECRUITER');

  return (
    <div className="dashboard-content">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h1>Xin chào, {user?.fullName || user?.email}!</h1>
          <p>
            Chào mừng bạn đến với <strong>Hệ thống Tuyển dụng Nội bộ (ATS)</strong>.
            Vai trò hiện tại: <span className="badge role">{primaryRole}</span>
          </p>
        </div>
        <div className="welcome-actions">
          {hasRole('ADMIN') && (
            <button className="btn btn-primary" onClick={() => navigate('/admin/users')}>
              <i className="bi bi-people-fill"></i> Quản lý Tài khoản & Phân quyền
            </button>
          )}
        </div>
      </div>

      {/* Role specific dashboard cards */}
      {hasRole('ADMIN') && (
        <div className="role-dashboard admin-view">
          <h2 className="section-title"><i className="bi bi-shield-shaded"></i> Bảng điều khiển Quản trị viên (Admin)</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue"><i className="bi bi-people"></i></div>
              <div className="stat-info">
                <h3>7</h3>
                <p>Tài khoản Hệ thống</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><i className="bi bi-person-check"></i></div>
              <div className="stat-info">
                <h3>7</h3>
                <p>Vai trò phân quyền (RBAC)</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple"><i className="bi bi-database-check"></i></div>
              <div className="stat-info">
                <h3>PostgreSQL</h3>
                <p>Cơ sở dữ liệu hoạt động</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange"><i className="bi bi-shield-lock"></i></div>
              <div className="stat-info">
                <h3>ISO 27001</h3>
                <p>Tiêu chuẩn mã hóa BCrypt & JWT</p>
              </div>
            </div>
          </div>

          <div className="dashboard-cards-grid">
            <div className="card">
              <h3><i className="bi bi-person-gear"></i> Quản lý Tài khoản</h3>
              <p>Thêm mới nhân sự, chỉ định vai trò RBAC, khóa tài khoản hoặc reset mật khẩu.</p>
              <button className="btn btn-outline" onClick={() => navigate('/admin/users')}>
                Xem danh sách người dùng →
              </button>
            </div>
            <div className="card">
              <h3><i className="bi bi-sliders"></i> Cấu hình Hệ thống</h3>
              <p>Thiết lập thời gian hết hạn Access Token (60m), Refresh Token (7d), và ngưỡng khóa (5 lần / 15m).</p>
              <button className="btn btn-outline" onClick={() => alert('Cấu hình đang được áp dụng qua backend properties.')}>
                Xem thiết lập bảo mật →
              </button>
            </div>
          </div>
        </div>
      )}

      {hasRole('RECRUITER') && (
        <div className="role-dashboard recruiter-view">
          <h2 className="section-title"><i className="bi bi-briefcase"></i> Bảng điều khiển Tuyển dụng (Recruiter)</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue"><i className="bi bi-file-earmark-text"></i></div>
              <div className="stat-info">
                <h3>12</h3>
                <p>Tin tuyển dụng đang mở</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><i className="bi bi-person-badge"></i></div>
              <div className="stat-info">
                <h3>48</h3>
                <p>Hồ sơ ứng viên mới</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange"><i className="bi bi-calendar2-check"></i></div>
              <div className="stat-info">
                <h3>6</h3>
                <p>Phỏng vấn hôm nay</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple"><i className="bi bi-send-check"></i></div>
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
          <h2 className="section-title"><i className="bi bi-bar-chart-line"></i> Quản lý Nhân sự (HR Manager)</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon green"><i className="bi bi-clipboard-data"></i></div>
              <div className="stat-info">
                <h3>5</h3>
                <p>Yêu cầu tuyển dụng cần duyệt</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><i className="bi bi-graph-up-arrow"></i></div>
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
          <h2 className="section-title"><i className="bi bi-person-workspace"></i> Trưởng bộ phận Tuyển dụng (Hiring Manager)</h2>
          <div className="dashboard-cards-grid">
            <div className="card">
              <h3><i className="bi bi-file-earmark-plus"></i> Tạo Requisition</h3>
              <p>Đề xuất nhu cầu tuyển dụng bổ sung cho đội ngũ của bộ phận.</p>
            </div>
            <div className="card">
              <h3><i className="bi bi-person-lines-fill"></i> Ứng viên Bộ phận</h3>
              <p>Xem xét hồ sơ đã qua vòng lọc của Recruiter.</p>
            </div>
            <div className="card">
              <h3><i className="bi bi-check-circle"></i> Quyết định Tuyển chọn</h3>
              <p>Gửi phản hồi chấp thuận hoặc từ chối sau phỏng vấn.</p>
            </div>
          </div>
        </div>
      )}

      {hasRole('APPROVER') && !hasRole('ADMIN') && (
        <div className="role-dashboard approver-view">
          <h2 className="section-title"><i className="bi bi-shield-check"></i> Người duyệt Headcount & Offer (Approver)</h2>
          <div className="dashboard-cards-grid">
            <div className="card">
              <h3><i className="bi bi-clipboard-check"></i> Duyệt Requisition</h3>
              <p>Phê duyệt hoặc từ chối yêu cầu tuyển dụng mới từ các phòng ban.</p>
            </div>
            <div className="card">
              <h3><i className="bi bi-award"></i> Duyệt Đề xuất Offer</h3>
              <p>Xem xét các gói đãi ngộ đặc biệt cho ứng viên tiềm năng.</p>
            </div>
          </div>
        </div>
      )}

      {hasRole('INTERVIEWER') && (
        <div className="role-dashboard interviewer-view">
          <h2 className="section-title"><i className="bi bi-camera-video"></i> Lịch phỏng vấn (Interviewer)</h2>
          <div className="card">
            <p>Bạn có <strong>2 buổi phỏng vấn</strong> cần đánh giá trong tuần này.</p>
          </div>
        </div>
      )}

      {hasRole('CANDIDATE') && (
        <div className="role-dashboard candidate-view">
          <h2 className="section-title"><i className="bi bi-person-workspace"></i> Cổng thông tin Ứng viên</h2>
          <div className="card">
            <p>Khám phá các vị trí tuyển dụng đang mở và theo dõi tiến trình hồ sơ của bạn.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

