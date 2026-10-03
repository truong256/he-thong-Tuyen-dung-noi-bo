import React from 'react';
import { X, ShieldCheck, Check, Minus } from 'lucide-react';
import { ATS_ROLES_INFO } from '../../constants/rbac';

interface RbacMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RbacMatrixModal: React.FC<RbacMatrixModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="rbac-title">
      <div className="modal-box rbac-modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="modal-title-icon rbac">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 id="rbac-title" style={{ margin: 0 }}>Ma trận Phân quyền & Vai trò (RBAC)</h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Chi tiết 7 vai trò và quyền hạn chức năng trong Hệ thống Tuyển dụng Nội bộ
              </p>
            </div>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        <div className="rbac-content-scroll">
          {/* Roles Overview Cards */}
          <div className="rbac-roles-grid">
            {ATS_ROLES_INFO.map((role) => (
              <div key={role.code} className="rbac-role-card">
                <div className="rbac-role-card-header">
                  <span className={`tag ${role.badgeClass}`}>{role.name}</span>
                  <strong className="rbac-role-name">{role.name}</strong>
                </div>
                <p className="rbac-role-desc">{role.description}</p>
              </div>
            ))}
          </div>

          {/* Matrix Table */}
          <h4 style={{ margin: '20px 0 12px', fontSize: '1rem', color: '#1e293b' }}>
            Bảng ma trận phân quyền theo vai trò
          </h4>
          <div className="table-responsive">
            <table className="custom-table rbac-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Quyền hạn / Chức năng</th>
                  {ATS_ROLES_INFO.map((r) => (
                    <th key={r.code} style={{ textAlign: 'center', minWidth: '95px' }}>
                      <span className={`tag ${r.badgeClass}`} style={{ fontSize: '0.68rem' }}>
                        {r.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Quản lý Người dùng & RBAC</strong>
                    <div className="rbac-perm-desc">Tạo tài khoản, gán vai trò, khóa/mở khóa</div>
                  </td>
                  {ATS_ROLES_INFO.map((r) => (
                    <td key={r.code} style={{ textAlign: 'center' }}>
                      {r.permissions.userManagement ? (
                        <Check size={18} className="text-green" />
                      ) : (
                        <Minus size={16} className="text-muted" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <strong>Đăng tin Tuyển dụng</strong>
                    <div className="rbac-perm-desc">Tạo, cập nhật và xuất bản Job Post</div>
                  </td>
                  {ATS_ROLES_INFO.map((r) => (
                    <td key={r.code} style={{ textAlign: 'center' }}>
                      {r.permissions.jobPosting ? (
                        <Check size={18} className="text-green" />
                      ) : (
                        <Minus size={16} className="text-muted" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <strong>Xem hồ sơ Ứng viên & Pipeline</strong>
                    <div className="rbac-perm-desc">Xem CV, lịch sử và trạng thái hồ sơ</div>
                  </td>
                  {ATS_ROLES_INFO.map((r) => (
                    <td key={r.code} style={{ textAlign: 'center' }}>
                      {r.permissions.candidateView ? (
                        <Check size={18} className="text-green" />
                      ) : (
                        <Minus size={16} className="text-muted" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <strong>Phỏng vấn & Đánh giá</strong>
                    <div className="rbac-perm-desc">Chấm điểm, viết nhận xét sau phỏng vấn</div>
                  </td>
                  {ATS_ROLES_INFO.map((r) => (
                    <td key={r.code} style={{ textAlign: 'center' }}>
                      {r.permissions.interviewEvaluation ? (
                        <Check size={18} className="text-green" />
                      ) : (
                        <Minus size={16} className="text-muted" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <strong>Phê duyệt Đề xuất & Offer</strong>
                    <div className="rbac-perm-desc">Duyệt Requisition, ký duyệt offer tuyển dụng</div>
                  </td>
                  {ATS_ROLES_INFO.map((r) => (
                    <td key={r.code} style={{ textAlign: 'center' }}>
                      {r.permissions.offerApproval ? (
                        <Check size={18} className="text-green" />
                      ) : (
                        <Minus size={16} className="text-muted" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <strong>Ứng tuyển Vị trí Nội bộ</strong>
                    <div className="rbac-perm-desc">Nộp hồ sơ cho nhân viên nội bộ</div>
                  </td>
                  {ATS_ROLES_INFO.map((r) => (
                    <td key={r.code} style={{ textAlign: 'center' }}>
                      {r.permissions.candidateApply ? (
                        <Check size={18} className="text-green" />
                      ) : (
                        <Minus size={16} className="text-muted" />
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '18px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default RbacMatrixModal;
