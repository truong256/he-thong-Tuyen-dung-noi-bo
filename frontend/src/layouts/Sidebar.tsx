import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
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
    onClose?.();
  };

  const handleUpcomingClick = (featureName: string) => {
    setNotice(
      `Tính năng "${featureName}" đang được phát triển theo lộ trình Sprint tiếp theo.`,
    );
    setTimeout(() => setNotice(null), 3500);
    handleLinkClick();
  };

  // Hiển thị menu theo quyền; sử dụng role làm phương án dự phòng.
  const checkPerm = (perm: string, fallbackRoles: string[]) =>
    typeof hasPermission === 'function'
      ? hasPermission(perm)
      : hasAnyRole(fallbackRoles);

  const canReadCatalog = checkPerm('CATALOG_READ', [
    'ADMIN',
    'HR_MANAGER',
    'RECRUITER',
    'HIRING_MANAGER',
    'INTERVIEWER',
    'APPROVER',
  ]);

  const canReadUsers = checkPerm('USER_READ', ['ADMIN', 'HR_MANAGER']);
  const canManageUsers = checkPerm('USER_MANAGE', ['ADMIN']);
  const canReadRoles = checkPerm('ROLE_READ', ['ADMIN', 'HR_MANAGER']);
  const canReadAudit = checkPerm('AUDIT_READ', ['ADMIN', 'HR_MANAGER']);

  const canReadRequisitions =
    hasAnyRole([
      'HIRING_MANAGER',
      'HR_MANAGER',
      'ADMIN',
      'RECRUITER',
      'APPROVER',
    ]) ||
    (typeof hasPermission === 'function' &&
      [
        'REQUISITION_CREATE',
        'REQUISITION_READ_OWN',
        'REQUISITION_READ_ALL',
        'REQUISITION_APPROVE',
      ].some((permission) => hasPermission(permission)));

  const canReadRecruitment = hasAnyRole([
    'RECRUITER',
    'HR_MANAGER',
    'ADMIN',
  ]);

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${isOpen ? 'mobile-open' : ''} ${
          isCollapsed ? 'is-collapsed' : ''
        }`}
        aria-label="Menu điều hướng hệ thống"
      >
        <div className="sidebar-mobile-header">
          <div className="sidebar-mobile-brand">
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
          {/* Điều hướng chính */}
          <div className="sidebar-section">
            <span className="sidebar-title">ĐIỀU HƯỚNG</span>
            <ul className="sidebar-menu">
              <li>
                <NavLink
                  to="/dashboard"
                  end
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={handleLinkClick}
                >
                  <span>Tổng quan</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Cơ cấu và danh mục */}
          {canReadCatalog && (
            <div className="sidebar-section">
              <span className="sidebar-title">CƠ CẤU & DANH MỤC</span>
              <ul className="sidebar-menu">
                <li>
                  <NavLink
                    to="/job-titles"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <span>Quản lý Chức danh</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/categories"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <span>Quản lý Danh mục</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/competencies"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <span>Khung Năng lực</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/questions"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <span>Ngân hàng Câu hỏi</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          )}

          {/* Quản trị tài khoản */}
          {(canReadUsers || canManageUsers || canReadRoles) && (
            <div className="sidebar-section">
              <span className="sidebar-title">QUẢN TRỊ TÀI KHOẢN</span>
              <ul className="sidebar-menu">
                {canReadUsers && (
                  <li>
                    <NavLink
                      to="/admin/users"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={handleLinkClick}
                    >
                      <span>
                        {canManageUsers
                          ? 'Quản lý Tài khoản'
                          : 'Danh sách tài khoản'}
                      </span>
                    </NavLink>
                  </li>
                )}

                {canReadRoles && (
                  <li>
                    <NavLink
                      to="/admin/permission-matrix"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={handleLinkClick}
                    >
                      <span>Ma trận phân quyền</span>
                    </NavLink>
                  </li>
                )}

                {canManageUsers && (
                  <li>
                    <NavLink
                      to="/admin/import-excel"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={handleLinkClick}
                    >
                      <span>Nhập nhân sự Excel</span>
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Quy trình tuyển dụng */}
          {(canReadRecruitment ||
            hasRole('HIRING_MANAGER') ||
            hasRole('APPROVER')) && (
            <div className="sidebar-section">
              <span className="sidebar-title">QUY TRÌNH TUYỂN DỤNG</span>
              <ul className="sidebar-menu">
                {canReadRequisitions && (
                  <li>
                    <NavLink
                      to="/recruitment/requisitions"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={handleLinkClick}
                    >
                      <span>Yêu cầu tuyển dụng</span>
                    </NavLink>
                  </li>
                )}

                {hasRole('HR_MANAGER') && (
                  <li>
                    <NavLink
                      to="/recruitment/approval-configurations"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={handleLinkClick}
                    >
                      <span>Cấu hình luồng phê duyệt</span>
                    </NavLink>
                  </li>
                )}

                {canReadRecruitment && (
                  <>
                    <li>
                      <NavLink
                        to="/recruitment/job-postings"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                        onClick={handleLinkClick}
                      >
                        <span>Tin tuyển dụng</span>
                      </NavLink>
                    </li>

                    {/* Hồ sơ ứng viên: chuyển đến trang Pipeline */}
                    <li>
                      <NavLink
                        to="/recruitment/candidates"
                        className={({ isActive }) =>
                          isActive ? 'active' : ''
                        }
                        onClick={handleLinkClick}
                      >
                        <span>Hồ sơ & Pipeline</span>
                      </NavLink>
                    </li>

                    <li>
                      <a
                        href="#interviews"
                        className="sidebar-link-upcoming"
                        onClick={(event) => {
                          event.preventDefault();
                          handleUpcomingClick('Lịch phỏng vấn');
                        }}
                      >
                        <span>Lịch phỏng vấn</span>
                      </a>
                    </li>
                  </>
                )}

                {hasAnyRole([
                  'HIRING_MANAGER',
                  'APPROVER',
                  'HR_MANAGER',
                  'ADMIN',
                ]) && (
                  <li>
                    <NavLink
                      to="/recruitment/candidates"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={handleLinkClick}
                    >
                      <span>Duyệt ứng viên & Offer</span>
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Phỏng vấn chuyên môn */}
          {hasRole('INTERVIEWER') && (
            <div className="sidebar-section">
              <span className="sidebar-title">PHỎNG VẤN CHUYÊN MÔN</span>
              <ul className="sidebar-menu">
                <li>
                  <a
                    href="#my-interviews"
                    className="sidebar-link-upcoming"
                    onClick={(event) => {
                      event.preventDefault();
                      handleUpcomingClick('Lịch phỏng vấn của tôi');
                    }}
                  >
                    <span>Lịch phỏng vấn của tôi</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#evaluation"
                    className="sidebar-link-upcoming"
                    onClick={(event) => {
                      event.preventDefault();
                      handleUpcomingClick('Phiếu đánh giá ứng viên');
                    }}
                  >
                    <span>Phiếu đánh giá ứng viên</span>
                  </a>
                </li>
              </ul>
            </div>
          )}

          {/* Cổng ứng viên */}
          {hasRole('CANDIDATE') && (
            <div className="sidebar-section">
              <span className="sidebar-title">ỨNG VIÊN NỘI BỘ</span>
              <ul className="sidebar-menu">
                <li>
                  <NavLink
                    to="/careers"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <span>Việc làm đang mở</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/candidate/applications"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={handleLinkClick}
                  >
                    <span>Hồ sơ & CV của tôi</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          )}

          {/* Nhật ký hệ thống */}
          {canReadAudit && !canManageUsers && (
            <div className="sidebar-section">
              <span className="sidebar-title">NHẬT KÝ HỆ THỐNG</span>
              <ul className="sidebar-menu">
                <li>
                  <a
                    href="#audit-log"
                    className="sidebar-link-upcoming"
                    onClick={(event) => {
                      event.preventDefault();
                      handleUpcomingClick('Nhật ký hoạt động');
                    }}
                  >
                    <span>Nhật ký hoạt động</span>
                  </a>
                </li>
              </ul>
            </div>
          )}
        </nav>
      </aside>

      {notice && (
        <div
          className="sidebar-toast-notice"
          role="status"
          aria-live="polite"
        >
          <span>{notice}</span>
        </div>
      )}
    </>
  );
};

export default Sidebar;
