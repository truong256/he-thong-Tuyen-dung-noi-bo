import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Tag,
  Briefcase,
  MapPin,
  GraduationCap,
  Users2,
  FileQuestion,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Copy,
  Check,
  Eye,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import categoryApi from '../api/category';
import {
  CommonCategory,
  CategoryTypeInfo,
  CreateCategoryPayload,
} from '../types/category';
import CategoryModal from '../components/category/CategoryModal';
import CategoryDetailModal from '../components/category/CategoryDetailModal';
import { PageHeader } from '../components/common/PageHeader';
import '../styles/category-management.css';

type ViewMode = 'table' | 'cards' | 'grouped';
type SortField = 'sortOrder' | 'code' | 'name' | 'active';

export const CategoryManagementPage: React.FC = () => {
  const { hasAnyRole, hasPermission } = useAuth();
  const canManage = typeof hasPermission === 'function'
    ? hasPermission('CATALOG_MANAGE')
    : (hasAnyRole ? hasAnyRole(['ADMIN', 'HR_MANAGER']) : false);

  // Data states
  const [categories, setCategories] = useState<CommonCategory[]>([]);
  const [typesInfo, setTypesInfo] = useState<CategoryTypeInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View & UI states
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [sortBy, setSortBy] = useState<SortField>('sortOrder');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);

  // Modals & Actions
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<CommonCategory | null>(null);
  const [detailCategory, setDetailCategory] = useState<CommonCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CommonCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState<boolean>(false);

  // Quick Copy Feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load types metadata
  const loadTypes = useCallback(async () => {
    try {
      const data = await categoryApi.getTypes();
      setTypesInfo(data);
    } catch {
      // Ignore if empty
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeParam =
        statusFilter === 'ACTIVE' ? true : statusFilter === 'INACTIVE' ? false : undefined;

      const data = await categoryApi.list({
        search: searchTerm.trim() || undefined,
        type: selectedType !== 'ALL' ? selectedType : undefined,
        active: activeParam,
      });
      setCategories(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải danh sách danh mục dùng chung từ máy chủ.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedType, statusFilter]);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Metrics computation
  const metrics = useMemo(() => {
    const total = categories.length;
    const activeCount = categories.filter((c) => c.active).length;
    const inactiveCount = total - activeCount;
    const distinctTypes = new Set(categories.map((c) => c.type)).size;
    const activePercentage = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    return { total, activeCount, inactiveCount, distinctTypes, activePercentage };
  }, [categories]);

  // Sorted categories
  const sortedCategories = useMemo(() => {
    const list = [...categories];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'sortOrder') cmp = a.sortOrder - b.sortOrder;
      else if (sortBy === 'code') cmp = a.code.localeCompare(b.code);
      else if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'vi');
      else if (sortBy === 'active') cmp = Number(b.active) - Number(a.active);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [categories, sortBy, sortAsc]);

  // Grouped categories by type (for grouped view)
  const groupedCategories = useMemo(() => {
    const groups: { [type: string]: CommonCategory[] } = {};
    sortedCategories.forEach((cat) => {
      if (!groups[cat.type]) groups[cat.type] = [];
      groups[cat.type].push(cat);
    });
    return groups;
  }, [sortedCategories]);

  // Handle Sort Change
  const handleToggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  // Quick Copy Code to Clipboard
  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Đã sao chép mã "${code}" vào clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedCategories.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Status Update
  const handleBulkSetStatus = async (active: boolean) => {
    if (selectedIds.length === 0 || !canManage) return;
    setIsBulkProcessing(true);
    try {
      await Promise.all(selectedIds.map((id) => categoryApi.setStatus(id, active)));
      showToast(
        `Đã ${active ? 'kích hoạt' : 'tạm ngưng'} thành công ${selectedIds.length} danh mục!`
      );
      setSelectedIds([]);
      await loadCategories();
      await loadTypes();
    } catch (err: any) {
      showToast(err.message || 'Không thể thực hiện thao tác hàng loạt', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Export Data to CSV
  const handleExportCSV = () => {
    if (categories.length === 0) {
      showToast('Không có dữ liệu danh mục để xuất file', 'error');
      return;
    }

    const headers = ['ID', 'Nhóm phân loại', 'Mã danh mục', 'Tên hiển thị', 'Thứ tự', 'Trạng thái'];
    const rows = sortedCategories.map((c) => [
      c.id,
      `"${c.type}"`,
      `"${c.code}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      c.sortOrder,
      c.active ? 'Đang hoạt động' : 'Tạm ngưng',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ATS_Danh_Muc_Dung_Chung_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất thành công file danh mục chuẩn CSV!');
  };

  // Handle Create or Update
  const handleSaveCategory = async (payload: CreateCategoryPayload) => {
    if (editingCategory) {
      await categoryApi.update(editingCategory.id, payload);
      showToast(`Đã cập nhật danh mục "${payload.name}" thành công!`);
    } else {
      await categoryApi.create(payload);
      showToast(`Đã thêm mới danh mục "${payload.name}" thành công!`);
    }
    await loadCategories();
    await loadTypes();
  };

  // Handle Toggle Status
  const handleToggleStatus = async (cat: CommonCategory) => {
    if (!canManage) return;
    try {
      await categoryApi.setStatus(cat.id, !cat.active);
      showToast(`Đã ${!cat.active ? 'kích hoạt' : 'tạm ngưng'} danh mục "${cat.name}".`);
      setCategories((prev) =>
        prev.map((item) => (item.id === cat.id ? { ...item, active: !cat.active } : item))
      );
    } catch (err: any) {
      showToast(err.message || 'Không thể thay đổi trạng thái danh mục', 'error');
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await categoryApi.delete(deletingCategory.id);
      showToast(`Đã xóa danh mục "${deletingCategory.name}" thành công!`);
      setDeletingCategory(null);
      await loadCategories();
      await loadTypes();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể xóa danh mục này';
      setDeleteError(msg);
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Reorder
  const handleMoveOrder = async (cat: CommonCategory, direction: 'up' | 'down') => {
    if (!canManage || isReordering) return;
    const sameTypeCats = [...categories]
      .filter((c) => c.type === cat.type)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const currentIndex = sameTypeCats.findIndex((c) => c.id === cat.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sameTypeCats.length) return;

    const newOrderList = [...sameTypeCats];
    const temp = newOrderList[currentIndex];
    newOrderList[currentIndex] = newOrderList[targetIndex];
    newOrderList[targetIndex] = temp;

    const items = newOrderList.map((item, index) => ({
      id: item.id,
      sortOrder: index + 1,
    }));

    setIsReordering(true);
    try {
      await categoryApi.reorder({ items });
      showToast(`Đã thay đổi thứ tự danh mục "${cat.name}".`);
      await loadCategories();
    } catch (err: any) {
      showToast(err.message || 'Không thể cập nhật thứ tự danh mục', 'error');
    } finally {
      setIsReordering(false);
    }
  };

  const startDelete = (cat: CommonCategory) => {
    setDeleteError(null);
    setDeletingCategory(cat);
  };

  // Helper: Format badge class and icon by type
  const getTypeBadgeDetails = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EMPLOYMENT_TYPE':
        return {
          className: 'cat-badge-employment',
          label: 'Hình thức làm việc',
          icon: <Briefcase size={13} />,
          desc: 'Quy định hình thức hợp đồng, chế độ làm việc cho các tin tuyển dụng và headcount.',
        };
      case 'WORK_LOCATION':
        return {
          className: 'cat-badge-location',
          label: 'Địa điểm làm việc',
          icon: <MapPin size={13} />,
          desc: 'Trụ sở chính, chi nhánh vùng miền và chế độ làm việc từ xa (Remote / Hybrid).',
        };
      case 'EDUCATION_LEVEL':
        return {
          className: 'cat-badge-education',
          label: 'Trình độ học vấn',
          icon: <GraduationCap size={13} />,
          desc: 'Chuẩn bằng cấp, học vị tối thiểu phục vụ sàng lọc và xếp hạng ứng viên.',
        };
      case 'CANDIDATE_SOURCE':
        return {
          className: 'cat-badge-source',
          label: 'Nguồn ứng viên',
          icon: <Users2 size={13} />,
          desc: 'Kênh tuyển dụng, cổng nội bộ, sàn việc làm để đo lường hiệu quả chuyển đổi.',
        };
      case 'REJECTION_REASON':
        return {
          className: 'cat-badge-rejection',
          label: 'Lý do loại hồ sơ',
          icon: <AlertCircle size={13} />,
          desc: 'Lý do loại hồ sơ hoặc không đạt phỏng vấn, chuẩn hóa cho báo cáo nhân sự.',
        };
      case 'INTERVIEW_TYPE':
        return {
          className: 'cat-badge-interview',
          label: 'Hình thức phỏng vấn',
          icon: <FileQuestion size={13} />,
          desc: 'Định dạng phỏng vấn trực tiếp, online video hoặc bài kiểm tra chuyên môn.',
        };
      case 'SKILL_TAG':
        return {
          className: 'cat-badge-skill',
          label: 'Kỹ năng & Chuyên môn',
          icon: <Sparkles size={13} />,
          desc: 'Thẻ kỹ năng công nghệ và nghiệp vụ gán vào tin tuyển dụng & ngân hàng câu hỏi.',
        };
      default:
        return {
          className: 'cat-badge-default',
          label: type,
          icon: <Tag size={13} />,
          desc: 'Nhóm danh mục mở rộng phục vụ quy trình chuyên biệt.',
        };
    }
  };

  return (
    <div className="cat-page-container">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-white font-medium text-sm transition-all animate-bounce ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Standardized Enterprise Page Header */}
      <PageHeader
        title="Quản lý Danh mục Dùng chung"
        subtitle="Hệ thống danh mục dữ liệu dùng chung (Master Data) đồng bộ cho toàn bộ vòng đời tuyển dụng"
        breadcrumbs={[
          { label: 'Tổng quan', path: '/dashboard' },
          { label: 'Danh mục dùng chung' },
        ]}
        badge={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="cat-badge-enterprise">
              Master Data & Metadata
            </span>
            <span className="cat-badge-subtle hidden sm:inline-flex">
              Chuẩn hóa Tuyển dụng ATS
            </span>
          </div>
        }
        actions={
          <div className="cat-hero-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              title="Xuất toàn bộ danh mục ra file CSV (Excel tiếng Việt chuẩn)"
            >
              <span>Xuất CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('ALL');
                setStatusFilter('ALL');
                setSelectedIds([]);
              }}
              title="Đặt lại bộ lọc về mặc định"
            >
              <span>Đặt lại bộ lọc</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                loadCategories();
                loadTypes();
              }}
              title="Tải lại danh sách"
            >
              <span>Làm mới</span>
            </button>

            {canManage && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditingCategory(null);
                  setIsModalOpen(true);
                }}
              >
                <span>Thêm danh mục mới</span>
              </button>
            )}
          </div>
        }
      />

      {/* Metrics Cards */}
      <section className="cat-metrics-grid" aria-label="Thống kê tổng quan danh mục">
        <div className="cat-metric-card">
          <div className="cat-metric-info">
            <div className="cat-metric-value-row">
              <span className="cat-metric-value">{metrics.total}</span>
              <span className="cat-metric-subtext">bản ghi</span>
            </div>
            <span className="cat-metric-label">Tổng số danh mục</span>
          </div>
        </div>

        <div className="cat-metric-card">
          <div className="cat-metric-info">
            <div className="cat-metric-value-row">
              <span className="cat-metric-value">{metrics.distinctTypes || typesInfo.length}</span>
              <span className="cat-metric-subtext">nhóm chuẩn</span>
            </div>
            <span className="cat-metric-label">Nhóm phân loại</span>
          </div>
        </div>

        <div className="cat-metric-card">
          <div className="cat-metric-info">
            <div className="cat-metric-value-row">
              <span className="cat-metric-value">{metrics.activeCount}</span>
              <span className="cat-metric-subtext text-emerald-600 font-semibold">
                ({metrics.activePercentage}%)
              </span>
            </div>
            <span className="cat-metric-label">Đang hoạt động</span>
            <div className="cat-metric-progress">
              <div
                className="cat-metric-progress-bar"
                style={{ width: `${metrics.activePercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="cat-metric-card">
          <div className="cat-metric-info">
            <div className="cat-metric-value-row">
              <span className="cat-metric-value">{metrics.inactiveCount}</span>
              <span className="cat-metric-subtext text-rose-600 font-semibold">tạm khóa</span>
            </div>
            <span className="cat-metric-label">Tạm ngưng sử dụng</span>
          </div>
        </div>
      </section>

      {/* Category Type Navigation Pills */}
      <nav className="cat-types-nav" aria-label="Lọc theo nhóm danh mục">
        <button
          type="button"
          className={`cat-type-pill ${selectedType === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedType('ALL')}
        >
          <span>Tất cả nhóm</span>
          <span className="cat-type-pill-count">{metrics.total}</span>
        </button>

        {typesInfo.map((t) => (
          <button
            type="button"
            key={t.type}
            className={`cat-type-pill ${selectedType === t.type ? 'active' : ''}`}
            onClick={() => setSelectedType(t.type)}
          >
            <span>{t.label}</span>
            <span className="cat-type-pill-count">{t.count}</span>
          </button>
        ))}
      </nav>

      {/* Controls Bar: Search, Filters, View Modes */}
      <div className="cat-controls-bar">
        <div className="cat-search-box">
          <Search size={18} className="cat-search-icon" />
          <input
            type="text"
            className="cat-search-input"
            placeholder="Tìm theo tên hoặc mã danh mục (VD: FULL_TIME, Hà Nội, Đại học, Java...)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="cat-search-clear-btn"
              onClick={() => setSearchTerm('')}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="cat-filter-group">
          <select
            className="cat-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái hoạt động"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Chỉ đang hoạt động</option>
            <option value="INACTIVE">Chỉ tạm ngưng</option>
          </select>

          {/* View Mode Switcher */}
          <div className="cat-view-toggles" role="group" aria-label="Chế độ hiển thị">
            <button
              type="button"
              className={`cat-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Xem dạng Bảng chi tiết"
            >
              <span>Bảng</span>
            </button>
            <button
              type="button"
              className={`cat-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Xem dạng Thẻ trực quan"
            >
              <span>Thẻ</span>
            </button>
            <button
              type="button"
              className={`cat-view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
              onClick={() => setViewMode('grouped')}
              title="Xem dạng Phân nhóm chuyên sâu"
            >
              <span>Phân nhóm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} className="shrink-0 text-red-600" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="cat-table-card p-12 text-center text-slate-500 flex flex-col items-center gap-3">
          <RefreshCw size={28} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium">Đang tải dữ liệu danh mục chuẩn tuyển dụng...</p>
        </div>
      ) : sortedCategories.length === 0 ? (
        <div className="cat-table-card cat-empty-state">
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy danh mục nào</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Không có dữ liệu danh mục nào phù hợp với bộ lọc hiện tại. Hãy thử tìm từ khóa khác
            hoặc thêm mới danh mục.
          </p>
          {canManage && (
            <button
              type="button"
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              onClick={() => {
                setEditingCategory(null);
                setIsModalOpen(true);
              }}
            >
              Thêm danh mục mới
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 1. TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="cat-table-card">
              <div className="cat-table-wrapper">
                <table className="cat-table" aria-label="Danh sách danh mục dùng chung">
                  <thead>
                    <tr>
                      {canManage && (
                        <th style={{ width: '42px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="cat-checkbox"
                            checked={
                              sortedCategories.length > 0 &&
                              selectedIds.length === sortedCategories.length
                            }
                            onChange={handleSelectAll}
                            aria-label="Chọn tất cả danh mục"
                          />
                        </th>
                      )}
                      <th
                        style={{ width: '80px', cursor: 'pointer' }}
                        onClick={() => handleToggleSort('sortOrder')}
                        title="Nhấn để sắp xếp theo thứ tự"
                      >
                        <div className="flex items-center gap-1">
                          <span>Thứ tự</span>
                          {sortBy === 'sortOrder' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                        </div>
                      </th>
                      <th>Nhóm phân loại</th>
                      <th
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleSort('code')}
                        title="Nhấn để sắp xếp theo mã"
                      >
                        <div className="flex items-center gap-1">
                          <span>Mã danh mục</span>
                          {sortBy === 'code' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                        </div>
                      </th>
                      <th
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleSort('name')}
                        title="Nhấn để sắp xếp theo tên"
                      >
                        <div className="flex items-center gap-1">
                          <span>Tên hiển thị</span>
                          {sortBy === 'name' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                        </div>
                      </th>
                      <th
                        style={{ width: '150px', cursor: 'pointer' }}
                        onClick={() => handleToggleSort('active')}
                        title="Nhấn để sắp xếp theo trạng thái"
                      >
                        <div className="flex items-center gap-1">
                          <span>Trạng thái</span>
                          {sortBy === 'active' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ textAlign: 'right', width: '130px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCategories.map((cat) => {
                      const typeDetails = getTypeBadgeDetails(cat.type);
                      const isSelected = selectedIds.includes(cat.id);
                      return (
                        <tr
                          key={cat.id}
                          className={isSelected ? 'cat-table-row-selected' : ''}
                        >
                          {canManage && (
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="cat-checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRow(cat.id)}
                                aria-label={`Chọn ${cat.name}`}
                              />
                            </td>
                          )}
                          <td className="text-slate-500 font-mono font-medium text-xs">
                            <div className="flex items-center gap-1.5">
                              <span>#{cat.sortOrder}</span>
                              {canManage && (
                                <div className="inline-flex flex-col ml-0.5">
                                  <button
                                    type="button"
                                    className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={() => handleMoveOrder(cat, 'up')}
                                    disabled={isReordering}
                                    title="Di chuyển lên trên"
                                    aria-label={`Di chuyển lên ${cat.name}`}
                                  >
                                    <ArrowUp size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={() => handleMoveOrder(cat, 'down')}
                                    disabled={isReordering}
                                    title="Di chuyển xuống dưới"
                                    aria-label={`Di chuyển xuống ${cat.name}`}
                                  >
                                    <ArrowDown size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`cat-badge ${typeDetails.className}`}>
                              {typeDetails.icon}
                              <span>{typeDetails.label}</span>
                            </span>
                          </td>
                          <td>
                            <div className="cat-code-badge-wrap">
                              <span className="cat-code-badge">{cat.code}</span>
                              <button
                                type="button"
                                className="cat-copy-btn"
                                onClick={(e) => handleCopyCode(e, cat.code)}
                                title={`Sao chép mã ${cat.code}`}
                              >
                                {copiedCode === cat.code ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          </td>
                          <td>
                            <span
                              className="font-semibold text-slate-900 cursor-pointer hover:text-blue-600 transition"
                              onClick={() => setDetailCategory(cat)}
                              title="Xem chi tiết danh mục"
                            >
                              {cat.name}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`cat-status-pill ${cat.active ? 'active' : 'inactive'} ${
                                canManage ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
                              }`}
                              onClick={() => handleToggleStatus(cat)}
                              title={canManage ? 'Nhấn để bật/tắt trạng thái' : undefined}
                              disabled={!canManage}
                            >
                              <span className="cat-status-dot" />
                              <span>{cat.active ? 'Đang hoạt động' : 'Tạm ngưng'}</span>
                              {canManage && (
                                cat.active ? (
                                  <ToggleRight size={15} className="ml-0.5 text-emerald-700" />
                                ) : (
                                  <ToggleLeft size={15} className="ml-0.5 text-rose-700" />
                                )
                              )}
                            </button>
                          </td>
                          <td>
                            <div className="cat-action-btn-group justify-end">
                              <button
                                type="button"
                                className="cat-icon-btn view"
                                onClick={() => setDetailCategory(cat)}
                                title="Xem chi tiết danh mục"
                                aria-label={`Chi tiết ${cat.name}`}
                              >
                                <Eye size={16} />
                              </button>

                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    className="cat-icon-btn edit"
                                    onClick={() => {
                                      setEditingCategory(cat);
                                      setIsModalOpen(true);
                                    }}
                                    title="Chỉnh sửa danh mục"
                                    aria-label={`Sửa ${cat.name}`}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="cat-icon-btn delete"
                                    onClick={() => startDelete(cat)}
                                    title="Xóa danh mục"
                                    aria-label={`Xóa ${cat.name}`}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. CARDS GRID VIEW */}
          {viewMode === 'cards' && (
            <div className="cat-cards-grid">
              {sortedCategories.map((cat) => {
                const typeDetails = getTypeBadgeDetails(cat.type);
                const isSelected = selectedIds.includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    className={`cat-card ${isSelected ? 'cat-table-row-selected' : ''}`}
                  >
                    <div className="cat-card-header">
                      <span className={`cat-badge ${typeDetails.className}`}>
                        {typeDetails.icon}
                        <span>{typeDetails.label}</span>
                      </span>

                      <button
                        type="button"
                        className={`cat-status-pill ${cat.active ? 'active' : 'inactive'} ${
                          canManage ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
                        }`}
                        onClick={() => handleToggleStatus(cat)}
                        disabled={!canManage}
                        title={canManage ? 'Nhấn để bật/tắt trạng thái' : undefined}
                      >
                        <span className="cat-status-dot" />
                        <span>{cat.active ? 'Hoạt động' : 'Tạm ngưng'}</span>
                      </button>
                    </div>

                    <div className="cat-card-body">
                      <div className="cat-code-badge-wrap">
                        <span className="cat-code-badge">{cat.code}</span>
                        <button
                          type="button"
                          className="cat-copy-btn"
                          onClick={(e) => handleCopyCode(e, cat.code)}
                          title={`Sao chép mã ${cat.code}`}
                        >
                          <Copy size={13} />
                        </button>
                      </div>

                      <h3
                        className="cat-card-title cursor-pointer hover:text-blue-600 transition"
                        onClick={() => setDetailCategory(cat)}
                      >
                        {cat.name}
                      </h3>
                    </div>

                    <div className="cat-card-meta">
                      <div className="flex items-center gap-1">
                        <span>Thứ tự: #{cat.sortOrder}</span>
                        {canManage && (
                          <div className="inline-flex items-center gap-0.5 ml-1">
                            <button
                              type="button"
                              className="p-0.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 disabled:opacity-30"
                              onClick={() => handleMoveOrder(cat, 'up')}
                              disabled={isReordering}
                              title="Di chuyển lên"
                              aria-label={`Di chuyển lên ${cat.name}`}
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              className="p-0.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 disabled:opacity-30"
                              onClick={() => handleMoveOrder(cat, 'down')}
                              disabled={isReordering}
                              title="Di chuyển xuống"
                              aria-label={`Di chuyển xuống ${cat.name}`}
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <span>Mã ID: #{cat.id}</span>
                    </div>

                    <div className="cat-card-footer">
                      <button
                        type="button"
                        className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                        onClick={() => setDetailCategory(cat)}
                      >
                        <Eye size={13} />
                        <span>Xem chi tiết</span>
                      </button>

                      {canManage && (
                        <div className="cat-action-btn-group">
                          <button
                            type="button"
                            className="cat-icon-btn edit"
                            onClick={() => {
                              setEditingCategory(cat);
                              setIsModalOpen(true);
                            }}
                            title="Sửa danh mục"
                            aria-label={`Sửa ${cat.name}`}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="cat-icon-btn delete"
                            onClick={() => startDelete(cat)}
                            title="Xóa danh mục"
                            aria-label={`Xóa ${cat.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. GROUPED SECTION VIEW */}
          {viewMode === 'grouped' && (
            <div className="cat-groups-container">
              {Object.entries(groupedCategories).map(([typeKey, catList]) => {
                const typeDetails = getTypeBadgeDetails(typeKey);
                return (
                  <div key={typeKey} className="cat-group-section">
                    <div className="cat-group-header">
                      <div className="cat-group-header-left">
                        <div className="cat-group-icon bg-blue-50 text-blue-600">
                          {typeDetails.icon}
                        </div>
                        <div>
                          <h3 className="cat-group-title">
                            <span>{typeDetails.label}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                              {typeKey} ({catList.length})
                            </span>
                          </h3>
                          <p className="cat-group-desc">{typeDetails.desc}</p>
                        </div>
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition border border-blue-200"
                          onClick={() => {
                            setEditingCategory(null);
                            setSelectedType(typeKey);
                            setIsModalOpen(true);
                          }}
                        >
                          <Plus size={14} />
                          <span>Thêm vào nhóm này</span>
                        </button>
                      )}
                    </div>

                    <div className="cat-group-content">
                      <div className="cat-cards-grid">
                        {catList.map((cat) => (
                          <div key={cat.id} className="cat-card">
                            <div className="cat-card-header">
                              <div className="cat-code-badge-wrap">
                                <span className="cat-code-badge">{cat.code}</span>
                                <button
                                  type="button"
                                  className="cat-copy-btn"
                                  onClick={(e) => handleCopyCode(e, cat.code)}
                                  title={`Sao chép mã ${cat.code}`}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>

                              <button
                                type="button"
                                className={`cat-status-pill ${cat.active ? 'active' : 'inactive'} ${
                                  canManage ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
                                }`}
                                onClick={() => handleToggleStatus(cat)}
                                disabled={!canManage}
                              >
                                <span className="cat-status-dot" />
                                <span>{cat.active ? 'Hoạt động' : 'Tạm ngưng'}</span>
                              </button>
                            </div>

                            <div className="cat-card-body">
                              <h4
                                className="cat-card-title cursor-pointer hover:text-blue-600 transition"
                                onClick={() => setDetailCategory(cat)}
                              >
                                {cat.name}
                              </h4>
                            </div>

                            <div className="cat-card-footer">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500 font-mono">Thứ tự: #{cat.sortOrder}</span>
                                {canManage && (
                                  <div className="inline-flex items-center gap-0.5 ml-1">
                                    <button
                                      type="button"
                                      className="p-0.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 disabled:opacity-30"
                                      onClick={() => handleMoveOrder(cat, 'up')}
                                      disabled={isReordering}
                                      title="Di chuyển lên"
                                      aria-label={`Di chuyển lên ${cat.name}`}
                                    >
                                      <ArrowUp size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      className="p-0.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 disabled:opacity-30"
                                      onClick={() => handleMoveOrder(cat, 'down')}
                                      disabled={isReordering}
                                      title="Di chuyển xuống"
                                      aria-label={`Di chuyển xuống ${cat.name}`}
                                    >
                                      <ArrowDown size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {canManage && (
                                <div className="cat-action-btn-group">
                                  <button
                                    type="button"
                                    className="cat-icon-btn edit"
                                    onClick={() => {
                                      setEditingCategory(cat);
                                      setIsModalOpen(true);
                                    }}
                                    title="Sửa danh mục"
                                    aria-label={`Sửa ${cat.name}`}
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="cat-icon-btn delete"
                                    onClick={() => startDelete(cat)}
                                    title="Xóa danh mục"
                                    aria-label={`Xóa ${cat.name}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && canManage && (
        <aside className="cat-floating-bulk-bar" aria-label="Thao tác hàng loạt danh mục">
          <div className="cat-bulk-info">
            <CheckSquare size={18} />
            <span>Đã chọn {selectedIds.length} danh mục</span>
          </div>

          <div className="cat-bulk-actions">
            <button
              type="button"
              className="cat-bulk-btn activate"
              onClick={() => handleBulkSetStatus(true)}
              disabled={isBulkProcessing}
            >
              <CheckCircle2 size={14} />
              <span>Kích hoạt tất cả</span>
            </button>

            <button
              type="button"
              className="cat-bulk-btn deactivate"
              onClick={() => handleBulkSetStatus(false)}
              disabled={isBulkProcessing}
            >
              <XCircle size={14} />
              <span>Tạm ngưng tất cả</span>
            </button>

            <button
              type="button"
              className="cat-bulk-btn clear"
              onClick={() => setSelectedIds([])}
            >
              <X size={14} />
              <span>Bỏ chọn</span>
            </button>
          </div>
        </aside>
      )}

      {/* Add / Edit Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveCategory}
        editingCategory={editingCategory}
        existingTypes={typesInfo}
        defaultType={selectedType}
      />

      {/* Detail Inspection Modal */}
      <CategoryDetailModal
        category={detailCategory}
        isOpen={Boolean(detailCategory)}
        onClose={() => setDetailCategory(null)}
        onEdit={(cat) => {
          setEditingCategory(cat);
          setIsModalOpen(true);
        }}
        onDelete={(cat) => startDelete(cat)}
        canManage={canManage}
      />

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div
          className="cat-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeletingCategory(null);
              setDeleteError(null);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="cat-modal-card max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cat-modal-header bg-rose-50 border-b border-rose-100">
              <h3 className="cat-modal-title text-rose-700">
                <AlertCircle size={20} className="text-rose-600" />
                <span>Xác nhận Xóa danh mục</span>
              </h3>
            </div>
            <div className="cat-modal-body">
              <p className="text-sm text-slate-700 leading-relaxed">
                Bạn có chắc chắn muốn xóa danh mục{' '}
                <strong className="text-slate-900 font-semibold font-mono">
                  "{deletingCategory.name}" ({deletingCategory.code})
                </strong>{' '}
                thuộc nhóm{' '}
                <strong className="text-blue-700">{deletingCategory.type}</strong> không?
              </p>

              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Không thể xóa danh mục:</span>
                    <span>{deleteError}</span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Lưu ý: Nếu danh mục này đang được liên kết trong các tin tuyển dụng hoặc hồ sơ ứng viên,
                  việc xóa sẽ bị hệ thống chặn để bảo toàn dữ liệu. Bạn có thể chọn "Tạm ngưng" thay vì xóa vĩnh viễn.
                </span>
              </div>
            </div>
            <div className="cat-modal-footer">
              <button
                type="button"
                className="cat-btn-outline"
                onClick={() => {
                  setDeletingCategory(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="cat-btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagementPage;
