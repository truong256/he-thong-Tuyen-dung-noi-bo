import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Clock,
  Eye,
  Edit2,
  Calendar,
  MapPin,
  Building2,
  AlertCircle,
  Briefcase,
  PlusCircle,
  Share2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import jobPostingApi from '../api/jobPosting';
import { JobPosting } from '../types/jobPosting';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { JobPostingEditorModal } from '../components/requisition/JobPostingEditorModal';
import '../styles/requisitions.css';
import '../styles/job-posting.css';

export const JobPostingManagementPage: React.FC = () => {
  const { hasPermission, hasAnyRole } = useAuth();
  const canManage = hasPermission ? hasPermission('JOB_MANAGE') : hasAnyRole(['RECRUITER', 'HR_MANAGER', 'ADMIN']);

  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal editor / preview
  const [selectedPostingId, setSelectedPostingId] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await jobPostingApi.list({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        keyword: search.trim() || undefined,
        size: 50,
      });
      setPostings(res.content || []);
    } catch (err: any) {
      console.error('Failed to load job postings:', err);
      showToast(err.response?.data?.message || 'Không thể tải danh sách tin tuyển dụng.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenEditor = (postingId: number) => {
    setSelectedPostingId(postingId);
    setIsEditorOpen(true);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="neutral">Bản nháp</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning">Chờ phê duyệt</Badge>;
      case 'APPROVED':
        return <Badge variant="info">Đã phê duyệt</Badge>;
      case 'PUBLISHED':
        return <Badge variant="success">Đã xuất bản</Badge>;
      case 'CLOSED':
        return <Badge variant="danger">Đã đóng</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const formatSalary = (posting: JobPosting) => {
    if (!posting.showSalary || posting.salaryType === 'NEGOTIABLE') {
      return 'Thỏa thuận';
    }
    const fmt = (num?: number | null) => (num ? new Intl.NumberFormat('vi-VN').format(num) + ' ₫' : '');
    if (posting.salaryType === 'EXACT') {
      return fmt(posting.salaryMin) || 'Thỏa thuận';
    }
    if (posting.salaryMin && posting.salaryMax) {
      return `${fmt(posting.salaryMin)} - ${fmt(posting.salaryMax)}`;
    }
    return fmt(posting.salaryMin) || fmt(posting.salaryMax) || 'Thỏa thuận';
  };

  return (
    <div className="req-container">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 500,
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Standardized Enterprise Page Header with Breadcrumbs */}
      <PageHeader
        title="Quản lý Tin tuyển dụng"
        subtitle="Soạn thảo, lưu nháp và quản lý các tin tuyển dụng tạo từ yêu cầu tuyển dụng đã phê duyệt"
        breadcrumbs={[
          { label: 'Tổng quan', path: '/dashboard' },
          { label: 'Yêu cầu tuyển dụng', path: '/recruitment/requisitions' },
          { label: 'Tin tuyển dụng' },
        ]}
      />

      {/* Filter Bar (Single Row: 70% Search Box + 30% Status Filter) */}
      <div className="job-posting-filter-bar">
        <div className="req-search-box">
          <Search size={18} className="req-search-icon" />
          <input
            type="text"
            className="req-search-input"
            placeholder="Tìm theo tiêu đề tin, mã tin, địa điểm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="req-filter-group">
          <select
            className="req-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>
      </div>

      {/* Table Listing */}
      <div className="req-table-card job-posting-table-card">
        {isLoading ? (
          <div className="req-empty-state">
            <Clock size={28} className="animate-spin req-empty-icon" />
            <p>Đang tải danh sách tin tuyển dụng...</p>
          </div>
        ) : postings.length === 0 ? (
          <div className="req-empty-state">
            <Briefcase size={44} className="req-empty-icon" />
            <h3>Chưa có tin tuyển dụng nào</h3>
            <p>
              Hãy chuyển tới danh sách <strong>Yêu cầu tuyển dụng</strong> và chọn yêu cầu ở trạng thái{' '}
              <strong>ĐÃ DUYỆT</strong> để bắt đầu soạn tin.
            </p>
          </div>
        ) : (
          <table className="req-table">
            <thead>
              <tr>
                <th>MÃ TIN</th>
                <th>TIÊU ĐỀ VỊ TRÍ</th>
                <th>YÊU CẦU NGUỒN</th>
                <th>HÌNH THỨC</th>
                <th>MỨC LƯƠNG</th>
                <th>HẠN NHẬN HỒ SƠ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {postings.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="req-code-badge">{p.postingCode}</span>
                  </td>
                  <td>
                    <div className="req-title-cell">
                      <span className="req-title-text">{p.title}</span>
                      <span className="req-dept-subtext">
                        <MapPin size={12} /> {p.workLocation}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                      {p.requisitionCode || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <Badge variant="neutral">{p.workingModel}</Badge>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#059669' }}>
                      {formatSalary(p)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                      {p.applicationDeadline}
                    </span>
                  </td>
                  <td>{renderStatusBadge(p.status)}</td>
                  <td>
                    <div className="req-actions-cell">
                      <button
                        type="button"
                        className="req-action-btn"
                        title="Xem trước & Chỉnh sửa"
                        onClick={() => handleOpenEditor(p.id)}
                        style={{ color: '#2563eb' }}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="req-action-btn"
                        title="Chỉnh sửa nội dung tin"
                        onClick={() => handleOpenEditor(p.id)}
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor & Preview Modal */}
      {isEditorOpen && (
        <JobPostingEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setSelectedPostingId(null);
          }}
          requisition={null}
          postingId={selectedPostingId || undefined}
          onSuccess={() => {
            showToast('Lưu tin tuyển dụng thành công!');
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default JobPostingManagementPage;
