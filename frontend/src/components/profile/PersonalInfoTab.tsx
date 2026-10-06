import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserSummary } from '../../types/auth';
import { getRoleLabel } from '../../constants/rbac';
import organizationApi from '../../api/organization';

const DEFAULT_DEPARTMENT_PRESETS = [
  'Kỹ thuật & Công nghệ',
  'Tuyển dụng & Nhân sự',
  'Kinh doanh & Tiếp thị',
  'Tài chính - Kế toán',
  'Vận hành & Hỗ trợ',
  'Ban Giám đốc & Quản trị',
];

interface PersonalInfoTabProps {
  user: UserSummary | null;
  fullName: string;
  department: string;
  isSaving: boolean;
  validationError: string | null;
  errorMsg: string | null;
  successMsg: string | null;
  onFullNameChange: (val: string) => void;
  onDepartmentChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

export const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
  user,
  fullName,
  department,
  isSaving,
  validationError,
  errorMsg,
  successMsg,
  onFullNameChange,
  onDepartmentChange,
  onSubmit,
  onReset,
}) => {
  const [departmentsList, setDepartmentsList] = useState<string[]>(DEFAULT_DEPARTMENT_PRESETS);
  const [loadingDepts, setLoadingDepts] = useState(false);

  // Fetch real departments from backend if available
  useEffect(() => {
    let isMounted = true;
    const loadDepartments = async () => {
      setLoadingDepts(true);
      try {
        const depts = await organizationApi.getDepartments();
        if (isMounted && Array.isArray(depts) && depts.length > 0) {
          const names = depts.map((d) => d.name).filter(Boolean);
          // Merge unique with presets
          const merged = Array.from(new Set([...names, ...DEFAULT_DEPARTMENT_PRESETS]));
          setDepartmentsList(merged);
        }
      } catch {
        // Silently keep default presets if API call is unauthenticated or fails
      } finally {
        if (isMounted) setLoadingDepts(false);
      }
    };
    loadDepartments();
    return () => {
      isMounted = false;
    };
  }, []);

  const isDirty =
    fullName.trim() !== (user?.fullName || '').trim() ||
    department.trim() !== (user?.department || '').trim();

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
            Cập nhật họ tên hiển thị và phòng ban công tác trong hệ thống tuyển dụng nội bộ.
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

        {/* Department Selection */}
        <div className="profile-form-group">
          <label htmlFor="profile-department" className="profile-form-label">
            Phòng ban
          </label>
          <div className="profile-dept-select-container">
            <select
              id="profile-department-select"
              aria-label="Danh mục cơ cấu tổ chức"
              className="profile-form-select"
              value={departmentsList.includes(department) ? department : ''}
              onChange={(e) => {
                if (e.target.value) {
                  onDepartmentChange(e.target.value);
                }
              }}
              disabled={isSaving || loadingDepts}
            >
              <option value="">-- Chọn từ danh mục phòng ban --</option>
              {departmentsList.map((deptName) => (
                <option key={deptName} value={deptName}>
                  {deptName}
                </option>
              ))}
            </select>

            {/* Freeform input if custom */}
            <div className="profile-input-wrapper" style={{ marginTop: '8px' }}>
              <input
                id="profile-department"
                type="text"
                className="profile-form-input"
                value={department}
                onChange={(e) => onDepartmentChange(e.target.value)}
                placeholder="Hoặc nhập tên phòng ban cụ thể nếu không có trong danh sách..."
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Quick preset chips for rapid selection and test compatibility */}
          <div className="profile-dept-quick-chips">
            <span className="profile-dept-chips-label">Gợi ý phòng ban:</span>
            <div className="profile-dept-chips-group">
              {DEFAULT_DEPARTMENT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`profile-dept-chip ${department === preset ? 'selected' : ''}`}
                  onClick={() => onDepartmentChange(preset)}
                  disabled={isSaving}
                >
                  {preset}
                </button>
              ))}
            </div>
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
