import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, ChevronUp, Key, LogOut, Briefcase } from 'lucide-react';
import LogoutConfirmModal from '../components/common/LogoutConfirmModal';

interface HeaderProps {
  onChangePasswordClick: () => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onChangePasswordClick,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    } catch {
      // Clean fallback redirect
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Quản trị viên';
      case 'HR_MANAGER': return 'Trưởng phòng NS';
      case 'RECRUITER': return 'Chuyên viên Tuyển dụng';
      case 'HIRING_MANAGER': return 'Quản lý Bộ phận';
      case 'INTERVIEWER': return 'Người Phỏng vấn';
      case 'APPROVER': return 'Người Phê duyệt';
      case 'CANDIDATE': return 'Ứng viên';
      default: return role;
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
              <Menu size={22} />
            </button>
          )}

          <div
            className="header-logo"
            onClick={() => navigate('/dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
            style={{ cursor: 'pointer' }}
            aria-label="Về trang tổng quan"
          >
            <Briefcase size={22} className="header-logo-icon" />
            <span className="header-logo-text">HR Recruit ATS</span>
          </div>
        </div>

        <div className="header-right">
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
              {(user?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.fullName || user?.email?.split('@')[0]}</span>
              <span className="user-role-badge">{getRoleDisplayName(primaryRole)}</span>
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
                  <div className="role-tags">
                    {(user?.roles || [primaryRole]).map((r) => (
                      <span key={r} className="tag">{r}</span>
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
                    onChangePasswordClick();
                  }}
                >
                  <Key size={15} />
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
                  <LogOut size={15} />
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
