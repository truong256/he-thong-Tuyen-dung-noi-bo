import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Clock,
  CheckCircle,
  Globe,
  Lock,
  Building,
  Calendar,
  AlertCircle,
  RefreshCw,
  MapPin,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { JobPosting, JobPostingStatus } from '../types/jobPosting';
import jobPostingApi from '../api/jobPosting';
import organizationApi from '../api/organization';
import { Department } from '../types/organization';
import { useAuth } from '../hooks/useAuth';
import JobPostingDetailModal from '../components/recruitment/JobPostingDetailModal';
import JobPostingFormModal from '../components/recruitment/JobPostingFormModal';
import '../styles/job-postings.css';

export const JobPostingManagementPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isHrManager = hasRole('HR_MANAGER');

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

  const loadData = useCallback(async () => {
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

      setPostings(res.content || []);
      setTotalElements(res.totalElements || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      showToast('error', 'Không thể nạp danh sách tin tuyển dụng.');
    } finally {
      setLoading(false);
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

  // Statistics calculation
  const totalCount = totalElements;
  const pendingCount = postings.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const publishedCount = postings.filter((p) => p.status === 'PUBLISHED').length;
  const unpublishedCount = postings.filter((p) => p.status === 'UNPUBLISHED' || p.status === 'CLOSED').length;

  const handleOpenDetail = (id: number) => {
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
        return <span className="jp-badge jp-badge-draft">Bản nháp</span>;
      case 'PENDING_APPROVAL':
        return <span className="jp-badge jp-badge-pending">Chờ HR duyệt</span>;
      case 'APPROVED':
        return <span className="jp-badge jp-badge-approved">Đã duyệt</span>;
      case 'PUBLISHED':
        return <span className="jp-badge jp-badge-published">Đang xuất bản</span>;
      case 'UNPUBLISHED':
        return <span className="jp-badge jp-badge-unpublished">Đã gỡ tin</span>;
      case 'REJECTED':
        return <span className="jp-badge jp-badge-rejected">Từ chối duyệt</span>;
      case 'CLOSED':
        return <span className="jp-badge jp-badge-closed">Đã đóng</span>;
      default:
        return <span className="jp-badge">{status}</span>;
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
          <div className="jp-stat-icon-wrapper jp-stat-icon-blue">
            <Briefcase size={22} />
          </div>
          <div className="jp-stat-content">
            <span className="jp-stat-label">Tổng tin tuyển dụng</span>
            <span className="jp-stat-value">{totalCount}</span>
          </div>
        </div>

        <div className="jp-stat-card">
          <div className="jp-stat-icon-wrapper jp-stat-icon-amber">
            <Clock size={22} />
          </div>
          <div className="jp-stat-content">
            <span className="jp-stat-label">Chờ HR Manager duyệt</span>
            <span className="jp-stat-value">{pendingCount}</span>
          </div>
        </div>

        <div className="jp-stat-card">
          <div className="jp-stat-icon-wrapper jp-stat-icon-green">
            <Globe size={22} />
          </div>
          <div className="jp-stat-content">
            <span className="jp-stat-label">Đang xuất bản công khai</span>
            <span className="jp-stat-value">{publishedCount}</span>
          </div>
        </div>

        <div className="jp-stat-card">
          <div className="jp-stat-icon-wrapper jp-stat-icon-gray">
            <Lock size={22} />
          </div>
          <div className="jp-stat-content">
            <span className="jp-stat-label">Đã gỡ hoặc đóng</span>
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
            className={`jp-tab-filter-btn ${statusFilter === 'DRAFT' ? 'active' : ''}`}
            onClick={() => { setStatusFilter('DRAFT'); setPage(0); }}
          >
            Bản nháp
          </button>
        </div>

        {/* Inputs filter */}
        <div className="jp-filter-controls">
          <div className="jp-search-input-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề hoặc mã tin (JP-...)"
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(0); }}
            />
          </div>

          <div className="jp-dept-filter-box">
            <Filter size={16} />
            <select
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
                          className="jp-action-btn jp-action-preview"
                          onClick={() => handleOpenDetail(p.id)}
                          title="Xem trước & Duyệt tin"
                        >
                          <Eye size={16} />
                          <span>Xem trước & Duyệt</span>
                        </button>

                        {p.status !== 'PUBLISHED' && (
                          <button
                            type="button"
                            className="jp-action-btn jp-action-edit"
                            onClick={() => handleOpenEdit(p)}
                            title="Chỉnh sửa nội dung"
                          >
                            <Edit size={16} />
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
