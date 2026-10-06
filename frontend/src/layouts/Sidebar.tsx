import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Kanban,
  Calendar,
  FileCheck,
  ClipboardCheck,
  MessageSquare,
  Star,
  Briefcase,
  FileText,
  User,
  Building2,
  Award,
  HelpCircle,
  FileSpreadsheet,
  FolderTree,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { hasRole, hasAnyRole } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleUpcomingClick = (featureName: string) => {
    setNotice(`Tính năng "${featureName}" đang được phát triển theo lộ trình Sprint tiếp theo.`);
    setTimeout(() => setNotice(null), 3500);
    handleLinkClick();
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'mobile-open' : ''}`} aria-label="Menu điều hướng hệ thống">
        {/* Mobile Header with close button */}
        <div className="sidebar-mobile-header">
          <div className="sidebar-mobile-brand">
            <Briefcase size={20} style={{ color: '#2563eb' }} />
            <span>Menu Hệ thống</span>
          </div>
          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={onClose}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav-container">
          {/* Main Navigation Section */}
          <div className="sidebar-section">
            <span className="sidebar-title">ĐIỀU HƯỚNG CHÍNH</span>
            <ul className="sidebar-menu">
              <li>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  end
                  onClick={handleLinkClick}
                >
                  <LayoutDashboard size={18} />
                  <span>Tổng quan</span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/profile"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={handleLinkClick}
                >
                  <User size={18} />
                  <span>Hồ sơ cá nhân</span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/organization"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={handleLinkClick}
                >
                  <Building2 size={18} />
                  <span>Hồ sơ tổ chức</span>
                </NavLink>
              </li>

              {hasAnyRole(['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER']) && (
                <li>
                  <NavLink
                    to="/job-titles"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <Award size={18} />
                    <span>Quản lý Chức danh</span>
                  </NavLink>
                </li>
              )}

              {hasAnyRole(['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER']) && (
                <li>
                  <NavLink
                    to="/categories"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <FolderTree size={18} />
                    <span>Quản lý Danh mục</span>
                  </NavLink>
                </li>
              )}

              {hasAnyRole(['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER']) && (
                <li>
                  <NavLink
                    to="/questions"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <HelpCircle size={18} />
                    <span>Ngân hàng Câu hỏi</span>
                  </NavLink>
                </li>
              )}

              {hasRole('ADMIN') && (
                <>
                  <li>
                    <NavLink
                      to="/admin/users"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={handleLinkClick}
                    >
                      <Users size={18} />
                      <span>Quản lý Tài khoản</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin/import-excel"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={handleLinkClick}
                    >
                      <FileSpreadsheet size={18} />
                      <span>Nhập nhân sự Excel</span>
                    </NavLink>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Recruitment Process Section */}
          {(hasAnyRole(['RECRUITER', 'HR_MANAGER', 'ADMIN'])) && (
            <div className="sidebar-section">
              <span className="sidebar-title">QUY TRÌNH TUYỂN DỤNG</span>
              <ul className="sidebar-menu">
                <li>
                  <a
                    href="#jobs"
                    aria-disabled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpcomingClick('Tin tuyển dụng');
                    }}
                  >
                    <Megaphone size={18} />
                    <span>Tin tuyển dụng</span>
                    <span className="sidebar-badge-soon">Sắp ra mắt</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#pipeline"
                    aria-disabled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpcomingClick('Hồ sơ & Pipeline');
                    }}
                  >
                    <Kanban size={18} />
                    <span>Hồ sơ & Pipeline</span>
                    <span className="sidebar-badge-soon">Sắp ra mắt</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#interviews"
                    aria-disabled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpcomingClick('Lịch phỏng vấn');
                    }}
                  >
                    <Calendar size={18} />
                    <span>Lịch phỏng vấn</span>
                    <span className="sidebar-badge-soon">Sắp ra mắt</span>
                  </a>
                </li>
              </ul>
            </div>
          )}

          {/* Approvals Section */}
          {(hasAnyRole(['HIRING_MANAGER', 'APPROVER', 'HR_MANAGER'])) && (
            <div className="sidebar-section">
              <span className="sidebar-title">PHÊ DUYỆT & ĐỀ XUẤT</span>
              <ul className="sidebar-menu">
                <li>
                  <a
                    href="#requisitions"
                    aria-disabled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpcomingClick('Yêu cầu tuyển dụng');
                    }}
                  >
                    <FileCheck size={18} />
                    <span>Yêu cầu tuyển dụng</span>
                    <span className="sidebar-badge-soon">Sắp ra mắt</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#approvals"
                    aria-disabled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpcomingClick('Duyệt ứng viên & Offer');
                    }}
                  >
                    <ClipboardCheck size={18} />
                    <span>Duyệt ứng viên & Offer</span>
                    <span className="sidebar-badge-soon">Sắp ra mắt</span>
                  </a>
                </li>
              </ul>
            </div>
          )}

          {/* Interviewer Section */}
          {(hasRole('INTERVIEWER')) && (
            <div className="sidebar-section">
              <span className="sidebar-title">PHỎNG VẤN CHUYÊN MÔN</span>
              <ul className="sidebar-menu">
                <li>
                  <a
                    href="#my-interviews"
                    aria-disabled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpcomingClick('Lịch phỏng vấn của tôi');
                    }}
                  >
                    <MessageSquare size={18} />
                    <span>Lịch phỏng vấn của tôi</span>
                    <span className="sidebar-badge-soon">Sắp ra mắt</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#evaluation"
                    aria-disabled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpcomingClick('Phiếu đánh giá ứng viên');
                    }}
                  >
                    <Star size={18} />
                    <span>Phiếu đánh giá ứng viên</span>
                    <span className="sidebar-badge-soon">Sắp ra mắt</span>
                  </a>
                </li>
              </ul>
            </div>
          )}

          {/* Candidate Section */}
          {(hasRole('CANDIDATE')) && (
            <div className="sidebar-section">
              <span className="sidebar-title">ỨNG VIÊN NỘI BỘ</span>
              <ul className="sidebar-menu">
                <li>
                  <a
                    href="#jobs-candidate"
                    aria-disabled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpcomingClick('Việc làm đang mở');
                    }}
                  >
                    <Briefcase size={18} />
                    <span>Việc làm đang mở</span>
                    <span className="sidebar-badge-soon">Sắp ra mắt</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#my-profile"
                    aria-disabled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpcomingClick('Hồ sơ & CV của tôi');
                    }}
                  >
                    <FileText size={18} />
                    <span>Hồ sơ & CV của tôi</span>
                    <span className="sidebar-badge-soon">Sắp ra mắt</span>
                  </a>
                </li>
              </ul>
            </div>
          )}
        </nav>
      </aside>

      {/* Roadmap notification toast */}
      {notice && (
        <div className="sidebar-toast-notice" role="status" aria-live="polite">
          <HelpCircle size={16} style={{ color: '#60a5fa', flexShrink: 0 }} />
          <span>{notice}</span>
        </div>
      )}
    </>
  );
};

export default Sidebar;
