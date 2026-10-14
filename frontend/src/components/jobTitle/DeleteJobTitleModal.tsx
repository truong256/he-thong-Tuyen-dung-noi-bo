import React, { useState } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { JobTitle } from '../../types/jobTitle';

interface DeleteJobTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
  jobTitle: JobTitle | null;
}

export const DeleteJobTitleModal: React.FC<DeleteJobTitleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jobTitle,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !jobTitle) return null;

  const hasEmployees = (jobTitle.currentHeadcount || 0) > 0;
  const hasOpenRequisitions = (jobTitle.openRequisitions || 0) > 0;
  const isBlocked = hasEmployees || hasOpenRequisitions;

  const handleDelete = async () => {
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await onConfirm(jobTitle.id);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể xóa chức danh này.';
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="jt-modal-backdrop" data-testid="delete-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="jt-modal-container jt-delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="jt-modal-header danger-header">
          <div className="jt-modal-title-group">
            <div className="jt-modal-icon-badge danger">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2>Xác nhận Xóa Chức danh</h2>
              <p className="jt-modal-subtitle">Thao tác này sẽ gỡ bỏ chức danh khỏi danh mục hệ thống</p>
            </div>
          </div>
          <button
            type="button"
            className="jt-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="jt-modal-body">
          {errorMessage && (
            <div className="jt-form-alert error" role="alert">
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="jt-delete-info-card">
            <div className="jt-delete-title-row">
              <span className="jt-code-pill">{jobTitle.code}</span>
              <h4>{jobTitle.title}</h4>
            </div>
            <p className="jt-delete-dept">
              Phòng ban: <strong>{jobTitle.departmentName || 'Chưa gán'}</strong>
            </p>
          </div>

          {isBlocked ? (
            <div className="jt-warning-blocked-box">
              <AlertTriangle size={20} className="icon-warning" />
              <div>
                <strong>Không thể xóa chức danh này vào lúc này:</strong>
                <ul>
                  {hasEmployees && (
                    <li>
                      Đang có <strong>{jobTitle.currentHeadcount} nhân sự</strong> được phân bổ chức danh này.
                    </li>
                  )}
                  {hasOpenRequisitions && (
                    <li>
                      Đang có <strong>{jobTitle.openRequisitions} yêu cầu tuyển dụng</strong> đang mở theo chức danh này.
                    </li>
                  )}
                </ul>
                <p className="hint">
                  Vui lòng điều chuyển nhân sự hoặc đóng các yêu cầu tuyển dụng trước khi tiến hành xóa chức danh.
                </p>
              </div>
            </div>
          ) : (
            <p className="jt-delete-warning-text">
              Bạn có chắc chắn muốn xóa vĩnh viễn chức danh <strong>"{jobTitle.title}"</strong> (Mã: {jobTitle.code})? Hành động này không thể hoàn tác sau khi thực hiện.
            </p>
          )}
        </div>

        <div className="jt-modal-footer">
          <button
            type="button"
            className="jt-btn-outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="jt-btn-danger"
            onClick={handleDelete}
            disabled={isDeleting || isBlocked}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? 'Đang xóa...' : 'Xác nhận Xóa vĩnh viễn'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteJobTitleModal;
