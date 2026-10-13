import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  X,
  Mail,
  Pencil,
} from 'lucide-react';
import adminApi from '../api/admin';
import { UserSummary } from '../types/user';
import { useAuth } from '../hooks/useAuth';
import RoleAssignmentModal from '../components/admin/RoleAssignmentModal';
import LockAccountModal from '../components/admin/LockAccountModal';
import RbacMatrixModal from '../components/admin/RbacMatrixModal';
import { ATS_ROLES_INFO, getRoleLabel } from '../constants/rbac';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, hasPermission } = useAuth();

  // Permission-based access control (S1-08, S1-09, S1-10)
  const canManageUsers = typeof hasPermission === 'function' ? hasPermission('USER_MANAGE') : false;  // ADMIN only
  const canManageRoles = typeof hasPermission === 'function' ? hasPermission('ROLE_MANAGE') : false;  // ADMIN only

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
  const [newRecoveryEmail, setNewRecoveryEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneError, setNewPhoneError] = useState<string | null>(null);
  const [newDepartment, setNewDepartment] = useState('');
  const [newRoles, setNewRoles] = useState<string[]>(['RECRUITER']);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit User Form states (Section 27)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhoneError, setEditPhoneError] = useState<string | null>(null);
  const [editRecoveryEmail, setEditRecoveryEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete User Form states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserSummary | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const handleOpenDelete = (u: UserSummary) => {
    setDeletingUser(u);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsSubmittingDelete(true);
    try {
      await adminApi.deleteUser(deletingUser.id);
      showToast(`Đã xóa vĩnh viễn tài khoản "${deletingUser.email}" thành công!`);
      setShowDeleteModal(false);
      setDeletingUser(null);
      await fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Không thể xóa tài khoản người dùng.', 'error');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

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
    setNewPhoneError(null);
    if (!newEmail.trim() || !newFullName.trim() || !newPhone.trim() || newRoles.length === 0) {
      if (!newPhone.trim()) {
        setNewPhoneError('Số điện thoại không được để trống.');
      }
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    const cleanPhone = newPhone.trim().replace(/[\s\-().]+/g, '');
    const phoneRegex = /^(\+?84|0)[35789]\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setNewPhoneError('Số điện thoại không đúng định dạng Việt Nam (10 chữ số).');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await adminApi.createUser({
        email: newEmail.trim(),
        recoveryEmail: newRecoveryEmail.trim() || undefined,
        fullName: newFullName.trim(),
        phone: cleanPhone,
        department: newDepartment.trim() || undefined,
        roles: newRoles,
        status: newStatus,
      });
      showToast(`Tạo thành công tài khoản cho ${newEmail.trim()}! Mật khẩu tạm thời đã được gửi qua email kích hoạt.`);
      setShowAddModal(false);
      setNewEmail('');
      setNewRecoveryEmail('');
      setNewFullName('');
      setNewPhone('');
      setNewPhoneError(null);
      setNewDepartment('');
      setNewRoles(['RECRUITER']);
      setNewStatus('ACTIVE');
      fetchUsers();
    } catch (err: any) {
      const apiErrors = err.response?.data?.validationErrors;
      let msg = err.response?.data?.message;
      if (err.response?.status === 409 || apiErrors?.phone || (msg && (msg.includes('Số điện thoại') || msg.includes('điện thoại')))) {
        const pErr = apiErrors?.phone || msg || 'Số điện thoại này đã được sử dụng bởi tài khoản khác.';
        setNewPhoneError(pErr);
      }
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

  const handleOpenEdit = (u: UserSummary) => {
    setSelectedUser(u);
    setEditFullName(u.fullName || '');
    setEditEmail(u.email || '');
    setEditPhone(u.phone || '');
    setEditPhoneError(null);
    setEditRecoveryEmail(u.recoveryEmail || '');
    setEditDepartment(u.department || '');
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setEditPhoneError(null);
    if (!editFullName.trim() || !editEmail.trim()) {
      showToast('Vui lòng nhập họ tên và email công ty.', 'error');
      return;
    }

    let cleanPhone: string | undefined = undefined;
    if (editPhone.trim()) {
      cleanPhone = editPhone.trim().replace(/[\s\-().]+/g, '');
      const phoneRegex = /^(\+?84|0)[35789]\d{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        setEditPhoneError('Số điện thoại không đúng định dạng Việt Nam (10 chữ số).');
        return;
      }
    }

    setIsSubmittingEdit(true);
    try {
      await adminApi.updateUser(selectedUser.id, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phone: cleanPhone,
        recoveryEmail: editRecoveryEmail.trim() || undefined,
        department: editDepartment.trim() || undefined,
      });
      showToast(`Cập nhật thông tin tài khoản ${editEmail.trim()} thành công!`);
      setShowEditModal(false);
      setEditPhoneError(null);
      fetchUsers();
    } catch (err: any) {
      const apiErrors = err.response?.data?.validationErrors;
      let msg = err.response?.data?.message;
      if (err.response?.status === 409 || apiErrors?.phone || (msg && (msg.includes('Số điện thoại') || msg.includes('điện thoại')))) {
        const pErr = apiErrors?.phone || msg || 'Số điện thoại này đã được sử dụng bởi tài khoản khác.';
        setEditPhoneError(pErr);
      }
      if (apiErrors && typeof apiErrors === 'object') {
        const firstErr = Object.values(apiErrors)[0];
        if (firstErr) msg = String(firstErr);
      }
      if (!err.response) {
        msg = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.';
      }
      showToast(msg || 'Cập nhật tài khoản thất bại.', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleExportCsv = () => {
    if (displayedUsers.length === 0) {
      showToast('Không có dữ liệu để xuất file CSV.', 'error');
      return;
    }
    const headers = ['ID,Họ và tên,Email,Số điện thoại,Phòng ban,Vai trò,Trạng thái\n'];
    const rows = displayedUsers.map((u) => {
      const rolesStr = (u.roles || [u.role]).join('; ');
      return `"${u.id}","${u.fullName || ''}","${u.email}","${u.phone || ''}","${u.department || ''}","${rolesStr}","${u.status}"\n`;
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
      {/* Standardized Enterprise Page Header */}
      <PageHeader
        title={canManageUsers ? 'Quản lý Tài khoản & Phân quyền' : 'Danh sách tài khoản'}
        subtitle={
          canManageUsers
            ? 'Quản lý người dùng nội bộ, phân quyền RBAC và kiểm soát truy cập hệ thống'
            : 'Xem danh sách người dùng nội bộ và thông tin vai trò (chỉ xem)'
        }
        breadcrumbs={[
          { label: 'Tổng quan', path: '/dashboard' },
          { label: 'Quản lý tài khoản' },
        ]}
        actions={
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowRbacMatrixModal(true)}
              aria-label="Xem ma trận phân quyền RBAC"
            >
              <span>Ma trận RBAC</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleExportCsv}
              aria-label="Xuất file CSV danh sách người dùng"
            >
              <span>Xuất CSV</span>
            </button>
            {/* S1-08: Only ADMIN (USER_MANAGE) can import Excel */}
            {canManageUsers && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate('/admin/import-excel')}
                aria-label="Nhập danh sách người dùng từ file Excel"
                data-testid="btn-import-excel"
              >
                <span>Nhập từ Excel</span>
              </button>
            )}
            {/* S1-08: Only ADMIN (USER_MANAGE) can add user */}
            {canManageUsers && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddModal(true)}
                aria-label="Thêm người dùng mới"
              >
                <span>Thêm tài khoản</span>
              </button>
            )}
          </div>
        }
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`} role="status" aria-live="polite">
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-green" />
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
            className="btn btn-outline"
            onClick={() => fetchUsers()}
            title="Làm mới danh sách"
            aria-label="Làm mới danh sách"
            disabled={isLoading}
          >
            <span>Làm mới</span>
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
              <th scope="col" style={{ width: '20%' }}>Họ và tên</th>
              <th scope="col" style={{ width: '18%' }}>Email</th>
              <th scope="col" style={{ width: '13%' }}>Số điện thoại</th>
              <th scope="col" style={{ width: '14%' }}>Phòng ban</th>
              <th scope="col" style={{ width: '16%' }}>Vai trò (RBAC)</th>
              <th scope="col" style={{ width: '10%' }}>Trạng thái</th>
              <th scope="col" style={{ width: '9%', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="table-loading-cell">
                  <div className="loading-state-wrapper">
                    <span className="auth-spinner" style={{ width: 22, height: 22 }} />
                    <span>Đang tải danh sách người dùng...</span>
                  </div>
                </td>
              </tr>
            ) : displayedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty-cell">
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
                      {u.recoveryEmail && (
                        <span className="user-recovery-email-hint" style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '2px' }} title="Email khôi phục nhận liên kết reset mật khẩu">
                          ✉ {u.recoveryEmail}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="user-phone-text" style={{ fontSize: '13px', color: '#334155' }}>
                        {u.phone || '—'}
                      </span>
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
                      {u.mustChangePassword && (
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            color: '#b45309',
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            marginTop: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Chưa đổi MK tạm
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-actions">
                        {/* S1-08: Edit user – ADMIN only (USER_MANAGE) */}
                        {canManageUsers && (
                          <button
                            type="button"
                            className="btn-icon"
                            title="Chỉnh sửa thông tin tài khoản"
                            aria-label={`Chỉnh sửa ${u.email}`}
                            onClick={() => handleOpenEdit(u)}
                          >
                            <Pencil size={18} />
                          </button>
                        )}

                        {/* S1-09: Assign roles – ADMIN only (ROLE_MANAGE) */}
                        {canManageRoles && (
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
                        )}

                        {/* S1-10: Lock/unlock – ADMIN only (USER_MANAGE) */}
                        {canManageUsers && (
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
                        )}

                        {/* Delete user – ADMIN only (USER_MANAGE) */}
                        {canManageUsers && (
                          <button
                            type="button"
                            className="btn-icon delete-btn"
                            title={isSelf ? 'Không thể tự xóa tài khoản của chính mình' : `Xóa tài khoản ${u.email}`}
                            aria-label={`Xóa tài khoản ${u.email}`}
                            disabled={!!isSelf}
                            onClick={() => handleOpenDelete(u)}
                            style={{ color: isSelf ? '#9ca3af' : '#dc2626' }}
                            data-testid={`delete-user-btn-${u.id}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}

                        {/* HR_MANAGER: read-only indicator when no actions available */}
                        {!canManageUsers && !canManageRoles && (
                          <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>Chỉ xem</span>
                        )}
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={`status-pill ${u.status ? u.status.toLowerCase() : 'active'}`}>
                      {u.status === 'ACTIVE' ? 'Hoạt động' : u.status === 'LOCKED' ? 'Bị khóa' : 'Vô hiệu hóa'}
                    </span>
                    {u.mustChangePassword && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          color: '#b45309',
                          background: '#fef3c7',
                          border: '1px solid #fde68a',
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        Chưa đổi MK tạm
                      </span>
                    )}
                  </div>
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
                  {canManageUsers && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenEdit(u)}
                    >
                      <Pencil size={14} />
                      <span>Sửa</span>
                    </button>
                  )}
                  {canManageRoles && (
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
                  )}
                  {canManageUsers && (
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
                  )}
                  {!canManageUsers && !canManageRoles && (
                    <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>Chỉ xem</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Standardized Enterprise Pagination */}
      <Pagination
        currentPage={currentPage + 1}
        totalPages={totalPages}
        totalItems={totalElements}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50]}
        itemLabel="tài khoản"
        onPageChange={(p) => setCurrentPage(Math.max(0, p - 1))}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(0);
        }}
      />

      {/* Modal Thêm người dùng mới (S1-08: Activation & Temp Password by System) */}
      {showAddModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-user-modal-title">
          <div className="modal-box user-form-modal-box">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <label htmlFor="newPhone">
                  Số điện thoại <span className="text-danger">*</span>
                </label>
                <input
                  id="newPhone"
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => {
                    setNewPhone(e.target.value);
                    if (newPhoneError) setNewPhoneError(null);
                  }}
                  placeholder="Ví dụ: 0912345678"
                  disabled={isSubmittingAdd}
                />
                {newPhoneError && (
                  <span className="field-error-text text-danger" style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', display: 'block' }}>
                    {newPhoneError}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="newRecoveryEmail">Email khôi phục (tùy chọn)</label>
                <input
                  id="newRecoveryEmail"
                  type="email"
                  value={newRecoveryEmail}
                  onChange={(e) => setNewRecoveryEmail(e.target.value)}
                  placeholder="canhan@gmail.com"
                  disabled={isSubmittingAdd}
                />
                <span className="field-hint" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Email khôi phục chỉ dùng để nhận liên kết đặt lại mật khẩu và không dùng để đăng nhập.
                </span>
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

      {/* Modal Chỉnh sửa người dùng (Section 27) */}
      {showEditModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-user-modal-title">
          <div className="modal-box user-form-modal-box">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="modal-title-icon">
                  <Pencil size={20} />
                </div>
                <h3 id="edit-user-modal-title">Chỉnh sửa thông tin tài khoản</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowEditModal(false)}
                aria-label="Đóng cửa sổ"
                disabled={isSubmittingEdit}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser}>
              <div className="form-group">
                <label htmlFor="editFullName">
                  Họ và tên <span className="text-danger">*</span>
                </label>
                <input
                  id="editFullName"
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  disabled={isSubmittingEdit}
                />
              </div>

              <div className="form-group">
                <label htmlFor="editEmail">
                  Email công ty <span className="text-danger">*</span>
                </label>
                <input
                  id="editEmail"
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="nhanvien@company.com"
                  disabled={isSubmittingEdit}
                />
              </div>

              <div className="form-group">
                <label htmlFor="editPhone">
                  Số điện thoại
                </label>
                <input
                  id="editPhone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => {
                    setEditPhone(e.target.value);
                    if (editPhoneError) setEditPhoneError(null);
                  }}
                  placeholder="Ví dụ: 0912345678"
                  disabled={isSubmittingEdit}
                />
                {editPhoneError && (
                  <span className="field-error-text text-danger" style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', display: 'block' }}>
                    {editPhoneError}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="editRecoveryEmail">
                  Email khôi phục (tùy chọn)
                </label>
                <input
                  id="editRecoveryEmail"
                  type="email"
                  value={editRecoveryEmail}
                  onChange={(e) => setEditRecoveryEmail(e.target.value)}
                  placeholder="canhan@gmail.com"
                  disabled={isSubmittingEdit}
                />
                <span className="field-hint" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Email khôi phục chỉ dùng để nhận liên kết đặt lại mật khẩu và không dùng để đăng nhập.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="editDepartment">Phòng ban (tùy chọn)</label>
                <input
                  id="editDepartment"
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="Ví dụ: Nhân sự, Công nghệ thông tin..."
                  disabled={isSubmittingEdit}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmittingEdit}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? (
                    <>
                      <span className="auth-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu thay đổi</span>
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

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && deletingUser && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingDelete) setShowDeleteModal(false);
          }}
        >
          <div className="modal-dialog modal-sm" data-testid="delete-user-modal">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <AlertCircle size={20} className="modal-title-icon text-danger" style={{ color: '#dc2626' }} />
                <h3 id="delete-user-modal-title">Xác nhận xóa tài khoản</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowDeleteModal(false)}
                disabled={isSubmittingDelete}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ marginBottom: '12px', fontSize: '0.92rem', lineHeight: '1.5' }}>
                Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản sau khỏi hệ thống?
              </p>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: '4px' }}>
                  {deletingUser.fullName || deletingUser.email}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>Email: {deletingUser.email}</div>
                {deletingUser.department && (
                  <div style={{ fontSize: '0.82rem', color: '#7f1d1d', marginTop: '2px' }}>
                    Phòng ban: {deletingUser.department}
                  </div>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: 0 }}>
                ⚠️ Lưu ý: Hành động này sẽ xoá hoàn toàn dữ liệu tài khoản và không thể hoàn tác.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isSubmittingDelete}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                data-testid="confirm-delete-user-btn"
              >
                <span>{isSubmittingDelete ? 'Đang xóa...' : 'Xóa vĩnh viễn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
