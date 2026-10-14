import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  ChevronDown,
  ChevronUp,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import LogoutConfirmModal from '../components/common/LogoutConfirmModal';
import { getRoleLabel } from '../constants/rbac';

interface HeaderProps {
  onChangePasswordClick: () => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleCollapseSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onChangePasswordClick,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
  isSidebarCollapsed = false,
  onToggleCollapseSidebar,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  const avatarSrc = user?.avatarThumbnailUrl || user?.avatarUrl;

  useEffect(() => {
    setAvatarImgError(false);
  }, [avatarSrc]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }
    };
    if (dropdownOpen || notificationOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen, notificationOpen]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    } catch {
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const primaryRole = user?.roles && user.roles.length > 0 ? user.roles[0] : (user?.role || 'RECRUITER');

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          {/* Mobile hamburger menu toggle */}
          {onToggleMobileSidebar && (
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={onToggleMobileSidebar}
              aria-label={isMobileSidebarOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
              aria-expanded={isMobileSidebarOpen}
            >
              <Menu size={20} />
            </button>
          )}

          {/* Desktop sidebar collapse / expand toggle */}
          {onToggleCollapseSidebar && (
            <button
              type="button"
              className="sidebar-toggle-btn desktop-only"
              onClick={onToggleCollapseSidebar}
              aria-label={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              title={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
          )}

          <div
            className="header-logo"
            onClick={() => navigate('/dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
            aria-label="Về trang tổng quan"
          >
            <span className="header-logo-text">HR Recruit ATS</span>
            <span className="header-badge">Enterprise</span>
          </div>
        </div>

        <div className="header-right">
          {/* Notification Center */}
          <div ref={notificationRef} className="notification-wrapper" style={{ position: 'relative' }}>
            <button
              type="button"
              className="header-notification-btn"
              onClick={() => setNotificationOpen(!notificationOpen)}
              aria-label="Thông báo hệ thống"
              aria-expanded={notificationOpen}
            >
              <Bell size={18} />
              <span className="notification-badge-dot" aria-hidden="true" />
            </button>

            {notificationOpen && (
              <div className="dropdown-menu notification-dropdown" style={{ width: '300px' }} role="menu">
                <div className="dropdown-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong className="dropdown-user-name">Thông báo hệ thống</strong>
                    <span className="enterprise-badge badge-primary badge-sm">Mới</span>
                  </div>
                </div>

                <div className="notification-list">
                  <div className="notification-item">
                    <span className="notification-dot-indicator success" aria-hidden="true" />
                    <div className="notification-item-content">
                      <strong className="notification-item-title">Bảo mật tài khoản</strong>
                      <span className="notification-item-desc">Hệ thống xác thực JWT & RBAC bảo vệ 100% dữ liệu tuyển dụng.</span>
                    </div>
                  </div>

                  <div className="notification-item">
                    <span className="notification-dot-indicator info" aria-hidden="true" />
                    <div className="notification-item-content">
                      <strong className="notification-item-title">Phiên làm việc tự động</strong>
                      <span className="notification-item-desc">Tự động thu hồi phiên sau 5 phút không hoạt động để bảo vệ dữ liệu.</span>
                    </div>
                  </div>

                  <div className="notification-item">
                    <span className="notification-dot-indicator warning" aria-hidden="true" />
                    <div className="notification-item-content">
                      <strong className="notification-item-title">Sprint 2 Enterprise</strong>
                      <span className="notification-item-desc">Đã hoàn thiện trọn bộ S2-01 đến S2-10 trên hệ thống.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div
            ref={dropdownRef}
            className={`user-profile ${dropdownOpen ? 'is-active' : ''}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            role="button"
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            aria-label="Tài khoản cá nhân"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setDropdownOpen(!dropdownOpen);
              }
            }}
          >
            <div className="user-avatar" aria-hidden="true">
              {avatarSrc && !avatarImgError ? (
                <img
                  src={avatarSrc}
                  alt={user?.fullName || 'Avatar'}
                  className="user-avatar-img"
                  onError={() => setAvatarImgError(true)}
                />
              ) : (
                (user?.fullName || user?.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.fullName || user?.email?.split('@')[0]}</span>
              <span className="user-role-badge">{getRoleLabel(primaryRole)}</span>
            </div>
            {dropdownOpen ? (
              <ChevronUp size={16} className="user-dropdown-arrow" />
            ) : (
              <ChevronDown size={16} className="user-dropdown-arrow" />
            )}

            {dropdownOpen && (
              <div className="dropdown-menu" role="menu">
                <div className="dropdown-header">
                  <strong className="dropdown-user-name">{user?.fullName || 'Người dùng'}</strong>
                  <div className="dropdown-user-email">{user?.email}</div>
                  <div className="role-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {(user?.roles || [primaryRole]).map((r: string) => (
                      <span key={r} className="tag enterprise-badge badge-primary badge-sm">
                        {getRoleLabel(r)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="dropdown-divider"></div>

                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                >
                  <span>Hồ sơ cá nhân</span>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
                    onChangePasswordClick();
                  }}
                >
                  <span>Đổi mật khẩu</span>
                </button>

                <button
                  type="button"
                  className="dropdown-item logout"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
                    setShowLogoutModal(true);
                  }}
                >
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog (S1-02) */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
        userEmail={user?.email}
      />
    </>
  );
};

export default Header;
