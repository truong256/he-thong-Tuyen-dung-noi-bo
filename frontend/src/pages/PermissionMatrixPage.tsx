import React, { useState, useMemo } from 'react';
import { ShieldCheck, Search, ChevronDown, ChevronRight, Check, Minus } from 'lucide-react';
import { ATS_ROLES_INFO } from '../constants/rbac';
import { PageHeader } from '../components/common/PageHeader';
import '../styles/permission-matrix.css';

// ─── Static permission matrix based on backend RolePermissions.java ──────────
// Source: backend/auth-service/src/main/java/com/example/auth_service/security/RolePermissions.java
// Each permission key maps to whether a given role has that permission.
// This is READ-ONLY. Checkbox editing is NOT enabled because the backend
// uses a static RolePermissions.java model — dynamic RBAC management requires
// a separate API (POST /api/admin/roles/permissions) which is not yet implemented.

interface PermissionRow {
  key: string;
  label: string;
  description: string;
  permissions: Record<string, boolean>;
}

interface PermissionGroup {
  id: string;
  label: string;
  rows: PermissionRow[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'user-admin',
    label: 'Quản trị Tài khoản & Phân quyền',
    rows: [
      {
        key: 'USER_READ',
        label: 'Xem danh sách tài khoản',
        description: 'Truy vấn danh sách và chi tiết nhân viên',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: false,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
      {
        key: 'USER_MANAGE',
        label: 'Quản lý tài khoản (tạo, sửa, khoá)',
        description: 'Tạo tài khoản nhân viên mới, khoá/mở khoá, chỉnh sửa thông tin',
        permissions: {
          ADMIN: true,
          HR_MANAGER: false,
          RECRUITER: false,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
      {
        key: 'ROLE_READ',
        label: 'Xem vai trò (RBAC)',
        description: 'Truy vấn danh sách vai trò trong hệ thống',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: false,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
      {
        key: 'ROLE_MANAGE',
        label: 'Gán vai trò cho tài khoản',
        description: 'Gán và thu hồi vai trò RBAC cho nhân viên',
        permissions: {
          ADMIN: true,
          HR_MANAGER: false,
          RECRUITER: false,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
      {
        key: 'AUDIT_READ',
        label: 'Xem nhật ký hệ thống',
        description: 'Truy vấn audit log và lịch sử hoạt động',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: false,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
    ],
  },
  {
    id: 'catalog',
    label: 'Danh mục & Cơ cấu tổ chức',
    rows: [
      {
        key: 'CATALOG_READ',
        label: 'Xem danh mục (phòng ban, chức danh, danh mục...)',
        description: 'Xem cơ cấu tổ chức, chức danh, danh mục tuyển dụng, ngân hàng câu hỏi',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: true,
          HIRING_MANAGER: true,
          INTERVIEWER: true,
          APPROVER: true,
          CANDIDATE: false,
        },
      },
      {
        key: 'CATALOG_MANAGE',
        label: 'Quản lý danh mục (tạo, sửa, xoá)',
        description: 'Tạo và chỉnh sửa phòng ban, chức danh và danh mục hệ thống',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: false,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
      {
        key: 'DEPARTMENT_MANAGE',
        label: 'Quản lý phòng ban',
        description: 'Tạo, cập nhật, kích hoạt/tạm ngưng và xoá phòng ban — có ràng buộc nghiệp vụ',
        permissions: {
          ADMIN: false,
          HR_MANAGER: true,
          RECRUITER: false,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
    ],
  },
  {
    id: 'recruitment',
    label: 'Yêu cầu tuyển dụng (Requisition)',
    rows: [
      {
        key: 'REQUISITION_CREATE',
        label: 'Tạo yêu cầu tuyển dụng',
        description: 'Khởi tạo đề xuất tuyển dụng mới cho phòng ban',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: false,
          HIRING_MANAGER: true,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
      {
        key: 'REQUISITION_READ_OWN',
        label: 'Xem yêu cầu của mình',
        description: 'Xem các yêu cầu tuyển dụng do mình tạo',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: false,
          HIRING_MANAGER: true,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
      {
        key: 'REQUISITION_READ_ALL',
        label: 'Xem tất cả yêu cầu tuyển dụng',
        description: 'Truy vấn và xem toàn bộ yêu cầu tuyển dụng trong hệ thống',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: true,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: true,
          CANDIDATE: false,
        },
      },
      {
        key: 'REQUISITION_APPROVE',
        label: 'Phê duyệt yêu cầu tuyển dụng',
        description: 'Duyệt hoặc từ chối các đề xuất tuyển dụng theo luồng phê duyệt',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: false,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: true,
          CANDIDATE: false,
        },
      },
      {
        key: 'RECRUITER_ASSIGN',
        label: 'Phân công chuyên viên tuyển dụng',
        description: 'Gán Recruiter phụ trách yêu cầu tuyển dụng đã được phê duyệt',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: false,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
    ],
  },
  {
    id: 'job-posting',
    label: 'Tin tuyển dụng (Job Posting)',
    rows: [
      {
        key: 'JOB_MANAGE',
        label: 'Quản lý tin tuyển dụng',
        description: 'Tạo, chỉnh sửa, nháp, gửi duyệt và xuất bản tin tuyển dụng',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: true,
          HIRING_MANAGER: false,
          INTERVIEWER: false,
          APPROVER: false,
          CANDIDATE: false,
        },
      },
    ],
  },
  {
    id: 'profile',
    label: 'Hồ sơ Cá nhân',
    rows: [
      {
        key: 'PROFILE_READ',
        label: 'Xem hồ sơ cá nhân',
        description: 'Xem thông tin cá nhân và phiên đăng nhập của bản thân',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: true,
          HIRING_MANAGER: true,
          INTERVIEWER: true,
          APPROVER: true,
          CANDIDATE: true,
        },
      },
      {
        key: 'PROFILE_UPDATE',
        label: 'Cập nhật hồ sơ cá nhân',
        description: 'Chỉnh sửa thông tin cơ bản và ảnh đại diện của bản thân',
        permissions: {
          ADMIN: true,
          HR_MANAGER: true,
          RECRUITER: true,
          HIRING_MANAGER: true,
          INTERVIEWER: true,
          APPROVER: true,
          CANDIDATE: true,
        },
      },
    ],
  },
];

// ─── Role shortnames for compact display ──────────────────────────────────────
const ROLE_SHORTNAMES: Record<string, string> = {
  ADMIN: 'Admin',
  HR_MANAGER: 'HR Mgr',
  RECRUITER: 'Recruiter',
  HIRING_MANAGER: 'Hiring Mgr',
  INTERVIEWER: 'Interviewer',
  APPROVER: 'Approver',
  CANDIDATE: 'Candidate',
};

const PermissionMatrixPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return PERMISSION_GROUPS
      .filter((g) => selectedGroup === 'ALL' || g.id === selectedGroup)
      .map((group) => ({
        ...group,
        rows: group.rows.filter(
          (row) =>
            !q ||
            row.label.toLowerCase().includes(q) ||
            row.key.toLowerCase().includes(q) ||
            row.description.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.rows.length > 0);
  }, [searchQuery, selectedGroup]);

  const visibleRoles = ATS_ROLES_INFO;

  return (
    <div className="page-wrapper" data-testid="permission-matrix-page">
      <PageHeader
        title="Ma trận Phân quyền"
        subtitle="Xem quyền truy cập của các vai trò trong hệ thống — chỉ xem, nguồn thực tế từ backend"
        breadcrumbs={[
          { label: 'Tổng quan', path: '/dashboard' },
          { label: 'Quản trị tài khoản', path: '/admin/users' },
          { label: 'Ma trận phân quyền' },
        ]}
      />

      {/* Info banner */}
      <div className="pmatrix-info-banner">
        <ShieldCheck size={16} className="pmatrix-banner-icon" />
        <span>
          Ma trận này phản ánh cấu hình phân quyền từ{' '}
          <code>RolePermissions.java</code>. Hiện tại chỉ hỗ trợ xem — để thay
          đổi cấu trúc quyền, cần thiết kế API động riêng và phê duyệt từ nhóm
          bảo mật.
        </span>
      </div>

      {/* Toolbar */}
      <div className="pmatrix-toolbar">
        <div className="pmatrix-search-wrap">
          <Search size={15} className="pmatrix-search-icon" />
          <input
            type="text"
            className="pmatrix-search-input"
            placeholder="Tìm kiếm theo tên quyền, mã hoặc mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm quyền"
          />
        </div>
        <div className="pmatrix-group-filter">
          <select
            className="form-select"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            aria-label="Lọc nhóm chức năng"
          >
            <option value="ALL">Tất cả nhóm chức năng</option>
            {PERMISSION_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Role Header Cards */}
      <div className="pmatrix-role-cards">
        {visibleRoles.map((role) => (
          <div key={role.code} className={`pmatrix-role-card ${role.badgeClass}`}>
            <span className={`tag ${role.badgeClass}`}>{ROLE_SHORTNAMES[role.code] ?? role.name}</span>
            <p className="pmatrix-role-card-desc">{role.description}</p>
          </div>
        ))}
      </div>

      {/* Matrix Table */}
      <div className="pmatrix-container">
        {filteredGroups.length === 0 ? (
          <div className="pmatrix-empty">
            <ShieldCheck size={40} />
            <p>Không tìm thấy quyền phù hợp với từ khoá "<strong>{searchQuery}</strong>".</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.id);
            return (
              <div key={group.id} className="pmatrix-group">
                {/* Group Header */}
                <button
                  type="button"
                  className="pmatrix-group-header"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <span>{group.label}</span>
                  <span className="pmatrix-group-count">{group.rows.length} quyền</span>
                </button>

                {!isCollapsed && (
                  <div className="table-responsive">
                    <table className="pmatrix-table" aria-label={`Ma trận phân quyền — ${group.label}`}>
                      <thead>
                        <tr>
                          <th className="pmatrix-col-feature">Chức năng / Quyền</th>
                          {visibleRoles.map((r) => (
                            <th key={r.code} className="pmatrix-col-role">
                              <span className={`tag ${r.badgeClass} pmatrix-role-tag`}>
                                {ROLE_SHORTNAMES[r.code] ?? r.name}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={row.key} className="pmatrix-row">
                            <td className="pmatrix-cell-feature">
                              <strong className="pmatrix-perm-label">{row.label}</strong>
                              <div className="pmatrix-perm-key">{row.key}</div>
                              <div className="pmatrix-perm-desc">{row.description}</div>
                            </td>
                            {visibleRoles.map((r) => {
                              const hasIt = row.permissions[r.code] ?? false;
                              return (
                                <td key={r.code} className="pmatrix-cell-check">
                                  {hasIt ? (
                                    <span className="pmatrix-check pmatrix-check-yes" title="Có quyền">
                                      <Check size={16} />
                                    </span>
                                  ) : (
                                    <span className="pmatrix-check pmatrix-check-no" title="Không có quyền">
                                      <Minus size={14} />
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PermissionMatrixPage;
