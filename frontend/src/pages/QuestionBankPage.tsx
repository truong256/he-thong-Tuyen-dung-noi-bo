import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import questionBankApi from '../api/questionBank';
import {
  InterviewQuestion,
  CompetencyCriterion,
  CreateQuestionPayload,
  UpdateQuestionPayload,
} from '../types/questionBank';
import QuestionModal from '../components/questionBank/QuestionModal';
import '../styles/question-bank.css';

export const QuestionBankPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['ADMIN', 'HR_MANAGER']);

  // Data states
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [criteria, setCriteria] = useState<CompetencyCriterion[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [criterionFilter, setCriterionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

  // Fetch questions
  const loadQuestions = useCallback(async (page = 0) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeParam =
        statusFilter === 'ACTIVE' ? true : statusFilter === 'INACTIVE' ? false : 'ALL';

      const res = await questionBankApi.search({
        search: searchTerm.trim() || undefined,
        difficultyLevel: difficultyFilter !== 'ALL' ? difficultyFilter : undefined,
        criterionId: criterionFilter !== 'ALL' ? Number(criterionFilter) : undefined,
        active: activeParam,
        page,
        size: pageSize,
      });

      setQuestions(res.content || []);
      setTotalElements(res.totalElements || 0);
      setTotalPages(Math.max(1, res.totalPages || 1));
      setCurrentPage(page);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể kết nối đến máy chủ để tải ngân hàng câu hỏi.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, difficultyFilter, criterionFilter, statusFilter, pageSize]);

  useEffect(() => {
    loadCriteria();
  }, [loadCriteria]);

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
          <select
            className="qb-select"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            aria-label="Lọc theo độ khó"
          >
            <option value="ALL">Tất cả độ khó</option>
            <option value="EASY">Dễ (Easy)</option>
            <option value="MEDIUM">Trung bình (Medium)</option>
            <option value="HARD">Khó (Hard)</option>
          </select>

          <select
            className="qb-select"
            value={criterionFilter}
            onChange={(e) => setCriterionFilter(e.target.value)}
            aria-label="Lọc theo tiêu chí năng lực"
          >
            <option value="ALL">Tất cả tiêu chí năng lực</option>
            {criteria.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.criterionCode}] {c.criterionName}
              </option>
            ))}
          </select>

          <select
            className="qb-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang kích hoạt</option>
            <option value="INACTIVE">Tạm dừng</option>
          </select>
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
            <HelpCircle size={32} />
          </div>
          <h3>Không tìm thấy câu hỏi nào</h3>
          <p>
            {searchTerm || difficultyFilter !== 'ALL' || criterionFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Không có câu hỏi phỏng vấn nào phù hợp với bộ lọc hiện tại. Thử xóa bớt điều kiện lọc.'
              : 'Hiện chưa có câu hỏi nào trong ngân hàng. Hãy thêm mới câu hỏi để chuẩn hóa quy trình phỏng vấn!'}
          </p>
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Thêm câu hỏi ngay</span>
            </button>
          )}
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
        <div className="org-modal-overlay" onClick={() => setDeletingQuestion(null)} role="dialog">
          <div className="org-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="org-modal-header">
              <div className="org-modal-title-group">
                <div className="org-modal-icon-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3>Xác nhận vô hiệu hóa câu hỏi</h3>
                  <p className="org-modal-subtitle">Hành động này sẽ tạm dừng sử dụng câu hỏi trong các buổi phỏng vấn</p>
                </div>
              </div>
            </div>

            <div className="org-modal-body" style={{ padding: '16px 0' }}>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn vô hiệu hóa câu hỏi:
              </p>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 8,
                  fontStyle: 'italic',
                  fontSize: '0.875rem',
                }}
              >
                "{deletingQuestion.questionText}"
              </div>
            </div>

            <div className="org-modal-footer">
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
