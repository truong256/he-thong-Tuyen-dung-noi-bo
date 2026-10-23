import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Edit2,
  Clock,
  CheckCircle,
  Globe,
  Lock,
  FileText,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TimerOff,
} from 'lucide-react';
import { JobPosting, JobPostingStatus } from '../types/jobPosting';
import jobPostingApi from '../api/jobPosting';
import organizationApi from '../api/organization';
import { Department } from '../types/organization';
import JobPostingDetailModal from '../components/recruitment/JobPostingDetailModal';
import JobPostingFormModal from '../components/recruitment/JobPostingFormModal';
import '../styles/job-postings.css';
import { useAuth } from '../hooks/useAuth';

export const JobPostingManagementPage: React.FC = () => {

  const { hasRole, hasPermission } = useAuth();
  const canUnpublish = hasRole('HR_MANAGER') || hasRole('ADMIN') || hasRole('RECRUITER') || Boolean(hasPermission?.('JOB_MANAGE'));
  const [initialAction, setInitialAction] = useState<'unpublish' | undefined>();

  // State
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [size] = useState(10);

  // Filter input refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deptSelectRef = useRef<HTMLSelectElement>(null);

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPostingId, setSelectedPostingId] = useState<number | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const requestVersion = useRef(0);
  const loadData = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const deptId = departmentFilter !== 'ALL' ? Number(departmentFilter) : undefined;
      const res = await jobPostingApi.list({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        departmentId: deptId,
        keyword: searchKeyword.trim() || undefined,
        page,
        size,
      });

      if (version !== requestVersion.current) return;
      if (page > 0 && page >= res.totalPages) { setPage(Math.max(0, res.totalPages - 1)); return; }
      setPostings(res.content || []);
      setTotalElements(res.totalElements || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      if (version !== requestVersion.current) return;
      showToast('error', 'Không thể nạp danh sách tin tuyển dụng.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [statusFilter, departmentFilter, searchKeyword, page, size]);

  useEffect(() => {
    organizationApi.getDepartments().then((data) => {
      if (Array.isArray(data)) setDepartments(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden && !detailModalOpen) void loadData(); }, 60000);
    const refresh = () => { if (!document.hidden && !detailModalOpen) void loadData(); };
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [loadData, detailModalOpen]);

  // Statistics calculation
  const totalCount = totalElements;
  const pendingCount = postings.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const publishedCount = postings.filter((p) => p.status === 'PUBLISHED').length;
  const unpublishedCount = postings.filter((p) => p.status === 'UNPUBLISHED' || p.status === 'CLOSED' || p.status === 'EXPIRED').length;

  const handleOpenDetail = (id: number, action?: 'unpublish') => {
    setInitialAction(action);
    setSelectedPostingId(id);
    setDetailModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPosting(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (posting: JobPosting) => {
    setEditingPosting(posting);
    setFormModalOpen(true);
  };

  const formatCurrency = (amount?: number, currency = 'VND') => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ' + currency;
  };

  const renderStatusBadge = (status: JobPostingStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="jp-status-pill jp-status-draft">
            <FileText size={13} className="jp-status-pill-icon" />
            <span>Bản nháp</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="jp-status-pill jp-status-pending">
            <Clock size={13} className="jp-status-pill-icon" />
            <span>Chờ HR duyệt</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="jp-status-pill jp-status-approved">
            <CheckCircle2 size={13} className="jp-status-pill-icon" />
            <span>Đã duyệt</span>
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="jp-status-pill jp-status-published">
            <Globe size={13} className="jp-status-pill-icon" />
            <span>Đang xuất bản</span>
          </span>
        );
      case 'UNPUBLISHED':
        return (
          <span className="jp-status-pill jp-status-unpublished">
            <Lock size={13} className="jp-status-pill-icon" />
            <span>Đã gỡ tin</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="jp-status-pill jp-status-rejected">
            <XCircle size={13} className="jp-status-pill-icon" />
            <span>Từ chối duyệt</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="jp-status-pill jp-status-closed">
            <Lock size={13} className="jp-status-pill-icon" />
            <span>Đã đóng</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="jp-status-pill jp-status-expired">
            <TimerOff size={13} className="jp-status-pill-icon" />
            <span>Hết hạn (tự động)</span>
          </span>
        );
      default:
        return (
          <span className="jp-status-pill jp-status-default">
            <AlertCircle size={13} className="jp-status-pill-icon" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="jp-management-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`jp-floating-toast jp-toast-${toastMessage.type}`} role="status">
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="jp-page-header">
        <div className="jp-header-left">
          <div className="jp-breadcrumb">
            <span>Tuyển dụng</span>
            <span className="jp-breadcrumb-sep">/</span>
            <span className="jp-breadcrumb-curr">Tin tuyển dụng (S3-10)</span>
          </div>
          <h1 className="jp-page-title">Quản lý & Duyệt tin tuyển dụng</h1>
          <p className="jp-page-desc">
            Quy trình soạn thảo, phê duyệt nội dung chuẩn thương hiệu và xuất bản tin việc làm ra cổng công khai.
          </p>
        </div>

        <div className="jp-header-actions">
          <button
            type="button"
            className="jp-btn jp-btn-primary"
            onClick={handleOpenCreate}
          >
            <Plus size={18} />
            <span>Soạn tin tuyển dụng</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="jp-stats-grid">
        <div className="jp-stat-card">
          <div className="jp-stat-content">
            <span className="jp-stat-label">Tổng tin tuyển dụng</span>
            <span className="jp-stat-value">{totalCount}</span>
          </div>
        </div>

        <div className="jp-stat-card">
          <div className="jp-stat-content">
            <span className="jp-stat-label">Chờ HR Manager duyệt</span>
            <span className="jp-stat-value">{pendingCount}</span>
          </div>
        </div>

        <div className="jp-stat-card">
          <div className="jp-stat-content">
            <span className="jp-stat-label">Đang xuất bản công khai</span>
            <span className="jp-stat-value">{publishedCount}</span>
          </div>
        </div>

        <div className="jp-stat-card">
          <div className="jp-stat-content">
            <span className="jp-stat-label">Đã gỡ, đóng hoặc hết hạn</span>
            <span className="jp-stat-value">{unpublishedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="jp-filter-toolbar">
        {/* Status Tab Filter */}
        <div className="jp-status-tabs" role="tablist">
          <button
            type="button"
            className={`jp-tab-filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => { setStatusFilter('ALL'); setPage(0); }}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`jp-tab-filter-btn ${statusFilter === 'PENDING_APPROVAL' ? 'active' : ''}`}
            onClick={() => { setStatusFilter('PENDING_APPROVAL'); setPage(0); }}
          >
            Chờ duyệt
          </button>
          <button
            type="button"
            className={`jp-tab-filter-btn ${statusFilter === 'APPROVED' ? 'active' : ''}`}
            onClick={() => { setStatusFilter('APPROVED'); setPage(0); }}
          >
            Đã duyệt
          </button>
          <button
            type="button"
            className={`jp-tab-filter-btn ${statusFilter === 'PUBLISHED' ? 'active' : ''}`}
            onClick={() => { setStatusFilter('PUBLISHED'); setPage(0); }}
          >
            Đang xuất bản
          </button>
          <button
            type="button"
            className={`jp-tab-filter-btn ${statusFilter === 'UNPUBLISHED' ? 'active' : ''}`}
            onClick={() => { setStatusFilter('UNPUBLISHED'); setPage(0); }}
          >
            Đã gỡ tin
          </button>
          <button
            type="button"
            className={`jp-tab-filter-btn ${statusFilter === 'EXPIRED' ? 'active' : ''}`}
            onClick={() => { setStatusFilter('EXPIRED'); setPage(0); }}
          >
            Hết hạn
          </button>
          <button
            type="button"
            className={`jp-tab-filter-btn ${statusFilter === 'DRAFT' ? 'active' : ''}`}
            onClick={() => { setStatusFilter('DRAFT'); setPage(0); }}
          >
            Bản nháp
          </button>
        </div>

        {/* Inputs filter */}
        <div className="jp-filter-controls">
          <div
            className="jp-search-input-box"
            onClick={() => searchInputRef.current?.focus()}
          >
            <Search size={16} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm theo tiêu đề hoặc mã tin (JP-...)"
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(0); }}
            />
          </div>

          <div
            className="jp-dept-filter-box"
            onClick={() => {
              deptSelectRef.current?.focus();
              try {
                deptSelectRef.current?.showPicker?.();
              } catch (err) {
                void err;
              }
            }}
          >
            <Filter size={16} />
            <select
              ref={deptSelectRef}
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setPage(0); }}
            >
              <option value="ALL">Tất cả phòng ban</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="jp-btn-refresh"
            onClick={loadData}
            title="Tải lại danh sách"
          >
            <RefreshCw size={16} className={loading ? 'jp-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="jp-table-card">
        {loading ? (
          <div className="jp-loading-container">
            <div className="jp-spinner" />
            <p>Đang tải dữ liệu tin tuyển dụng...</p>
          </div>
        ) : postings.length === 0 ? (
          <div className="jp-empty-state">
            <Briefcase size={40} />
            <h3>Không tìm thấy tin tuyển dụng nào</h3>
            <p>Chưa có tin tuyển dụng nào phù hợp với bộ lọc hiện tại.</p>
            <button
              type="button"
              className="jp-btn jp-btn-primary"
              onClick={handleOpenCreate}
              style={{ marginTop: '12px' }}
            >
              <Plus size={16} />
              <span>Soạn tin mới ngay</span>
            </button>
          </div>
        ) : (
          <div className="jp-table-wrapper">
            <table className="jp-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Mã tin</th>
                  <th>Tiêu đề tuyển dụng</th>
                  <th>Phòng ban & Vị trí</th>
                  <th>Địa điểm / Hình thức</th>
                  <th>Mức lương</th>
                  <th>Hạn nộp hồ sơ</th>
                  <th>Trạng thái</th>
                  <th>Xuất bản</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {postings.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="jp-table-code">{p.jobCode}</span>
                    </td>
                    <td>
                      <div className="jp-table-title-box">
                        <strong className="jp-table-title-text" onClick={() => handleOpenDetail(p.id)}>
                          {p.title}
                        </strong>
                        {p.requisitionCode && (
                          <span className="jp-table-req-ref">Từ yêu cầu: {p.requisitionCode}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="jp-table-dept-info">
                        <span>{p.departmentName || 'Chưa gán'}</span>
                        <small className="jp-table-job-title">{p.jobTitleName || 'Vị trí chung'}</small>
                      </div>
                    </td>
                    <td>
                      <div className="jp-table-location-info">
                        <span>{p.workLocation || 'Tại văn phòng'}</span>
                        <small className="jp-table-model-badge">{p.workingModel}</small>
                      </div>
                    </td>
                    <td>
                      <span className="jp-table-salary">
                        {p.salaryVisible ? (
                          p.salaryMin && p.salaryMax ? (
                            `${formatCurrency(p.salaryMin)} - ${formatCurrency(p.salaryMax)}`
                          ) : (
                            'Thỏa thuận'
                          )
                        ) : (
                          <span className="jp-text-muted">Bảo mật (Thỏa thuận)</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="jp-table-deadline">
                        {p.applicationDeadline || 'Không giới hạn'}
                      </span>
                    </td>
                    <td>{renderStatusBadge(p.status)}</td>
                    <td>
                      <div className="jp-table-publish-info">
                        {p.publishedByUserName ? (
                          <>
                            <span className="jp-table-publisher">{p.publishedByUserName}</span>
                            <small className="jp-table-pub-time">
                              {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('vi-VN') : ''}
                            </small>
                          </>
                        ) : (
                          <span className="jp-text-muted">Chưa xuất bản</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="jp-table-actions">
                        <button
                          type="button"
                          className="jp-action-btn jp-action-view"
                          onClick={() => handleOpenDetail(p.id)}
                          title="Xem trước tin tuyển dụng"
                        >
                          <Eye size={18} />
                          <span className="sr-only">Xem trước</span>
                        </button>

                        <button
                          type="button"
                          className="jp-action-btn jp-action-approve"
                          onClick={() => handleOpenDetail(p.id)}
                          title="Phê duyệt tin tuyển dụng"
                        >
                          <CheckCircle2 size={18} />
                          <span className="sr-only">Xem trước & Duyệt</span>
                        </button>

                        {canUnpublish && (p.status === 'PUBLISHED' || p.status === 'EXPIRED') && (
                          <button type="button" className="jp-action-btn jp-action-unpublish"
                            onClick={() => handleOpenDetail(p.id, 'unpublish')}
                            title={`Gỡ tin ${p.jobCode}`} aria-label={`Gỡ tin ${p.jobCode}`}>
                            <Lock size={18} />
                          </button>
                        )}

                        {p.status !== 'PUBLISHED' && (
                          <button
                            type="button"
                            className="jp-action-btn jp-action-edit"
                            onClick={() => handleOpenEdit(p)}
                            title="Chỉnh sửa nội dung"
                          >
                            <Edit2 size={18} />
                            <span className="sr-only">Chỉnh sửa</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="jp-pagination">
            <span className="jp-pagination-info">
              Hiển thị trang {page + 1} / {totalPages} ({totalElements} tin tuyển dụng)
            </span>
            <div className="jp-pagination-btns">
              <button
                type="button"
                className="jp-page-btn"
                disabled={page === 0}
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeft size={16} />
                <span>Trước</span>
              </button>
              <button
                type="button"
                className="jp-page-btn"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((prev) => prev + 1)}
              >
                <span>Sau</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail & Public Preview Modal */}
      <JobPostingDetailModal
        isOpen={detailModalOpen}
        initialAction={initialAction}
        jobPostingId={selectedPostingId}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedPostingId(null);
        }}
        onActionSuccess={() => {
          loadData();
          showToast('success', 'Thao tác phê duyệt / cập nhật tin tuyển dụng thành công!');
        }}
      />

      {/* Form Modal (Create / Edit) */}
      <JobPostingFormModal
        isOpen={formModalOpen}
        editingPosting={editingPosting}
        onClose={() => {
          setFormModalOpen(false);
          setEditingPosting(null);
        }}
        onSuccess={() => {
          loadData();
          showToast('success', editingPosting ? 'Cập nhật tin thành công!' : 'Tạo bản nháp tin tuyển dụng thành công!');
        }}
      />
    </div>
  );
};

export default JobPostingManagementPage;
