import React from 'react';

export type ProfileTabType = 'info' | 'rbac' | 'security';

interface ProfileTabsProps {
  activeTab: ProfileTabType;
  onTabChange: (tab: ProfileTabType) => void;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { key: ProfileTabType; label: string }[] = [
    { key: 'info', label: 'Thông tin cá nhân' },
    { key: 'rbac', label: 'Vai trò & Quyền hạn' },
    { key: 'security', label: 'Bảo mật & Phiên làm việc' },
  ];

  return (
    <nav className="profile-tabs-nav" aria-label="Các mục hồ sơ" role="tablist">
      <div className="profile-tabs-list">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              id={`tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              className={`profile-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.key)}
            >
              <span>{tab.label}</span>
              {isActive && <span className="profile-tab-indicator" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default ProfileTabs;
