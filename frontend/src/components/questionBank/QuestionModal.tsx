import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save } from 'lucide-react';
import {
  InterviewQuestion,
  CompetencyCriterion,
  CreateQuestionPayload,
  UpdateQuestionPayload,
} from '../../types/questionBank';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateQuestionPayload | UpdateQuestionPayload) => Promise<void>;
  question: InterviewQuestion | null;
  criteria: CompetencyCriterion[];
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  question,
  criteria,
}) => {
  const isEditing = Boolean(question);

  const [questionText, setQuestionText] = useState('');
  const [category, setCategory] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState<string>('MEDIUM');
  const [suggestedAnswer, setSuggestedAnswer] = useState('');
  const [competencyCriterionId, setCompetencyCriterionId] = useState<number | ''>('');
  const [active, setActive] = useState(true);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state on question / open change
  useEffect(() => {
    if (question) {
      setQuestionText(question.questionText || '');
      setCategory(question.category || '');
      setDifficultyLevel(question.difficultyLevel || 'MEDIUM');
      setSuggestedAnswer(question.suggestedAnswer || '');
      setCompetencyCriterionId(question.competencyCriterionId || '');
      setActive(question.active !== false);
    } else {
      setQuestionText('');
      setCategory('');
      setDifficultyLevel('MEDIUM');
      setSuggestedAnswer('');
      setCompetencyCriterionId(criteria.length > 0 ? criteria[0].id : '');
      setActive(true);
    }
    setValidationError(null);
  }, [question, criteria, isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedText = questionText.trim();
    if (!trimmedText) {
      setValidationError('Vui lòng nhập nội dung câu hỏi.');
      return;
    }

    if (!competencyCriterionId) {
      setValidationError('Vui lòng chọn tiêu chí năng lực liên kết.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await onSave({
          questionText: trimmedText,
          category: category.trim() || undefined,
          difficultyLevel,
          suggestedAnswer: suggestedAnswer.trim() || undefined,
          competencyCriterionId: Number(competencyCriterionId),
          active,
        });
      } else {
        await onSave({
          questionText: trimmedText,
          category: category.trim() || undefined,
          difficultyLevel,
          suggestedAnswer: suggestedAnswer.trim() || undefined,
          competencyCriterionId: Number(competencyCriterionId),
        });
      }
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Lỗi khi lưu câu hỏi phỏng vấn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="qb-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qb-modal-title"
    >
      <div className="qb-modal-card">
        {/* Modal Header */}
        <div className="qb-modal-header">
          <div className="qb-modal-title-group">
            <h3 id="qb-modal-title" className="qb-modal-title">
              {isEditing ? 'Chỉnh sửa Câu hỏi Phỏng vấn' : 'Thêm mới Câu hỏi Phỏng vấn'}
            </h3>
            <p className="qb-modal-subtitle">
              {isEditing
                ? 'Cập nhật nội dung câu hỏi và tiêu chí đánh giá'
                : 'Tạo mới câu hỏi và gán vào khung năng lực tiêu chuẩn'}
            </p>
          </div>
          <button
            type="button"
            className="qb-modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="qb-modal-body">
          {validationError && (
            <div className="qb-form-error-banner" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{validationError}</span>
            </div>
          )}

          {/* 1. Nội dung câu hỏi */}
          <div className="qb-form-group">
            <label className="qb-form-label" htmlFor="qb-questionText">
              Nội dung câu hỏi <span className="qb-form-required">*</span>
            </label>
            <textarea
              id="qb-questionText"
              className="qb-form-control-textarea"
              rows={3}
              style={{ minHeight: 110 }}
              placeholder="Nhập nội dung chi tiết của câu hỏi phỏng vấn..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              autoFocus
            />
          </div>

          {/* 2. Tiêu chí năng lực liên kết */}
          <div className="qb-form-group">
            <label className="qb-form-label" htmlFor="qb-criterion">
              Tiêu chí năng lực liên kết <span className="qb-form-required">*</span>
            </label>
            <select
              id="qb-criterion"
              className="qb-form-control-select"
              value={competencyCriterionId}
              onChange={(e) => setCompetencyCriterionId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">-- Chọn tiêu chí năng lực --</option>
              {criteria.length === 0 ? (
                <option value="" disabled>
                  Chưa có tiêu chí năng lực.
                </option>
              ) : (
                criteria.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.criterionCode}] {c.criterionName} {c.jobTitle ? `(${c.jobTitle})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 3. Độ khó câu hỏi */}
          <div className="qb-form-group">
            <label className="qb-form-label" htmlFor="qb-difficulty">
              Độ khó câu hỏi <span className="qb-form-required">*</span>
            </label>
            <select
              id="qb-difficulty"
              className="qb-form-control-select"
              value={difficultyLevel}
              onChange={(e) => setDifficultyLevel(e.target.value)}
            >
              <option value="EASY">Dễ (EASY)</option>
              <option value="MEDIUM">Trung bình (MEDIUM)</option>
              <option value="HARD">Khó / Chuyên sâu (HARD)</option>
            </select>
          </div>

          {/* 4. Chuyên mục / Chủ đề kỹ năng */}
          <div className="qb-form-group">
            <label className="qb-form-label" htmlFor="qb-category">
              Chuyên mục / Chủ đề kỹ năng
            </label>
            <input
              id="qb-category"
              type="text"
              className="qb-form-control-input"
              placeholder="VD: Java Core, React, SQL, Spring Boot..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          {/* 5. Trạng thái hoạt động (khi chỉnh sửa) */}
          {isEditing && (
            <div className="qb-form-group">
              <label className="qb-form-label" htmlFor="qb-active">
                Trạng thái hoạt động
              </label>
              <select
                id="qb-active"
                className="qb-form-control-select"
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
              >
                <option value="true">Đang kích hoạt (Active)</option>
                <option value="false">Tạm dừng (Inactive)</option>
              </select>
            </div>
          )}

          {/* 6. Gợi ý câu trả lời & Tiêu chí chấm điểm */}
          <div className="qb-form-group">
            <label className="qb-form-label" htmlFor="qb-suggestedAnswer">
              Gợi ý câu trả lời & Tiêu chí chấm điểm
            </label>
            <p className="qb-form-helper">
              Mô tả các ý chính người phỏng vấn cần lắng nghe để đánh giá ứng viên.
            </p>
            <textarea
              id="qb-suggestedAnswer"
              className="qb-form-control-textarea"
              rows={4}
              style={{ minHeight: 130 }}
              placeholder="Mô tả đáp án gợi ý, các ý chính cần có và tiêu chí đánh giá..."
              value={suggestedAnswer}
              onChange={(e) => setSuggestedAnswer(e.target.value)}
            />
          </div>

          {/* Modal Footer */}
          <div className="qb-modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              <Save size={16} />
              <span>
                {isSubmitting
                  ? 'Đang lưu...'
                  : isEditing
                  ? 'Cập nhật câu hỏi'
                  : 'Lưu câu hỏi mới'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionModal;
