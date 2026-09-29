import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onChangePasswordClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onChangePasswordClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <i className="bi bi-briefcase-fill" style={{ fontSize: '1.3rem' }}></i>
          <span>HR Recruit ATS</span>
        </div>
      </div>

      <div className="header-right">
        <div className="user-profile" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <div className="user-avatar">
            {(user?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.fullName || user?.email?.split('@')[0]}</span>
            <span className="user-role-badge">{getRoleDisplayName(primaryRole)}</span>
          </div>
          <i className={`bi bi-chevron-${dropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '0.8rem', color: '#94a3b8' }}></i>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <strong>{user?.fullName}</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{user?.email}</div>
                <div className="role-tags">
                  {(user?.roles || [primaryRole]).map((r) => (
                    <span key={r} className="tag">{r}</span>
                  ))}
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(false);
                  onChangePasswordClick();
                }}
              >
                <i className="bi bi-key"></i> Đổi mật khẩu
              </button>
              <button
                className="dropdown-item logout"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(false);
                  handleLogout();
                }}
              >
                <i className="bi bi-box-arrow-right"></i> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
