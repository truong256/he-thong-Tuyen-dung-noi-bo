import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Briefcase,
  Users,
  Award,
  AlertCircle,
  Tag,
  Building,
} from 'lucide-react';
import { Referral, GeneralStatus, ReferralStats } from '../types/referral';
import referralApi from '../api/referral';
import { useAuth } from '../hooks/useAuth';
import ReferralModal from '../components/referral/ReferralModal';
import ReferralDetailModal from '../components/referral/ReferralDetailModal';
import ReferralStatusUpdateModal from '../components/referral/ReferralStatusUpdateModal';
import '../styles/referrals.css';

export const ReferralManagementPage: React.FC = () => {
  const { user, hasAnyRole, hasPermission } = useAuth();

  const isPrivileged =
    (hasAnyRole && hasAnyRole(['HR_MANAGER', 'ADMIN', 'RECRUITER'])) ||
    (hasPermission && hasPermission('CANDIDATE_READ_ALL'));

  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<ReferralStats>({
    total: 0,
    submitted: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
  });

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReferralForDetail, setSelectedReferralForDetail] = useState<Referral | null>(null);
  const [selectedReferralForStatus, setSelectedReferralForStatus] = useState<Referral | null>(null);

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        keyword: searchKeyword.trim() || undefined,
        status: statusFilter || undefined,
        page: currentPage,
        size: 10,
        sort: 'createdAt,desc',
      };

      const response =
        activeTab === 'all' && isPrivileged
          ? await referralApi.getAllReferrals(params)
          : await referralApi.getMyReferrals(params);

      setReferrals(response.content || []);
      setTotalElements(response.totalElements || 0);
      setTotalPages(response.totalPages || 1);

      // Compute stats for current tab
      const items = response.content || [];
      const newStats: ReferralStats = {
        total: response.totalElements || items.length,
        submitted: items.filter((r) => r.generalStatus === 'SUBMITTED').length,
        screening: items.filter((r) => r.generalStatus === 'SCREENING').length,
        interview: items.filter((r) => r.generalStatus === 'INTERVIEW').length,
        offer: items.filter((r) => r.generalStatus === 'OFFER').length,
        hired: items.filter((r) => r.generalStatus === 'HIRED').length,
        rejected: items.filter((r) => r.generalStatus === 'REJECTED').length,
      };
      setStats(newStats);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Không thể tải danh sách hồ sơ giới thiệu.'
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, isPrivileged, searchKeyword, statusFilter, currentPage]);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  const handleTabChange = (tab: 'my' | 'all') => {
    setActiveTab(tab);
    setCurrentPage(0);
    setSearchKeyword('');
    setStatusFilter('');
  };

  const renderStatusBadge = (status: GeneralStatus, label: string) => {
    const cls = status.toLowerCase();
    return (
      <span className={`ref-status-badge ${cls}`}>
        {status === 'HIRED' && <CheckCircle2 size={12} />}
        {status === 'INTERVIEW' && <Users size={12} />}
        {status === 'SUBMITTED' && <Clock size={12} />}
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="ref-page-container">
      {/* Page Header */}
      <header className="ref-header">
        <div className="ref-header-info">
          <h1>
            <UserCheck size={28} style={{ color: 'var(--primary)' }} />
            <span>Giới thiệu ứng viên nội bộ</span>
            <span className="ref-header-badge">S4-07 • Referral</span>
          </h1>
          <p className="ref-header-subtitle">
            Giới thiệu người quen ứng tuyển cho các vị trí đang tuyển của công ty, gắn nhãn nguồn nội bộ và theo dõi tiến độ tổng quát.
          </p>
        </div>
        <button
          type="button"
          className="ref-btn-create"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={18} />
          <span>Giới thiệu ứng viên ngay</span>
        </button>
      </header>

      {/* KPI Stats Grid */}
      <section className="ref-stats-grid" aria-label="Thống kê giới thiệu">
        <div className="ref-stat-card">
          <div className="ref-stat-icon blue">
            <Users size={24} />
          </div>
          <div className="ref-stat-content">
            <h3>{totalElements}</h3>
            <p>{activeTab === 'all' ? 'Tổng hồ sơ toàn công ty' : 'Hồ sơ tôi đã giới thiệu'}</p>
          </div>
        </div>

        <div className="ref-stat-card">
          <div className="ref-stat-icon amber">
            <Clock size={24} />
          </div>
          <div className="ref-stat-content">
            <h3>{stats.submitted + stats.screening}</h3>
            <p>Đang tiếp nhận & Sàng lọc</p>
          </div>
        </div>

        <div className="ref-stat-card">
          <div className="ref-stat-icon purple">
            <Briefcase size={24} />
          </div>
          <div className="ref-stat-content">
            <h3>{stats.interview + stats.offer}</h3>
            <p>Đang phỏng vấn & Đề xuất</p>
          </div>
        </div>

        <div className="ref-stat-card">
          <div className="ref-stat-icon green">
            <Award size={24} />
          </div>
          <div className="ref-stat-content">
            <h3>{stats.hired}</h3>
            <p>Đã tuyển dụng thành công</p>
          </div>
        </div>
      </section>

      {/* Tab Navigation (for HR/Admin/Recruiter) */}
      {isPrivileged && (
        <nav className="ref-tabs-bar" aria-label="Chuyển chế độ xem">
          <button
            type="button"
            className={`ref-tab-btn ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => handleTabChange('my')}
          >
            <span>Hồ sơ của tôi</span>
          </button>
          <button
            type="button"
            className={`ref-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            <span>Tất cả hồ sơ nội bộ (HR Quản lý)</span>
            <span className="ref-tab-counter">{totalElements}</span>
          </button>
        </nav>
      )}

      {/* Filter and Search Box */}
      <section className="ref-filter-card">
        <div className="ref-search-input-wrap">
          <Search size={16} className="ref-search-icon" />
          <input
            type="text"
            className="ref-search-input"
            placeholder="Tìm theo tên ứng viên, email, số điện thoại, vị trí..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>

        <select
          className="ref-select-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc theo trạng thái tổng quát"
        >
          <option value="">-- Tất cả trạng thái --</option>
          <option value="SUBMITTED">Đã tiếp nhận hồ sơ (SUBMITTED)</option>
          <option value="SCREENING">Đang sàng lọc hồ sơ (SCREENING)</option>
          <option value="INTERVIEW">Đang phỏng vấn (INTERVIEW)</option>
          <option value="OFFER">Đã gửi đề xuất (OFFER)</option>
          <option value="HIRED">Đã tuyển dụng (HIRED)</option>
          <option value="REJECTED">Chưa phù hợp (REJECTED)</option>
        </select>

        <button
          type="button"
          className="ref-btn-refresh"
          onClick={() => loadReferrals()}
          title="Tải lại danh sách"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </section>

      {/* Main Content Area */}
      {loading ? (
        <div className="ref-table-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div
            className="jp-spinner"
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #e2e8f0',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              margin: '0 auto 12px auto',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Đang tải danh sách hồ sơ giới thiệu...
          </p>
        </div>
      ) : error ? (
        <div className="ref-table-card" style={{ padding: '36px', textAlign: 'center' }}>
          <AlertCircle size={36} style={{ color: 'var(--danger)', margin: '0 auto 12px auto' }} />
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>Không thể tải dữ liệu</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px 0', fontSize: '0.875rem' }}>
            {error}
          </p>
          <button
            type="button"
            className="ref-btn ref-btn-secondary"
            onClick={() => loadReferrals()}
          >
            Thử lại
          </button>
        </div>
      ) : referrals.length === 0 ? (
        <div className="ref-table-card ref-empty-box">
          <UserCheck size={48} className="ref-empty-icon" />
          <h3>Chưa có hồ sơ giới thiệu nào</h3>
          <p>
            {searchKeyword || statusFilter
              ? 'Không tìm thấy hồ sơ phù hợp với bộ lọc tìm kiếm hiện tại.'
              : activeTab === 'all'
              ? 'Chưa có nhân viên nào gửi hồ sơ giới thiệu ứng viên trong hệ thống.'
              : 'Bạn chưa giới thiệu ứng viên nào. Hãy giới thiệu bạn bè, đồng nghiệp quen biết để giúp công ty tuyển dụng nhân tài!'}
          </p>
          <button
            type="button"
            className="ref-btn ref-btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} />
            <span>Giới thiệu ứng viên đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="ref-table-card">
          <div className="ref-table-responsive">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>Mã & Ứng viên</th>
                  <th>Vị trí giới thiệu</th>
                  {activeTab === 'all' && <th>Người giới thiệu</th>}
                  <th>Nguồn hồ sơ</th>
                  <th>Trạng thái tổng quát</th>
                  <th>Ngày nộp</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="ref-candidate-name">
                        <span>{r.candidateName}</span>
                      </div>
                      <div className="ref-candidate-email">
                        {r.candidateEmail} {r.candidatePhone ? `• ${r.candidatePhone}` : ''}
                      </div>
                    </td>

                    <td>
                      <div className="ref-job-title">{r.jobTitle || 'Chưa xác định'}</div>
                      <div className="ref-job-dept">
                        {r.departmentName || 'Công ty'} • {r.jobPostingCode || r.requisitionCode || 'N/A'}
                      </div>
                    </td>

                    {activeTab === 'all' && (
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {r.referrerName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {r.referrerEmail || 'Nội bộ'}
                        </div>
                      </td>
                    )}

                    <td>
                      <span className="ref-source-badge">
                        <Tag size={12} />
                        Giới thiệu nội bộ
                      </span>
                    </td>

                    <td>
                      {renderStatusBadge(
                        r.generalStatus,
                        r.generalStatusLabel || r.generalStatus
                      )}
                    </td>

                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="ref-actions-cell" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="ref-btn-icon-action primary"
                          onClick={() => setSelectedReferralForDetail(r)}
                          title="Xem chi tiết hồ sơ & tiến trình"
                        >
                          <Eye size={14} />
                          <span>Chi tiết</span>
                        </button>

                        {isPrivileged && (
                          <button
                            type="button"
                            className="ref-btn-icon-action"
                            onClick={() => setSelectedReferralForStatus(r)}
                            title="Cập nhật trạng thái tổng quát"
                          >
                            <RefreshCw size={14} />
                            <span>Trạng thái</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar if multiple pages */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: '#fafbfc',
                fontSize: '0.8125rem',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                Trang {currentPage + 1} / {totalPages} ({totalElements} hồ sơ)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="ref-btn ref-btn-secondary"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  className="ref-btn ref-btn-secondary"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ReferralModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadReferrals();
        }}
      />

      <ReferralDetailModal
        isOpen={!!selectedReferralForDetail}
        referral={selectedReferralForDetail}
        onClose={() => setSelectedReferralForDetail(null)}
      />

      <ReferralStatusUpdateModal
        isOpen={!!selectedReferralForStatus}
        referral={selectedReferralForStatus}
        onClose={() => setSelectedReferralForStatus(null)}
        onSuccess={() => {
          loadReferrals();
        }}
      />
    </div>
  );
};

export default ReferralManagementPage;
