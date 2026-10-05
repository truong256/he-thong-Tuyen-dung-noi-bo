import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle, Save } from 'lucide-react';
import { Department } from '../../types/organization';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deptData: Omit<Department, 'id' | 'createdAt'> | Partial<Department>) => Promise<void>;
  department: Department | null;
  parentDepartmentId?: number | null;
  allDepartments: Department[];
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  department,
  parentDepartmentId,
  allDepartments,
}) => {
  const isEditing = Boolean(department);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (department) {
      setName(department.name || '');
      setCode(department.code || '');
      setParentId(department.parentDepartmentId || null);
      setManagerName(department.managerName || '');
      setManagerEmail(department.managerEmail || '');
      setEmployeeCount(department.employeeCount || 0);
      setDescription(department.description || '');
      setActive(department.active !== undefined ? department.active : true);
    } else {
      setName('');
      setCode('');
      setParentId(parentDepartmentId ?? null);
      setManagerName('');
      setManagerEmail('');
      setEmployeeCount(0);
      setDescription('');
      setActive(true);
    }
    setValidationError(null);
  }, [department, parentDepartmentId, isOpen]);

  if (!isOpen) return null;

  // Filter out self and its children to prevent circular reference
  const availableParents = allDepartments.filter((d) => {
    if (!department) return true;
    if (d.id === department.id) return false;
    if (d.parentDepartmentId === department.id) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName) {
      setValidationError('Vui lòng nhập tên phòng ban / đơn vị.');
      return;
    }

    if (!trimmedCode) {
      setValidationError('Vui lòng nhập mã định danh phòng ban.');
      return;
    }

    // Check duplicate code
    const isDuplicateCode = allDepartments.some(
      (d) => d.code.toUpperCase() === trimmedCode && (!department || d.id !== department.id)
    );
    if (isDuplicateCode) {
      setValidationError(`Mã phòng ban "${trimmedCode}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: trimmedName,
        code: trimmedCode,
        parentDepartmentId: parentId,
        managerName: managerName.trim() || undefined,
        managerEmail: managerEmail.trim() || undefined,
        employeeCount: Number(employeeCount) || 0,
        description: description.trim() || undefined,
        active,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Có lỗi xảy ra khi lưu phòng ban. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dept-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-md" data-testid="department-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Building2 size={20} className="modal-title-icon" />
            <h3 id="dept-modal-title">
              {isEditing ? 'Chỉnh sửa Phòng ban / Đơn vị' : 'Thêm mới Phòng ban / Đơn vị'}
            </h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {validationError && (
              <div className="modal-alert-error" role="alert">
                <AlertCircle size={16} />
                <span>{validationError}</span>
              </div>
            )}

            <div className="form-grid-2">
              {/* Tên phòng ban */}
              <div className="form-group span-2">
                <label htmlFor="dept-name">
                  Tên phòng ban / Đơn vị <span className="text-danger">*</span>
                </label>
                <input
                  id="dept-name"
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Phòng Phát triển Phần mềm Backend"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Mã phòng ban */}
              <div className="form-group">
                <label htmlFor="dept-code">
                  Mã phòng ban <span className="text-danger">*</span>
                </label>
                <input
                  id="dept-code"
                  type="text"
                  className="form-control text-uppercase"
                  placeholder="Ví dụ: DEV-BE"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                />
                <span className="field-hint">Mã viết tắt dạng chữ hoa (TECH, HR, QA...)</span>
              </div>

              {/* Phòng ban cấp trên */}
              <div className="form-group">
                <label htmlFor="dept-parent">Đơn vị trực thuộc cấp trên</label>
                <select
                  id="dept-parent"
                  className="form-control"
                  value={parentId === null ? '' : parentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setParentId(val === '' ? null : Number(val));
                  }}
                >
                  <option value="">-- Cấp cao nhất (Trực thuộc Ban Điều Hành) --</option>
                  {availableParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Trưởng đơn vị */}
              <div className="form-group">
                <label htmlFor="dept-manager">Trưởng đơn vị / Phụ trách</label>
                <input
                  id="dept-manager"
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Vũ Minh Đức (Lead BE)"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                />
              </div>

              {/* Email trưởng đơn vị */}
              <div className="form-group">
                <label htmlFor="dept-manager-email">Email công vụ</label>
                <input
                  id="dept-manager-email"
                  type="email"
                  className="form-control"
                  placeholder="duc.vm@ats-corp.vn"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                />
              </div>

              {/* Số lượng nhân sự */}
              <div className="form-group">
                <label htmlFor="dept-employees">Số nhân sự hiện tại</label>
                <input
                  id="dept-employees"
                  type="number"
                  min="0"
                  className="form-control"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>

              {/* Trạng thái hoạt động */}
              <div className="form-group toggle-group">
                <label className="toggle-label" htmlFor="dept-active">
                  <span>Trạng thái hoạt động</span>
                  <div className="toggle-switch-wrapper">
                    <input
                      id="dept-active"
                      type="checkbox"
                      className="toggle-checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </div>
                </label>
                <span className="field-hint">
                  {active ? 'Phòng ban đang hoạt động bình thường' : 'Phòng ban đang tạm ngưng'}
                </span>
              </div>

              {/* Mô tả chức năng nhiệm vụ */}
              <div className="form-group span-2">
                <label htmlFor="dept-desc">Chức năng & Nhiệm vụ</label>
                <textarea
                  id="dept-desc"
                  rows={3}
                  className="form-control"
                  placeholder="Mô tả tóm tắt mục tiêu, trách nhiệm chính của phòng ban..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
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
              <span>{isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentModal;
