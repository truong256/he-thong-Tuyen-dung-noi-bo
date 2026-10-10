import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle, Save } from 'lucide-react';
import { CommonCategory, CreateCategoryPayload } from '../../types/category';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCategoryPayload) => Promise<void>;
  editingCategory?: CommonCategory | null;
  existingTypes: { type: string; label: string }[];
  defaultType?: string;
}

const PREDEFINED_TYPES = [
  { type: 'EMPLOYMENT_TYPE', label: 'Hình thức làm việc (Full-time, Part-time, Intern...)' },
  { type: 'WORK_LOCATION', label: 'Địa điểm làm việc (Hà Nội, TP.HCM, Remote, Hybrid...)' },
  { type: 'EDUCATION_LEVEL', label: 'Trình độ học vấn (Đại học, Cao đẳng, Thạc sĩ...)' },
  { type: 'CANDIDATE_SOURCE', label: 'Nguồn ứng viên (Website, LinkedIn, TopCV, Referral...)' },
  { type: 'REJECTION_REASON', label: 'Lý do loại hồ sơ (Kỹ năng, Kinh nghiệm, Mức lương...)' },
  { type: 'INTERVIEW_TYPE', label: 'Hình thức phỏng vấn (Trực tiếp, Online, Bài test...)' },
  { type: 'SKILL_TAG', label: 'Kỹ năng & Chuyên môn (Java, React, Python, QA, BA...)' },
  { type: 'CUSTOM', label: '+ Tạo nhóm phân loại mới...' },
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingCategory,
  existingTypes,
  defaultType,
}) => {
  const [selectedType, setSelectedType] = useState<string>('EMPLOYMENT_TYPE');
  const [customType, setCustomType] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [active, setActive] = useState<boolean>(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingCategory) {
      const isKnown = PREDEFINED_TYPES.some((p) => p.type === editingCategory.type) ||
        existingTypes.some((t) => t.type === editingCategory.type);
      if (isKnown) {
        setSelectedType(editingCategory.type);
        setCustomType('');
      } else {
        setSelectedType('CUSTOM');
        setCustomType(editingCategory.type);
      }
      setCode(editingCategory.code);
      setName(editingCategory.name);
      setSortOrder(editingCategory.sortOrder);
      setActive(editingCategory.active);
    } else {
      const initType = defaultType && defaultType !== 'ALL' ? defaultType : 'EMPLOYMENT_TYPE';
      setSelectedType(initType);
      setCustomType('');
      setCode('');
      setName('');
      setSortOrder(0);
      setActive(true);
    }
    setErrors({});
  }, [editingCategory, defaultType, existingTypes, isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    const resolvedType = selectedType === 'CUSTOM' ? customType.trim().toUpperCase() : selectedType;
    if (!resolvedType) {
      newErrors.type = 'Vui lòng chọn hoặc nhập nhóm loại danh mục';
    }

    if (!code.trim()) {
      newErrors.code = 'Mã danh mục không được để trống';
    } else if (code.trim().length > 100) {
      newErrors.code = 'Mã danh mục không được vượt quá 100 ký tự';
    }

    if (!name.trim()) {
      newErrors.name = 'Tên danh mục không được để trống';
    } else if (name.trim().length > 150) {
      newErrors.name = 'Tên danh mục không được vượt quá 150 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const resolvedType = selectedType === 'CUSTOM' ? customType.trim().toUpperCase() : selectedType;

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: resolvedType,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        sortOrder: Number(sortOrder) || 0,
        active,
      });
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu danh mục';
      setErrors((prev) => ({ ...prev, api: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="cat-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
    >
      <div className="cat-modal-card">
        <div className="cat-modal-header">
          <h2 id="category-modal-title" className="cat-modal-title">
            <Layers size={20} className="text-blue-600" />
            <span>{editingCategory ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục Mới'}</span>
          </h2>
          <button
            type="button"
            className="cat-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cat-modal-form">
          <div className="cat-modal-body">
            {errors.api && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle size={18} className="shrink-0 text-red-600" />
                <span>{errors.api}</span>
              </div>
            )}

            {/* Type selection */}
            <div className="cat-form-group">
              <label htmlFor="cat-type-select" className="cat-form-label">
                Nhóm Phân loại <span className="required">*</span>
              </label>
              <select
                id="cat-type-select"
                className="cat-form-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                disabled={Boolean(editingCategory)}
              >
                {PREDEFINED_TYPES.map((pt) => (
                  <option key={pt.type} value={pt.type}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedType === 'CUSTOM' && (
              <div className="cat-form-group">
                <label htmlFor="cat-custom-type" className="cat-form-label">
                  Mã Nhóm mới (Viết hoa, không dấu, VD: LANGUAGE_LEVEL) <span className="required">*</span>
                </label>
                <input
                  id="cat-custom-type"
                  type="text"
                  className="cat-form-input font-mono uppercase"
                  placeholder="VD: CERTIFICATE_TYPE"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value.toUpperCase())}
                  disabled={Boolean(editingCategory)}
                />
                {errors.type && <span className="cat-form-error">{errors.type}</span>}
              </div>
            )}

            {/* Code */}
            <div className="cat-form-group">
              <label htmlFor="cat-code-input" className="cat-form-label">
                Mã Danh mục <span className="required">*</span>
              </label>
              <input
                id="cat-code-input"
                type="text"
                className="cat-form-input font-mono uppercase"
                placeholder="VD: FULL_TIME, HN_HQ, BACHELOR..."
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <span className="cat-form-hint">Mã định danh duy nhất trong nhóm phân loại (viết hoa tự động).</span>
              {errors.code && <span className="cat-form-error">{errors.code}</span>}
            </div>

            {/* Name */}
            <div className="cat-form-group">
              <label htmlFor="cat-name-input" className="cat-form-label">
                Tên Hiển thị <span className="required">*</span>
              </label>
              <input
                id="cat-name-input"
                type="text"
                className="cat-form-input"
                placeholder="VD: Toàn thời gian, Hà Nội - Trụ sở chính..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && <span className="cat-form-error">{errors.name}</span>}
            </div>

            {/* Sort order & Active status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="cat-form-group">
                <label htmlFor="cat-sort-input" className="cat-form-label">
                  Thứ tự Sắp xếp
                </label>
                <input
                  id="cat-sort-input"
                  type="number"
                  min="0"
                  className="cat-form-input"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                />
                <span className="cat-form-hint">Số nhỏ hiển thị trước.</span>
              </div>

              <div className="cat-form-group">
                <label className="cat-form-label">Trạng thái Hoạt động</label>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    onClick={() => setActive(!active)}
                    className={`cat-status-switch ${active ? 'active' : ''}`}
                    title={active ? 'Nhấn để chuyển sang Tạm ngưng' : 'Nhấn để chuyển sang Hoạt động'}
                  >
                    <span className="cat-status-switch-knob" />
                  </button>
                  <span
                    className={`text-sm cursor-pointer select-none transition-colors ${
                      active ? 'text-emerald-700 font-semibold' : 'text-slate-600 font-medium'
                    }`}
                    onClick={() => setActive(!active)}
                  >
                    {active ? 'Đang hoạt động' : 'Tạm ngưng'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="cat-modal-footer">
            <button
              type="button"
              className="cat-btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="cat-btn-primary"
              disabled={isSubmitting}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Đang lưu...' : editingCategory ? 'Cập nhật' : 'Tạo mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
