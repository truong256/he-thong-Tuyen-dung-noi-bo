import React, { useEffect } from 'react';
import {
  X,
  Tag,
  Briefcase,
  MapPin,
  GraduationCap,
  Users2,
  AlertCircle,
  FileQuestion,
  Sparkles,
  Edit2,
  Trash2,
  Copy,
  Check,
  Calendar,
  Layers,
  Info,
} from 'lucide-react';
import { CommonCategory } from '../../types/category';

interface CategoryDetailModalProps {
  category: CommonCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (category: CommonCategory) => void;
  onDelete?: (category: CommonCategory) => void;
  canManage?: boolean;
}

export const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  category,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canManage = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !category) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(category.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeMeta = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EMPLOYMENT_TYPE':
        return {
          label: 'Hình thức làm việc',
          icon: <Briefcase size={16} />,
          badgeClass: 'cat-badge-employment',
          description: 'Quy định chế độ hợp đồng, giờ làm việc khi đăng tin tuyển dụng và tạo headcount.',
          scope: 'Tin tuyển dụng, Hợp đồng, Offer letter',
        };
      case 'WORK_LOCATION':
        return {
          label: 'Địa điểm làm việc',
          icon: <MapPin size={16} />,
          badgeClass: 'cat-badge-location',
          description: 'Xác định văn phòng, chi nhánh hoặc chế độ làm việc từ xa của vị trí tuyển dụng.',
          scope: 'Chi nhánh, Headcount, Tin tuyển dụng',
        };
      case 'EDUCATION_LEVEL':
        return {
          label: 'Trình độ học vấn',
          icon: <GraduationCap size={16} />,
          badgeClass: 'cat-badge-education',
          description: 'Tiêu chuẩn bằng cấp tối thiểu được sử dụng để lọc hồ sơ ứng viên tự động.',
          scope: 'Yêu cầu tuyển dụng, Hồ sơ ứng viên',
        };
      case 'CANDIDATE_SOURCE':
        return {
          label: 'Nguồn ứng viên',
          icon: <Users2 size={16} />,
          badgeClass: 'cat-badge-source',
          description: 'Kênh tiếp cận ứng viên, phục vụ báo cáo hiệu quả kênh và chi phí tuyển dụng (Cost-per-hire).',
          scope: 'Cổng tuyển dụng, Referral, Báo cáo Funnel',
        };
      case 'REJECTION_REASON':
        return {
          label: 'Lý do từ chối',
          icon: <AlertCircle size={16} />,
          badgeClass: 'cat-badge-rejection',
          description: 'Lý do loại hồ sơ ở các vòng lọc CV, phỏng vấn, phục vụ phân tích chất lượng nguồn ứng viên.',
          scope: 'Pipeline tuyển dụng, Đánh giá phỏng vấn',
        };
      case 'INTERVIEW_TYPE':
        return {
          label: 'Hình thức phỏng vấn',
          icon: <FileQuestion size={16} />,
          badgeClass: 'cat-badge-interview',
          description: 'Định dạng buổi phỏng vấn (Trực tiếp, Trực tuyến, Bài test) để chuẩn bị phòng họp và link.',
          scope: 'Lịch phỏng vấn, Thư mời phỏng vấn',
        };
      case 'SKILL_TAG':
        return {
          label: 'Kỹ năng & Chuyên môn',
          icon: <Sparkles size={16} />,
          badgeClass: 'cat-badge-skill',
          description: 'Thẻ kỹ năng chuẩn hóa để gắn vào mô tả công việc, câu hỏi phỏng vấn và đánh giá năng lực.',
          scope: 'Khung năng lực, Ngân hàng câu hỏi, CV matcher',
        };
      default:
        return {
          label: type,
          icon: <Tag size={16} />,
          badgeClass: 'cat-badge-default',
          description: 'Nhóm danh mục tùy chỉnh phục vụ mở rộng tính năng của doanh nghiệp.',
          scope: 'Master Data hệ thống',
        };
    }
  };

  const meta = getTypeMeta(category.type);

  return (
    <div
      className="cat-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-detail-title"
    >
      <div className="cat-modal-card cat-detail-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cat-detail-header">
          <div className="cat-detail-header-left">
            <span className={`cat-badge ${meta.badgeClass}`}>
              {meta.icon}
              <span>{meta.label}</span>
            </span>
            <span
              className={`cat-status-pill ${category.active ? 'active' : 'inactive'}`}
            >
              <span className="cat-status-dot" />
              <span>{category.active ? 'Đang kích hoạt' : 'Tạm ngưng'}</span>
            </span>
          </div>

          <button
            type="button"
            className="cat-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng chi tiết"
          >
            <X size={20} />
          </button>
        </div>

        {/* Title area */}
        <div className="cat-detail-title-area">
          <h2 id="category-detail-title" className="cat-detail-title">
            {category.name}
          </h2>

          <div className="cat-detail-code-row">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Mã hệ thống:
            </span>
            <div className="cat-detail-code-pill">
              <code>{category.code}</code>
              <button
                type="button"
                className="cat-copy-code-btn"
                onClick={handleCopyCode}
                title="Sao chép mã vào clipboard"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span className="text-xs">{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Body content */}
        <div className="cat-detail-body">
          <div className="cat-detail-grid">
            <div className="cat-detail-cell">
              <span className="cat-detail-cell-label">
                <Layers size={14} />
                <span>Thứ tự ưu tiên</span>
              </span>
              <span className="cat-detail-cell-value font-mono">
                #{category.sortOrder}
              </span>
            </div>

            <div className="cat-detail-cell">
              <span className="cat-detail-cell-label">
                <Calendar size={14} />
                <span>Mã số bản ghi ID</span>
              </span>
              <span className="cat-detail-cell-value font-mono text-slate-600">
                #{category.id}
              </span>
            </div>

            <div className="cat-detail-cell full-width">
              <span className="cat-detail-cell-label">
                <Info size={14} />
                <span>Phạm vi áp dụng trong quy trình</span>
              </span>
              <span className="cat-detail-cell-value text-blue-700 font-medium">
                {meta.scope}
              </span>
            </div>
          </div>

          {/* Business description */}
          <div className="cat-detail-desc-box">
            <div className="cat-detail-desc-title">
              <Info size={15} className="text-blue-600 shrink-0" />
              <span>Mục đích & Hướng dẫn sử dụng</span>
            </div>
            <p className="cat-detail-desc-text">{meta.description}</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="cat-detail-footer">
          <div className="cat-detail-footer-actions">
            {canManage && (
              <>
                <button
                  type="button"
                  className="cat-btn-secondary"
                  onClick={() => {
                    onClose();
                    onEdit?.(category);
                  }}
                >
                  <Edit2 size={16} />
                  <span>Chỉnh sửa thông tin</span>
                </button>

                <button
                  type="button"
                  className="cat-btn-danger-outline"
                  onClick={() => {
                    onClose();
                    onDelete?.(category);
                  }}
                >
                  <Trash2 size={16} />
                  <span>Xóa danh mục</span>
                </button>
              </>
            )}

            <button
              type="button"
              className="cat-btn-primary"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryDetailModal;
