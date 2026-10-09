import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  CompetencyFramework,
  CreateCompetencyFrameworkPayload,
  UpdateCompetencyFrameworkPayload,
  FRAMEWORK_CATEGORIES,
} from '../types/competencyFramework';
import { competencyFrameworkApi } from '../api/competencyFramework';
import { useAuth } from '../hooks/useAuth';
import CompetencyFrameworkModal from '../components/competencyFramework/CompetencyFrameworkModal';
import CompetencyFrameworkDetailModal from '../components/competencyFramework/CompetencyFrameworkDetailModal';
import DeleteCompetencyFrameworkModal from '../components/competencyFramework/DeleteCompetencyFrameworkModal';
import { PageHeader } from '../components/common/PageHeader';
import '../styles/competency-framework.css';

export const CompetencyFrameworkPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = Boolean(hasPermission?.('CATALOG_MANAGE'));

  // State
  const [frameworks, setFrameworks] = useState<CompetencyFramework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFramework, setEditingFramework] = useState<CompetencyFramework | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailFramework, setDetailFramework] = useState<CompetencyFramework | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingFramework, setDeletingFramework] = useState<CompetencyFramework | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch frameworks
  const loadFrameworks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await competencyFrameworkApi.getFrameworks();
      setFrameworks(data);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Không thể tải danh sách khung năng lực.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFrameworks();
  }, [loadFrameworks]);

  // Statistics
  const stats = useMemo(() => {
    const totalFrameworks = frameworks.length;
    const totalCriteria = frameworks.reduce((acc, f) => acc + (f.criteria?.length || f.criteriaCount || 0), 0);
    const totalJobTitlesLinked = frameworks.reduce((acc, f) => acc + (f.jobTitles?.length || f.jobTitlesCount || 0), 0);
    return { totalFrameworks, totalCriteria, totalJobTitlesLinked };
  }, [frameworks]);

  // Filtered Frameworks
  const filteredFrameworks = useMemo(() => {
    return frameworks.filter((f) => {
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        f.competencyName.toLowerCase().includes(term) ||
        (f.description && f.description.toLowerCase().includes(term)) ||
        (f.category && f.category.toLowerCase().includes(term)) ||
        (f.jobTitles && f.jobTitles.some((jt) => jt.title.toLowerCase().includes(term) || jt.code.toLowerCase().includes(term)));

      const matchCategory =
        selectedCategory === 'ALL' ||
        (f.category && f.category.toUpperCase() === selectedCategory.toUpperCase());

      return matchSearch && matchCategory;
    });
  }, [frameworks, searchTerm, selectedCategory]);

  // Handlers
  const handleSaveFramework = async (payload: CreateCompetencyFrameworkPayload | UpdateCompetencyFrameworkPayload) => {
    if (editingFramework) {
      const updated = await competencyFrameworkApi.updateFramework(editingFramework.id, payload);
      setFrameworks((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );
      showToast(`Đã cập nhật khung năng lực "${updated.competencyName}" thành công!`);
    } else {
      const created = await competencyFrameworkApi.createFramework(payload);
      setFrameworks((prev) => [created, ...prev]);
      showToast(`Đã tạo mới khung năng lực "${created.competencyName}" thành công!`);
    }
  };

  const handleDeleteFramework = async (id: number) => {
    await competencyFrameworkApi.deleteFramework(id);
    setFrameworks((prev) => prev.filter((f) => f.id !== id));
    showToast('Đã xóa khung năng lực thành công!');
  };

  const getCategoryBadgeClass = (category?: string) => {
    const cat = category?.toUpperCase() || '';
    if (cat.includes('KỸ THUẬT') || cat.includes('TECH')) return 'tech';
    if (cat.includes('NHÂN SỰ') || cat.includes('HR')) return 'hr';
    if (cat.includes('QUẢN LÝ') || cat.includes('LEAD')) return 'mgmt';
    return '';
  };

  return (
    <div className="cf-page-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`cf-toast ${toast.type}`} role="status">
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Standardized Enterprise Page Header */}
      <PageHeader
        title="Quản lý Khung Năng lực"
        subtitle="Chuẩn hóa danh mục năng lực, thiết lập tiêu chí đánh giá và trọng số 100% cho từng vị trí công việc."
        breadcrumbs={[
          { label: 'Tổng quan', path: '/dashboard' },
          { label: 'Khung năng lực' },
        ]}
        actions={
          <div className="cf-header-actions">
            <button
              type="button"
              className="cf-btn-secondary"
              onClick={loadFrameworks}
              title="Tải lại dữ liệu"
            >
              Làm mới
            </button>
            {canManage && (
              <button
                type="button"
                className="cf-btn-primary"
                onClick={() => {
                  setEditingFramework(null);
                  setIsModalOpen(true);
                }}
              >
                Thêm khung năng lực
              </button>
            )}
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="cf-stats-grid">
        <div className="cf-stat-card">
          <div className="cf-stat-meta">
            <div className="cf-stat-label">Tổng số Khung Năng lực</div>
            <div className="cf-stat-val">{stats.totalFrameworks}</div>
          </div>
        </div>

        <div className="cf-stat-card">
          <div className="cf-stat-meta">
            <div className="cf-stat-label">Tổng số Tiêu chí Đánh giá</div>
            <div className="cf-stat-val">{stats.totalCriteria}</div>
          </div>
        </div>

        <div className="cf-stat-card">
          <div className="cf-stat-meta">
            <div className="cf-stat-label">Chức danh Đang áp dụng</div>
            <div className="cf-stat-val">{stats.totalJobTitlesLinked}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="cf-controls-bar">
        <div className="cf-search-box">
          <Search size={18} className="cf-search-icon" />
          <input
            type="text"
            className="cf-search-input"
            placeholder="Tìm theo tên khung, tiêu chí, chức danh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="cf-filters-right">
          <select
            className="cf-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">Tất cả danh mục chuyên môn</option>
            {FRAMEWORK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="cf-alert error">
          <AlertCircle size={18} style={{ display: 'inline', marginRight: 8 }} />
          {errorMessage}
        </div>
      )}

      {/* Framework Table */}
      <div className="cf-table-card">
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            Đang tải dữ liệu khung năng lực...
          </div>
        ) : filteredFrameworks.length === 0 ? (
          <div className="cf-empty-state">
            <h3>
              {searchTerm || selectedCategory !== 'ALL'
                ? 'Không tìm thấy khung năng lực phù hợp'
                : 'Chưa có khung năng lực nào'}
            </h3>
            <p>
              {searchTerm || selectedCategory !== 'ALL'
                ? 'Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ bộ lọc danh mục để xem nhiều kết quả hơn.'
                : 'Hãy tạo khung năng lực đầu tiên để chuẩn hóa tiêu chuẩn tuyển dụng và đánh giá phỏng vấn.'}
            </p>
            {canManage && (
              <button
                type="button"
                className="cf-btn-primary"
                onClick={() => {
                  setEditingFramework(null);
                  setIsModalOpen(true);
                }}
              >
                Thêm khung năng lực mới
              </button>
            )}
          </div>
        ) : (
          <div className="cf-table-scroll">
            <table className="cf-table">
              <thead>
                <tr>
                  <th style={{ width: '280px' }}>Tên khung năng lực</th>
                  <th style={{ width: '150px' }}>Danh mục</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Số tiêu chí</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Tổng trọng số</th>
                  <th>Chức danh áp dụng</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredFrameworks.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div
                        className="cf-name-cell"
                        onClick={() => {
                          setDetailFramework(f);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        {f.competencyName}
                      </div>
                      {f.description && <div className="cf-desc-sub">{f.description}</div>}
                    </td>

                    <td>
                      <span className={`cf-badge-category ${getCategoryBadgeClass(f.category)}`}>
                        {f.category || 'CHUNG'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span className="cf-criteria-chip">
                        {f.criteria?.length || f.criteriaCount || 0} tiêu chí
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span className="cf-weight-badge success">
                        <CheckCircle2 size={13} /> {f.weightPercent}%
                      </span>
                    </td>

                    <td>
                      {(!f.jobTitles || f.jobTitles.length === 0) ? (
                        <span className="cf-jt-tag-empty">Chưa gắn chức danh</span>
                      ) : (
                        <div className="cf-job-titles-wrap">
                          {f.jobTitles.map((jt) => (
                            <span key={jt.id} className="cf-jt-tag" title={jt.title}>
                              <strong>{jt.code}</strong> - {jt.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="cf-actions-group" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          data-testid={`view-framework-${f.id}`}
                          className="cf-icon-btn"
                          title="Xem chi tiết"
                          onClick={() => {
                            setDetailFramework(f);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <Eye size={15} />
                        </button>

                        {canManage && (
                          <>
                            <button
                              type="button"
                              data-testid={`edit-framework-${f.id}`}
                              className="cf-icon-btn"
                              title="Chỉnh sửa khung"
                              onClick={() => {
                                setEditingFramework(f);
                                setIsModalOpen(true);
                              }}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              data-testid={`delete-framework-${f.id}`}
                              className="cf-icon-btn danger"
                              title="Xóa khung"
                              onClick={() => {
                                setDeletingFramework(f);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 size={15} />
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
      </div>

      {/* Modals */}
      <CompetencyFrameworkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFramework}
        framework={editingFramework}
      />

      <CompetencyFrameworkDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        framework={detailFramework}
        onEdit={(f) => {
          setEditingFramework(f);
          setIsModalOpen(true);
        }}
        canEdit={canManage}
      />

      <DeleteCompetencyFrameworkModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteFramework}
        framework={deletingFramework}
      />
    </div>
  );
};

export default CompetencyFrameworkPage;
