import React from 'react';
import { KeyRound } from 'lucide-react';
import { UserSummary } from '../../types/auth';
import { getRoleLabel } from '../../constants/rbac';

interface ProfileHeaderProps {
  user: UserSummary | null;
  fullName: string;
  isAccountActive: boolean;
  onOpenPasswordModal: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  fullName,
  isAccountActive,
  onOpenPasswordModal,
}) => {
  const displayName = fullName.trim() || user?.fullName || user?.email || 'Người dùng';
  const initial = displayName.charAt(0).toUpperCase();

  const userRolesList =
    user?.roles && user.roles.length > 0
      ? user.roles
      : [user?.role || 'RECRUITER'];

  const rolesSummary = userRolesList.map((r: string) => getRoleLabel(r)).join(' · ');

  return (
    <section className="profile-summary-header" aria-label="Thông tin hồ sơ quản trị viên">
      <div className="profile-header-main">
        {/* Avatar with Status Indicator */}
        <div className="profile-header-avatar-box">
          <div className="profile-header-avatar" aria-label="Ảnh đại diện">
            {initial}
          </div>
          <span
            className={`profile-header-status-dot ${isAccountActive ? 'active' : 'locked'}`}
            title={isAccountActive ? 'Đang hoạt động' : 'Tài khoản tạm khóa'}
          />
        </div>

        {/* Identity & Metadata */}
        <div className="profile-header-info">
          <div className="profile-header-name-row">
            <h1 className="profile-header-name">{displayName}</h1>
          </div>

          <div className="profile-header-email">{user?.email || 'Chưa cập nhật email'}</div>

          <div className="profile-header-roles-text">{rolesSummary}</div>

          <div className="profile-header-status-indicator">
            <span
              className={`status-indicator-dot ${isAccountActive ? 'active' : 'locked'}`}
            />
            <span className="status-indicator-text">
              {isAccountActive ? 'Đang hoạt động' : 'Tài khoản tạm khóa'}
            </span>
          </div>
        </div>
      </div>

      {/* Action: Secondary Change Password Button */}
      <div className="profile-header-actions">
        <button
          type="button"
          className="btn btn-secondary profile-btn-change-password"
          onClick={onOpenPasswordModal}
          title="Đổi mật khẩu tài khoản"
        >
          <KeyRound size={15} />
          <span>Đổi mật khẩu</span>
        </button>
      </div>
    </section>
  );
};

export default ProfileHeader;
