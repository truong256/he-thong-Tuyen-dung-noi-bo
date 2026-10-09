import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  HelpCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
  BookOpen,
  Award,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  X,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import questionBankApi from '../api/questionBank';
import jobTitleApi from '../api/jobTitle';
import { JobTitle } from '../types/jobTitle';
import {
  InterviewQuestion,
  CompetencyCriterion,
  CreateQuestionPayload,
  UpdateQuestionPayload,
} from '../types/questionBank';
import QuestionModal from '../components/questionBank/QuestionModal';
import { PageHeader } from '../components/common/PageHeader';
import '../styles/question-bank.css';

export const QuestionBankPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['ADMIN', 'HR_MANAGER']);

  // Data states
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [criteria, setCriteria] = useState<CompetencyCriterion[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [jobTitleFilter, setJobTitleFilter] = useState<string>('ALL');
  const [criterionFilter, setCriterionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Race condition ref
  const reqIdRef = useRef(0);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<InterviewQuestion | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<InterviewQuestion | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch criteria once
  const loadCriteria = useCallback(async () => {
    try {
      const data = await questionBankApi.getCriteria();
      setCriteria(data);
    } catch {
      // Criteria could be empty or not yet seeded
    }
  }, []);

  // Fetch job titles once
  const loadJobTitles = useCallback(async () => {
    try {
      const data = await jobTitleApi.getJobTitles();
      setJobTitles(data);
    } catch {
      // Job titles could be unavailable
    }
  }, []);

  // Filter criteria options based on selected job title
  const filteredCriteria = useMemo(() => {
    if (jobTitleFilter === 'ALL') {
      return criteria;
    }
    const titleIdNum = Number(jobTitleFilter);
    return criteria.filter((c) => c.jobTitleId === titleIdNum);
  }, [criteria, jobTitleFilter]);

  // Handle job title change and adjust selected criterion if mismatched
  const handleJobTitleChange = (newTitleId: string) => {
    setJobTitleFilter(newTitleId);
    setCurrentPage(0);
    if (newTitleId !== 'ALL' && criterionFilter !== 'ALL') {
      const titleIdNum = Number(newTitleId);
      const currentCriterion = criteria.find((c) => String(c.id) === criterionFilter);
      if (currentCriterion && currentCriterion.jobTitleId && currentCriterion.jobTitleId !== titleIdNum) {
        setCriterionFilter('ALL');
      }
    }
  };

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    difficultyFilter !== 'ALL' ||
    jobTitleFilter !== 'ALL' ||
    criterionFilter !== 'ALL' ||
    statusFilter !== 'ALL'
  );

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearchTerm('');
    setDifficultyFilter('ALL');
    setJobTitleFilter('ALL');
    setCriterionFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(0);
  };

  // Fetch questions with race condition handling
  const loadQuestions = useCallback(async (page = 0) => {
    const currentReqId = ++reqIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeParam =
        statusFilter === 'ACTIVE' ? true : statusFilter === 'INACTIVE' ? false : 'ALL';

      const res = await questionBankApi.search({
        search: searchTerm.trim() || undefined,
        difficultyLevel: difficultyFilter !== 'ALL' ? difficultyFilter : undefined,
        jobTitleId: jobTitleFilter !== 'ALL' ? Number(jobTitleFilter) : undefined,
        criterionId: criterionFilter !== 'ALL' ? Number(criterionFilter) : undefined,
        active: activeParam,
        page,
        size: pageSize,
      });

      if (currentReqId === reqIdRef.current) {
        setQuestions(res.content || []);
        setTotalElements(res.totalElements || 0);
        setTotalPages(Math.max(1, res.totalPages || 1));
        setCurrentPage(page);
      }
    } catch (err: any) {
      if (currentReqId === reqIdRef.current) {
        setErrorMessage(err.message || 'Không thể kết nối đến máy chủ để tải ngân hàng câu hỏi.');
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [searchTerm, difficultyFilter, jobTitleFilter, criterionFilter, statusFilter, pageSize]);

  useEffect(() => {
    loadCriteria();
    loadJobTitles();
  }, [loadCriteria, loadJobTitles]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadQuestions(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [loadQuestions]);

  // Statistics calculation
  const metrics = useMemo(() => {
    const total = totalElements;
    const hardCount = questions.filter((q) => q.difficultyLevel === 'HARD').length;
    const mediumCount = questions.filter((q) => q.difficultyLevel === 'MEDIUM').length;
    const easyCount = questions.filter((q) => q.difficultyLevel === 'EASY').length;
    return { total, hardCount, mediumCount, easyCount };
  }, [totalElements, questions]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: InterviewQuestion) => {
    setEditingQuestion(q);
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async (payload: CreateQuestionPayload | UpdateQuestionPayload) => {
    if (editingQuestion) {
      await questionBankApi.update(editingQuestion.id, payload as UpdateQuestionPayload);
      showToast('Cập nhật câu hỏi phỏng vấn thành công!');
    } else {
      await questionBankApi.create(payload as CreateQuestionPayload);
      showToast('Thêm mới câu hỏi vào ngân hàng thành công!');
    }
    loadQuestions(currentPage);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingQuestion) return;
    try {
      await questionBankApi.delete(deletingQuestion.id);
      showToast(`Đã vô hiệu hóa câu hỏi thành công!`);
      setDeletingQuestion(null);
      loadQuestions(currentPage);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi vô hiệu hóa câu hỏi.', 'error');
    }
  };

  return (
    <div className="qb-page-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`qb-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Enterprise Breadcrumb and Page Header */}
      <PageHeader
        title="Kho Dữ liệu Câu hỏi Phỏng vấn Chuyên môn"
        subtitle="Chuẩn hóa bộ câu hỏi đánh giá theo tiêu chí khung năng lực và vị trí chuyên môn"
        breadcrumbs={[
          { label: 'Tổng quan', path: '/dashboard' },
          { label: 'Ngân hàng câu hỏi' },
        ]}
      />

      {/* Hero Banner */}
      <section className="qb-hero-card" aria-label="Giới thiệu Ngân hàng Câu hỏi">
        <div className="qb-hero-header">
          <div className="qb-identity-left">
            <div className="qb-icon-box">
              <HelpCircle size={32} />
            </div>
            <div className="qb-title-group">
              <h1>Ngân hàng Câu hỏi Phỏng vấn</h1>
              <div className="qb-title-meta">
                <span className="qb-badge-code">ATS-QUESTION-BANK</span>
                <span className="qb-subtitle">
                  Chuẩn hóa bộ câu hỏi đánh giá theo tiêu chí năng lực (Competency Rubric)
                </span>
              </div>
            </div>
          </div>

          <div className="qb-actions-right">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => loadQuestions(currentPage)}
              disabled={isLoading}
              title="Làm mới danh sách"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span>Tải lại</span>
            </button>

            {canManage && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
                id="btn-add-question"
              >
                <Plus size={18} />
                <span>Thêm câu hỏi mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="qb-metrics-row">
          <div className="qb-metric-card">
            <div className="qb-metric-icon blue">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="qb-metric-val">{metrics.total}</div>
              <div className="qb-metric-label">Tổng số câu hỏi</div>
            </div>
          </div>

          <div className="qb-metric-card">
            <div className="qb-metric-icon green">
              <Layers size={20} />
            </div>
            <div>
              <div className="qb-metric-val">{criteria.length}</div>
              <div className="qb-metric-label">Tiêu chí năng lực liên kết</div>
            </div>
          </div>

          <div className="qb-metric-card">
            <div className="qb-metric-icon amber">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="qb-metric-val">{metrics.mediumCount}</div>
              <div className="qb-metric-label">Độ khó Trung bình (Medium)</div>
            </div>
          </div>

          <div className="qb-metric-card">
            <div className="qb-metric-icon rose">
              <Award size={20} />
            </div>
            <div>
              <div className="qb-metric-val">{metrics.hardCount}</div>
              <div className="qb-metric-label">Độ khó Chuyên sâu (Hard)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="qb-filter-bar" aria-label="Bộ lọc tìm kiếm">
        <div className="qb-search-wrapper">
          <Search size={18} className="qb-search-icon" />
          <input
            type="text"
            className="qb-search-input"
            placeholder="Tìm theo nội dung câu hỏi, từ khóa kỹ thuật..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="input-search-question"
          />
        </div>

        <div className="qb-filters-group">
          {/* Lọc theo chức danh */}
          <select
            className="qb-select"
            value={jobTitleFilter}
            onChange={(e) => handleJobTitleChange(e.target.value)}
            aria-label="Lọc theo chức danh"
            id="select-filter-job-title"
          >
            <option value="ALL">Tất cả chức danh</option>
            {jobTitles.map((jt) => (
              <option key={jt.id} value={jt.id}>
                {jt.title}
              </option>
            ))}
          </select>

          {/* Lọc theo tiêu chí năng lực */}
          <select
            className="qb-select"
            value={criterionFilter}
            onChange={(e) => setCriterionFilter(e.target.value)}
            aria-label="Lọc theo tiêu chí năng lực"
            id="select-filter-criterion"
          >
            <option value="ALL">Tất cả tiêu chí năng lực</option>
            {filteredCriteria.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.criterionCode}] {c.criterionName}
              </option>
            ))}
          </select>

          {/* Lọc theo độ khó */}
          <select
            className="qb-select"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            aria-label="Lọc theo độ khó"
            id="select-filter-difficulty"
          >
            <option value="ALL">Tất cả độ khó</option>
            <option value="EASY">Dễ (Easy)</option>
            <option value="MEDIUM">Trung bình (Medium)</option>
            <option value="HARD">Khó (Hard)</option>
          </select>

          {/* Lọc theo trạng thái */}
          <select
            className="qb-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái"
            id="select-filter-status"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang kích hoạt</option>
            <option value="INACTIVE">Ngừng kích hoạt</option>
          </select>

          {/* Nút Xóa bộ lọc */}
          <button
            type="button"
            className={`btn btn-outline qb-btn-reset-filters ${hasActiveFilters ? 'active' : ''}`}
            onClick={handleResetFilters}
            id="btn-reset-filters"
            title="Khôi phục toàn bộ lựa chọn bộ lọc mặc định"
          >
            <RotateCcw size={15} />
            <span>Xóa bộ lọc</span>
          </button>
        </div>
      </section>

      {/* Error state */}
      {errorMessage && (
        <div className="org-error-banner" role="alert" style={{ margin: '0 0 16px 0' }}>
          <AlertCircle size={20} />
          <div style={{ flex: 1 }}>
            <strong>Đã xảy ra lỗi:</strong> {errorMessage}
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => loadQuestions(currentPage)}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="qb-empty-state" aria-busy="true">
          <RefreshCw size={36} className="animate-spin" style={{ color: '#2563eb', margin: '0 auto 16px' }} />
          <h3>Đang tải ngân hàng câu hỏi...</h3>
          <p>Hệ thống đang truy xuất câu hỏi phỏng vấn từ cơ sở dữ liệu nội bộ.</p>
        </div>
      ) : questions.length === 0 ? (
        /* Empty state */
        <div className="qb-empty-state">
          <div className="qb-empty-icon">
            <HelpCircle size={30} />
          </div>
          <h3 className="qb-empty-title">Không tìm thấy câu hỏi nào</h3>
          <p className="qb-empty-desc">
            {hasActiveFilters
              ? 'Không có câu hỏi phỏng vấn nào phù hợp với bộ lọc hiện tại. Thử xóa bớt điều kiện lọc hoặc bấm "Xóa bộ lọc".'
              : 'Hiện chưa có câu hỏi nào trong ngân hàng. Hãy thêm mới câu hỏi để chuẩn hóa quy trình phỏng vấn.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleResetFilters}
                id="btn-empty-reset-filters"
              >
                <RotateCcw size={16} />
                <span>Xóa bộ lọc</span>
              </button>
            )}
            {canManage && (
              <button
                type="button"
                className="btn btn-primary qb-empty-cta"
                onClick={handleOpenCreate}
                id="btn-add-question-empty"
              >
                <Plus size={16} />
                <span>Thêm câu hỏi ngay</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Question List */
        <div className="qb-list-grid">
          {questions.map((q) => {
            const diffClass =
              q.difficultyLevel === 'EASY'
                ? 'easy'
                : q.difficultyLevel === 'HARD'
                ? 'hard'
                : 'medium';

            const diffLabel =
              q.difficultyLevel === 'EASY'
                ? 'DỄ'
                : q.difficultyLevel === 'HARD'
                ? 'KHÓ'
                : 'TRUNG BÌNH';

            return (
              <div key={q.id} className="qb-card">
                <div className="qb-card-header">
                  <div className="qb-card-tags">
                    <span className={`qb-difficulty-badge ${diffClass}`}>{diffLabel}</span>
                    {q.category && <span className="qb-category-tag">{q.category}</span>}
                    <span className={`qb-status-badge ${q.active ? 'active' : 'inactive'}`}>
                      {q.active ? 'Đang kích hoạt' : 'Tạm dừng'}
                    </span>
                  </div>

                  {canManage && (
                    <div className="qb-card-actions">
                      <button
                        type="button"
                        className="qb-icon-btn"
                        onClick={() => handleOpenEdit(q)}
                        title="Chỉnh sửa câu hỏi"
                      >
                        <Edit2 size={14} />
                        <span>Sửa</span>
                      </button>
                      {q.active && (
                        <button
                          type="button"
                          className="qb-icon-btn danger"
                          onClick={() => setDeletingQuestion(q)}
                          title="Vô hiệu hóa câu hỏi"
                        >
                          <Trash2 size={14} />
                          <span>Vô hiệu hóa</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="qb-question-text">{q.questionText}</div>

                {q.suggestedAnswer && (
                  <div className="qb-suggested-answer">
                    <div className="qb-suggested-answer-title">
                      <Lightbulb size={16} />
                      <span>Gợi ý câu trả lời & Tiêu chí chấm điểm:</span>
                    </div>
                    <div>{q.suggestedAnswer}</div>
                  </div>
                )}

                <div className="qb-card-footer">
                  <div className="qb-card-meta">
                    <div className="qb-meta-item">
                      <Layers size={14} />
                      <span>
                        Tiêu chí: <strong>[{q.criterionCode}] {q.criterionName}</strong>
                      </span>
                    </div>
                    {q.competencyName && (
                      <div className="qb-meta-item">
                        <Award size={14} />
                        <span>Khung: {q.competencyName}</span>
                      </div>
                    )}
                    {q.jobTitle && (
                      <div className="qb-meta-item">
                        <span>Vị trí: <strong>{q.jobTitle}</strong></span>
                      </div>
                    )}
                  </div>

                  {q.createdAt && (
                    <div className="qb-meta-item">
                      <span>Khởi tạo: {String(q.createdAt).slice(0, 10)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                marginTop: 8,
              }}
            >
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Hiển thị trang <strong>{currentPage + 1}</strong> / <strong>{totalPages}</strong> ({totalElements} câu hỏi)
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={currentPage === 0}
                  onClick={() => loadQuestions(currentPage - 1)}
                >
                  <ChevronLeft size={16} />
                  <span>Trang trước</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => loadQuestions(currentPage + 1)}
                >
                  <span>Trang sau</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <QuestionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveQuestion}
        question={editingQuestion}
        criteria={criteria}
      />

      {/* Delete / Deactivate Confirmation Dialog */}
      {deletingQuestion && (
        <div
          className="qb-modal-backdrop"
          onClick={() => setDeletingQuestion(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="qb-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className="qb-modal-header">
              <div className="qb-modal-title-group">
                <h2 className="qb-modal-title" style={{ color: '#dc2626' }}>
                  Xác nhận vô hiệu hóa câu hỏi
                </h2>
                <p className="qb-modal-subtitle">
                  Hành động này sẽ tạm dừng sử dụng câu hỏi trong các buổi phỏng vấn
                </p>
              </div>
              <button
                type="button"
                className="qb-modal-close-btn"
                onClick={() => setDeletingQuestion(null)}
                aria-label="Đóng dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="qb-modal-body">
              <p style={{ fontSize: '0.9375rem', color: '#1e293b', lineHeight: 1.5, margin: 0 }}>
                Bạn có chắc chắn muốn vô hiệu hóa câu hỏi:
              </p>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 12,
                  fontStyle: 'italic',
                  fontSize: '0.875rem',
                  color: '#334155',
                }}
              >
                "{deletingQuestion.questionText}"
              </div>
            </div>

            <div className="qb-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeletingQuestion(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
              >
                Vô hiệu hóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBankPage;
