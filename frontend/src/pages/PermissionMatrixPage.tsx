import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Minus,
  RefreshCw,
  AlertCircle,
  Server,
  Lock,
} from 'lucide-react';
import { ATS_ROLES_INFO } from '../constants/rbac';
import { PageHeader } from '../components/common/PageHeader';
import { useAuth } from '../hooks/useAuth';
import adminApi from '../api/admin';
import '../styles/permission-matrix.css';

// ─── Metadata for all system permissions (Permission.java enum) ───────────────
// Dynamic authority mapping is fetched from backend GET /api/admin/roles
interface PermissionMeta {
  key: string;
  label: string;
  description: string;
  groupId: string;
  groupLabel: string;
}

const ALL_SYSTEM_PERMISSIONS: PermissionMeta[] = [
  // Module 1: Quản trị Tài khoản & Phân quyền
  {
    key: 'USER_READ',
    label: 'Xem danh sách tài khoản',
    description: 'Truy vấn danh sách và chi tiết thông tin nhân sự/tài khoản',
    groupId: 'user-admin',
    groupLabel: 'Quản trị Tài khoản & Phân quyền',
  },
  {
    key: 'USER_MANAGE',
    label: 'Quản lý tài khoản (tạo, sửa, khoá)',
    description: 'Tạo tài khoản nhân viên mới, khoá/mở khoá, chỉnh sửa thông tin',
    groupId: 'user-admin',
    groupLabel: 'Quản trị Tài khoản & Phân quyền',
  },
  {
    key: 'ROLE_READ',
    label: 'Xem cấu hình phân quyền (RBAC)',
    description: 'Truy vấn ma trận phân quyền và danh sách vai trò hệ thống',
    groupId: 'user-admin',
    groupLabel: 'Quản trị Tài khoản & Phân quyền',
  },
  {
    key: 'ROLE_MANAGE',
    label: 'Gán vai trò cho tài khoản',
    description: 'Gán và thu hồi vai trò RBAC cho nhân viên trong hệ thống',
    groupId: 'user-admin',
    groupLabel: 'Quản trị Tài khoản & Phân quyền',
  },
  {
    key: 'AUDIT_READ',
    label: 'Xem nhật ký hoạt động hệ thống',
    description: 'Truy vấn audit log, lịch sử đăng nhập và thay đổi dữ liệu',
    groupId: 'user-admin',
    groupLabel: 'Quản trị Tài khoản & Phân quyền',
  },

  // Module 2: Hồ sơ Doanh nghiệp, Cơ cấu & Danh mục
  {
    key: 'PROFILE_READ',
    label: 'Xem hồ sơ cá nhân / công ty',
    description: 'Truy vấn thông tin hồ sơ tài khoản và hồ sơ doanh nghiệp',
    groupId: 'org-catalog',
    groupLabel: 'Hồ sơ Doanh nghiệp & Cơ cấu Tổ chức',
  },
  {
    key: 'PROFILE_UPDATE',
    label: 'Cập nhật hồ sơ',
    description: 'Chỉnh sửa thông tin cá nhân và thông tin pháp lý doanh nghiệp',
    groupId: 'org-catalog',
    groupLabel: 'Hồ sơ Doanh nghiệp & Cơ cấu Tổ chức',
  },
  {
    key: 'DEPARTMENT_MANAGE',
    label: 'Quản lý phòng ban & sơ đồ cây',
    description: 'Tạo, sửa, tạm ngưng hoặc xóa phòng ban trong sơ đồ cây tổ chức',
    groupId: 'org-catalog',
    groupLabel: 'Hồ sơ Doanh nghiệp & Cơ cấu Tổ chức',
  },
  {
    key: 'CATALOG_READ',
    label: 'Xem danh mục chung & chức danh',
    description: 'Truy vấn danh mục dùng chung, khung năng lực và chức danh',
    groupId: 'org-catalog',
    groupLabel: 'Hồ sơ Doanh nghiệp & Cơ cấu Tổ chức',
  },
  {
    key: 'CATALOG_MANAGE',
    label: 'Quản lý danh mục tuyển dụng',
    description: 'Thêm, sửa, xóa tiêu chí năng lực, câu hỏi và danh mục dùng chung',
    groupId: 'org-catalog',
    groupLabel: 'Hồ sơ Doanh nghiệp & Cơ cấu Tổ chức',
  },
  {
    key: 'SALARY_READ',
    label: 'Xem dải lương chuẩn ngạch bậc',
    description: 'Chỉ HR Manager được xem dải lương chuẩn theo quy định S2-05',
    groupId: 'org-catalog',
    groupLabel: 'Hồ sơ Doanh nghiệp & Cơ cấu Tổ chức',
  },
  {
    key: 'SALARY_MANAGE',
    label: 'Quản lý dải lương chuẩn',
    description: 'Cấu hình và cập nhật khung lương cho từng vị trí chức danh',
    groupId: 'org-catalog',
    groupLabel: 'Hồ sơ Doanh nghiệp & Cơ cấu Tổ chức',
  },

  // Module 3: Yêu cầu Tuyển dụng (Requisitions)
  {
    key: 'REQUISITION_CREATE',
    label: 'Khởi tạo yêu cầu tuyển dụng',
    description: 'Tạo mới bản nháp yêu cầu tuyển dụng cho phòng ban',
    groupId: 'requisition',
    groupLabel: 'Quy trình Yêu cầu Tuyển dụng',
  },
  {
    key: 'REQUISITION_READ_OWN',
    label: 'Xem yêu cầu tuyển dụng của mình',
    description: 'Xem danh sách yêu cầu tuyển dụng do chính mình tạo ra',
    groupId: 'requisition',
    groupLabel: 'Quy trình Yêu cầu Tuyển dụng',
  },
  {
    key: 'REQUISITION_READ_ALL',
    label: 'Xem toàn bộ yêu cầu tuyển dụng',
    description: 'Xem tất cả yêu cầu tuyển dụng trên toàn hệ thống',
    groupId: 'requisition',
    groupLabel: 'Quy trình Yêu cầu Tuyển dụng',
  },
  {
    key: 'REQUISITION_APPROVE',
    label: 'Phê duyệt yêu cầu tuyển dụng',
    description: 'Thẩm định, duyệt hoặc từ chối phiếu yêu cầu tuyển dụng',
    groupId: 'requisition',
    groupLabel: 'Quy trình Yêu cầu Tuyển dụng',
  },
  {
    key: 'RECRUITER_ASSIGN',
    label: 'Phân công chuyên viên tuyển dụng',
    description: 'Giao yêu cầu tuyển dụng đã duyệt cho Recruiter phụ trách',
    groupId: 'requisition',
    groupLabel: 'Quy trình Yêu cầu Tuyển dụng',
  },

  // Module 4: Tin Tuyển dụng (Job Postings)
  {
    key: 'JOB_MANAGE',
    label: 'Quản lý & Xuất bản tin tuyển dụng',
    description: 'Soạn thảo, phê duyệt nội dung và xuất bản tin ra cổng việc làm',
    groupId: 'job-posting',
    groupLabel: 'Tin Tuyển dụng & Đăng tuyển',
  },

  // Module 5: Ứng viên & Pipeline Tuyển dụng
  {
    key: 'APPLICATION_CREATE',
    label: 'Nộp hồ sơ ứng tuyển',
    description: 'Nộp CV và đăng ký ứng tuyển vào vị trí việc làm mở',
    groupId: 'candidate-pipeline',
    groupLabel: 'Ứng viên & Quy trình Tuyển chọn (Pipeline)',
  },
  {
    key: 'CANDIDATE_READ_OWN',
    label: 'Xem hồ sơ ứng tuyển của mình',
    description: 'Ứng viên theo dõi tiến độ hồ sơ cá nhân đã nộp',
    groupId: 'candidate-pipeline',
    groupLabel: 'Ứng viên & Quy trình Tuyển chọn (Pipeline)',
  },
  {
    key: 'CANDIDATE_READ_ASSIGNED',
    label: 'Xem ứng viên theo vị trí phụ trách',
    description: 'Xem danh sách ứng viên thuộc vị trí được phân công quản lý',
    groupId: 'candidate-pipeline',
    groupLabel: 'Ứng viên & Quy trình Tuyển chọn (Pipeline)',
  },
  {
    key: 'CANDIDATE_READ_ALL',
    label: 'Xem toàn bộ cơ sở dữ liệu ứng viên',
    description: 'Truy cập kho hồ sơ tài năng toàn diện của công ty',
    groupId: 'candidate-pipeline',
    groupLabel: 'Ứng viên & Quy trình Tuyển chọn (Pipeline)',
  },
  {
    key: 'PIPELINE_MANAGE',
    label: 'Quản lý vòng tuyển dụng & chuyển trạng thái',
    description: 'Kéo thả ứng viên qua các vòng, sàng lọc hồ sơ CV',
    groupId: 'candidate-pipeline',
    groupLabel: 'Ứng viên & Quy trình Tuyển chọn (Pipeline)',
  },

  // Module 6: Phỏng vấn & Đánh giá Năng lực
  {
    key: 'INTERVIEW_MANAGE',
    label: 'Điều phối & Lên lịch phỏng vấn',
    description: 'Xếp lịch phỏng vấn, phòng họp, gửi thư mời cho hội đồng',
    groupId: 'interview-eval',
    groupLabel: 'Phỏng vấn & Đánh giá Chuyên môn',
  },
  {
    key: 'INTERVIEW_READ_ASSIGNED',
    label: 'Xem lịch phỏng vấn được phân công',
    description: 'Xem các buổi phỏng vấn mà mình được chỉ định là người phỏng vấn',
    groupId: 'interview-eval',
    groupLabel: 'Phỏng vấn & Đánh giá Chuyên môn',
  },
  {
    key: 'EVALUATION_READ',
    label: 'Xem kết quả & phiếu đánh giá',
    description: 'Đọc nhận xét phỏng vấn và điểm số tiêu chí năng lực',
    groupId: 'interview-eval',
    groupLabel: 'Phỏng vấn & Đánh giá Chuyên môn',
  },
  {
    key: 'EVALUATION_SUBMIT',
    label: 'Chấm điểm & Gửi phiếu đánh giá',
    description: 'Nhập điểm đánh giá kỹ năng chuyên môn sau buổi phỏng vấn',
    groupId: 'interview-eval',
    groupLabel: 'Phỏng vấn & Đánh giá Chuyên môn',
  },

  // Module 7: Đề xuất Lương, Offer & Onboarding
  {
    key: 'OFFER_READ_OWN',
    label: 'Xem đề xuất offer của mình',
    description: 'Hiring Manager hoặc ứng viên xem thông tin gói offer liên quan',
    groupId: 'offer-onboarding',
    groupLabel: 'Đề xuất Lương, Thư mời nhận việc (Offer) & Tiếp nhận',
  },
  {
    key: 'OFFER_RESPOND',
    label: 'Phản hồi chấp thuận / từ chối offer',
    description: 'Ứng viên phản hồi lời mời làm việc chính thức',
    groupId: 'offer-onboarding',
    groupLabel: 'Đề xuất Lương, Thư mời nhận việc (Offer) & Tiếp nhận',
  },
  {
    key: 'OFFER_MANAGE',
    label: 'Soạn thảo & Quản lý gói offer',
    description: 'Lập đề xuất lương thưởng, soạn thảo thư mời nhận việc',
    groupId: 'offer-onboarding',
    groupLabel: 'Đề xuất Lương, Thư mời nhận việc (Offer) & Tiếp nhận',
  },
  {
    key: 'OFFER_APPROVE',
    label: 'Phê duyệt gói offer ứng viên',
    description: 'Thẩm định và phê duyệt chi phí đãi ngộ cho ứng viên trúng tuyển',
    groupId: 'offer-onboarding',
    groupLabel: 'Đề xuất Lương, Thư mời nhận việc (Offer) & Tiếp nhận',
  },
  {
    key: 'ONBOARDING_MANAGE',
    label: 'Quản lý quy trình tiếp nhận nhân viên mới',
    description: 'Thực hiện thủ tục onboarding, tạo hồ sơ nhân sự nội bộ',
    groupId: 'offer-onboarding',
    groupLabel: 'Đề xuất Lương, Thư mời nhận việc (Offer) & Tiếp nhận',
  },

  // Module 8: Thông báo & Báo cáo
  {
    key: 'NOTIFICATION_READ_OWN',
    label: 'Xem thông báo cá nhân',
    description: 'Nhận thông báo tự động từ các sự kiện trong hệ thống',
    groupId: 'notif-report',
    groupLabel: 'Thông báo & Báo cáo Phân tích',
  },
  {
    key: 'NOTIFICATION_MANAGE',
    label: 'Cấu hình mẫu email & thông báo',
    description: 'Soạn template thư mời, từ chối, offer và gửi broadcast',
    groupId: 'notif-report',
    groupLabel: 'Thông báo & Báo cáo Phân tích',
  },
  {
    key: 'REPORT_READ',
    label: 'Xem báo cáo & bảng chỉ số tuyển dụng',
    description: 'Truy vấn báo cáo tỷ lệ chuyển đổi, chi phí tuyển dụng, SLA',
    groupId: 'notif-report',
    groupLabel: 'Thông báo & Báo cáo Phân tích',
  },
];

const ROLE_SHORTNAMES: Record<string, string> = {
  ADMIN: 'Admin',
  HR_MANAGER: 'HR Mgr',
  RECRUITER: 'Recruiter',
  HIRING_MANAGER: 'Hiring Mgr',
  INTERVIEWER: 'Interviewer',
  APPROVER: 'Approver',
  CANDIDATE: 'Candidate',
};

export const PermissionMatrixPage: React.FC = () => {
  const { hasPermission, hasRole } = useAuth();
  const canReadRoles = Boolean(
    (hasPermission && hasPermission('ROLE_READ')) ||
    (hasRole && (hasRole('ADMIN') || hasRole('HR_MANAGER')))
  );

  // Server data state
  const [rolesMatrix, setRolesMatrix] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Fetch real roles permission mapping from backend API /api/admin/roles
  const fetchRolesPermissions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await adminApi.getRolesPermissions();
      setRolesMatrix(data || {});
      setLastSyncedAt(new Date());
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể tải dữ liệu phân quyền từ máy chủ.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canReadRoles) {
      fetchRolesPermissions();
    }
  }, [canReadRoles, fetchRolesPermissions]);

  // Transform permissions list into grouped structure based on REAL backend data
  const groupedData = useMemo(() => {
    const term = search.trim().toLowerCase();

    // Group items by groupId
    const groupMap = new Map<string, { id: string; label: string; rows: Array<{
      key: string;
      label: string;
      description: string;
      permissions: Record<string, boolean>;
    }> }>();

    ALL_SYSTEM_PERMISSIONS.forEach((perm) => {
      // Filter by group dropdown
      if (selectedGroup !== 'ALL' && perm.groupId !== selectedGroup) {
        return;
      }

      // Filter by search
      if (
        term &&
        !perm.label.toLowerCase().includes(term) &&
        !perm.key.toLowerCase().includes(term) &&
        !perm.description.toLowerCase().includes(term)
      ) {
        return;
      }

      if (!groupMap.has(perm.groupId)) {
        groupMap.set(perm.groupId, {
          id: perm.groupId,
          label: perm.groupLabel,
          rows: [],
        });
      }

      // Calculate permissions from real backend matrix
      const permRowRecord: Record<string, boolean> = {};
      ATS_ROLES_INFO.forEach((r) => {
        const rolePermissions = rolesMatrix[r.code] || [];
        permRowRecord[r.code] = rolePermissions.includes(perm.key);
      });

      groupMap.get(perm.groupId)!.rows.push({
        key: perm.key,
        label: perm.label,
        description: perm.description,
        permissions: permRowRecord,
      });
    });

    return Array.from(groupMap.values()).filter((g) => g.rows.length > 0);
  }, [search, selectedGroup, rolesMatrix]);

  // Unique groups for filter dropdown
  const allGroupOptions = useMemo(() => {
    const map = new Map<string, string>();
    ALL_SYSTEM_PERMISSIONS.forEach((p) => {
      if (!map.has(p.groupId)) {
        map.set(p.groupId, p.groupLabel);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, []);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedGroups(new Set());
  const collapseAll = () => {
    const allIds = new Set(allGroupOptions.map((g) => g.id));
    setCollapsedGroups(allIds);
  };

  // If user lacks ROLE_READ permission: show dedicated 403 access denied UI
  if (!canReadRoles) {
    return (
      <div className="pmatrix-page">
        <PageHeader
          title="Ma trận Phân quyền (RBAC)"
          breadcrumbs={[
            { label: 'Tổng quan', path: '/dashboard' },
            { label: 'Quản trị tài khoản', path: '/admin/users' },
            { label: 'Ma trận phân quyền' },
          ]}
        />
        <div className="pmatrix-access-denied" role="alert" style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #fee2e2',
          padding: '48px 24px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '40px auto',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Truy cập bị từ chối
          </h2>
          <p style={{ color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: 20 }}>
            Bạn không có quyền <code>ROLE_READ</code> để xem ma trận phân quyền hệ thống. Quyền truy cập trang này chỉ dành cho <strong>Quản trị viên (ADMIN)</strong> hoặc <strong>Trưởng phòng Nhân sự (HR_MANAGER)</strong>.
          </p>
          <a
            href="/dashboard"
            className="btn btn-primary"
            style={{ display: 'inline-flex', padding: '10px 20px', borderRadius: '8px' }}
          >
            Quay lại Bảng điều khiển
          </a>
        </div>
      </div>
    );
  }

  const visibleRoles = ATS_ROLES_INFO;

  return (
    <div className="pmatrix-page">
      {/* Page Header */}
      <PageHeader
        title="Ma trận Phân quyền (RBAC)"
        subtitle="Xem quyền hạn thực tế của các vai trò trong hệ thống — dữ liệu thời gian thực từ máy chủ"
        breadcrumbs={[
          { label: 'Tổng quan', path: '/dashboard' },
          { label: 'Quản trị tài khoản', path: '/admin/users' },
          { label: 'Ma trận phân quyền' },
        ]}
        actions={
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={fetchRolesPermissions}
              disabled={isLoading}
              title="Đồng bộ lại quyền từ máy chủ"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} className={isLoading ? 'spin-animation' : ''} />
              <span>{isLoading ? 'Đang tải...' : 'Làm mới từ server'}</span>
            </button>
          </div>
        }
      />

      {/* Backend Real-Time Sync Indicator Banner */}
      <div className="pmatrix-banner" role="note" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Server size={18} className="pmatrix-banner-icon" style={{ color: '#2563eb' }} />
          <span>
            Dữ liệu quyền được đọc trực tiếp từ API <code>/api/admin/roles</code> (nguồn chuẩn <code>RolePermissions.java</code>).
          </span>
        </div>
        {lastSyncedAt && (
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Đồng bộ lúc: <strong>{lastSyncedAt.toLocaleTimeString('vi-VN')}</strong>
          </span>
        )}
      </div>

      {/* Error Banner */}
      {loadError && (
        <div className="alert-banner error" role="alert" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} />
          <span>Lỗi tải dữ liệu quyền: {loadError}</span>
          <button type="button" className="btn btn-link" onClick={fetchRolesPermissions}>
            Thử lại
          </button>
        </div>
      )}

      {/* Toolbar: Search, Group filter, Collapse controls */}
      <div className="pmatrix-toolbar">
        <div className="pmatrix-search-wrap">
          <Search size={16} className="pmatrix-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="pmatrix-search-input"
            placeholder="Tìm kiếm theo tên quyền, mã hoặc mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm kiếm quyền"
          />
        </div>

        <div className="pmatrix-filter-select-wrap">
          <select
            className="pmatrix-group-select"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            aria-label="Lọc theo nhóm chức năng"
          >
            <option value="ALL">Tất cả nhóm chức năng</option>
            {allGroupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pmatrix-expand-controls">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={expandAll}
            title="Mở rộng tất cả các nhóm quyền"
          >
            Mở rộng tất cả
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={collapseAll}
            title="Thu gọn tất cả các nhóm quyền"
          >
            Thu gọn tất cả
          </button>
        </div>
      </div>

      {/* Role Summary Cards Grid */}
      <div className="pmatrix-roles-grid" aria-label="Danh sách vai trò người dùng">
        {visibleRoles.map((role) => {
          const rolePerms = rolesMatrix[role.code] || [];
          return (
            <div key={role.code} className="pmatrix-role-card">
              <div className="pmatrix-role-card-header">
                <span className={`tag ${role.badgeClass}`}>{ROLE_SHORTNAMES[role.code] ?? role.name}</span>
                <span className="pmatrix-role-perm-count" title="Số lượng quyền được cấp từ backend">
                  {rolePerms.length} quyền
                </span>
              </div>
              <p className="pmatrix-role-card-desc">{role.description}</p>
            </div>
          );
        })}
      </div>

      {/* Loading State */}
      {isLoading && Object.keys(rolesMatrix).length === 0 ? (
        <div className="loading-state-wrapper" style={{ padding: '48px', textAlign: 'center', background: '#ffffff', borderRadius: '12px' }}>
          <span className="auth-spinner" style={{ width: 28, height: 28, marginBottom: 12 }} />
          <p style={{ color: '#64748b', fontSize: '0.92rem' }}>Đang nạp ma trận phân quyền thực tế từ máy chủ...</p>
        </div>
      ) : (
        /* Permission Matrix Groups */
        <div className="pmatrix-groups-list">
          {groupedData.length === 0 ? (
            <div className="empty-state-wrapper" style={{ padding: '36px', textAlign: 'center', background: '#ffffff', borderRadius: '12px' }}>
              <ShieldCheck size={36} className="text-muted" style={{ margin: '0 auto 12px' }} />
              <h4>Không tìm thấy quyền nào phù hợp</h4>
              <p style={{ color: '#64748b' }}>Vui lòng thay đổi từ khóa tìm kiếm hoặc chọn lại nhóm chức năng.</p>
            </div>
          ) : (
            groupedData.map((group) => {
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
                    <span className="pmatrix-group-title">{group.label}</span>
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
                                      <span className="pmatrix-check pmatrix-check-yes" title={`${r.name} có quyền ${row.key}`}>
                                        <Check size={16} />
                                      </span>
                                    ) : (
                                      <span className="pmatrix-check pmatrix-check-no" title={`${r.name} không có quyền`}>
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
      )}
    </div>
  );
};

export default PermissionMatrixPage;
