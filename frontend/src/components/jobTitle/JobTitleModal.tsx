import React, { useState, useEffect } from 'react';
import { X, Award, AlertCircle, Save, Plus, Trash2 } from 'lucide-react';
import { JobTitle, JobTitleLevel, JobFamily, LEVEL_METADATA, JOB_FAMILY_METADATA } from '../../types/jobTitle';
import { Department } from '../../types/organization';

interface JobTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<JobTitle, 'id' | 'createdAt'> | Partial<JobTitle>) => Promise<void>;
  jobTitle: JobTitle | null;
  departments: Department[];
}

export const JobTitleModal: React.FC<JobTitleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  jobTitle,
  departments,
}) => {
  const isEditing = Boolean(jobTitle);

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState<number>(departments[0]?.id || 1);
  const [level, setLevel] = useState<JobTitleLevel>('MIDDLE');
  const [jobFamily, setJobFamily] = useState<JobFamily>('TECH');
  const [minSalary, setMinSalary] = useState<number | ''>('');
  const [maxSalary, setMaxSalary] = useState<number | ''>('');
  const [salaryRangeDisplay, setSalaryRangeDisplay] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [standardHeadcount, setStandardHeadcount] = useState<number | ''>('');
  const [currentHeadcount, setCurrentHeadcount] = useState<number>(0);
  const [openRequisitions, setOpenRequisitions] = useState<number>(0);
  const [active, setActive] = useState(true);

  // Dynamic lists for responsibilities & competencies
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [newRespInput, setNewRespInput] = useState('');
  const [competencies, setCompetencies] = useState<string[]>([]);
  const [newCompInput, setNewCompInput] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newReqInput, setNewReqInput] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (jobTitle) {
      setTitle(jobTitle.title || '');
      setCode(jobTitle.code || '');
      setDepartmentId(jobTitle.departmentId || departments[0]?.id || 1);
      setLevel(jobTitle.level || 'MIDDLE');
      setJobFamily(jobTitle.jobFamily || 'TECH');
      setMinSalary(jobTitle.minSalary !== undefined ? jobTitle.minSalary : '');
      setMaxSalary(jobTitle.maxSalary !== undefined ? jobTitle.maxSalary : '');
      setSalaryRangeDisplay(jobTitle.salaryRangeDisplay || '');
      setJobDescription(jobTitle.jobDescription || '');
      setStandardHeadcount(jobTitle.standardHeadcount !== undefined ? jobTitle.standardHeadcount : '');
      setCurrentHeadcount(jobTitle.currentHeadcount || 0);
      setOpenRequisitions(jobTitle.openRequisitions || 0);
      setActive(jobTitle.active !== undefined ? jobTitle.active : true);
      setResponsibilities(jobTitle.keyResponsibilities ? [...jobTitle.keyResponsibilities] : []);
      setCompetencies(jobTitle.competencies ? [...jobTitle.competencies] : []);
      setRequirements(jobTitle.requirements ? [...jobTitle.requirements] : []);
    } else {
      setTitle('');
      setCode('');
      setDepartmentId(departments[0]?.id || 1);
      setLevel('MIDDLE');
      setJobFamily('TECH');
      setMinSalary('');
      setMaxSalary('');
      setSalaryRangeDisplay('');
      setJobDescription('');
      setStandardHeadcount(5);
      setCurrentHeadcount(0);
      setOpenRequisitions(0);
      setActive(true);
      setResponsibilities([
        'Thực hiện các nhiệm vụ chuyên môn theo kế hoạch định kỳ',
        'Báo cáo tiến độ và phối hợp liên phòng ban để giải quyết công việc',
      ]);
      setCompetencies(['Giao tiếp hiệu quả', 'Kỹ năng chuyên môn']);
      setRequirements([
        'Tốt nghiệp Cao đẳng/Đại học chuyên ngành liên quan',
        'Có tinh thần trách nhiệm và tinh thần học hỏi cao',
      ]);
    }
    setValidationError(null);
    setNewRespInput('');
    setNewCompInput('');
    setNewReqInput('');
  }, [jobTitle, departments, isOpen]);

  if (!isOpen) return null;

  // Add items handlers
  const handleAddResponsibility = () => {
    const trimmed = newRespInput.trim();
    if (trimmed && !responsibilities.includes(trimmed)) {
      setResponsibilities([...responsibilities, trimmed]);
      setNewRespInput('');
    }
  };

  const handleRemoveResponsibility = (idx: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== idx));
  };

  const handleAddCompetency = () => {
    const trimmed = newCompInput.trim();
    if (trimmed && !competencies.includes(trimmed)) {
      setCompetencies([...competencies, trimmed]);
      setNewCompInput('');
    }
  };

  const handleRemoveCompetency = (idx: number) => {
    setCompetencies(competencies.filter((_, i) => i !== idx));
  };

  const handleAddRequirement = () => {
    const trimmed = newReqInput.trim();
    if (trimmed && !requirements.includes(trimmed)) {
      setRequirements([...requirements, trimmed]);
      setNewReqInput('');
    }
  };

  const handleRemoveRequirement = (idx: number) => {
    setRequirements(requirements.filter((_, i) => i !== idx));
  };

  // Auto-generate salary display if min/max set
  const handleMinSalaryChange = (val: number | '') => {
    setMinSalary(val);
    updateSalaryDisplay(val, maxSalary);
  };

  const handleMaxSalaryChange = (val: number | '') => {
    setMaxSalary(val);
    updateSalaryDisplay(minSalary, val);
  };

  const updateSalaryDisplay = (min: number | '', max: number | '') => {
    if (min && max) {
      const minMil = (Number(min) / 1000000).toLocaleString('vi-VN');
      const maxMil = (Number(max) / 1000000).toLocaleString('vi-VN');
      setSalaryRangeDisplay(`${minMil} - ${maxMil} triệu VNĐ`);
    } else if (min) {
      const minMil = (Number(min) / 1000000).toLocaleString('vi-VN');
      setSalaryRangeDisplay(`Từ ${minMil} triệu VNĐ`);
    } else if (max) {
      const maxMil = (Number(max) / 1000000).toLocaleString('vi-VN');
      setSalaryRangeDisplay(`Lên đến ${maxMil} triệu VNĐ`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedTitle = title.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedTitle) {
      setValidationError('Vui lòng nhập tên chức danh.');
      return;
    }

    if (!trimmedCode) {
      setValidationError('Vui lòng nhập mã chức danh (ví dụ: DEV-FE-MID, HR-REC-SR).');
      return;
    }

    if (minSalary !== '' && Number(minSalary) < 0) {
      setValidationError('Mức lương tối thiểu không được âm.');
      return;
    }

    if (maxSalary !== '' && Number(maxSalary) < 0) {
      setValidationError('Mức lương tối đa không được âm.');
      return;
    }

    if (minSalary !== '' && maxSalary !== '' && Number(minSalary) > Number(maxSalary)) {
      setValidationError('Mức lương tối thiểu không được lớn hơn mức lương tối đa.');
      return;
    }

    const selectedDept = departments.find((d) => d.id === Number(departmentId));

    setIsSubmitting(true);
    try {
      await onSave({
        title: trimmedTitle,
        code: trimmedCode,
        departmentId: Number(departmentId),
        departmentName: selectedDept?.name,
        level,
        jobFamily,
        minSalary: minSalary !== '' ? Number(minSalary) : undefined,
        maxSalary: maxSalary !== '' ? Number(maxSalary) : undefined,
        salaryRangeDisplay: salaryRangeDisplay.trim() || undefined,
        jobDescription: jobDescription.trim() || 'Chưa có mô tả chi tiết.',
        keyResponsibilities: responsibilities.length > 0 ? responsibilities : ['Thực hiện công việc theo phân công'],
        requirements: requirements.length > 0 ? requirements : ['Tốt nghiệp các ngành liên quan'],
        competencies: competencies.length > 0 ? competencies : undefined,
        standardHeadcount: standardHeadcount !== '' ? Number(standardHeadcount) : undefined,
        currentHeadcount: Number(currentHeadcount) || 0,
        openRequisitions: Number(openRequisitions) || 0,
        active,
      });
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đã có lỗi xảy ra khi lưu thông tin chức danh.';
      setValidationError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="jt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="jt-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="jt-modal-header">
          <div className="jt-modal-title-group">
            <div className="jt-modal-icon-badge">
              <Award size={22} />
            </div>
            <div>
              <h2>{isEditing ? 'Cập nhật Chức danh' : 'Thêm Chức danh Mới'}</h2>
              <p className="jt-modal-subtitle">
                {isEditing
                  ? `Chỉnh sửa thông số, dải lương và tiêu chuẩn năng lực cho mã ${jobTitle?.code}`
                  : 'Khai báo thông tin vị trí chức danh và định biên tiêu chuẩn'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="jt-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="jt-modal-form">
          {validationError && (
            <div className="jt-form-alert error" role="alert">
              <AlertCircle size={18} />
              <span>{validationError}</span>
            </div>
          )}

          <div className="jt-form-scrollable">
            {/* Section 1: Basic Information */}
            <div className="jt-form-section">
              <h3 className="jt-section-title">1. Thông tin Định danh & Tổ chức</h3>
              <div className="jt-form-grid-2">
                <div className="jt-form-group">
                  <label htmlFor="jt-title">
                    Tên chức danh <span className="req">*</span>
                  </label>
                  <input
                    id="jt-title"
                    type="text"
                    className="jt-input"
                    placeholder="Ví dụ: Kỹ sư Phần mềm Senior"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="jt-form-group">
                  <label htmlFor="jt-code">
                    Mã chức danh <span className="req">*</span>
                  </label>
                  <input
                    id="jt-code"
                    type="text"
                    className="jt-input code-input"
                    placeholder="Ví dụ: DEV-SR-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                  />
                  <span className="jt-hint">Mã viết in hoa, không trùng lặp toàn hệ thống</span>
                </div>
              </div>

              <div className="jt-form-grid-3">
                <div className="jt-form-group">
                  <label htmlFor="jt-dept">
                    Phòng ban trực thuộc <span className="req">*</span>
                  </label>
                  <select
                    id="jt-dept"
                    className="jt-select"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="jt-form-group">
                  <label htmlFor="jt-level">
                    Cấp bậc năng lực <span className="req">*</span>
                  </label>
                  <select
                    id="jt-level"
                    className="jt-select"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as JobTitleLevel)}
                  >
                    {Object.entries(LEVEL_METADATA).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="jt-form-group">
                  <label htmlFor="jt-family">
                    Khối nghề nghiệp <span className="req">*</span>
                  </label>
                  <select
                    id="jt-family"
                    className="jt-select"
                    value={jobFamily}
                    onChange={(e) => setJobFamily(e.target.value as JobFamily)}
                  >
                    {Object.entries(JOB_FAMILY_METADATA).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Compensation & Headcount */}
            <div className="jt-form-section">
              <h3 className="jt-section-title">2. Dải lương & Định biên Nhân sự</h3>
              <div className="jt-form-grid-3">
                <div className="jt-form-group">
                  <label htmlFor="jt-min-salary">Lương tối thiểu (VNĐ)</label>
                  <input
                    id="jt-min-salary"
                    type="number"
                    step="1000000"
                    min="0"
                    className="jt-input"
                    placeholder="Ví dụ: 25000000"
                    value={minSalary}
                    onChange={(e) =>
                      handleMinSalaryChange(e.target.value ? Number(e.target.value) : '')
                    }
                  />
                </div>

                <div className="jt-form-group">
                  <label htmlFor="jt-max-salary">Lương tối đa (VNĐ)</label>
                  <input
                    id="jt-max-salary"
                    type="number"
                    step="1000000"
                    min="0"
                    className="jt-input"
                    placeholder="Ví dụ: 40000000"
                    value={maxSalary}
                    onChange={(e) =>
                      handleMaxSalaryChange(e.target.value ? Number(e.target.value) : '')
                    }
                  />
                </div>

                <div className="jt-form-group">
                  <label htmlFor="jt-salary-display">Hiển thị dải lương</label>
                  <input
                    id="jt-salary-display"
                    type="text"
                    className="jt-input"
                    placeholder="Ví dụ: 25 - 40 triệu VNĐ"
                    value={salaryRangeDisplay}
                    onChange={(e) => setSalaryRangeDisplay(e.target.value)}
                  />
                </div>
              </div>

              <div className="jt-form-grid-3">
                <div className="jt-form-group">
                  <label htmlFor="jt-std-headcount">
                    Định biên tiêu chuẩn (Chỉ tiêu)
                  </label>
                  <input
                    id="jt-std-headcount"
                    type="number"
                    min="0"
                    className="jt-input"
                    placeholder="Ví dụ: 10"
                    value={standardHeadcount}
                    onChange={(e) =>
                      setStandardHeadcount(e.target.value ? Number(e.target.value) : '')
                    }
                  />
                </div>

                <div className="jt-form-group">
                  <label htmlFor="jt-curr-headcount">Số nhân sự hiện tại</label>
                  <input
                    id="jt-curr-headcount"
                    type="number"
                    min="0"
                    className="jt-input"
                    value={currentHeadcount}
                    onChange={(e) => setCurrentHeadcount(Number(e.target.value))}
                  />
                </div>

                <div className="jt-form-group">
                  <label htmlFor="jt-open-req">Vị trí đang tuyển (Requisitions)</label>
                  <input
                    id="jt-open-req"
                    type="number"
                    min="0"
                    className="jt-input"
                    value={openRequisitions}
                    onChange={(e) => setOpenRequisitions(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Job Description & Competencies */}
            <div className="jt-form-section">
              <h3 className="jt-section-title">3. Bản mô tả & Tiêu chuẩn Năng lực</h3>
              <div className="jt-form-group">
                <label htmlFor="jt-desc">Mô tả công việc tổng quát</label>
                <textarea
                  id="jt-desc"
                  rows={3}
                  className="jt-textarea"
                  placeholder="Mô tả mục tiêu, vai trò và phạm vi công việc của chức danh..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              {/* Responsibilities list */}
              <div className="jt-form-group">
                <label>Trách nhiệm chính (Key Responsibilities)</label>
                <div className="jt-tag-input-row">
                  <input
                    type="text"
                    className="jt-input"
                    placeholder="Nhập trách nhiệm và nhấn Thêm..."
                    value={newRespInput}
                    onChange={(e) => setNewRespInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddResponsibility();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="jt-btn-secondary"
                    onClick={handleAddResponsibility}
                  >
                    <Plus size={16} /> Thêm
                  </button>
                </div>
                <div className="jt-items-list">
                  {responsibilities.map((resp, idx) => (
                    <div key={idx} className="jt-item-row">
                      <span className="jt-item-bullet">•</span>
                      <span className="jt-item-text">{resp}</span>
                      <button
                        type="button"
                        className="jt-item-del-btn"
                        onClick={() => handleRemoveResponsibility(idx)}
                        aria-label="Xóa trách nhiệm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements list */}
              <div className="jt-form-group">
                <label>Yêu cầu chuyên môn & kinh nghiệm</label>
                <div className="jt-tag-input-row">
                  <input
                    type="text"
                    className="jt-input"
                    placeholder="Nhập yêu cầu kinh nghiệm, học vấn..."
                    value={newReqInput}
                    onChange={(e) => setNewReqInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRequirement();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="jt-btn-secondary"
                    onClick={handleAddRequirement}
                  >
                    <Plus size={16} /> Thêm
                  </button>
                </div>
                <div className="jt-items-list">
                  {requirements.map((req, idx) => (
                    <div key={idx} className="jt-item-row">
                      <span className="jt-item-bullet">•</span>
                      <span className="jt-item-text">{req}</span>
                      <button
                        type="button"
                        className="jt-item-del-btn"
                        onClick={() => handleRemoveRequirement(idx)}
                        aria-label="Xóa yêu cầu"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Competencies tags */}
              <div className="jt-form-group">
                <label>Khung năng lực cốt lõi (Competencies)</label>
                <div className="jt-tag-input-row">
                  <input
                    type="text"
                    className="jt-input"
                    placeholder="Ví dụ: Lập trình React, Lãnh đạo, Tư duy phản biện..."
                    value={newCompInput}
                    onChange={(e) => setNewCompInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCompetency();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="jt-btn-secondary"
                    onClick={handleAddCompetency}
                  >
                    <Plus size={16} /> Gán
                  </button>
                </div>
                <div className="jt-tags-wrap">
                  {competencies.map((comp, idx) => (
                    <span key={idx} className="jt-tag-badge">
                      {comp}
                      <button
                        type="button"
                        onClick={() => handleRemoveCompetency(idx)}
                        aria-label="Xóa năng lực"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 4: Status */}
            <div className="jt-form-section">
              <div className="jt-checkbox-row">
                <input
                  id="jt-active-cb"
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <label htmlFor="jt-active-cb">
                  <strong>Áp dụng chức danh này trong doanh nghiệp</strong>
                  <span className="jt-sub-label">
                    Khi tắt, chức danh sẽ chuyển sang trạng thái Tạm ngưng và không thể mở mới yêu cầu tuyển dụng.
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="jt-modal-footer">
            <button
              type="button"
              className="jt-btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="jt-btn-primary"
              disabled={isSubmitting}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo chức danh'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobTitleModal;
