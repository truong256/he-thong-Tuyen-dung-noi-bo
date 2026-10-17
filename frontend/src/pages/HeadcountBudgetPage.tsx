import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Coins,
  Edit2,
  Eye,
  History,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { useAuth } from '../hooks/useAuth';
import budgetApi from '../api/budget';
import organizationApi from '../api/organization';
import {
  BudgetSummary,
  BudgetDashboardStats,
  BudgetStatus,
  CreateBudgetPayload,
  UpdateBudgetPayload,
  BudgetAuditLog,
} from '../types/budget';
import { Department } from '../types/organization';
import { formatNumberWithCommas, parseNumberFromCommas } from '../utils/numberFormat';
import '../styles/headcount-budget.css';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

export const HeadcountBudgetPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['HR_MANAGER', 'ADMIN']);

  // Data states
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [stats, setStats] = useState<BudgetDashboardStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [auditLogs, setAuditLogs] = useState<BudgetAuditLog[]>([]);

  // Filter states
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Loading & notification states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [activeBudget, setActiveBudget] = useState<BudgetSummary | null>(null);

  // Form states
  const [formDeptId, setFormDeptId] = useState<string>('');
  const [formYear, setFormYear] = useState<number>(CURRENT_YEAR);
  const [formQuota, setFormQuota] = useState<string>('5');
  const [formSalaryBudgetVnd, setFormSalaryBudgetVnd] = useState<string>('600,000,000');
  const [formNote, setFormNote] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Audit log filter
  const [auditDeptId, setAuditDeptId] = useState<string>('ALL');
  const [auditPage, setAuditPage] = useState<number>(0);
  const [auditTotalPages, setAuditTotalPages] = useState<number>(1);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);

  // Format currency
  const formatVnd = (val?: number | null) => {
    if (val === undefined || val === null) return '0 đ';
    return `${new Intl.NumberFormat('vi-VN').format(val)} đ`;
  };

  // Fetch departments
  useEffect(() => {
    organizationApi.getDepartments().then((list) => {
      setDepartments(list || []);
      if (list && list.length > 0) {
        setFormDeptId((prev) => prev || String(list[0].id));
      }
    }).catch((err) => {
      console.error('Không thể tải danh sách phòng ban', err);
    });
  }, []);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await budgetApi.getBudgetStats(selectedYear);
      setStats(data);
    } catch (err) {
      console.error('Lỗi khi tải thống kê ngân sách:', err);
    }
  }, [selectedYear]);

  // Fetch paged budgets
  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const deptIdNum = selectedDeptId !== 'ALL' ? Number(selectedDeptId) : undefined;
      const statusParam = selectedStatus !== 'ALL' ? (selectedStatus as BudgetStatus) : undefined;

      const res = await budgetApi.searchBudgets({
        year: selectedYear,
        departmentId: deptIdNum,
        status: statusParam,
        page,
        size: pageSize,
      });

      setBudgets(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tải danh sách ngân sách.';
      setNotification({ type: 'error', message: msg });
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedDeptId, selectedStatus, page, pageSize]);

  useEffect(() => {
    fetchStats();
    fetchBudgets();
  }, [fetchStats, fetchBudgets]);

  // Client-side search filtering by department name/code
  const filteredBudgets = useMemo(() => {
    if (!searchKeyword.trim()) return budgets;
    const kw = searchKeyword.trim().toLowerCase();
    return budgets.filter(
      (b) =>
        b.departmentName.toLowerCase().includes(kw) ||
        (b.departmentCode && b.departmentCode.toLowerCase().includes(kw))
    );
  }, [budgets, searchKeyword]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const defaultDept = departments.length > 0 ? String(departments[0].id) : '';
    setFormDeptId(defaultDept);
    setFormYear(selectedYear);
    setFormQuota('5');
    setFormSalaryBudgetVnd('600,000,000');
    setFormNote('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (b: BudgetSummary) => {
    setActiveBudget(b);
    setFormDeptId(String(b.departmentId));
    setFormYear(b.year);
    setFormQuota(String(b.headcountQuota));
    setFormSalaryBudgetVnd(formatNumberWithCommas(b.salaryBudgetVnd));
    setFormNote(b.note || '');
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (b: BudgetSummary) => {
    setActiveBudget(b);
    setIsDetailModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (b: BudgetSummary) => {
    setActiveBudget(b);
    setIsDeleteModalOpen(true);
  };

  // Open Audit Logs Modal
  const handleOpenAuditLogs = async () => {
    setIsAuditLogsModalOpen(true);
    setAuditPage(0);
    fetchAuditLogs(0);
  };

  const fetchAuditLogs = async (p: number) => {
    setIsAuditLoading(true);
    try {
      const deptIdNum = auditDeptId !== 'ALL' ? Number(auditDeptId) : undefined;
      const res = await budgetApi.getBudgetAuditLogs({
        departmentId: deptIdNum,
        year: selectedYear,
        page: p,
        size: 15,
      });
      setAuditLogs(res.content || []);
      setAuditTotalPages(res.totalPages || 1);
      setAuditPage(p);
    } catch (err: any) {
      console.error('Lỗi khi tải nhật ký ngân sách:', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const quotaNum = parseInt(formQuota, 10);
    const salaryNum = Number(parseNumberFromCommas(formSalaryBudgetVnd)) || 0;

    if (!formDeptId) {
      setFormError('Vui lòng chọn phòng ban.');
      return;
    }
    if (isNaN(quotaNum) || quotaNum < 1) {
      setFormError('Chỉ tiêu định mức Headcount phải tối thiểu là 1.');
      return;
    }
    if (isNaN(salaryNum) || salaryNum < 0) {
      setFormError('Hạn mức ngân sách lương không hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateBudgetPayload = {
        departmentId: Number(formDeptId),
        year: formYear,
        headcountQuota: quotaNum,
        salaryBudgetVnd: salaryNum,
        note: formNote.trim() || undefined,
      };

      await budgetApi.createBudget(payload);
      setNotification({ type: 'success', message: 'Khai báo ngân sách phòng ban thành công!' });
      setIsCreateModalOpen(false);
      fetchStats();
      fetchBudgets();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tạo ngân sách.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBudget) return;
    setFormError(null);

    const quotaNum = parseInt(formQuota, 10);
    const salaryNum = Number(parseNumberFromCommas(formSalaryBudgetVnd)) || 0;

    if (isNaN(quotaNum) || quotaNum < activeBudget.headcountUsed) {
      setFormError(
        `Không thể giảm chỉ tiêu xuống dưới số headcount đã dùng (${activeBudget.headcountUsed} người).`
      );
      return;
    }
    if (isNaN(salaryNum) || salaryNum < activeBudget.salaryBudgetUsedVnd) {
      setFormError(
        `Không thể giảm ngân sách lương xuống dưới số tiền đã cam kết (${formatVnd(activeBudget.salaryBudgetUsedVnd)}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateBudgetPayload = {
        headcountQuota: quotaNum,
        salaryBudgetVnd: salaryNum,
        note: formNote.trim() || undefined,
      };

      await budgetApi.updateBudget(activeBudget.id, payload);
      setNotification({ type: 'success', message: 'Cập nhật ngân sách phòng ban thành công!' });
      setIsEditModalOpen(false);
      fetchStats();
      fetchBudgets();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể cập nhật ngân sách.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!activeBudget) return;
    setIsSubmitting(true);
    try {
      await budgetApi.deleteBudget(activeBudget.id);
      setNotification({ type: 'success', message: 'Đã xóa ngân sách phòng ban thành công!' });
      setIsDeleteModalOpen(false);
      fetchStats();
      fetchBudgets();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xóa ngân sách.';
      setNotification({ type: 'error', message: msg });
      setIsDeleteModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status badge renderer
  const renderStatusBadge = (status: BudgetStatus) => {
    switch (status) {
      case 'NORMAL':
        return <span className="hb-badge normal">Bình thường</span>;
      case 'NEAR_LIMIT':
        return <span className="hb-badge near_limit">Gần hết (≥85%)</span>;
      case 'EXHAUSTED':
        return <span className="hb-badge exhausted">Đã hết định mức</span>;
      case 'EXCEEDED':
        return <span className="hb-badge exceeded">Vượt hạn mức</span>;
      default:
        return <span className="hb-badge normal">{status}</span>;
    }
  };

  // Utilization color class
  const getProgressClass = (rate: number) => {
    if (rate >= 100) return 'exceeded';
    if (rate >= 85) return 'near-limit';
    return 'normal';
  };

  return (
    <div className="headcount-budget-page">
      {/* Top Header */}
      <PageHeader
        title="Quản lý Ngân sách Headcount"
        subtitle="Quản trị định mức chỉ tiêu tuyển dụng và trần ngân sách chi trả lương theo từng phòng ban"
        breadcrumbs={[
          { label: 'Trang chủ', path: '/dashboard' },
          { label: 'Quy trình tuyển dụng' },
          { label: 'Ngân sách Headcount' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              onClick={handleOpenAuditLogs}
              icon={<History size={16} />}
            >
              Nhật ký ngân sách
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                fetchStats();
                fetchBudgets();
              }}
              icon={<RefreshCw size={16} />}
            >
              Làm mới
            </Button>
            {canManage && (
              <Button
                variant="primary"
                onClick={handleOpenCreate}
                icon={<Plus size={16} />}
              >
                Khai báo ngân sách
              </Button>
            )}
          </div>
        }
      />

      {/* Notification Banner */}
      {notification && (
        <div
          className={`hb-eval-banner ${notification.type === 'success' ? 'success' : 'danger'}`}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} color="#059669" />
            ) : (
              <AlertCircle size={18} color="#dc2626" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="hb-stats-grid">
        {/* Card 1: Tổng chỉ tiêu Headcount */}
        <div className="hb-stat-card">
          <div className="hb-stat-icon-wrapper blue">
            <Users size={24} />
          </div>
          <div className="hb-stat-info">
            <span className="hb-stat-title">Tổng chỉ tiêu Headcount</span>
            <span className="hb-stat-value">
              {stats ? stats.totalHeadcountQuota : 0}
            </span>
            <span className="hb-stat-subtext">
              Năm {selectedYear} • <span className="highlight">{stats?.activeBudgetsCount ?? 0}</span> phòng ban
            </span>
          </div>
        </div>

        {/* Card 2: Headcount đã sử dụng */}
        <div className="hb-stat-card">
          <div className="hb-stat-icon-wrapper indigo">
            <Layers size={24} />
          </div>
          <div className="hb-stat-info">
            <span className="hb-stat-title">Headcount đã sử dụng</span>
            <span className="hb-stat-value">
              {stats ? stats.totalHeadcountUsed : 0}
            </span>
            <span className="hb-stat-subtext">
              Tỷ lệ lấp đầy:{' '}
              <span className="highlight">
                {stats?.overallHeadcountUtilizationRate ?? 0}%
              </span>
            </span>
          </div>
        </div>

        {/* Card 3: Headcount còn lại */}
        <div className="hb-stat-card">
          <div className="hb-stat-icon-wrapper emerald">
            <Building2 size={24} />
          </div>
          <div className="hb-stat-info">
            <span className="hb-stat-title">Headcount còn lại</span>
            <span className="hb-stat-value">
              {stats ? stats.totalHeadcountRemaining : 0}
            </span>
            <span className="hb-stat-subtext">
              Chỉ tiêu khả dụng để tuyển mới
            </span>
          </div>
        </div>

        {/* Card 4: Ngân sách lương còn lại */}
        <div className="hb-stat-card">
          <div className="hb-stat-icon-wrapper amber">
            <Coins size={24} />
          </div>
          <div className="hb-stat-info">
            <span className="hb-stat-title">Ngân sách lương còn lại</span>
            <span className="hb-stat-value" style={{ fontSize: '1.45rem' }}>
              {stats ? formatVnd(stats.totalSalaryBudgetRemainingVnd) : '0 đ'}
            </span>
            <span className="hb-stat-subtext">
              Đã cam kết: {stats ? formatVnd(stats.totalSalaryBudgetUsedVnd) : '0 đ'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="hb-filter-card">
        <div className="hb-filter-group">
          {/* Search box */}
          <div className="hb-search-input-box">
            <Search size={16} />
            <input
              type="text"
              className="hb-search-input"
              placeholder="Tìm theo tên hoặc mã phòng ban..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>

          {/* Year selector */}
          <select
            className="hb-select"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setPage(0);
            }}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>

          {/* Department selector */}
          <select
            className="hb-select"
            value={selectedDeptId}
            onChange={(e) => {
              setSelectedDeptId(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">Tất cả phòng ban</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status selector */}
          <select
            className="hb-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="NORMAL">Bình thường</option>
            <option value="NEAR_LIMIT">Gần hết (≥85%)</option>
            <option value="EXHAUSTED">Đã hết định mức</option>
            <option value="EXCEEDED">Vượt hạn mức</option>
          </select>
        </div>
      </div>

      {/* Main Budget Table */}
      <div className="hb-table-card">
        {isLoading ? (
          <div style={{ padding: '60px 20px' }}>
            <LoadingState message="Đang tải dữ liệu ngân sách headcount..." />
          </div>
        ) : filteredBudgets.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu ngân sách"
            description={
              selectedDeptId !== 'ALL' || selectedStatus !== 'ALL' || searchKeyword
                ? 'Không tìm thấy phòng ban nào phù hợp với bộ lọc hiện tại.'
                : `Phòng ban nào chưa được khai báo ngân sách năm ${selectedYear}. Bấm "Khai báo ngân sách" để thiết lập định mức.`
            }
            action={
              canManage ? (
                <Button variant="primary" onClick={handleOpenCreate} icon={<Plus size={16} />}>
                  Khai báo ngân sách ngay
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="hb-table-container">
            <table className="hb-table">
              <thead>
                <tr>
                  <th>Phòng ban</th>
                  <th style={{ textAlign: 'center' }}>Năm</th>
                  <th>Chỉ tiêu Headcount</th>
                  <th>Tiến độ sử dụng</th>
                  <th>Ngân sách lương (Cả năm)</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredBudgets.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="hb-dept-col">
                        <span className="hb-dept-name">{b.departmentName}</span>
                        {b.departmentCode && (
                          <span className="hb-dept-code">{b.departmentCode}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.year}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600 }}>
                          {b.headcountUsed} / {b.headcountQuota} người
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Còn lại: <strong>{b.headcountRemaining}</strong> chỉ tiêu
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="hb-utilization-box">
                        <div className="hb-utilization-header">
                          <span>Tỷ lệ</span>
                          <span className="hb-utilization-rate">
                            {b.headcountUtilizationRate}%
                          </span>
                        </div>
                        <div className="hb-progress-bar-bg">
                          <div
                            className={`hb-progress-bar-fill ${getProgressClass(
                              b.headcountUtilizationRate
                            )}`}
                            style={{
                              width: `${Math.min(100, b.headcountUtilizationRate)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600 }}>{formatVnd(b.salaryBudgetVnd)}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Đã dùng: {formatVnd(b.salaryBudgetUsedVnd)} ({b.salaryUtilizationRate}%)
                        </span>
                      </div>
                    </td>
                    <td>{renderStatusBadge(b.status)}</td>
                    <td>
                      <div className="hb-actions-cell" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="hb-action-btn"
                          title="Xem chi tiết"
                          onClick={() => handleOpenDetail(b)}
                        >
                          <Eye size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="hb-action-btn"
                              title="Chỉnh sửa ngân sách"
                              onClick={() => handleOpenEdit(b)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="hb-action-btn delete"
                              title={
                                b.headcountUsed > 0
                                  ? 'Đã có yêu cầu sử dụng định mức này, không thể xóa'
                                  : 'Xóa ngân sách'
                              }
                              disabled={b.headcountUsed > 0}
                              onClick={() => handleOpenDelete(b)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
            }}
          >
            <span style={{ color: '#64748b' }}>
              Hiển thị {filteredBudgets.length} / {totalElements} phòng ban
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Trước
              </Button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                Trang {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: KHAI BÁO NGÂN SÁCH MỚI
          ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Khai báo Ngân sách Headcount Phòng ban"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="hb-modal-form">
          {formError && (
            <div className="hb-danger-box">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="hb-form-group">
            <label>
              Phòng ban <span className="required">*</span>
            </label>
            <select
              className="hb-form-select"
              value={formDeptId}
              onChange={(e) => setFormDeptId(e.target.value)}
              required
            >
              <option value="" disabled>
                -- Chọn phòng ban áp dụng --
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="hb-form-row">
            <div className="hb-form-group">
              <label>
                Năm áp dụng <span className="required">*</span>
              </label>
              <select
                className="hb-form-select"
                value={formYear}
                onChange={(e) => setFormYear(Number(e.target.value))}
                required
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="hb-form-group">
              <label>
                Chỉ tiêu Headcount <span className="required">*</span>
              </label>
              <input
                type="number"
                min="1"
                className="hb-form-input"
                placeholder="VD: 10"
                value={formQuota}
                onChange={(e) => setFormQuota(e.target.value)}
                required
              />
              <span className="hb-form-hint">Số lượng nhân sự tối đa được duyệt tuyển</span>
            </div>
          </div>

          <div className="hb-form-group">
            <label>
              Trần ngân sách lương cả năm (VND) <span className="required">*</span>
            </label>
            <input
              type="text"
              className="hb-form-input"
              placeholder="VD: 1,200,000,000"
              value={formSalaryBudgetVnd}
              onChange={(e) => setFormSalaryBudgetVnd(formatNumberWithCommas(e.target.value))}
              required
            />
            <span className="hb-form-hint">
              Tổng quỹ lương cho các đợt tuyển mới trong năm (Quy đổi = Số lượng × Lương tháng × 12 tháng)
            </span>
          </div>

          <div className="hb-form-group">
            <label>Ghi chú kế hoạch</label>
            <textarea
              className="hb-form-textarea"
              placeholder="Kế hoạch tuyển dụng mở rộng quy mô bộ phận..."
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              maxLength={500}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Xác nhận khai báo
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL 2: ĐIỀU CHỈNH NGÂN SÁCH (EDIT)
          ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Điều chỉnh Ngân sách - ${activeBudget?.departmentName} (${activeBudget?.year})`}
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="hb-modal-form">
          {formError && (
            <div className="hb-danger-box">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {activeBudget && (
            <div className="hb-warning-box">
              <AlertTriangle size={18} />
              <div>
                <strong>Lưu ý bảo toàn định mức đã dùng:</strong>
                <div style={{ marginTop: '4px' }}>
                  • Headcount đã dùng:{' '}
                  <strong>{activeBudget.headcountUsed} người</strong>. Không thể hạ chỉ tiêu dưới mức này.
                </div>
                <div>
                  • Ngân sách lương đã cam kết:{' '}
                  <strong>{formatVnd(activeBudget.salaryBudgetUsedVnd)}</strong>.
                </div>
              </div>
            </div>
          )}

          <div className="hb-form-row">
            <div className="hb-form-group">
              <label>
                Chỉ tiêu Headcount mới <span className="required">*</span>
              </label>
              <input
                type="number"
                min={activeBudget?.headcountUsed || 1}
                className="hb-form-input"
                value={formQuota}
                onChange={(e) => setFormQuota(e.target.value)}
                required
              />
            </div>

            <div className="hb-form-group">
              <label>
                Trần ngân sách lương mới (VND) <span className="required">*</span>
              </label>
              <input
                type="text"
                className="hb-form-input"
                value={formSalaryBudgetVnd}
                onChange={(e) => setFormSalaryBudgetVnd(formatNumberWithCommas(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="hb-form-group">
            <label>Ghi chú lý do điều chỉnh</label>
            <textarea
              className="hb-form-textarea"
              placeholder="VD: Bổ sung chỉ tiêu dự án mới quý 3..."
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              maxLength={500}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL 3: CHI TIẾT NGÂN SÁCH
          ========================================================================= */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Chi tiết Ngân sách & Tiến độ sử dụng"
        size="lg"
      >
        {activeBudget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header summary */}
            <div
              style={{
                background: '#eff6ff',
                padding: '16px 20px',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '1.125rem', color: '#1e40af' }}>
                  {activeBudget.departmentName}
                </h4>
                <span style={{ fontSize: '0.8125rem', color: '#3b82f6' }}>
                  Mã phòng ban: {activeBudget.departmentCode || 'N/A'} • Kế hoạch năm{' '}
                  <strong>{activeBudget.year}</strong>
                </span>
              </div>
              <div>{renderStatusBadge(activeBudget.status)}</div>
            </div>

            {/* Grid 2 cột: Headcount & Lương */}
            <div className="hb-detail-grid">
              {/* Cột Headcount */}
              <div className="hb-detail-box">
                <div className="hb-detail-box-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={16} /> Chỉ tiêu Headcount
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: '#2563eb' }}>
                    {activeBudget.headcountUtilizationRate}%
                  </span>
                </div>
                <div className="hb-detail-row">
                  <span className="label">Định mức phân bổ:</span>
                  <span className="val">{activeBudget.headcountQuota} người</span>
                </div>
                <div className="hb-detail-row">
                  <span className="label">Đã duyệt sử dụng:</span>
                  <span className="val">{activeBudget.headcountUsed} người</span>
                </div>
                <div className="hb-detail-row">
                  <span className="label">Chỉ tiêu còn lại:</span>
                  <span className="val" style={{ color: '#059669' }}>
                    {activeBudget.headcountRemaining} người
                  </span>
                </div>
                <div className="hb-progress-bar-bg" style={{ marginTop: '8px' }}>
                  <div
                    className={`hb-progress-bar-fill ${getProgressClass(
                      activeBudget.headcountUtilizationRate
                    )}`}
                    style={{ width: `${Math.min(100, activeBudget.headcountUtilizationRate)}%` }}
                  />
                </div>
              </div>

              {/* Cột Ngân sách Lương */}
              <div className="hb-detail-box">
                <div className="hb-detail-box-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Coins size={16} /> Ngân sách Chi trả Lương
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: '#2563eb' }}>
                    {activeBudget.salaryUtilizationRate}%
                  </span>
                </div>
                <div className="hb-detail-row">
                  <span className="label">Trần ngân sách năm:</span>
                  <span className="val">{formatVnd(activeBudget.salaryBudgetVnd)}</span>
                </div>
                <div className="hb-detail-row">
                  <span className="label">Đã cam kết sử dụng:</span>
                  <span className="val">{formatVnd(activeBudget.salaryBudgetUsedVnd)}</span>
                </div>
                <div className="hb-detail-row">
                  <span className="label">Số dư khả dụng:</span>
                  <span className="val" style={{ color: '#059669' }}>
                    {formatVnd(activeBudget.salaryBudgetRemainingVnd)}
                  </span>
                </div>
                <div className="hb-progress-bar-bg" style={{ marginTop: '8px' }}>
                  <div
                    className={`hb-progress-bar-fill ${getProgressClass(
                      activeBudget.salaryUtilizationRate
                    )}`}
                    style={{ width: `${Math.min(100, activeBudget.salaryUtilizationRate)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Note & Metadata */}
            <div
              style={{
                fontSize: '0.8125rem',
                color: '#64748b',
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div>
                <strong>Ghi chú:</strong> {activeBudget.note || 'Không có ghi chú.'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span>Khởi tạo bởi: {activeBudget.createdByName}</span>
                <span>Cập nhật lần cuối: {activeBudget.updatedByName}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          MODAL 4: XÁC NHẬN XÓA NGÂN SÁCH
          ========================================================================= */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Xác nhận Xóa Ngân sách"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="hb-danger-box">
            <AlertCircle size={20} />
            <div>
              Bạn có chắc chắn muốn xóa ngân sách năm <strong>{activeBudget?.year}</strong> của phòng ban{' '}
              <strong>{activeBudget?.departmentName}</strong>? Thao tác này sẽ được ghi vào nhật ký kiểm toán.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteSubmit}
              isLoading={isSubmitting}
            >
              Xác nhận xóa
            </Button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL 5: NHẬT KÝ KIỂM TOÁN NGÂN SÁCH (AUDIT LOGS)
          ========================================================================= */}
      <Modal
        isOpen={isAuditLogsModalOpen}
        onClose={() => setIsAuditLogsModalOpen(false)}
        title="Nhật ký Biến động Ngân sách & Phê duyệt Ghi đè"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Audit filter toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <select
              className="hb-select"
              value={auditDeptId}
              onChange={(e) => {
                setAuditDeptId(e.target.value);
                setAuditPage(0);
              }}
            >
              <option value="ALL">Tất cả phòng ban</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAuditLogs(0)}
              icon={<RefreshCw size={14} />}
            >
              Lọc nhật ký
            </Button>
          </div>

          {/* Table */}
          {isAuditLoading ? (
            <div style={{ padding: '40px 0' }}>
              <LoadingState message="Đang tải nhật ký kiểm toán..." />
            </div>
          ) : auditLogs.length === 0 ? (
            <EmptyState
              title="Chưa có nhật ký ghi nhận"
              description="Chưa có thao tác khởi tạo, điều chỉnh hoặc phê duyệt vượt ngân sách nào được ghi nhận."
            />
          ) : (
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="hb-audit-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Thao tác</th>
                    <th>Phòng ban</th>
                    <th>Người thực hiện</th>
                    <th>Lý do & Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                        {new Intl.DateTimeFormat('vi-VN', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        }).format(new Date(log.createdAt))}
                      </td>
                      <td>
                        <span className={`hb-audit-badge ${log.action}`}>
                          {log.action === 'BUDGET_CREATED' && 'Khai báo mới'}
                          {log.action === 'BUDGET_UPDATED' && 'Cập nhật'}
                          {log.action === 'BUDGET_DELETED' && 'Xóa ngân sách'}
                          {log.action === 'BUDGET_OVERRIDE' && 'Phê duyệt ghi đè'}
                        </span>
                      </td>
                      <td>
                        <strong>{log.departmentName}</strong> ({log.year})
                      </td>
                      <td>
                        <div>{log.userFullName || log.userEmail}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {log.userEmail}
                        </div>
                      </td>
                      <td>
                        {log.reason && (
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            Lý do: {log.reason}
                          </div>
                        )}
                        <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '2px' }}>
                          {log.detail}
                        </div>
                        {log.requisitionTitle && (
                          <div style={{ color: '#2563eb', fontSize: '0.75rem', marginTop: '2px' }}>
                            Yêu cầu: {log.requisitionTitle}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit Pagination */}
          {auditTotalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '8px',
              }}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage === 0}
                onClick={() => fetchAuditLogs(Math.max(0, auditPage - 1))}
              >
                Trước
              </Button>
              <span style={{ fontSize: '0.8125rem' }}>
                Trang {auditPage + 1} / {auditTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage >= auditTotalPages - 1}
                onClick={() => fetchAuditLogs(auditPage + 1)}
              >
                Sau
              </Button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button variant="outline" onClick={() => setIsAuditLogsModalOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HeadcountBudgetPage;
