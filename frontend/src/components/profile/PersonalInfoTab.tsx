import React from 'react';
import { AlertCircle } from 'lucide-react';
import { UserSummary } from '../../types/auth';
import { getRoleLabel } from '../../constants/rbac';

export interface ProfileFieldErrors {
  fullName?: string;
  phone?: string;
  displayName?: string;
  recoveryEmail?: string;
}

interface PersonalInfoTabProps {
  user: UserSummary | null;
  fullName: string;
  department: string;
  phone: string;
  displayName: string;
  recoveryEmail?: string;
  isSaving: boolean;
  fieldErrors?: ProfileFieldErrors;
  validationError?: string | null;
  errorMsg: string | null;
  successMsg: string | null;
  onFullNameChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onDisplayNameChange: (val: string) => void;
  onRecoveryEmailChange?: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

export const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
  user,
  fullName,
  department,
  phone,
  displayName,
  recoveryEmail = '',
  isSaving,
  fieldErrors,
  validationError,
  errorMsg,
  onFullNameChange,
  onPhoneChange,
  onDisplayNameChange,
  onRecoveryEmailChange,
  onSubmit,
  onReset,
}) => {
  const isDirty =
    fullName.trim() !== (user?.fullName || '').trim() ||
    phone.trim() !== (user?.phone || '').trim() ||
    displayName.trim() !== (user?.displayName || '').trim() ||
    department.trim() !== (user?.department || '').trim() ||
    recoveryEmail.trim() !== (user?.recoveryEmail || '').trim();

  const primaryRole =
    user?.roles && user.roles.length > 0
      ? user.roles[0]
      : user?.role || 'RECRUITER';

  // Field-specific error mapping
  const fullNameError =
    fieldErrors?.fullName ||
    (validationError && validationError.includes('Họ và tên') ? validationError : undefined);

  const phoneError =
    fieldErrors?.phone ||
    (validationError && (validationError.includes('Số điện thoại') || validationError.includes('điện thoại'))
      ? validationError
      : undefined);

  const displayNameError =
    fieldErrors?.displayName ||
    (validationError && validationError.includes('Chức danh') ? validationError : undefined);

  const recoveryEmailError =
    fieldErrors?.recoveryEmail ||
    (validationError && (validationError.includes('Email khôi phục') || validationError.includes('khôi phục'))
      ? validationError
      : undefined);

  // Unmapped fallback error
  const unmappedError =
    validationError &&
    !fullNameError &&
    !phoneError &&
    !displayNameError &&
    !recoveryEmailError
      ? validationError
      : null;

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
      {errorMsg && (
        <div className="profile-alert error" role="alert">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {unmappedError && (
        <div className="profile-alert error" role="alert">
          <AlertCircle size={16} />
          <span>{unmappedError}</span>
        </div>
      )}

      {/* Main Form with 2-Column Responsive Groups */}
      <form onSubmit={onSubmit} noValidate className="profile-form">
        {/* Row 1: Họ và tên & Chức danh hiển thị */}
        <div className="profile-form-row-2col">
          <div className="profile-form-group">
            <label htmlFor="profile-fullName" className="profile-form-label">
              Họ và tên <span className="profile-required-mark">*</span>
            </label>
            <div className="profile-input-wrapper">
              <input
                id="profile-fullName"
                type="text"
                className={`profile-form-input ${fullNameError ? 'is-invalid' : ''}`}
                value={fullName}
                onChange={(e) => onFullNameChange(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ..."
                disabled={isSaving}
                autoComplete="name"
                required
              />
            </div>
            {fullNameError && (
              <div className="profile-form-error-msg">
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{fullNameError}</span>
              </div>
            )}
            <div className="profile-form-helper">
              Họ tên chính thức hiển thị trên danh sách phỏng vấn, hồ sơ tuyển dụng.
            </div>
          </div>

          <div className="profile-form-group">
            <label htmlFor="profile-displayName" className="profile-form-label">
              Chức danh hiển thị
            </label>
            <div className="profile-input-wrapper">
              <input
                id="profile-displayName"
                type="text"
                className={`profile-form-input ${displayNameError ? 'is-invalid' : ''}`}
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                disabled={isSaving}
                maxLength={150}
                placeholder="Ví dụ: Quản trị viên hệ thống, Chuyên viên tuyển dụng..."
              />
            </div>
            {displayNameError && (
              <div className="profile-form-error-msg">
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{displayNameError}</span>
              </div>
            )}
            <div className="profile-form-helper">
              Chức danh hiển thị trên danh thiếp và hồ sơ nội bộ.
            </div>
          </div>
        </div>

        {/* Row 2: Số điện thoại & Phòng ban */}
        <div className="profile-form-row-2col">
          <div className="profile-form-group">
            <label htmlFor="profile-phone" className="profile-form-label">
              Số điện thoại
            </label>
            <div className="profile-input-wrapper">
              <input
                id="profile-phone"
                type="tel"
                className={`profile-form-input ${phoneError ? 'is-invalid' : ''}`}
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="0912345678"
                disabled={isSaving}
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
            {phoneError && (
              <div className="profile-form-error-msg">
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{phoneError}</span>
              </div>
            )}
            <div className="profile-form-helper">
              Số điện thoại liên hệ cá nhân (10 chữ số, ví dụ: 0912345678).
            </div>
          </div>

          <div className="profile-form-group">
            <label htmlFor="profile-department" className="profile-form-label">Phòng ban</label>
            <div className="profile-input-wrapper is-readonly">
              <input
                id="profile-department"
                type="text"
                className="profile-form-input is-readonly"
                value={department}
                readOnly
                disabled
              />
            </div>
            <div className="profile-form-helper">
              Phòng ban được quản lý bởi cơ cấu tổ chức doanh nghiệp.
            </div>
          </div>
        </div>

        {/* Row 3: Email đăng nhập & Email khôi phục */}
        <div className="profile-form-row-2col">
          <div className="profile-form-group">
            <label htmlFor="profile-email" className="profile-form-label">
              Email đăng nhập
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

          <div className="profile-form-group">
            <label htmlFor="profile-recovery-email" className="profile-form-label">
              Email khôi phục
            </label>
            <div className="profile-input-wrapper">
              <input
                id="profile-recovery-email"
                type="email"
                className={`profile-form-input ${recoveryEmailError ? 'is-invalid' : ''}`}
                value={recoveryEmail}
                onChange={(e) => onRecoveryEmailChange && onRecoveryEmailChange(e.target.value)}
                placeholder="Ví dụ: myemail@gmail.com"
                disabled={isSaving}
                autoComplete="email"
              />
            </div>
            {recoveryEmailError && (
              <div className="profile-form-error-msg">
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{recoveryEmailError}</span>
              </div>
            )}
            <div className="profile-form-helper">
              Email khôi phục chỉ dùng để nhận liên kết đặt lại mật khẩu và không dùng để đăng nhập.
            </div>
          </div>
        </div>

        {/* Row 4: Vai trò chính (Read-only) */}
        <div className="profile-form-group" style={{ marginTop: '4px' }}>
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

        {/* Action Bar - Clean Minimalist Text Buttons */}
        <div className="profile-form-actions-clean">
          <button
            type="button"
            className="btn btn-secondary profile-btn-action"
            onClick={onReset}
            disabled={!isDirty || isSaving}
          >
            Hủy thay đổi
          </button>

          <button
            type="submit"
            className="btn btn-primary profile-btn-action"
            disabled={!isDirty || isSaving}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonalInfoTab;
