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
  ShieldCheck,
  Target,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  isCollapsed = false,
  onClose,
}) => {
  const { hasRole, hasAnyRole, hasPermission } = useAuth();
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

  // Permission-based visibility flags (S1-06: Menu theo quyền) with role-based fallbacks
  const checkPerm = (perm: string, fallbackRoles: string[]) =>
    typeof hasPermission === 'function' ? hasPermission(perm) : (hasAnyRole ? hasAnyRole(fallbackRoles) : false);

  const canReadCatalog = checkPerm('CATALOG_READ', ['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'APPROVER']);
  const canReadUsers = checkPerm('USER_READ', ['ADMIN', 'HR_MANAGER']);
  const canManageUsers = checkPerm('USER_MANAGE', ['ADMIN']);
  const canReadAudit = checkPerm('AUDIT_READ', ['ADMIN', 'HR_MANAGER']);

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

      <aside
        className={`app-sidebar ${isOpen ? 'mobile-open' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
        aria-label="Menu điều hướng hệ thống"
      >
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

              {/*
                Hồ sơ tổ chức – CATALOG_READ
                Visible: HR_MANAGER(F), ADMIN(F), RECRUITER(R), HIRING_MANAGER(R),
                          INTERVIEWER(R), APPROVER(R)
                Hidden: CANDIDATE (no CATALOG_READ)
              */}
              {canReadCatalog && (
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
              )}

              {/*
                Quản lý Chức danh – CATALOG_READ
                Same visibility as organization (catalog module)
              */}
              {canReadCatalog && (
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

              {/*
                Quản lý Danh mục – CATALOG_READ
                Same visibility as above
              */}
              {canReadCatalog && (
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

              {/*
                Khung Năng lực – CATALOG_READ
              */}
              {canReadCatalog && (
                <li>
                  <NavLink
                    to="/competencies"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <Target size={18} />
                    <span>Khung Năng lực</span>
                  </NavLink>
                </li>
              )}

              {/*
                Ngân hàng Câu hỏi – CATALOG_READ
                Same visibility as catalog
              */}
              {canReadCatalog && (
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

              {/*
                Quản lý Tài khoản – USER_READ
                ADMIN: full actions (create/lock/assign roles visible in page)
                HR_MANAGER: read-only view (action buttons hidden in UserManagementPage)
                Others: no access
              */}
              {canReadUsers && (
                <li>
                  <NavLink
                    to="/admin/users"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <Users size={18} />
                    <span>{canManageUsers ? 'Quản lý Tài khoản' : 'Danh sách tài khoản'}</span>
                  </NavLink>
                </li>
              )}

              {/*
                Nhập nhân sự Excel – USER_MANAGE (ADMIN only)
                HR_MANAGER has USER_READ but NOT USER_MANAGE
              */}
              {canManageUsers && (
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
          {(hasAnyRole(['HIRING_MANAGER', 'APPROVER', 'HR_MANAGER', 'ADMIN'])) && (
            <div className="sidebar-section">
              <span className="sidebar-title">PHÊ DUYỆT & ĐỀ XUẤT</span>
              <ul className="sidebar-menu">
                {(hasAnyRole(['HIRING_MANAGER', 'HR_MANAGER', 'ADMIN']) || (hasPermission && hasPermission('REQUISITION_CREATE'))) ? (
                  <li>
                    <NavLink
                      to="/recruitment/requisitions"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={handleLinkClick}
                    >
                      <FileCheck size={18} />
                      <span>Yêu cầu tuyển dụng</span>
                    </NavLink>
                  </li>
                ) : (
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
                )}
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

          {/* HR Manager – Audit/Nhật ký section (S1-07 / AUDIT_READ) */}
          {canReadAudit && !canManageUsers && (
            <div className="sidebar-section">
              <span className="sidebar-title">NHẬT KÝ HỆ THỐNG</span>
              <ul className="sidebar-menu">
                <li>
                  <a
                    href="#audit-log"
                    aria-disabled="true"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpcomingClick('Nhật ký hoạt động');
                    }}
                  >
                    <ShieldCheck size={18} />
                    <span>Nhật ký hoạt động</span>
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
