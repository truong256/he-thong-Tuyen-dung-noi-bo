import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Sparkles } from 'lucide-react';
import { JobPosting, JobPostingRequest } from '../../types/jobPosting';
import jobPostingApi from '../../api/jobPosting';
import { requisitionApi } from '../../api/requisition';
import { Requisition } from '../../types/requisition';
import { Department } from '../../types/organization';
import { JobTitle } from '../../types/jobTitle';
import organizationApi from '../../api/organization';
import jobTitleApi from '../../api/jobTitle';

interface JobPostingFormModalProps {
  isOpen: boolean;
  editingPosting?: JobPosting | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const JobPostingFormModal: React.FC<JobPostingFormModalProps> = ({
  isOpen,
  editingPosting,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [requisitionId, setRequisitionId] = useState<number | undefined>(undefined);
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [jobTitleId, setJobTitleId] = useState<number | undefined>(undefined);
  const [workLocation, setWorkLocation] = useState('Hà Nội');
  const [workingModel, setWorkingModel] = useState('ONSITE');
  const [quantity, setQuantity] = useState(1);
  const [salaryMin, setSalaryMin] = useState<number | undefined>(undefined);
  const [salaryMax, setSalaryMax] = useState<number | undefined>(undefined);
  const [salaryVisible, setSalaryVisible] = useState(true);
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [benefits, setBenefits] = useState('');

  // Dropdown lists
  const [approvedRequisitions, setApprovedRequisitions] = useState<Requisition[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDropdowns();
      if (editingPosting) {
        // Edit mode
        setTitle(editingPosting.title);
        setRequisitionId(editingPosting.requisitionId);
        setDepartmentId(editingPosting.departmentId);
        setJobTitleId(editingPosting.jobTitleId);
        setWorkLocation(editingPosting.workLocation || 'Hà Nội');
        setWorkingModel(editingPosting.workingModel || 'ONSITE');
        setQuantity(editingPosting.quantity || 1);
        setSalaryMin(editingPosting.salaryMin);
        setSalaryMax(editingPosting.salaryMax);
        setSalaryVisible(editingPosting.salaryVisible);
        setApplicationDeadline(editingPosting.applicationDeadline || '');
        setJobDescription(editingPosting.jobDescription || '');
        setRequirements(editingPosting.requirements || '');
        setBenefits(editingPosting.benefits || '');
      } else {
        // Reset form
        setTitle('');
        setRequisitionId(undefined);
        setDepartmentId(undefined);
        setJobTitleId(undefined);
        setWorkLocation('Hà Nội');
        setWorkingModel('ONSITE');
        setQuantity(1);
        setSalaryMin(undefined);
        setSalaryMax(undefined);
        setSalaryVisible(true);
        setApplicationDeadline('');
        setJobDescription('');
        setRequirements('');
        setBenefits('');
      }
      setError(null);
    }
  }, [isOpen, editingPosting]);

  const loadDropdowns = async () => {
    setLoading(true);
    try {
      const [reqsRes, deptsRes, titlesRes] = await Promise.allSettled([
        requisitionApi.list({ status: 'APPROVED', size: 100 }),
        organizationApi.getDepartments(),
        jobTitleApi.getJobTitles(),
      ]);

      if (reqsRes.status === 'fulfilled' && reqsRes.value) {
        setApprovedRequisitions(reqsRes.value.content || []);
      }
      if (deptsRes.status === 'fulfilled' && deptsRes.value) {
        setDepartments(Array.isArray(deptsRes.value) ? deptsRes.value : []);
      }
      if (titlesRes.status === 'fulfilled' && titlesRes.value) {
        setJobTitles(Array.isArray(titlesRes.value) ? titlesRes.value : []);
      }
    } catch {
      // Ignore background dropdown fetch errors
    } finally {
      setLoading(false);
    }
  };

  const handleInheritFromRequisition = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setRequisitionId(undefined);
      return;
    }
    const rId = Number(val);
    setRequisitionId(rId);

    const selected = approvedRequisitions.find((r) => r.id === rId);
    if (selected) {
      const anySelected = selected as any;
      if (!title) setTitle(`Tuyển dụng ${selected.title}`);
      if (selected.departmentId) setDepartmentId(selected.departmentId);
      if (selected.jobTitleId) setJobTitleId(selected.jobTitleId);
      if (anySelected.workLocation) setWorkLocation(anySelected.workLocation);
      if (anySelected.workingModel) setWorkingModel(anySelected.workingModel);
      if (selected.quantity) setQuantity(selected.quantity);
      if (selected.proposedMinSalary) setSalaryMin(selected.proposedMinSalary);
      if (selected.proposedMaxSalary) setSalaryMax(selected.proposedMaxSalary);
      if (selected.targetDate) setApplicationDeadline(selected.targetDate);
      if (selected.jobDescription) setJobDescription(selected.jobDescription);
      if (selected.requirements) setRequirements(selected.requirements);
      if (anySelected.benefits) setBenefits(anySelected.benefits);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề tin tuyển dụng.');
      return;
    }
    if (salaryMin !== undefined && salaryMax !== undefined && salaryMin > salaryMax) {
      setError('Mức lương tối thiểu không được lớn hơn mức lương tối đa.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: JobPostingRequest = {
      title: title.trim(),
      requisitionId,
      departmentId,
      jobTitleId,
      workLocation: workLocation.trim(),
      workingModel,
      quantity,
      salaryMin,
      salaryMax,
      currency: 'VND',
      salaryVisible,
      applicationDeadline: applicationDeadline || undefined,
      jobDescription: jobDescription.trim(),
      requirements: requirements.trim(),
      benefits: benefits.trim(),
    };

    try {
      if (editingPosting) {
        await jobPostingApi.update(editingPosting.id, payload);
      } else {
        await jobPostingApi.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu tin tuyển dụng.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="jp-modal-overlay" role="dialog" aria-modal="true">
      <div className="jp-modal-container jp-form-modal">
        <div className="jp-modal-header">
          <div>
            <h2 className="jp-modal-title">
              {editingPosting ? 'Chỉnh sửa tin tuyển dụng' : 'Soạn thảo tin tuyển dụng mới'}
            </h2>
            <p className="jp-modal-subtitle">
              {editingPosting
                ? `Cập nhật thông tin mã tin ${editingPosting.jobCode}`
                : 'Tạo bản nháp tin tuyển dụng (có thể kế thừa từ Yêu cầu đã duyệt hoặc soạn mới)'}
            </p>
          </div>
          <button type="button" className="jp-modal-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="jp-alert jp-alert-danger" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="jp-form-body">
          {/* Section 1: Kế thừa từ Requisition */}
          {!editingPosting && (
            <div className="jp-form-inherit-box">
              <div className="jp-inherit-header">
                <Sparkles size={16} />
                <span>Kế thừa từ Yêu cầu tuyển dụng đã duyệt (S3-09):</span>
              </div>
              <select
                className="jp-select"
                value={requisitionId || ''}
                onChange={handleInheritFromRequisition}
              >
                <option value="">-- Tự soạn thảo mới (Không kế thừa) --</option>
                {approvedRequisitions.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.requisitionCode}] {r.title} - {r.departmentName || 'Phòng ban'} ({r.quantity} headcount)
                  </option>
                ))}
              </select>
              <span className="jp-field-hint">
                * Khi chọn yêu cầu đã duyệt, hệ thống sẽ tự động điền các thông tin mô tả, yêu cầu và dải lương.
              </span>
            </div>
          )}

          {/* Tiêu đề & Phòng ban */}
          <div className="jp-form-row">
            <div className="jp-form-group jp-flex-2">
              <label className="jp-label">
                Tiêu đề tin tuyển dụng <span className="jp-required">*</span>
              </label>
              <input
                type="text"
                className="jp-input"
                placeholder="Ví dụ: Senior Backend Java Developer (Spring Boot / Microservices)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="jp-form-group jp-flex-1">
              <label className="jp-label">Phòng ban</label>
              <select
                className="jp-select"
                value={departmentId || ''}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">-- Chọn phòng ban --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chức danh, Địa điểm, Hình thức */}
          <div className="jp-form-row">
            <div className="jp-form-group jp-flex-1">
              <label className="jp-label">Chức danh công việc</label>
              <select
                className="jp-select"
                value={jobTitleId || ''}
                onChange={(e) => setJobTitleId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">-- Chọn chức danh --</option>
                {jobTitles.map((jt) => (
                  <option key={jt.id} value={jt.id}>
                    {jt.title} ({jt.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="jp-form-group jp-flex-1">
              <label className="jp-label">Địa điểm làm việc</label>
              <input
                type="text"
                className="jp-input"
                placeholder="Ví dụ: Tòa nhà FPT, Cầu Giấy, Hà Nội"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
              />
            </div>

            <div className="jp-form-group jp-flex-1">
              <label className="jp-label">Hình thức làm việc</label>
              <select
                className="jp-select"
                value={workingModel}
                onChange={(e) => setWorkingModel(e.target.value)}
              >
                <option value="ONSITE">Tại văn phòng (On-site)</option>
                <option value="HYBRID">Linh hoạt (Hybrid)</option>
                <option value="REMOTE">Từ xa (Remote)</option>
              </select>
            </div>

            <div className="jp-form-group" style={{ maxWidth: '100px' }}>
              <label className="jp-label">Số lượng</label>
              <input
                type="number"
                min={1}
                className="jp-input"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Lương, Công khai lương, Hạn nhận hồ sơ */}
          <div className="jp-form-row">
            <div className="jp-form-group jp-flex-1">
              <label className="jp-label">Mức lương tối thiểu (VND)</label>
              <input
                type="number"
                step={500000}
                className="jp-input"
                placeholder="20,000,000"
                value={salaryMin ?? ''}
                onChange={(e) => setSalaryMin(e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div className="jp-form-group jp-flex-1">
              <label className="jp-label">Mức lương tối đa (VND)</label>
              <input
                type="number"
                step={500000}
                className="jp-input"
                placeholder="35,000,000"
                value={salaryMax ?? ''}
                onChange={(e) => setSalaryMax(e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div className="jp-form-group jp-flex-1">
              <label className="jp-label">Hạn nhận hồ sơ</label>
              <input
                type="date"
                className="jp-input"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="jp-checkbox-row">
            <label className="jp-checkbox-label">
              <input
                type="checkbox"
                checked={salaryVisible}
                onChange={(e) => setSalaryVisible(e.target.checked)}
              />
              <span>Hiển thị mức lương trên trang công khai (nếu bỏ chọn, hiển thị "Thỏa thuận")</span>
            </label>
          </div>

          {/* Nội dung chi tiết: Mô tả, Yêu cầu, Quyền lợi */}
          <div className="jp-form-group">
            <label className="jp-label">Mô tả công việc (Job Description)</label>
            <textarea
              className="jp-textarea"
              rows={4}
              placeholder="Chi tiết trách nhiệm, nhiệm vụ hằng ngày của vị trí..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Yêu cầu ứng viên (Requirements)</label>
            <textarea
              className="jp-textarea"
              rows={4}
              placeholder="Yêu cầu về kỹ năng chuyên môn, kinh nghiệm làm việc, ngoại ngữ..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Quyền lợi & Đãi ngộ (Benefits)</label>
            <textarea
              className="jp-textarea"
              rows={3}
              placeholder="Chế độ bảo hiểm, thưởng hiệu quả, đào tạo, môi trường làm việc..."
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
            />
          </div>

          <div className="jp-modal-footer">
            <button
              type="button"
              className="jp-btn jp-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="jp-btn jp-btn-primary"
              disabled={submitting || loading}
            >
              {submitting ? 'Đang lưu...' : loading ? 'Đang tải...' : editingPosting ? 'Lưu thay đổi' : 'Tạo bản nháp tin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobPostingFormModal;
