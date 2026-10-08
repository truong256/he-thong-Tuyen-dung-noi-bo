import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Plus,
  Search,
  Download,
  RotateCcw,
  LayoutGrid,
  List,
  TrendingUp,
  Building2,
  Users,
  Briefcase,
  Layers,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import jobTitleApi from '../api/jobTitle';
import organizationApi from '../api/organization';
import {
  JobTitle,
  JobTitleStatistics,
  LEVEL_METADATA,
  JOB_FAMILY_METADATA,
} from '../types/jobTitle';
import { Department } from '../types/organization';
import JobTitleModal from '../components/jobTitle/JobTitleModal';
import JobTitleDetailModal from '../components/jobTitle/JobTitleDetailModal';
import DeleteJobTitleModal from '../components/jobTitle/DeleteJobTitleModal';
import CareerMatrixVisualizer from '../components/jobTitle/CareerMatrixVisualizer';
import '../styles/job-titles.css';

type ViewMode = 'table' | 'cards' | 'matrix';

export const JobTitleManagementPage: React.FC = () => {
  const { user, hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(['HR_MANAGER']);
  const canViewSalary = hasAnyRole(['HR_MANAGER']);

  // Data states
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statistics, setStatistics] = useState<JobTitleStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [jobFamilyFilter, setJobFamilyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'title' | 'level' | 'headcount' | 'createdAt'>('level');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJobTitle, setSelectedJobTitle] = useState<JobTitle | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailJobTitle, setDetailJobTitle] = useState<JobTitle | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetJobTitle, setDeleteTargetJobTitle] = useState<JobTitle | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch((prev) => (prev !== search ? search : prev));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [titlesData, deptsData] = await Promise.all([
        jobTitleApi.getJobTitles({
          search: debouncedSearch,
          departmentId: departmentFilter,
          level: levelFilter,
          jobFamily: jobFamilyFilter,
          status: statusFilter,
          sortBy,
          sortOrder,
        }),
        organizationApi.getDepartments(),
      ]);
      const statsData = await jobTitleApi.getJobTitleStatistics(titlesData);
      setJobTitles(titlesData);
      setDepartments(deptsData);
      setStatistics(statsData);
    } catch {
      showToast('Không thể tải danh sách chức danh.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, departmentFilter, levelFilter, jobFamilyFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- CRUD Handlers ---
  const handleSaveJobTitle = async (
    data: Omit<JobTitle, 'id' | 'createdAt'> | Partial<JobTitle>
  ) => {
    if (selectedJobTitle) {
      await jobTitleApi.updateJobTitle(selectedJobTitle.id, {
        ...data,
        updatedBy: user?.fullName || 'Quản trị viên',
      });
      showToast(`Đã cập nhật chức danh "${data.title}" thành công.`);
    } else {
      await jobTitleApi.createJobTitle({
        ...(data as Omit<JobTitle, 'id' | 'createdAt'>),
        updatedBy: user?.fullName || 'Quản trị viên',
      });
      showToast(`Đã thêm mới chức danh "${data.title}" thành công.`);
    }
    await loadData();
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const updated = await jobTitleApi.toggleJobTitleStatus(id);
      showToast(
        `Đã ${updated.active ? 'kích hoạt' : 'tạm ngưng'} chức danh "${updated.title}".`
      );
      await loadData();
      if (detailJobTitle && detailJobTitle.id === id) {
        setDetailJobTitle(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Không thể đổi trạng thái chức danh.', 'error');
    }
  };

  const handleDeleteJobTitle = async (id: number) => {
    await jobTitleApi.deleteJobTitle(id);
    showToast('Đã xóa chức danh thành công.');
    await loadData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setDepartmentFilter('ALL');
    setLevelFilter('ALL');
    setJobFamilyFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('level');
    setSortOrder('asc');
  };

  const handleExportCSV = async () => {
    try {
      const csv = await jobTitleApi.exportToCSV(jobTitles, canViewSalary);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `danh_muc_chuc_danh_ats_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Đã xuất file dữ liệu chức danh (CSV) thành công.');
    } catch {
      showToast('Không thể xuất dữ liệu.', 'error');
    }
  };

  const handleResetToDefault = async () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ danh mục chức danh chuẩn doanh nghiệp?')) {
      await jobTitleApi.resetToDefault();
      showToast('Đã khôi phục dữ liệu chức danh mẫu chuẩn.');
      await loadData();
    }
  };

  return (
    <div className="jt-page-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`jt-toast ${toast.type}`} role="status">
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Banner Card */}
      <section className="jt-hero-card" aria-label="Giới thiệu Quản lý Chức danh">
        <div className="jt-hero-header">
          <div className="jt-identity-left">
            <div className="jt-icon-box">
              <Award size={34} />
            </div>
            <div className="jt-identity-info">
              <div className="jt-title-row">
                <h1>Quản lý Chức danh & Vị trí Công việc</h1>
                <span className="jt-badge-catalog">
                  <Layers size={13} />
                  Danh mục Tiêu chuẩn (EP-02)
                </span>
              </div>
              <div className="jt-meta-row">
                <span className="jt-meta-item">
                  <Building2 size={15} />
                  Chuẩn hóa toàn diện phòng ban & khối ngành
                </span>
                <span className="jt-meta-item">
                  <TrendingUp size={15} />
                  8 bậc năng lực chuẩn hóa
                </span>
                <span className="jt-meta-item">
                  <Users size={15} />
                  Kiểm soát định biên headcount
                </span>
              </div>
            </div>
          </div>

          <div className="jt-hero-actions">
            <button
              type="button"
              className="jt-btn-secondary"
              onClick={handleExportCSV}
              title="Xuất danh mục chức danh dạng CSV"
            >
              <Download size={16} />
              <span>Xuất CSV</span>
            </button>

            {canEdit && (
              <>
                <button
                  type="button"
                  className="jt-btn-secondary"
                  onClick={handleResetToDefault}
                  title="Khôi phục dữ liệu mẫu ban đầu"
                >
                  <RotateCcw size={16} />
                  <span>Dữ liệu mẫu</span>
                </button>

                <button
                  type="button"
                  className="jt-btn-primary"
                  onClick={() => {
                    setSelectedJobTitle(null);
                    setIsModalOpen(true);
                  }}
                >
                  <Plus size={18} />
                  <span>Thêm Chức danh mới</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Metrics & KPIs Cards */}
      {statistics && (
        <section className="jt-metrics-grid" aria-label="Thống kê chức danh">
          <div className="jt-metric-card">
            <div className="jt-metric-icon-wrap primary">
              <Award size={24} />
            </div>
            <div className="jt-metric-data">
              <span className="jt-metric-num">{statistics.totalJobTitles}</span>
              <span className="jt-metric-title">Tổng số chức danh chuẩn hóa</span>
            </div>
          </div>

          <div className="jt-metric-card">
            <div className="jt-metric-icon-wrap success">
              <CheckCircle2 size={24} />
            </div>
            <div className="jt-metric-data">
              <span className="jt-metric-num">{statistics.activeJobTitles}</span>
              <span className="jt-metric-title">Đang áp dụng thực tế</span>
            </div>
          </div>

          <div className="jt-metric-card">
            <div className="jt-metric-icon-wrap purple">
              <Users size={24} />
            </div>
            <div className="jt-metric-data">
              <span className="jt-metric-num">{statistics.totalHeadcount}</span>
              <span className="jt-metric-title">Nhân sự đảm nhiệm chức danh</span>
            </div>
          </div>

          <div className="jt-metric-card">
            <div className="jt-metric-icon-wrap warning">
              <Briefcase size={24} />
            </div>
            <div className="jt-metric-data">
              <span className="jt-metric-num">{statistics.openRequisitions}</span>
              <span className="jt-metric-title">Vị trí đang mở tuyển dụng</span>
            </div>
          </div>
        </section>
      )}

      {/* Control Bar: Search, Filters & View Mode */}
      <section className="jt-toolbar-card" aria-label="Bộ lọc và tìm kiếm chức danh">
        <div className="jt-toolbar-top">
          {/* Search box */}
          <div className="jt-search-box">
            <Search size={18} className="jt-search-icon" />
            <input
              type="text"
              className="jt-search-input"
              placeholder="Tìm kiếm theo mã, tên chức danh hoặc phòng ban..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="jt-search-clear"
                onClick={() => setSearch('')}
                aria-label="Xóa từ khóa"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* View mode switcher */}
          <div className="jt-view-modes-group" role="tablist" aria-label="Chế độ hiển thị">
            <button
              type="button"
              className={`jt-view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              role="tab"
              aria-selected={viewMode === 'table'}
            >
              <List size={16} />
              <span>Bảng danh sách</span>
            </button>
            <button
              type="button"
              className={`jt-view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              role="tab"
              aria-selected={viewMode === 'cards'}
            >
              <LayoutGrid size={16} />
              <span>Dạng thẻ</span>
            </button>
            <button
              type="button"
              className={`jt-view-mode-btn ${viewMode === 'matrix' ? 'active' : ''}`}
              onClick={() => setViewMode('matrix')}
              role="tab"
              aria-selected={viewMode === 'matrix'}
            >
              <TrendingUp size={16} />
              <span>Lộ trình cấp bậc</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="jt-toolbar-filters">
          {/* Department Filter */}
          <select
            className="jt-filter-select"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Lọc theo phòng ban"
          >
            <option value="ALL">Tất cả phòng ban</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Level Filter */}
          <select
            className="jt-filter-select"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Lọc theo cấp bậc"
          >
            <option value="ALL">Tất cả cấp bậc</option>
            {Object.entries(LEVEL_METADATA).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>

          {/* Job Family Filter */}
          <select
            className="jt-filter-select"
            value={jobFamilyFilter}
            onChange={(e) => setJobFamilyFilter(e.target.value)}
            aria-label="Lọc theo nhóm nghề nghiệp"
          >
            <option value="ALL">Tất cả khối ngành</option>
            {Object.entries(JOB_FAMILY_METADATA).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            className="jt-filter-select"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [
                'title' | 'level' | 'headcount' | 'createdAt',
                'asc' | 'desc',
              ];
              setSortBy(field);
              setSortOrder(order);
            }}
            aria-label="Sắp xếp danh sách"
          >
            <option value="level-asc">Sắp xếp: Cấp bậc (Thấp → Cao)</option>
            <option value="level-desc">Sắp xếp: Cấp bậc (Cao → Thấp)</option>
            <option value="title-asc">Sắp xếp: Tên A - Z</option>
            <option value="title-desc">Sắp xếp: Tên Z - A</option>
            <option value="headcount-desc">Sắp xếp: Định biên (Cao → Thấp)</option>
            <option value="headcount-asc">Sắp xếp: Định biên (Thấp → Cao)</option>
            <option value="createdAt-desc">Sắp xếp: Ngày tạo (Mới nhất)</option>
            <option value="createdAt-asc">Sắp xếp: Ngày tạo (Cũ nhất)</option>
          </select>

          {/* Status Filter */}
          <div className="jt-status-segmented" role="group" aria-label="Lọc trạng thái">
            <button
              type="button"
              className={`jt-status-segment-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`jt-status-segment-btn ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Đang áp dụng
            </button>
            <button
              type="button"
              className={`jt-status-segment-btn ${statusFilter === 'INACTIVE' ? 'active' : ''}`}
              onClick={() => setStatusFilter('INACTIVE')}
            >
              Tạm ngưng
            </button>
          </div>

          {/* Reset Filters button */}
          {(search ||
            departmentFilter !== 'ALL' ||
            levelFilter !== 'ALL' ||
            jobFamilyFilter !== 'ALL' ||
            statusFilter !== 'ALL' ||
            sortBy !== 'level' ||
            sortOrder !== 'asc') && (
            <button
              type="button"
              className="jt-filter-reset-btn"
              onClick={handleResetFilters}
            >
              <RotateCcw size={13} />
              <span>Xóa bộ lọc</span>
            </button>
          )}

          <span className="jt-active-count-badge">
            {isLoading ? (
              'Đang tải...'
            ) : (
              <>Hiển thị <strong>{jobTitles.length}</strong> chức danh</>
            )}
          </span>
        </div>
      </section>

      {/* Main Content Area */}
      {viewMode === 'matrix' ? (
        <CareerMatrixVisualizer
          jobTitles={jobTitles}
          departments={departments}
          canViewSalary={canViewSalary}
          onSelectJobTitle={(jt) => {
            setDetailJobTitle(jt);
            setIsDetailModalOpen(true);
          }}
        />
      ) : viewMode === 'cards' ? (
        jobTitles.length === 0 ? (
          <div className="jt-table-card">
            <div className="jt-empty-state">
              <div className="jt-empty-icon">
                <Award size={36} />
              </div>
              <h3 className="jt-empty-title">Không tìm thấy chức danh nào phù hợp</h3>
              <p className="jt-empty-desc">
                Thử điều chỉnh từ khóa tìm kiếm hoặc xóa các điều kiện lọc để hiển thị nhiều kết quả hơn.
              </p>
              {canEdit && (
                <button
                  type="button"
                  className="jt-btn-primary"
                  onClick={() => {
                    setSelectedJobTitle(null);
                    setIsModalOpen(true);
                  }}
                >
                  <Plus size={16} /> Thêm chức danh mới
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="jt-cards-grid">
            {jobTitles.map((jt) => {
              const levelInfo = LEVEL_METADATA[jt.level];
              const std = jt.standardHeadcount || 0;
              const curr = jt.currentHeadcount || 0;
              const fillPct = std > 0 ? Math.min(Math.round((curr / std) * 100), 100) : 100;

              return (
                <div
                  key={jt.id}
                  className={`jt-card-item ${!jt.active ? 'inactive' : ''}`}
                >
                  <div className="jt-card-item-top">
                    <span className="jt-code-cell">{jt.code}</span>
                    <span
                      className="jt-level-badge"
                      style={{ backgroundColor: levelInfo?.badgeBg, color: levelInfo?.badgeText }}
                    >
                      {levelInfo?.shortLabel || jt.level}
                    </span>
                  </div>

                  <h3
                    className="jt-card-item-title"
                    onClick={() => {
                      setDetailJobTitle(jt);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    {jt.title}
                  </h3>

                  <p className="jt-card-item-desc">{jt.jobDescription}</p>

                  <div className="jt-card-item-details-box">
                    <div className="jt-card-detail-line">
                      <span className="jt-card-detail-label">Phòng ban:</span>
                      <span className="jt-card-detail-value">{jt.departmentName}</span>
                    </div>

                    {canViewSalary && (
                      <div className="jt-card-detail-line">
                        <span className="jt-card-detail-label">Dải lương:</span>
                        <span className="jt-card-detail-value salary">
                          {jt.salaryRangeDisplay || 'Chưa khai báo'}
                        </span>
                      </div>
                    )}

                    <div className="jt-card-detail-line">
                      <span className="jt-card-detail-label">Nhân sự / Định biên:</span>
                      <span className="jt-card-detail-value">
                        {curr} / {std > 0 ? std : '—'} ({fillPct}%)
                      </span>
                    </div>

                    <div className="jt-card-detail-line">
                      <span className="jt-card-detail-label">Tuyển dụng:</span>
                      <span className="jt-card-detail-value">
                        {jt.openRequisitions > 0 ? (
                          <span className="jt-req-badge">
                            <Briefcase size={12} /> {jt.openRequisitions} đang tuyển
                          </span>
                        ) : (
                          <span className="jt-req-badge zero">Đủ định biên</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="jt-card-item-footer">
                    <div className="jt-card-status-col">
                      <span className={`jt-status-badge ${jt.active ? 'active' : 'inactive'}`}>
                        {jt.active ? 'Đang áp dụng' : 'Tạm ngưng'}
                      </span>
                    </div>

                    <div className="jt-actions-row">
                      <button
                        type="button"
                        className="jt-action-icon-btn"
                        onClick={() => {
                          setDetailJobTitle(jt);
                          setIsDetailModalOpen(true);
                        }}
                        title="Xem chi tiết chức danh & tiêu chuẩn"
                      >
                        <Eye size={15} />
                      </button>

                      {canEdit && (
                        <>
                          <button
                            type="button"
                            className="jt-action-icon-btn"
                            onClick={() => {
                              setSelectedJobTitle(jt);
                              setIsModalOpen(true);
                            }}
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="jt-action-icon-btn danger"
                            onClick={() => {
                              setDeleteTargetJobTitle(jt);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Xóa chức danh"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Table View */
        <div className="jt-table-card">
          <div className="jt-table-wrapper">
            <table className="jt-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Mã CD</th>
                  <th>Chức danh & Phòng ban</th>
                  <th style={{ width: '150px' }}>Cấp bậc</th>
                  {canViewSalary && <th style={{ width: '170px' }}>Dải lương tham chiếu</th>}
                  <th style={{ width: '150px' }}>Thực tế / Định biên</th>
                  <th style={{ width: '140px' }}>Tuyển dụng</th>
                  <th style={{ width: '110px' }}>Trạng thái</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {jobTitles.length === 0 ? (
                  <tr>
                    <td colSpan={canViewSalary ? 8 : 7}>
                      <div className="jt-empty-state">
                        <div className="jt-empty-icon">
                          <Award size={36} />
                        </div>
                        <h3 className="jt-empty-title">Không tìm thấy chức danh nào phù hợp</h3>
                        <p className="jt-empty-desc">
                          Thử điều chỉnh từ khóa tìm kiếm hoặc xóa các điều kiện lọc để hiển thị nhiều kết quả hơn.
                        </p>
                        {canEdit && (
                          <button
                            type="button"
                            className="jt-btn-primary"
                            onClick={() => {
                              setSelectedJobTitle(null);
                              setIsModalOpen(true);
                            }}
                          >
                            <Plus size={16} /> Thêm chức danh mới
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  jobTitles.map((jt) => {
                    const levelInfo = LEVEL_METADATA[jt.level];
                    const std = jt.standardHeadcount || 0;
                    const curr = jt.currentHeadcount || 0;
                    const fillPct = std > 0 ? Math.min(Math.round((curr / std) * 100), 100) : 100;

                    return (
                      <tr key={jt.id} className={!jt.active ? 'inactive-row' : ''}>
                        <td>
                          <span className="jt-code-cell">{jt.code}</span>
                        </td>
                        <td>
                          <div className="jt-title-cell-wrap">
                            <span
                              className="jt-title-link"
                              onClick={() => {
                                setDetailJobTitle(jt);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              {jt.title}
                            </span>
                            <span className="jt-dept-sub">
                              <Building2 size={12} />
                              {jt.departmentName}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="jt-level-badge"
                            style={{
                              backgroundColor: levelInfo?.badgeBg,
                              color: levelInfo?.badgeText,
                            }}
                          >
                            {levelInfo?.label || jt.level}
                          </span>
                        </td>
                        {canViewSalary && (
                          <td>
                            <span className="jt-salary-cell">
                              {jt.salaryRangeDisplay || 'Chưa khai báo'}
                            </span>
                          </td>
                        )}
                        <td>
                          <div className="jt-headcount-cell">
                            <span className="jt-headcount-nums">
                              {curr} / {std > 0 ? std : '—'} nhân sự
                            </span>
                            {std > 0 && (
                              <div className="jt-progress-bar-bg">
                                <div
                                  className="jt-progress-bar-fill"
                                  style={{ width: `${fillPct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {jt.openRequisitions > 0 ? (
                            <span className="jt-req-badge">
                              <Briefcase size={13} /> {jt.openRequisitions} đang tuyển
                            </span>
                          ) : (
                            <span className="jt-req-badge zero">Đủ định biên</span>
                          )}
                        </td>
                        <td>
                          {canEdit ? (
                            <label className="jt-status-switch" title={jt.active ? 'Đang áp dụng' : 'Tạm ngưng'}>
                              <input
                                type="checkbox"
                                checked={jt.active}
                                onChange={() => handleToggleStatus(jt.id)}
                              />
                              <span className="jt-status-slider" />
                            </label>
                          ) : (
                            <span className={`jt-status-badge ${jt.active ? 'active' : 'inactive'}`}>
                              {jt.active ? 'Hoạt động' : 'Tạm ngưng'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="jt-actions-row" style={{ justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="jt-action-icon-btn"
                              onClick={() => {
                                setDetailJobTitle(jt);
                                setIsDetailModalOpen(true);
                              }}
                              title="Xem chi tiết JD & Năng lực"
                            >
                              <Eye size={15} />
                            </button>

                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  className="jt-action-icon-btn"
                                  onClick={() => {
                                    setSelectedJobTitle(jt);
                                    setIsModalOpen(true);
                                  }}
                                  title="Chỉnh sửa chức danh"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  data-testid={`delete-btn-${jt.id}`}
                                  className="jt-action-icon-btn danger"
                                  onClick={() => {
                                    setDeleteTargetJobTitle(jt);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  title="Xóa chức danh"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
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
        </div>
      )}

      {/* Add / Edit Job Title Modal */}
      <JobTitleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveJobTitle}
        jobTitle={selectedJobTitle}
        departments={departments}
      />

      {/* View Detail Modal */}
      <JobTitleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        jobTitle={detailJobTitle}
        onEdit={(jt) => {
          setSelectedJobTitle(jt);
          setIsModalOpen(true);
        }}
        onToggleStatus={handleToggleStatus}
        canEdit={canEdit}
        canViewSalary={canViewSalary}
      />

      {/* Delete Confirmation Modal */}
      <DeleteJobTitleModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteJobTitle}
        jobTitle={deleteTargetJobTitle}
      />
    </div>
  );
};

export default JobTitleManagementPage;
