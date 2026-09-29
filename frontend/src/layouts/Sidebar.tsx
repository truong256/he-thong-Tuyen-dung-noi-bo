import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { hasRole, hasAnyRole } = useAuth();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-section">
        <span className="sidebar-title">ĐIỀU HƯỚNG</span>
        <ul className="sidebar-menu">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')} end>
              <i className="bi bi-grid-1x2-fill"></i>
              <span>Tổng quan</span>
            </NavLink>
          </li>

          {hasRole('ADMIN') && (
            <li>
              <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'active' : '')}>
                <i className="bi bi-people-fill"></i>
                <span>Quản lý Tài khoản (Admin)</span>
              </NavLink>
            </li>
          )}
        </ul>
      </div>

      {(hasAnyRole(['RECRUITER', 'HR_MANAGER', 'ADMIN'])) && (
        <div className="sidebar-section">
          <span className="sidebar-title">QUY TRÌNH TUYỂN DỤNG</span>
          <ul className="sidebar-menu">
            <li>
              <a href="#jobs" onClick={(e) => e.preventDefault()}>
                <i className="bi bi-megaphone-fill"></i>
                <span>Tin tuyển dụng</span>
              </a>
            </li>
            <li>
              <a href="#pipeline" onClick={(e) => e.preventDefault()}>
                <i className="bi bi-kanban-fill"></i>
                <span>Hồ sơ & Pipeline</span>
              </a>
            </li>
            <li>
              <a href="#interviews" onClick={(e) => e.preventDefault()}>
                <i className="bi bi-calendar-event-fill"></i>
                <span>Lịch phỏng vấn</span>
              </a>
            </li>
          </ul>
        </div>
      )}

      {(hasAnyRole(['HIRING_MANAGER', 'APPROVER', 'HR_MANAGER'])) && (
        <div className="sidebar-section">
          <span className="sidebar-title">PHÊ DUYỆT & ĐỀ XUẤT</span>
          <ul className="sidebar-menu">
            <li>
              <a href="#requisitions" onClick={(e) => e.preventDefault()}>
                <i className="bi bi-file-earmark-check-fill"></i>
                <span>Yêu cầu tuyển dụng</span>
              </a>
            </li>
            <li>
              <a href="#approvals" onClick={(e) => e.preventDefault()}>
                <i className="bi bi-clipboard-check-fill"></i>
                <span>Duyệt ứng viên & Offer</span>
              </a>
            </li>
          </ul>
        </div>
      )}

      {(hasRole('INTERVIEWER')) && (
        <div className="sidebar-section">
          <span className="sidebar-title">PHỎNG VẤN</span>
          <ul className="sidebar-menu">
            <li>
              <a href="#my-interviews" onClick={(e) => e.preventDefault()}>
                <i className="bi bi-chat-square-text-fill"></i>
                <span>Lịch phỏng vấn của tôi</span>
              </a>
            </li>
            <li>
              <a href="#evaluation" onClick={(e) => e.preventDefault()}>
                <i className="bi bi-star-fill"></i>
                <span>Phiếu đánh giá</span>
              </a>
            </li>
          </ul>
        </div>
      )}

      {(hasRole('CANDIDATE')) && (
        <div className="sidebar-section">
          <span className="sidebar-title">ỨNG VIÊN</span>
          <ul className="sidebar-menu">
            <li>
              <a href="#jobs-candidate" onClick={(e) => e.preventDefault()}>
                <i className="bi bi-briefcase"></i>
                <span>Việc làm đang mở</span>
              </a>
            </li>
            <li>
              <a href="#my-profile" onClick={(e) => e.preventDefault()}>
                <i className="bi bi-person-lines-fill"></i>
                <span>Hồ sơ & CV của tôi</span>
              </a>
            </li>
          </ul>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
