import React, { useState } from 'react';
import { Shield, ShieldAlert, X, Check } from 'lucide-react';
import { UserSummary } from '../../types/user';
import adminApi from '../../api/admin';
import { ATS_ROLES_INFO } from '../../constants/rbac';

interface RoleAssignmentModalProps {
  isOpen: boolean;
  user: UserSummary | null;
  currentLoggedInUserEmail?: string;
  onClose: () => void;
  onSuccess: (updatedUser: UserSummary) => void;
  onError: (msg: string) => void;
}

export const RoleAssignmentModal: React.FC<RoleAssignmentModalProps> = ({
  isOpen,
  user,
  currentLoggedInUserEmail,
  onClose,
  onSuccess,
  onError,
}) => {
  const initialRoles = user?.roles && user.roles.length > 0 ? user.roles : (user?.role ? [user.role] : ['RECRUITER']);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminWarning, setShowAdminWarning] = useState(false);

  if (!isOpen || !user) return null;

  // Check if target user is current admin editing themselves
  const isSelf = currentLoggedInUserEmail && user.email.toLowerCase() === currentLoggedInUserEmail.toLowerCase();
  const hadAdminInitially = initialRoles.includes('ADMIN');

  const handleToggleRole = (roleCode: string) => {
    // If self editing and trying to remove ADMIN: protect admin from locking self out
    if (isSelf && hadAdminInitially && roleCode === 'ADMIN') {
      return;
    }

    if (selectedRoles.includes(roleCode)) {
      if (selectedRoles.length === 1) {
        // Must keep at least one role
        return;
      }
      setSelectedRoles(selectedRoles.filter((r) => r !== roleCode));
    } else {
      setSelectedRoles([...selectedRoles, roleCode]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length === 0) {
      onError('Người dùng phải có ít nhất 1 vai trò hệ thống.');
      return;
    }

    // If adding or removing ADMIN role, confirm if not acknowledged
    const willHaveAdmin = selectedRoles.includes('ADMIN');
    if (willHaveAdmin !== hadAdminInitially && !showAdminWarning) {
      setShowAdminWarning(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await adminApi.updateRoles(user.id, { roles: selectedRoles });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể cập nhật vai trò người dùng.';
      onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="role-modal-title">
      <div className="modal-box role-assignment-modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="modal-title-icon rbac">
              <Shield size={20} />
            </div>
            <div>
              <h3 id="role-modal-title" style={{ margin: 0 }}>Phân vai trò RBAC</h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Gán hoặc thu hồi vai trò cho <strong>{user.email}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Current Roles Display */}
          <div className="current-roles-banner">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              Vai trò hiện tại:
            </span>
            <div className="role-tags" style={{ display: 'inline-flex', marginLeft: '8px' }}>
              {initialRoles.map((r) => (
                <span key={r} className="tag tag-sm">
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Warning banner when self editing admin */}
          {isSelf && hadAdminInitially && (
            <div className="alert-box info" style={{ margin: '12px 0 16px' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem' }}>
                Bạn đang phân quyền cho chính tài khoản của mình. Quyền <strong>ADMIN</strong> được giữ cố định để bảo vệ phiên quản trị.
              </span>
            </div>
          )}

          {/* Admin role change confirmation banner */}
          {showAdminWarning && (
            <div className="alert-box error" style={{ margin: '12px 0 16px' }}>
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem' }}>
                <strong>Lưu ý quan trọng:</strong> Bạn đang thay đổi quyền <strong>ADMIN (Quản trị viên)</strong> cho tài khoản này. Nhấn <strong>Xác nhận lưu</strong> để tiếp tục.
              </span>
            </div>
          )}

          <div style={{ margin: '14px 0 8px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
              Chọn các vai trò áp dụng ({selectedRoles.length} vai trò đã chọn):
            </span>
          </div>

          {/* Role Checkbox List */}
          <div className="role-checklist">
            {ATS_ROLES_INFO.map((role) => {
              const isChecked = selectedRoles.includes(role.code);
              const isSelfAdmin = isSelf && hadAdminInitially && role.code === 'ADMIN';

              return (
                <div
                  key={role.code}
                  className={`role-select-card ${isChecked ? 'selected' : ''} ${isSelfAdmin ? 'disabled' : ''}`}
                  onClick={() => !isSelfAdmin && handleToggleRole(role.code)}
                >
                  <div className="role-select-checkbox">
                    <input
                      type="checkbox"
                      id={`role-${role.code}`}
                      checked={isChecked}
                      disabled={isSelfAdmin || isSubmitting}
                      onChange={() => handleToggleRole(role.code)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="role-select-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>{role.name}</strong>
                      <span className={`tag ${role.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                        {role.code}
                      </span>
                      {isSelfAdmin && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                          (Cố định)
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                      {role.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || selectedRoles.length === 0}
            >
              {isSubmitting ? (
                <>
                  <span className="auth-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                  <span>Đang lưu...</span>
                </>
              ) : showAdminWarning ? (
                <>
                  <Check size={16} />
                  <span>Xác nhận lưu thay đổi</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Lưu vai trò</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleAssignmentModal;
