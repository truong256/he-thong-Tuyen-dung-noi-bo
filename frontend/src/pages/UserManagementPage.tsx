import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  UserPlus,
  FileSpreadsheet,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  UserCheck,
  Mail,
} from 'lucide-react';
import adminApi from '../api/admin';
import { UserSummary } from '../types/user';
import { useAuth } from '../hooks/useAuth';
import RoleAssignmentModal from '../components/admin/RoleAssignmentModal';
import LockAccountModal from '../components/admin/LockAccountModal';
import RbacMatrixModal from '../components/admin/RbacMatrixModal';
import { ATS_ROLES_INFO, getRoleLabel } from '../constants/rbac';

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Data states (S1-08: Default pageSize = 20)
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showRbacMatrixModal, setShowRbacMatrixModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);

  // Add User Form states (S1-08: Admin does not manually input temporary password)
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newRoles, setNewRoles] = useState<string[]>(['RECRUITER']);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await adminApi.listUsers(
        debouncedSearch.trim() || undefined,
        statusFilter,
        roleFilter,
        currentPage,
        pageSize
      );
      setUsers(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || (data.content ? data.content.length : 0));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tải danh sách tài khoản từ máy chủ.';
      setFetchError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, roleFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Server-side filtered users list
  const displayedUsers = users;

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setRoleFilter('ALL');
    setCurrentPage(0);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newFullName.trim() || newRoles.length === 0) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await adminApi.createUser({
        email: newEmail.trim(),
        fullName: newFullName.trim(),
        department: newDepartment.trim() || undefined,
        roles: newRoles,
        status: newStatus,
      });
      showToast(`Tạo thành công tài khoản cho ${newEmail.trim()}! Mật khẩu tạm thời đã được gửi qua email kích hoạt.`);
      setShowAddModal(false);
      setNewEmail('');
      setNewFullName('');
      setNewDepartment('');
      setNewRoles(['RECRUITER']);
      setNewStatus('ACTIVE');
      fetchUsers();
    } catch (err: any) {
      const apiErrors = err.response?.data?.validationErrors;
      let msg = err.response?.data?.message;
      if (apiErrors && typeof apiErrors === 'object') {
        const firstErr = Object.values(apiErrors)[0];
        if (firstErr) msg = String(firstErr);
      }
      if (!err.response) {
        msg = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.';
      }
      showToast(msg || 'Tạo tài khoản thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleExportCsv = () => {
    if (displayedUsers.length === 0) {
      showToast('Không có dữ liệu để xuất file CSV.', 'error');
      return;
    }
    const headers = ['ID,Họ và tên,Email,Phòng ban,Vai trò,Trạng thái\n'];
    const rows = displayedUsers.map((u) => {
      const rolesStr = (u.roles || [u.role]).join('; ');
      return `"${u.id}","${u.fullName || ''}","${u.email}","${u.department || ''}","${rolesStr}","${u.status}"\n`;
    });
    const blob = new Blob(['\uFEFF' + headers.concat(rows).join('')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh-sach-nguoi-dung-ats-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file CSV thành công!');
  };

  const getRoleBadgeClass = (role: string) => {
    const found = ATS_ROLES_INFO.find((r) => r.code === role);
    return found ? found.badgeClass : 'tag-default';
  };

  return (
    <div className="admin-page" data-testid="user-management-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h2>Quản lý Tài khoản & Phân quyền</h2>
          <p>Quản lý người dùng nội bộ, phân quyền RBAC và kiểm soát truy cập hệ thống</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowRbacMatrixModal(true)}
            aria-label="Xem ma trận phân quyền RBAC"
          >
            <ShieldCheck size={16} />
            <span>Ma trận RBAC</span>
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportCsv}
            aria-label="Xuất file CSV danh sách người dùng"
          >
            <FileSpreadsheet size={16} />
            <span>Xuất CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            aria-label="Thêm người dùng mới"
          >
            <UserPlus size={16} />
            <span>Thêm tài khoản</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`} role="status" aria-live="polite">
          {toast.type === 'success' ? (
            <UserCheck size={18} className="text-green" />
          ) : (
            <AlertCircle size={18} className="text-red" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Filter Toolbar (S1-08) */}
      <div className="toolbar user-toolbar">
        {/* Search */}
        <div className="search-wrap">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, email hoặc phòng ban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm kiếm người dùng"
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch('')}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Controls Group */}
        <div className="toolbar-filters">
          {/* Role Filter */}
          <div className="filter-select">
            <label htmlFor="role-filter">Vai trò:</label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(0);
              }}
            >
              <option value="ALL">Tất cả vai trò</option>
              {ATS_ROLES_INFO.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-select">
            <label htmlFor="status-filter">Trạng thái:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(0);
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="LOCKED">Bị khóa</option>
              <option value="INACTIVE">Vô hiệu hóa</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="btn btn-outline btn-icon-only"
            onClick={() => fetchUsers()}
            title="Làm mới danh sách"
            aria-label="Làm mới danh sách"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {fetchError && !isLoading && (
        <div className="alert-banner error" role="alert">
          <AlertCircle size={18} />
          <span>{fetchError}</span>
          <button type="button" className="btn btn-link" onClick={() => fetchUsers()}>
            Thử lại
          </button>
        </div>
      )}

      {/* Users table wrapper */}
      <div className="table-responsive">
        <table className="custom-table" aria-label="Bảng danh sách người dùng">
          <thead>
            <tr>
              <th scope="col" style={{ width: '22%' }}>Họ và tên</th>
              <th scope="col" style={{ width: '22%' }}>Email</th>
              <th scope="col" style={{ width: '15%' }}>Phòng ban</th>
              <th scope="col" style={{ width: '20%' }}>Vai trò (RBAC)</th>
              <th scope="col" style={{ width: '11%' }}>Trạng thái</th>
              <th scope="col" style={{ width: '10%', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="table-loading-cell">
                  <div className="loading-state-wrapper">
                    <span className="auth-spinner" style={{ width: 22, height: 22 }} />
                    <span>Đang tải danh sách người dùng...</span>
                  </div>
                </td>
              </tr>
            ) : displayedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty-cell">
                  <div className="empty-state-wrapper">
                    <div className="empty-state-icon">
                      <Search size={32} />
                    </div>
                    <h4>Không tìm thấy tài khoản nào</h4>
                    <p>
                      {search || statusFilter !== 'ALL' || roleFilter !== 'ALL'
                        ? 'Không có tài khoản nào phù hợp với bộ lọc hiện tại.'
                        : 'Hệ thống chưa có dữ liệu tài khoản.'}
                    </p>
                    {(search || statusFilter !== 'ALL' || roleFilter !== 'ALL') && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleResetFilters}
                      >
                        Xóa bộ lọc tìm kiếm
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayedUsers.map((u) => {
                const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role || 'CANDIDATE'];
                const isLocked = u.status === 'LOCKED';
                const isSelf = currentUser && u.email.toLowerCase() === currentUser.email.toLowerCase();

                return (
                  <tr key={u.id} className={isLocked ? 'row-locked' : ''}>
                    <td>
                      <div className="user-name-cell">
                        <div className="user-avatar-initial" aria-hidden="true">
                          {(u.fullName || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info-group">
                          <div className="user-name-row">
                            <strong>{u.fullName || u.email.split('@')[0]}</strong>
                            {isSelf && <span className="tag-self">Bạn</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="user-email-text">{u.email}</span>
                    </td>
                    <td>
                      <span className="user-department-text">{u.department || '—'}</span>
                    </td>
                    <td>
                      <div className="role-tags">
                        {userRoles.map((r) => (
                          <span key={r} className={`tag ${getRoleBadgeClass(r)}`}>
                            {getRoleLabel(r)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${u.status ? u.status.toLowerCase() : 'active'}`}>
                        {u.status === 'ACTIVE'
                          ? 'Hoạt động'
                          : u.status === 'LOCKED'
                          ? 'Bị khóa'
                          : 'Vô hiệu hóa'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Phân vai trò RBAC"
                          aria-label={`Phân quyền cho ${u.email}`}
                          onClick={() => {
                            setSelectedUser(u);
                            setShowRoleModal(true);
                          }}
                        >
                          <ShieldCheck size={18} />
                        </button>

                        <button
                          type="button"
                          className={`btn-icon ${isLocked ? 'unlock-btn' : 'lock-btn'}`}
                          title={isSelf ? 'Không thể tự khóa tài khoản của chính mình' : isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          aria-label={isLocked ? `Mở khóa cho ${u.email}` : `Khóa ${u.email}`}
                          disabled={!!isSelf}
                          onClick={() => {
                            setSelectedUser(u);
                            setShowLockModal(true);
                          }}
                        >
                          {isLocked ? <Unlock size={18} /> : <Lock size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile view cards */}
      <div className="mobile-cards-list">
        {isLoading ? (
          <div className="loading-state-wrapper" style={{ padding: '24px' }}>
            <span className="auth-spinner" style={{ width: 22, height: 22 }} />
            <span>Đang tải danh sách người dùng...</span>
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="empty-state-wrapper" style={{ padding: '24px' }}>
            <p>Không tìm thấy người dùng nào phù hợp.</p>
          </div>
        ) : (
          displayedUsers.map((u) => {
            const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role || 'CANDIDATE'];
            const isLocked = u.status === 'LOCKED';
            const isSelf = currentUser && u.email.toLowerCase() === currentUser.email.toLowerCase();
            const initials = (u.fullName || u.email).charAt(0).toUpperCase();

            return (
              <div key={u.id} className={`mobile-user-card ${isLocked ? 'locked' : ''}`}>
                <div className="mobile-card-header">
                  <div className="mobile-card-user-info">
                    <div className="user-avatar-initial" aria-hidden="true">
                      {initials}
                    </div>
                    <div>
                      <div className="user-name-row">
                        <strong>{u.fullName || u.email.split('@')[0]}</strong>
                        {isSelf && <span className="tag-self">Bạn</span>}
                      </div>
                      <div className="mobile-card-email">{u.email}</div>
                    </div>
                  </div>
                  <span className={`status-pill ${u.status ? u.status.toLowerCase() : 'active'}`}>
                    {u.status === 'ACTIVE' ? 'Hoạt động' : u.status === 'LOCKED' ? 'Bị khóa' : 'Vô hiệu hóa'}
                  </span>
                </div>

                <div className="mobile-card-roles">
                  <div className="role-tags">
                    {userRoles.map((r) => (
                      <span key={r} className={`tag ${getRoleBadgeClass(r)}`}>
                        {getRoleLabel(r)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mobile-card-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setSelectedUser(u);
                      setShowRoleModal(true);
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>Phân vai trò</span>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${isLocked ? 'btn-success' : 'btn-secondary'}`}
                    disabled={!!isSelf}
                    onClick={() => {
                      setSelectedUser(u);
                      setShowLockModal(true);
                    }}
                  >
                    {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                    <span>{isLocked ? 'Mở khóa' : 'Khóa'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls UI (S1-08: Default 20) */}
      <div className="pagination-bar">
        <div className="pagination-info">
          <span>
            Hiển thị <strong>{displayedUsers.length}</strong> / <strong>{totalElements}</strong> tài khoản
          </span>
          <div className="page-size-selector">
            <label htmlFor="page-size-select">Số lượng:</label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="pagination-actions pagination-nav">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0 || isLoading}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
            <span>Trang trước</span>
          </button>
          <span className="pagination-page-indicator pagination-current-page">
            Trang <strong>{currentPage + 1}</strong> / <strong>{totalPages || 1}</strong>
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1 || isLoading}
            aria-label="Trang sau"
          >
            <span>Trang sau</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Modal Thêm người dùng mới (S1-08: Activation & Temp Password by System) */}
      {showAddModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-user-modal-title">
          <div className="modal-box user-form-modal-box">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="modal-title-icon">
                  <UserPlus size={20} />
                </div>
                <h3 id="add-user-modal-title">Thêm tài khoản nhân viên nội bộ</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Đóng cửa sổ"
                disabled={isSubmittingAdd}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label htmlFor="newFullName">
                  Họ và tên <span className="text-danger">*</span>
                </label>
                <input
                  id="newFullName"
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  disabled={isSubmittingAdd}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newEmail">
                  Email công ty <span className="text-danger">*</span>
                </label>
                <input
                  id="newEmail"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nhanvien@company.com"
                  disabled={isSubmittingAdd}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newDepartment">Phòng ban (tùy chọn)</label>
                <input
                  id="newDepartment"
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="Ví dụ: Nhân sự, Công nghệ thông tin, Tuyển dụng..."
                  disabled={isSubmittingAdd}
                />
              </div>

              <div className="alert-box info" style={{ marginBottom: '16px' }}>
                <Mail size={16} style={{ flexShrink: 0 }} />
                <span>Mật khẩu tạm thời sẽ được hệ thống tạo tự động và gửi qua email kích hoạt cho nhân viên.</span>
              </div>

              <div className="form-group">
                <label>
                  Gán vai trò ban đầu (RBAC) <span className="text-danger">*</span>
                </label>
                <div className="checkbox-grid">
                  {ATS_ROLES_INFO.map((role) => (
                    <label
                      key={role.code}
                      className={`checkbox-item ${newRoles.includes(role.code) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={newRoles.includes(role.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewRoles([...newRoles, role.code]);
                          } else {
                            if (newRoles.length > 1) {
                              setNewRoles(newRoles.filter((r) => r !== role.code));
                            }
                          }
                        }}
                        disabled={isSubmittingAdd}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label htmlFor="newStatus">Trạng thái tài khoản ban đầu</label>
                <select
                  id="newStatus"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  disabled={isSubmittingAdd}
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="LOCKED">Bị khóa</option>
                  <option value="INACTIVE">Vô hiệu hóa</option>
                </select>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmittingAdd}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingAdd}
                >
                  {isSubmittingAdd ? (
                    <>
                      <span className="auth-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <span>Thêm tài khoản</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Assignment Modal (S1-09) */}
      <RoleAssignmentModal
        isOpen={showRoleModal}
        user={selectedUser}
        currentLoggedInUserEmail={currentUser?.email}
        onClose={() => setShowRoleModal(false)}
        onSuccess={(updated) => {
          showToast(`Cập nhật phân quyền cho ${updated.email} thành công!`);
          fetchUsers();
        }}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* Lock/Unlock Account Modal (S1-10) */}
      <LockAccountModal
        isOpen={showLockModal}
        user={selectedUser}
        onClose={() => setShowLockModal(false)}
        onSuccess={(updatedUser, status) => {
          if (status === 'LOCKED' && updatedUser.handoverWarnings && updatedUser.handoverWarnings.length > 0) {
            showToast(
              `Đã khóa tài khoản ${selectedUser?.email}. CẢNH BÁO: Nhân sự đang phụ trách ${updatedUser.handoverWarnings.length} vị trí tuyển dụng (${updatedUser.handoverWarnings.join(', ')}) cần bàn giao!`,
              'error'
            );
          } else {
            showToast(
              `Đã ${status === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản ${selectedUser?.email} thành công!`
            );
          }
          fetchUsers();
        }}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* RBAC Matrix Information Modal (S1-05) */}
      <RbacMatrixModal
        isOpen={showRbacMatrixModal}
        onClose={() => setShowRbacMatrixModal(false)}
      />
    </div>
  );
};

export default UserManagementPage;
