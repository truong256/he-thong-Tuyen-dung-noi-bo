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
import notificationApi from '../api/notification';
import { NotificationItem } from '../types/notification';

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const avatarSrc = user?.avatarThumbnailUrl || user?.avatarUrl;

  useEffect(() => {
    setAvatarImgError(false);
  }, [avatarSrc]);

  const isItemRead = (item: NotificationItem) => Boolean(item.isRead ?? item.read);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      notificationApi
        .getUnreadCount()
        .then((res) => setUnreadCount(res.unreadCount || 0))
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    window.addEventListener('focus', fetchUnread);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchUnread);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !notificationOpen) return;
    notificationApi
      .getNotifications({ size: 10 })
      .then((res) => {
        if (res && res.content) {
          setNotifications(res.content);
        }
      })
      .catch(() => {});
  }, [user, notificationOpen]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore notification read failure
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore notification read-all failure
    }
  };

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
              {unreadCount > 0 && <span className="notification-badge-dot" aria-hidden="true" />}
            </button>

            {notificationOpen && (
              <div className="dropdown-menu notification-dropdown" style={{ width: '340px', maxHeight: '420px', overflowY: 'auto' }} role="menu">
                <div className="dropdown-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong className="dropdown-user-name">Thông báo</strong>
                    {unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                          padding: 0,
                        }}
                      >
                        Đọc tất cả ({unreadCount})
                      </button>
                    ) : (
                      <span className="enterprise-badge badge-primary badge-sm">Cập nhật</span>
                    )}
                  </div>
                </div>

                <div className="notification-list">
                  {notifications.length > 0 ? (
                    notifications.map((item) => {
                      const readStatus = isItemRead(item);
                      return (
                        <div
                          key={item.id}
                          className={`notification-item ${!readStatus ? 'unread' : ''}`}
                          onClick={() => !readStatus && handleMarkAsRead(item.id)}
                          style={{ cursor: !readStatus ? 'pointer' : 'default', opacity: readStatus ? 0.75 : 1 }}
                        >
                          <span
                            className={`notification-dot-indicator ${
                              item.type === 'CANDIDATE_WITHDRAWAL' || item.type === 'CANDIDATE_WITHDRAWN'
                                ? 'danger'
                                : readStatus
                                ? 'info'
                                : 'warning'
                            }`}
                            aria-hidden="true"
                          />
                          <div className="notification-item-content" style={{ flex: 1 }}>
                          <strong className="notification-item-title" style={{ display: 'block', fontSize: '0.85rem' }}>
                            {item.title}
                          </strong>
                          <span
                            className="notification-item-desc"
                            style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}
                          >
                            {item.content}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                  ) : (
                    <>
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
                          <strong className="notification-item-title">Sprint Tuyển dụng</strong>
                          <span className="notification-item-desc">Hệ thống sẵn sàng xử lý thông báo rút hồ sơ và pipeline.</span>
                        </div>
                      </div>
                    </>
                  )}
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
