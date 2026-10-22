import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import { CompetencyFramework } from '../../types/competencyFramework';

interface DeleteCompetencyFrameworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
  framework: CompetencyFramework | null;
}

export const DeleteCompetencyFrameworkModal: React.FC<DeleteCompetencyFrameworkModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  framework,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !framework) return null;

  const inUse = Boolean(framework.jobTitles && framework.jobTitles.length > 0);

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirm(framework.id);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể xóa khung năng lực.';
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="cf-modal-overlay" role="dialog" aria-modal="true">
      <div className="cf-modal-card" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div className="cf-modal-header">
          <h2 style={{ color: '#dc2626' }}>
            <AlertTriangle size={20} />
            Xác nhận xóa Khung Năng lực
          </h2>
          <button
            type="button"
            className="cf-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="cf-modal-body">
          {errorMessage && (
            <div className="cf-alert error" role="alert">
              <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
              {errorMessage}
            </div>
          )}

          {inUse ? (
            <div className="cf-alert error" style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
              <strong>Không thể xóa khung năng lực này!</strong>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', lineHeight: 1.5 }}>
                Khung năng lực <strong>"{framework.competencyName}"</strong> hiện đang được gắn cho{' '}
                <strong>{framework.jobTitles.length} chức danh công việc</strong>:{' '}
                {framework.jobTitles.map((j) => j.title).join(', ')}.
                <br />
                Vui lòng gỡ liên kết khung năng lực khỏi các chức danh trước khi thực hiện xóa.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', color: '#334155', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa khung năng lực{' '}
                <strong>"{framework.competencyName}"</strong>?
              </p>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Hành động này sẽ xóa vĩnh viễn khung năng lực cùng toàn bộ{' '}
                <strong>{framework.criteria?.length || 0} tiêu chí</strong> liên quan nếu không có câu hỏi tham chiếu.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cf-modal-footer">
          <button
            type="button"
            className="cf-btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Hủy bỏ
          </button>
          {!inUse && (
            <button
              type="button"
              className="cf-btn-danger"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 size={16} />
              {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteCompetencyFrameworkModal;
