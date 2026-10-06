import React from 'react';
import { Save, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserSummary } from '../../types/auth';
import { getRoleLabel } from '../../constants/rbac';

interface PersonalInfoTabProps {
  user: UserSummary | null;
  fullName: string;
  department: string;
  phone: string;
  displayName: string;
  isSaving: boolean;
  validationError: string | null;
  errorMsg: string | null;
  successMsg: string | null;
  onFullNameChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onDisplayNameChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

export const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
  user,
  fullName,
  department,
  phone,
  displayName,
  isSaving,
  validationError,
  errorMsg,
  successMsg,
  onFullNameChange,
  onPhoneChange,
  onDisplayNameChange,
  onSubmit,
  onReset,
}) => {
  const isDirty =
    fullName.trim() !== (user?.fullName || '').trim() ||
    phone.trim() !== (user?.phone || '').trim() ||
    displayName.trim() !== (user?.displayName || '').trim();

  const primaryRole =
    user?.roles && user.roles.length > 0
      ? user.roles[0]
      : user?.role || 'RECRUITER';

  return (
    <div className="profile-personal-info-card" role="tabpanel" id="panel-info" aria-labelledby="tab-info">
      {/* Card Header */}
      <div className="profile-card-header-clean">
        <div className="profile-card-title-group">
          <h2 className="profile-section-title">Thông tin cá nhân</h2>
          <p className="profile-section-desc">
            Cập nhật họ tên, số điện thoại và chức danh hiển thị.
          </p>
        </div>
        {user?.id && (
          <div className="profile-account-id-badge" title="Mã định danh kỹ thuật trong cơ sở dữ liệu">
            Mã tài khoản: #{user.id}
          </div>
        )}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="profile-alert success" role="alert">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="profile-alert error" role="alert">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={onSubmit} noValidate className="profile-form">
        {/* Full Name */}
        <div className="profile-form-group">
          <label htmlFor="profile-fullName" className="profile-form-label">
            Họ và tên <span className="profile-required-mark">*</span>
          </label>
          <div className="profile-input-wrapper">
            <input
              id="profile-fullName"
              type="text"
              className={`profile-form-input ${validationError ? 'is-invalid' : ''}`}
              value={fullName}
              onChange={(e) => onFullNameChange(e.target.value)}
              placeholder="Nhập họ và tên đầy đủ..."
              disabled={isSaving}
              autoComplete="name"
              required
            />
          </div>
          {validationError && (
            <div className="profile-form-error-msg">{validationError}</div>
          )}
          <div className="profile-form-helper">
            Họ tên chính thức hiển thị trên danh sách phỏng vấn, hồ sơ tuyển dụng và phê duyệt.
          </div>
        </div>

        {/* Contact and display title */}
        <div className="profile-form-group">
          <label htmlFor="profile-phone" className="profile-form-label">
            Số điện thoại
          </label>
          <div className="profile-input-wrapper">
            <input id="profile-phone" type="tel" className="profile-form-input" value={phone}
              onChange={(e) => onPhoneChange(e.target.value)} placeholder="0912345678" disabled={isSaving}
              autoComplete="tel" inputMode="tel" />
          </div>
        </div>
        <div className="profile-form-group">
          <label htmlFor="profile-displayName" className="profile-form-label">Chức danh hiển thị</label>
          <div className="profile-input-wrapper">
            <input id="profile-displayName" type="text" className="profile-form-input" value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)} disabled={isSaving} maxLength={150} />
          </div>
        </div>

        {/* Protected fields are displayed for reference only. */}
        <div className="profile-form-group">
          <label htmlFor="profile-department" className="profile-form-label">Phòng ban</label>
          <div className="profile-input-wrapper is-readonly">
            <input id="profile-department" type="text" className="profile-form-input is-readonly"
              value={department} readOnly disabled />
          </div>
        </div>

        {/* 2-Column Read-only Fields: Email and Primary Role */}
        <div className="profile-form-row-2col">
          {/* Email (Read-only) */}
          <div className="profile-form-group">
            <label htmlFor="profile-email" className="profile-form-label">
              Email
            </label>
            <div className="profile-input-wrapper is-readonly">
              <input
                id="profile-email"
                type="email"
                className="profile-form-input is-readonly"
                value={user?.email || ''}
                readOnly
                disabled
              />
            </div>
            <div className="profile-form-helper">
              Email đăng nhập được quản lý bởi Quản trị hệ thống.
            </div>
          </div>

          {/* Primary Role (Read-only) */}
          <div className="profile-form-group">
            <label htmlFor="profile-role" className="profile-form-label">
              Vai trò chính
            </label>
            <div className="profile-input-wrapper is-readonly">
              <input
                id="profile-role"
                type="text"
                className="profile-form-input is-readonly"
                value={getRoleLabel(primaryRole)}
                readOnly
                disabled
              />
            </div>
            <div className="profile-form-helper">
              Vai trò được quản lý trong mục Vai trò & Quyền hạn.
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="profile-form-actions-clean">
          <button
            type="button"
            className="btn btn-secondary profile-btn-action"
            onClick={onReset}
            disabled={!isDirty || isSaving}
          >
            <RotateCcw size={14} />
            <span>Hủy thay đổi</span>
          </button>

          <button
            type="submit"
            className="btn btn-primary profile-btn-action"
            disabled={!isDirty || isSaving}
          >
            {isSaving ? (
              <>
                <span className="auth-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonalInfoTab;
