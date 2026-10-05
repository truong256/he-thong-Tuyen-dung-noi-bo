import React, { useState, useEffect } from 'react';
import { X, HelpCircle, AlertCircle, Save } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedText = questionText.trim();
    if (!trimmedText) {
      setValidationError('Vui lòng nhập nội dung câu hỏi phỏng vấn.');
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
    <div className="org-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="org-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="org-modal-header">
          <div className="org-modal-title-group">
            <div className="org-modal-icon-badge">
              <HelpCircle size={22} />
            </div>
            <div>
              <h3>{isEditing ? 'Chỉnh sửa Câu hỏi Phỏng vấn' : 'Thêm mới Câu hỏi Phỏng vấn'}</h3>
              <p className="org-modal-subtitle">
                {isEditing ? 'Cập nhật nội dung câu hỏi và tiêu chí đánh giá' : 'Tạo mới câu hỏi và gán vào khung năng lực tiêu chuẩn'}
              </p>
            </div>
          </div>
          <button type="button" className="org-modal-close-btn" onClick={onClose} aria-label="Đóng modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="org-modal-body">
          {validationError && (
            <div className="org-error-banner" style={{ marginBottom: 16 }}>
              <AlertCircle size={18} />
              <span>{validationError}</span>
            </div>
          )}

          <div className="org-form-group">
            <label className="org-label" htmlFor="qb-questionText">
              Nội dung câu hỏi <span className="org-required">*</span>
            </label>
            <textarea
              id="qb-questionText"
              className="org-textarea"
              rows={3}
              placeholder="Nhập nội dung chi tiết của câu hỏi phỏng vấn..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              required
            />
          </div>

          <div className="org-form-row">
            <div className="org-form-group">
              <label className="org-label" htmlFor="qb-criterion">
                Tiêu chí năng lực liên kết <span className="org-required">*</span>
              </label>
              <select
                id="qb-criterion"
                className="org-input"
                value={competencyCriterionId}
                onChange={(e) => setCompetencyCriterionId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">-- Chọn tiêu chí năng lực --</option>
                {criteria.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.criterionCode}] {c.criterionName} {c.jobTitle ? `(${c.jobTitle})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="org-form-group">
              <label className="org-label" htmlFor="qb-difficulty">
                Độ khó câu hỏi <span className="org-required">*</span>
              </label>
              <select
                id="qb-difficulty"
                className="org-input"
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value)}
                required
              >
                <option value="EASY">Dễ (EASY)</option>
                <option value="MEDIUM">Trung bình (MEDIUM)</option>
                <option value="HARD">Khó / Chuyên sâu (HARD)</option>
              </select>
            </div>
          </div>

          <div className="org-form-row">
            <div className="org-form-group">
              <label className="org-label" htmlFor="qb-category">
                Chuyên mục / Chủ đề kỹ năng
              </label>
              <input
                id="qb-category"
                type="text"
                className="org-input"
                placeholder="VD: Java Core, React, SQL, Phỏng vấn STAR..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            {isEditing && (
              <div className="org-form-group">
                <label className="org-label" htmlFor="qb-active">
                  Trạng thái hoạt động
                </label>
                <select
                  id="qb-active"
                  className="org-input"
                  value={active ? 'true' : 'false'}
                  onChange={(e) => setActive(e.target.value === 'true')}
                >
                  <option value="true">Đang kích hoạt (Active)</option>
                  <option value="false">Tạm dừng (Inactive)</option>
                </select>
              </div>
            )}
          </div>

          <div className="org-form-group">
            <label className="org-label" htmlFor="qb-suggestedAnswer">
              Gợi ý câu trả lời & Tiêu chí chấm điểm (Suggested Answer / Rubric)
            </label>
            <textarea
              id="qb-suggestedAnswer"
              className="org-textarea"
              rows={4}
              placeholder="Mô tả các ý chính người phỏng vấn cần lắng nghe để đánh giá điểm số của ứng viên..."
              value={suggestedAnswer}
              onChange={(e) => setSuggestedAnswer(e.target.value)}
            />
          </div>

          <div className="org-modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Save size={16} />
              <span>{isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật câu hỏi' : 'Lưu câu hỏi mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionModal;
