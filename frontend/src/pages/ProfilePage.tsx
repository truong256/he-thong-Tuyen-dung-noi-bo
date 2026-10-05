import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Building2,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Lock,
  ShieldCheck,
  Clock,
  Sparkles,
  Info,
  Check,
  X,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import authApi from '../api/auth';
import { ATS_ROLES_INFO, getRoleLabel } from '../constants/rbac';
import ChangePasswordModal from '../components/auth/ChangePasswordModal';
import '../styles/profile.css';

const DEPARTMENT_PRESETS = [
  'Kỹ thuật & Công nghệ',
  'Tuyển dụng & Nhân sự',
  'Kinh doanh & Tiếp thị',
  'Tài chính - Kế toán',
  'Vận hành & Hỗ trợ',
  'Ban Giám đốc & Quản trị',
];

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'info' | 'rbac' | 'security'>('info');

  // Form states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [department, setDepartment] = useState(user?.department || '');

  // UI status states
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Sync state if user context updates from backend
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setDepartment(user.department || '');
    }
  }, [user]);

  // Check if form has changed from current user data
  const isDirty =
    fullName.trim() !== (user?.fullName || '').trim() ||
    department.trim() !== (user?.department || '').trim();

  const handleReset = () => {
    setFullName(user?.fullName || '');
    setDepartment(user?.department || '');
    setValidationError(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSelectDepartment = (dept: string) => {
    setDepartment(dept);
    if (validationError) setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = fullName.trim();
    const trimmedDept = department.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setValidationError('Họ và tên phải có tối thiểu 2 ký tự.');
      return;
    }

    if (trimmedName.length > 100) {
      setValidationError('Họ và tên không được vượt quá 100 ký tự.');
      return;
    }

    if (trimmedDept.length > 100) {
      setValidationError('Tên phòng ban không được vượt quá 100 ký tự.');
      return;
    }

    setIsSaving(true);
    try {
      await authApi.updateProfile({
        fullName: trimmedName,
        department: trimmedDept || undefined,
      });

      // Refresh current user data across context and localStorage
      await refreshUser();

      setSuccessMsg('Thông tin hồ sơ cá nhân đã được cập nhật thành công!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.validationErrors?.fullName ||
        'Không thể cập nhật hồ sơ cá nhân. Vui lòng thử lại sau.';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const primaryRole =
    user?.roles && user.roles.length > 0
      ? user.roles[0]
      : user?.role || 'RECRUITER';

  const userRolesList = user?.roles && user.roles.length > 0 ? user.roles : [primaryRole];

  // Lookup role metadata for the current user
  const matchingRolesInfo = ATS_ROLES_INFO.filter((r) =>
    userRolesList.some((roleCode) => roleCode.toUpperCase() === r.code.toUpperCase())
  );

  const isAccountActive = user?.status === 'ACTIVE';

  return (
    <div className="profile-page-container" data-testid="profile-page">
      {/* ========================================================
          HERO BANNER: AVATAR & IDENTITY
          ======================================================== */}
      <section className="profile-hero-card" aria-label="Thông tin tổng quan cá nhân">
        <div className="profile-hero-content">
          <div className="profile-hero-main">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-circle" aria-label="Ảnh đại diện">
                {(fullName || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <span
                className={`profile-avatar-badge ${isAccountActive ? 'active' : 'locked'}`}
                title={isAccountActive ? 'Đang hoạt động' : 'Tài khoản tạm khóa'}
              />
            </div>

            <div className="profile-identity">
              <div className="profile-name-row">
                <h1 className="profile-name-title">{fullName || user?.email || 'Người dùng'}</h1>
                <span
                  className={`profile-status-badge ${isAccountActive ? 'active' : 'locked'}`}
                >
                  {isAccountActive ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Đang hoạt động</span>
                    </>
                  ) : (
                    <>
                      <Lock size={13} />
                      <span>Tài khoản tạm khóa</span>
                    </>
                  )}
                </span>
              </div>

              <div className="profile-meta-row">
                <span className="profile-meta-item">
                  <Mail size={15} />
                  <span>{user?.email}</span>
                </span>
                {department && (
                  <span className="profile-meta-item">
                    <Building2 size={15} />
                    <span>{department}</span>
                  </span>
                )}
                <span className="profile-meta-item">
                  <BadgeCheck size={15} />
                  <span>Mã tài khoản: #{user?.id ?? 'N/A'}</span>
                </span>
              </div>

              <div className="profile-roles-strip">
                {userRolesList.map((r) => (
                  <span key={r} className="profile-role-chip">
                    <Shield size={12} />
                    <span>{getRoleLabel(r)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="profile-hero-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsPasswordModalOpen(true)}
              title="Đổi mật khẩu tài khoản"
            >
              <KeyRound size={16} />
              <span>Đổi mật khẩu</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          FEEDBACK ALERTS
          ======================================================== */}
      {successMsg && (
        <div className="profile-alert success" role="alert">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="profile-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================
          NAVIGATION TABS
          ======================================================== */}
      <nav className="profile-tabs-header" aria-label="Các mục hồ sơ">
        <button
          type="button"
          className={`profile-tab-button ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <User size={17} />
          <span>Thông tin cá nhân</span>
        </button>
        <button
          type="button"
          className={`profile-tab-button ${activeTab === 'rbac' ? 'active' : ''}`}
          onClick={() => setActiveTab('rbac')}
        >
          <ShieldCheck size={17} />
          <span>Vai trò & Quyền hạn</span>
        </button>
        <button
          type="button"
          className={`profile-tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={17} />
          <span>Bảo mật & Phiên làm việc</span>
        </button>
      </nav>

      {/* ========================================================
          TAB 1: PERSONAL INFORMATION & EDIT FORM
          ======================================================== */}
      {activeTab === 'info' && (
        <div className="profile-cards-grid">
          {/* Main Edit Form */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div>
                <h2 className="profile-card-title">
                  <User size={19} className="profile-card-title-icon" />
                  <span>Chỉnh sửa thông tin cá nhân</span>
                </h2>
                <p className="profile-card-subtitle">
                  Cập nhật họ tên hiển thị và phòng ban công tác trong hệ thống tuyển dụng.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="profile-form-grid">
                {/* Full Name */}
                <div className="profile-field-group profile-form-full">
                  <label htmlFor="profile-fullName">
                    <span>Họ và tên</span>
                    <span className="required-star">*</span>
                  </label>
                  <div className="profile-field-input-wrapper">
                    <User size={17} className="profile-field-icon" />
                    <input
                      id="profile-fullName"
                      type="text"
                      className="profile-input"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (validationError) setValidationError(null);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="Nhập họ và tên đầy đủ..."
                      disabled={isSaving}
                      required
                    />
                  </div>
                  {validationError && (
                    <span className="profile-field-error">{validationError}</span>
                  )}
                  <span className="profile-field-helper">
                    Họ tên hiển thị trên danh sách phỏng vấn, trao đổi tuyển dụng và đề xuất.
                  </span>
                </div>

                {/* Department */}
                <div className="profile-field-group profile-form-full">
                  <label htmlFor="profile-department">
                    <span>Phòng ban / Bộ phận</span>
                  </label>
                  <div className="profile-field-input-wrapper">
                    <Building2 size={17} className="profile-field-icon" />
                    <input
                      id="profile-department"
                      type="text"
                      className="profile-input"
                      value={department}
                      onChange={(e) => {
                        setDepartment(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="Ví dụ: Kỹ thuật & Công nghệ, Tuyển dụng & Nhân sự..."
                      disabled={isSaving}
                    />
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="dept-suggestions-wrapper">
                    <span className="dept-suggestions-title">Gợi ý phòng ban phổ biến:</span>
                    <div className="dept-chips-list">
                      {DEPARTMENT_PRESETS.map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          className={`dept-chip-btn ${department === dept ? 'selected' : ''}`}
                          onClick={() => handleSelectDepartment(dept)}
                          disabled={isSaving}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Email Address (Read-only) */}
                <div className="profile-field-group">
                  <label htmlFor="profile-email">
                    <span>Địa chỉ Email</span>
                  </label>
                  <div className="profile-field-input-wrapper">
                    <Mail size={17} className="profile-field-icon" />
                    <input
                      id="profile-email"
                      type="email"
                      className="profile-input"
                      value={user?.email || ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <span className="profile-field-helper">
                    Email là định danh tài khoản duy nhất, quản lý bởi Quản trị viên.
                  </span>
                </div>

                {/* System Roles (Read-only) */}
                <div className="profile-field-group">
                  <label htmlFor="profile-role">
                    <span>Vai trò chính</span>
                  </label>
                  <div className="profile-field-input-wrapper">
                    <Shield size={17} className="profile-field-icon" />
                    <input
                      id="profile-role"
                      type="text"
                      className="profile-input"
                      value={getRoleLabel(primaryRole)}
                      disabled
                      readOnly
                    />
                  </div>
                  <span className="profile-field-helper">
                    Phân quyền theo vai trò RBAC được cấp bởi Quản trị viên hệ thống.
                  </span>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="profile-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReset}
                  disabled={!isDirty || isSaving}
                >
                  <RotateCcw size={15} />
                  <span>Khôi phục</span>
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!isDirty || isSaving}
                >
                  {isSaving ? (
                    <>
                      <span
                        className="auth-spinner"
                        style={{ width: 15, height: 15, borderTopColor: '#fff' }}
                      />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Info & Security Sidebar Card */}
          <div className="profile-summary-card">
            <h3 className="profile-card-title" style={{ marginBottom: '18px' }}>
              <Sparkles size={18} className="profile-card-title-icon" />
              <span>Tổng quan tài khoản</span>
            </h3>

            <div className="profile-quick-stats">
              <div className="profile-stat-row">
                <span className="profile-stat-label">
                  <Clock size={16} />
                  <span>Thời lượng phiên:</span>
                </span>
                <span className="profile-stat-value">60 phút</span>
              </div>

              <div className="profile-stat-row">
                <span className="profile-stat-label">
                  <ShieldCheck size={16} />
                  <span>Phiên làm mới (Refresh):</span>
                </span>
                <span className="profile-stat-value">7 ngày</span>
              </div>

              <div className="profile-stat-row">
                <span className="profile-stat-label">
                  <Lock size={16} />
                  <span>Chính sách bảo vệ:</span>
                </span>
                <span className="profile-stat-value">Khóa 15m sau 5 lần sai</span>
              </div>

              <div className="profile-stat-row">
                <span className="profile-stat-label">
                  <BadgeCheck size={16} />
                  <span>Tiêu chuẩn bảo mật:</span>
                </span>
                <span className="profile-stat-value">BCrypt / ISO 27001</span>
              </div>
            </div>

            <div className="security-callout-box">
              <Info size={19} className="security-callout-icon" />
              <div className="security-callout-content">
                <h4>Chính sách dữ liệu nội bộ</h4>
                <p>
                  Thông tin hồ sơ của bạn được hiển thị trong quy trình phân công phỏng vấn,
                  duyệt yêu cầu tuyển dụng và phê duyệt đề xuất (offer).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: RBAC ROLES & PERMISSIONS BREAKDOWN
          ======================================================== */}
      {activeTab === 'rbac' && (
        <div className="profile-card">
          <div className="profile-card-header">
            <div>
              <h2 className="profile-card-title">
                <ShieldCheck size={20} className="profile-card-title-icon" />
                <span>Phân quyền vai trò RBAC (Role-Based Access Control)</span>
              </h2>
              <p className="profile-card-subtitle">
                Chi tiết danh mục trách nhiệm và quyền thao tác được gán cho tài khoản của bạn.
              </p>
            </div>
          </div>

          {matchingRolesInfo.length > 0 ? (
            matchingRolesInfo.map((roleInfo) => (
              <div key={roleInfo.code} className="rbac-role-card">
                <div className="rbac-role-card-header">
                  <div className="rbac-role-title-group">
                    <span className="profile-role-chip">
                      <Shield size={14} />
                      <span className="rbac-role-name">{roleInfo.name}</span>
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      ({roleInfo.code})
                    </span>
                  </div>
                </div>

                <p className="rbac-role-description">{roleInfo.description}</p>

                <table className="rbac-permissions-table">
                  <thead>
                    <tr>
                      <th>Hạng mục nghiệp vụ</th>
                      <th>Phạm vi chức năng</th>
                      <th style={{ width: '140px' }}>Trạng thái cấp quyền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Quản lý Tài khoản & Phân quyền</td>
                      <td>Thêm người dùng, gán vai trò, quản lý khóa tài khoản</td>
                      <td>
                        {roleInfo.permissions.userManagement ? (
                          <span className="rbac-perm-granted">
                            <Check size={13} /> Được phép
                          </span>
                        ) : (
                          <span className="rbac-perm-denied">
                            <X size={13} /> Không cấp
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Đăng tin & Vị trí tuyển dụng</td>
                      <td>Khởi tạo, duyệt và công bố tin tuyển dụng lên cổng nội bộ</td>
                      <td>
                        {roleInfo.permissions.jobPosting ? (
                          <span className="rbac-perm-granted">
                            <Check size={13} /> Được phép
                          </span>
                        ) : (
                          <span className="rbac-perm-denied">
                            <X size={13} /> Không cấp
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Tiếp nhận & Quản lý Pipeline ứng viên</td>
                      <td>Xem hồ sơ ứng viên, lọc CV và chuyển vòng tuyển dụng</td>
                      <td>
                        {roleInfo.permissions.candidateView ? (
                          <span className="rbac-perm-granted">
                            <Check size={13} /> Được phép
                          </span>
                        ) : (
                          <span className="rbac-perm-denied">
                            <X size={13} /> Không cấp
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Phỏng vấn & Đánh giá năng lực</td>
                      <td>Tham gia lịch phỏng vấn và nhập phiếu chấm điểm ứng viên</td>
                      <td>
                        {roleInfo.permissions.interviewEvaluation ? (
                          <span className="rbac-perm-granted">
                            <Check size={13} /> Được phép
                          </span>
                        ) : (
                          <span className="rbac-perm-denied">
                            <X size={13} /> Không cấp
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Phê duyệt Yêu cầu & Offer</td>
                      <td>Duyệt yêu cầu tuyển dụng mới và duyệt chế độ đãi ngộ offer</td>
                      <td>
                        {roleInfo.permissions.offerApproval ? (
                          <span className="rbac-perm-granted">
                            <Check size={13} /> Được phép
                          </span>
                        ) : (
                          <span className="rbac-perm-denied">
                            <X size={13} /> Không cấp
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Nộp hồ sơ Ứng tuyển nội bộ</td>
                      <td>Nộp đơn ứng tuyển các vị trí luân chuyển nội bộ</td>
                      <td>
                        {roleInfo.permissions.candidateApply ? (
                          <span className="rbac-perm-granted">
                            <Check size={13} /> Được phép
                          </span>
                        ) : (
                          <span className="rbac-perm-denied">
                            <X size={13} /> Không cấp
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <div className="profile-alert" style={{ background: '#f8fafc', color: '#475569' }}>
              <Info size={18} />
              <span>Chưa tìm thấy chi tiết quyền hạn cụ thể cho vai trò hiện tại.</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: SECURITY & SESSION SPECS
          ======================================================== */}
      {activeTab === 'security' && (
        <div className="profile-card">
          <div className="profile-card-header">
            <div>
              <h2 className="profile-card-title">
                <Lock size={20} className="profile-card-title-icon" />
                <span>Bảo mật tài khoản & Phiên làm việc</span>
              </h2>
              <p className="profile-card-subtitle">
                Kiểm soát mật khẩu, chính sách xác thực và các quy định an toàn hệ thống.
              </p>
            </div>
          </div>

          <div className="security-cards-grid">
            {/* Password Management */}
            <div className="security-panel-item">
              <div>
                <h4>
                  <KeyRound size={18} style={{ color: '#2563eb' }} />
                  <span>Mật khẩu tài khoản</span>
                </h4>
                <p>
                  Mật khẩu được mã hóa an toàn bằng thuật toán BCrypt với độ mạnh 12 vòng lặp,
                  đáp ứng tiêu chuẩn ISO 27001.
                </p>

                <div className="security-pill-badges">
                  <div className="security-pill">
                    <span>Độ dài tối thiểu:</span>
                    <span>8 ký tự</span>
                  </div>
                  <div className="security-pill">
                    <span>Yêu cầu ký tự:</span>
                    <span>Chữ cái và Chữ số</span>
                  </div>
                  <div className="security-pill">
                    <span>Khuyến nghị đổi định kỳ:</span>
                    <span>90 ngày</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                <KeyRound size={15} />
                <span>Đổi mật khẩu ngay</span>
              </button>
            </div>

            {/* Session Management */}
            <div className="security-panel-item">
              <div>
                <h4>
                  <Clock size={18} style={{ color: '#059669' }} />
                  <span>Phiên đăng nhập & Token</span>
                </h4>
                <p>
                  Hệ thống sử dụng cơ chế bảo mật kép Access Token và Refresh Token, đảm bảo
                  phiên làm việc an toàn và hạn chế rủi ro lộ lọt.
                </p>

                <div className="security-pill-badges">
                  <div className="security-pill">
                    <span>Hiệu lực Access Token:</span>
                    <span>60 phút</span>
                  </div>
                  <div className="security-pill">
                    <span>Hiệu lực Refresh Token:</span>
                    <span>7 ngày</span>
                  </div>
                  <div className="security-pill">
                    <span>Khóa tự động chống brute-force:</span>
                    <span>15 phút (sau 5 lần sai)</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#059669',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} />
                <span>Phiên làm việc hiện tại đang được mã hóa an toàn</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg('Mật khẩu của bạn đã được thay đổi thành công!');
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />
    </div>
  );
};

export default ProfilePage;
