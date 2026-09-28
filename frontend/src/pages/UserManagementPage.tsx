import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../api/admin';
import { UserSummary } from '../types/user';

const ALL_ROLES = [
  'ADMIN',
  'HR_MANAGER',
  'RECRUITER',
  'HIRING_MANAGER',
  'INTERVIEWER',
  'APPROVER',
  'CANDIDATE',
];

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['RECRUITER']);
  const [newStatus, setNewStatus] = useState('ACTIVE');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.listUsers(search, statusFilter, 0, 50);
      setUsers(data.content);
    } catch {
      showToast('Lỗi khi tải danh sách người dùng', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newFullName || selectedRoles.length === 0) {
      showToast('Vui lòng điền đủ các thông tin bắt buộc', 'error');
      return;
    }

    try {
      await adminApi.createUser({
        email: newEmail.trim(),
        password: newPassword,
        fullName: newFullName.trim(),
        roles: selectedRoles,
        status: newStatus,
      });
      showToast('Tạo tài khoản thành công!');
      setShowAddModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setSelectedRoles(['RECRUITER']);
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Tạo tài khoản thất bại', 'error');
    }
  };

  const handleToggleStatus = async (user: UserSummary) => {
    const nextStatus = user.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    try {
      await adminApi.updateStatus(user.id, { status: nextStatus });
      showToast(`Đã ${nextStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản ${user.email}`);
      fetchUsers();
    } catch {
      showToast('Không thể cập nhật trạng thái', 'error');
    }
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    try {
      await adminApi.updateRoles(selectedUser.id, { roles: selectedRoles });
      showToast('Cập nhật phân quyền thành công!');
      setShowRoleModal(false);
      fetchUsers();
    } catch {
      showToast('Không thể cập nhật quyền', 'error');
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID,Họ và tên,Email,Vai trò,Trạng thái\n'];
    const rows = users.map((u) => {
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

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h2>Quản lý Tài khoản & Phân quyền</h2>
          <p>Quản lý người dùng nội bộ, phân quyền RBAC và kiểm soát truy cập</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleExportCsv}>
            <i className="bi bi-file-earmark-spreadsheet"></i> Xuất CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <i className="bi bi-person-plus-fill"></i> Thêm người dùng
          </button>
        </div>
      </div>

      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <i className={`bi bi-${toast.type === 'success' ? 'check-circle' : 'exclamation-circle'}-fill`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Tìm theo email hoặc họ tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-select">
          <label>Trạng thái:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">Tất cả</option>
            <option value="ACTIVE">Hoạt động (ACTIVE)</option>
            <option value="LOCKED">Bị khóa (LOCKED)</option>
            <option value="INACTIVE">Vô hiệu hóa (INACTIVE)</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Email</th>
              <th>Vai trò (Roles)</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>
                  <i className="bi bi-arrow-repeat spin"></i> Đang tải dữ liệu...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Không tìm thấy người dùng nào phù hợp.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.fullName || u.email.split('@')[0]}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <div className="role-tags">
                        {userRoles.map((r) => (
                          <span key={r} className="tag">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${u.status.toLowerCase()}`}>
                        {u.status === 'ACTIVE' ? 'Hoạt động' : u.status === 'LOCKED' ? 'Bị khóa' : 'Vô hiệu hóa'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        title="Phân vai trò"
                        onClick={() => {
                          setSelectedUser(u);
                          setSelectedRoles(userRoles);
                          setShowRoleModal(true);
                        }}
                      >
                        <i className="bi bi-shield-check"></i>
                      </button>
                      <button
                        className={`btn-icon ${u.status === 'LOCKED' ? 'text-green' : 'text-orange'}`}
                        title={u.status === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản'}
                        onClick={() => handleToggleStatus(u)}
                      >
                        <i className={`bi bi-${u.status === 'LOCKED' ? 'unlock-fill' : 'lock-fill'}`}></i>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Thêm người dùng mới</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Họ và tên</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="form-group">
                <label>Email công ty</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@company.com"
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu ban đầu</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>

              <div className="form-group">
                <label>Gán vai trò (RBAC)</label>
                <div className="checkbox-grid">
                  {ALL_ROLES.map((role) => (
                    <label key={role} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role]);
                          } else {
                            setSelectedRoles(selectedRoles.filter((r) => r !== role));
                          }
                        }}
                      />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>Trạng thái tài khoản</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                  <option value="LOCKED">Bị khóa (LOCKED)</option>
                  <option value="INACTIVE">Vô hiệu hóa (INACTIVE)</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo người dùng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Roles Modal */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Phân vai trò: {selectedUser.email}</h3>
              <button className="close-btn" onClick={() => setShowRoleModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div style={{ padding: '15px 0' }}>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '15px' }}>
                Chọn một hoặc nhiều vai trò hệ thống gán cho người dùng:
              </p>
              <div className="checkbox-grid">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, role]);
                        } else {
                          setSelectedRoles(selectedRoles.filter((r) => r !== role));
                        }
                      }}
                    />
                    <span>{role}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>
                Hủy
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveRoles}>
                Lưu vai trò
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
