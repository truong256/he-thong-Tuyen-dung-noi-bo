import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
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
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import adminApi from '../api/admin';
import { UserSummary } from '../types/user';
import { useAuth } from '../hooks/useAuth';
import RoleAssignmentModal from '../components/admin/RoleAssignmentModal';
import LockAccountModal from '../components/admin/LockAccountModal';
import RbacMatrixModal from '../components/admin/RbacMatrixModal';
import { ATS_ROLES_INFO } from '../constants/rbac';

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Data states
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

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

  // Add User Form states
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRoles, setNewRoles] = useState<string[]>(['RECRUITER']);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [showNewPassword, setShowNewPassword] = useState(false);
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
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await adminApi.listUsers(
        debouncedSearch.trim() || undefined,
        statusFilter,
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
  }, [debouncedSearch, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Client-side role filter refinement if selected
  const displayedUsers = useMemo(() => {
    if (roleFilter === 'ALL') return users;
    return users.filter((u) => {
      const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
      return userRoles.some((r) => r.toUpperCase() === roleFilter.toUpperCase());
    });
  }, [users, roleFilter]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setRoleFilter('ALL');
    setDeptFilter('ALL');
    setCurrentPage(0);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword || !newFullName.trim() || newRoles.length === 0) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Mật khẩu ban đầu phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await adminApi.createUser({
        email: newEmail.trim(),
        password: newPassword,
        fullName: newFullName.trim(),
        roles: newRoles,
        status: newStatus,
      });
      showToast(`Tạo thành công tài khoản cho ${newEmail.trim()}!`);
      setShowAddModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRoles(['RECRUITER']);
      setNewStatus('ACTIVE');
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Tạo tài khoản thất bại. Vui lòng thử lại.';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleExportCsv = () => {
    if (displayedUsers.length === 0) {
      showToast('Không có dữ liệu để xuất file CSV.', 'error');
      return;
    }
    const headers = ['ID,Họ và tên,Email,Vai trò,Trạng thái\n'];
    const rows = displayedUsers.map((u) => {
      const rolesStr = (u.roles || [u.role]).join('; ');
      return `"${u.id}","${u.fullName || ''}","${u.email}","${rolesStr}","${u.status}"\n`;
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
            className="btn btn-outline"
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
            placeholder="Tìm theo email hoặc họ tên..."
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
                  {r.code} - {r.name}
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
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="LOCKED">Bị khóa (LOCKED)</option>
              <option value="INACTIVE">Vô hiệu hóa (INACTIVE)</option>
            </select>
          </div>

          {/* Department Filter (Sprint 2 indicator) */}
          <div className="filter-select">
            <label htmlFor="dept-filter">Phòng ban:</label>
            <select
              id="dept-filter"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              title="Tính năng lọc phòng ban đang được hoàn thiện ở Sprint 2"
            >
              <option value="ALL">Tất cả phòng ban</option>
              <option value="TECH" disabled>Công nghệ thông tin (Sprint 2)</option>
              <option value="HR" disabled>Nhân sự (Sprint 2)</option>
              <option value="SALES" disabled>Kinh doanh (Sprint 2)</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {(search || statusFilter !== 'ALL' || roleFilter !== 'ALL' || deptFilter !== 'ALL') && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleResetFilters}
              title="Đặt lại tất cả bộ lọc"
            >
              <Filter size={14} />
              <span>Đặt lại</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-icon"
            onClick={fetchUsers}
            title="Làm mới danh sách"
            disabled={isLoading}
            aria-label="Tải lại danh sách"
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {fetchError && !isLoading && (
        <div className="alert-box error" style={{ marginBottom: '16px' }} role="alert">
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}>{fetchError}</div>
          <button type="button" className="btn btn-outline btn-sm" onClick={fetchUsers}>
            Thử lại
          </button>
        </div>
      )}

      {/* Users table wrapper */}
      <div className="table-responsive">
        <table className="custom-table" aria-label="Bảng danh sách người dùng">
          <thead>
            <tr>
              <th scope="col" style={{ width: '25%' }}>Họ và tên</th>
              <th scope="col" style={{ width: '25%' }}>Email</th>
              <th scope="col" style={{ width: '25%' }}>Vai trò (RBAC)</th>
              <th scope="col" style={{ width: '13%' }}>Trạng thái</th>
              <th scope="col" style={{ width: '12%', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="table-loading-cell">
                  <div className="loading-state-wrapper">
                    <span className="auth-spinner" style={{ width: 22, height: 22 }} />
                    <span>Đang tải danh sách người dùng...</span>
                  </div>
                </td>
              </tr>
            ) : displayedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty-cell">
                  <div className="empty-state-wrapper">
                    <div className="empty-state-icon">
                      <Search size={32} />
                    </div>
                    <h4>Không tìm thấy người dùng nào</h4>
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
                        <strong>{u.fullName || u.email.split('@')[0]}</strong>
                        {isSelf && <span className="tag-self">Bạn</span>}
                      </div>
                    </td>
                    <td>
                      <span className="user-email-text">{u.email}</span>
                    </td>
                    <td>
                      <div className="role-tags">
                        {userRoles.map((r) => (
                          <span key={r} className={`tag ${getRoleBadgeClass(r)}`}>
                            {r}
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
                          className={`btn-icon ${isLocked ? 'text-green' : 'text-orange'}`}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          aria-label={`${isLocked ? 'Mở khóa' : 'Khóa'} tài khoản ${u.email}`}
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

      {/* Mobile Card View (Adaptation for <= 640px) */}
      <div className="mobile-user-cards-list">
        {isLoading ? (
          <div className="loading-state-wrapper" style={{ padding: '24px 0' }}>
            <span className="auth-spinner" style={{ width: 20, height: 20 }} />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="empty-state-wrapper" style={{ padding: '24px 0' }}>
            <Search size={28} />
            <p style={{ marginTop: '8px' }}>Không có tài khoản phù hợp</p>
          </div>
        ) : (
          displayedUsers.map((u) => {
            const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role || 'CANDIDATE'];
            const isLocked = u.status === 'LOCKED';
            const isSelf = currentUser && u.email.toLowerCase() === currentUser.email.toLowerCase();

            return (
              <div key={u.id} className={`mobile-user-card ${isLocked ? 'card-locked' : ''}`}>
                <div className="mobile-card-header">
                  <div>
                    <strong>{u.fullName || u.email.split('@')[0]}</strong>
                    {isSelf && <span className="tag-self">Bạn</span>}
                    <div className="mobile-card-email">{u.email}</div>
                  </div>
                  <span className={`status-pill ${u.status ? u.status.toLowerCase() : 'active'}`}>
                    {u.status === 'ACTIVE' ? 'Hoạt động' : u.status === 'LOCKED' ? 'Bị khóa' : 'Vô hiệu hóa'}
                  </span>
                </div>

                <div className="mobile-card-roles">
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Vai trò:</span>
                  <div className="role-tags">
                    {userRoles.map((r) => (
                      <span key={r} className={`tag ${getRoleBadgeClass(r)}`}>
                        {r}
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

      {/* Pagination Controls UI (S1-08) */}
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

        <div className="pagination-nav">
          <button
            type="button"
            className="btn btn-outline btn-sm pagination-btn"
            disabled={currentPage === 0 || isLoading}
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
            <span>Trước</span>
          </button>

          <span className="pagination-current-page">
            Trang <strong>{currentPage + 1}</strong> / {Math.max(1, totalPages)}
          </span>

          <button
            type="button"
            className="btn btn-outline btn-sm pagination-btn"
            disabled={currentPage >= totalPages - 1 || isLoading}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            aria-label="Trang tiếp theo"
          >
            <span>Tiếp</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-user-title">
          <div className="modal-box">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="modal-title-icon">
                  <UserPlus size={20} />
                </div>
                <h3 id="add-user-title">Thêm người dùng mới</h3>
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
                <label htmlFor="newPassword">
                  Mật khẩu ban đầu <span className="text-danger">*</span>
                </label>
                <div className="input-with-eye">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    disabled={isSubmittingAdd}
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Gán vai trò ban đầu (RBAC) <span className="text-danger">*</span>
                </label>
                <div className="checkbox-grid">
                  {ATS_ROLES_INFO.map((role) => (
                    <label key={role.code} className="checkbox-item">
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
                      <span>{role.code}</span>
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
                  <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                  <option value="LOCKED">Bị khóa (LOCKED)</option>
                  <option value="INACTIVE">Vô hiệu hóa (INACTIVE)</option>
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
                    <span>Tạo người dùng</span>
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
        onSuccess={(_, status) => {
          showToast(
            `Đã ${status === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản ${selectedUser?.email} thành công!`
          );
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
