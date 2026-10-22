import React from 'react';
import { Shield, Check, X, Info } from 'lucide-react';
import { UserSummary } from '../../types/auth';
import { ATS_ROLES_INFO, getRoleLabel } from '../../constants/rbac';

interface RolesPermissionsTabProps {
  user: UserSummary | null;
}

export const RolesPermissionsTab: React.FC<RolesPermissionsTabProps> = ({ user }) => {
  const primaryRole =
    user?.roles && user.roles.length > 0
      ? user.roles[0]
      : user?.role || 'RECRUITER';

  const userRolesList =
    user?.roles && user.roles.length > 0 ? user.roles : [primaryRole];

  // Lookup matching role descriptions and permissions
  const matchingRolesInfo = ATS_ROLES_INFO.filter((r) =>
    userRolesList.some((roleCode: string) => roleCode.toUpperCase() === r.code.toUpperCase())
  );

  return (
    <div className="profile-roles-card" role="tabpanel" id="panel-rbac" aria-labelledby="tab-rbac">
      {/* Assigned Roles Section */}
      <div className="profile-card-header-clean">
        <div className="profile-card-title-group">
          <h2 className="profile-section-title">Vai trò được cấp</h2>
          <p className="profile-section-desc">
            Danh sách các vai trò hệ thống hiện được phân quyền cho tài khoản này.
          </p>
        </div>
      </div>

      <div className="profile-assigned-roles-list">
        {userRolesList.map((roleCode: string, idx: number) => {
          const isPrimary = idx === 0;
          return (
            <div key={roleCode} className={`profile-assigned-role-item ${isPrimary ? 'primary' : ''}`}>
              <div className="profile-assigned-role-badge">
                <Shield size={14} />
                <span>{getRoleLabel(roleCode)}</span>
              </div>
              {isPrimary && (
                <span className="profile-primary-role-tag">Vai trò chính</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Permissions Breakdown Section */}
      <div className="profile-rbac-breakdown-section">
        <div className="profile-card-header-clean" style={{ marginTop: '24px' }}>
          <div className="profile-card-title-group">
            <h3 className="profile-section-subtitle">
              Phân quyền vai trò RBAC (Role-Based Access Control)
            </h3>
            <p className="profile-section-desc">
              Chi tiết danh mục trách nhiệm và quyền thao tác được gán cho tài khoản của bạn.
            </p>
          </div>
        </div>

        {matchingRolesInfo.length > 0 ? (
          matchingRolesInfo.map((roleInfo) => (
            <div key={roleInfo.code} className="profile-role-detail-box">
              <div className="profile-role-detail-header">
                <div className="profile-role-header-title">
                  <span className="profile-role-name-bold">{roleInfo.name}</span>
                  <span className="profile-role-code-pill">({roleInfo.code})</span>
                </div>
                <p className="profile-role-desc-text">{roleInfo.description}</p>
              </div>

              <div className="profile-permissions-table-wrapper">
                <table className="profile-clean-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Hạng mục nghiệp vụ</th>
                      <th style={{ width: '52%' }}>Phạm vi chức năng</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Trạng thái cấp quyền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-medium">Quản lý Tài khoản & Phân quyền</td>
                      <td className="text-secondary">Thêm người dùng, gán vai trò, quản lý khóa tài khoản</td>
                      <td style={{ textAlign: 'right' }}>
                        {roleInfo.permissions.userManagement ? (
                          <span className="perm-status-badge granted">
                            <Check size={13} />
                            <span>Được phép</span>
                          </span>
                        ) : (
                          <span className="perm-status-badge denied">
                            <X size={13} />
                            <span>Không cấp</span>
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium">Đăng tin & Vị trí tuyển dụng</td>
                      <td className="text-secondary">Khởi tạo, duyệt và công bố tin tuyển dụng lên cổng nội bộ</td>
                      <td style={{ textAlign: 'right' }}>
                        {roleInfo.permissions.jobPosting ? (
                          <span className="perm-status-badge granted">
                            <Check size={13} />
                            <span>Được phép</span>
                          </span>
                        ) : (
                          <span className="perm-status-badge denied">
                            <X size={13} />
                            <span>Không cấp</span>
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium">Tiếp nhận & Quản lý Pipeline ứng viên</td>
                      <td className="text-secondary">Xem hồ sơ ứng viên, lọc CV và chuyển vòng tuyển dụng</td>
                      <td style={{ textAlign: 'right' }}>
                        {roleInfo.permissions.candidateView ? (
                          <span className="perm-status-badge granted">
                            <Check size={13} />
                            <span>Được phép</span>
                          </span>
                        ) : (
                          <span className="perm-status-badge denied">
                            <X size={13} />
                            <span>Không cấp</span>
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium">Phỏng vấn & Đánh giá năng lực</td>
                      <td className="text-secondary">Tham gia lịch phỏng vấn và nhập phiếu chấm điểm ứng viên</td>
                      <td style={{ textAlign: 'right' }}>
                        {roleInfo.permissions.interviewEvaluation ? (
                          <span className="perm-status-badge granted">
                            <Check size={13} />
                            <span>Được phép</span>
                          </span>
                        ) : (
                          <span className="perm-status-badge denied">
                            <X size={13} />
                            <span>Không cấp</span>
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium">Phê duyệt Yêu cầu & Offer</td>
                      <td className="text-secondary">Duyệt yêu cầu tuyển dụng mới và duyệt chế độ đãi ngộ offer</td>
                      <td style={{ textAlign: 'right' }}>
                        {roleInfo.permissions.offerApproval ? (
                          <span className="perm-status-badge granted">
                            <Check size={13} />
                            <span>Được phép</span>
                          </span>
                        ) : (
                          <span className="perm-status-badge denied">
                            <X size={13} />
                            <span>Không cấp</span>
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium">Nộp hồ sơ Ứng tuyển nội bộ</td>
                      <td className="text-secondary">Nộp đơn ứng tuyển các vị trí luân chuyển nội bộ</td>
                      <td style={{ textAlign: 'right' }}>
                        {roleInfo.permissions.candidateApply ? (
                          <span className="perm-status-badge granted">
                            <Check size={13} />
                            <span>Được phép</span>
                          </span>
                        ) : (
                          <span className="perm-status-badge denied">
                            <X size={13} />
                            <span>Không cấp</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="profile-alert info">
            <Info size={16} />
            <span>Chưa tìm thấy chi tiết quyền hạn cụ thể cho vai trò hiện tại.</span>
          </div>
        )}

        {/* Security Policy Reminder Box */}
        <div className="profile-callout-note">
          <Info size={16} className="profile-callout-icon" />
          <div className="profile-callout-text">
            <strong>Bảo vệ phân quyền Quản trị viên:</strong> Các quyền hạn được cấu hình và thực thi chặt chẽ bởi máy chủ Spring Security. Quản trị viên không thể tự xóa quyền ADMIN của chính mình trên trang quản trị tài khoản để bảo toàn khả năng vận hành của hệ thống.
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesPermissionsTab;
