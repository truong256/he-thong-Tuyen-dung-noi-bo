import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Eye,
  Edit3,
  Calendar,
  MapPin,
  Briefcase,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Requisition } from '../../types/requisition';
import {
  JobPosting,
  JobPostingPayload,
  WorkingModel,
  SalaryType,
} from '../../types/jobPosting';
import jobPostingApi from '../../api/jobPosting';
import '../../styles/job-posting.css';

export interface JobPostingEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: Requisition | null;
  postingId?: number;
  onSuccess?: (posting: JobPosting) => void;
}

export const JobPostingEditorModal: React.FC<JobPostingEditorModalProps> = ({
  isOpen,
  onClose,
  requisition,
  postingId,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [existingPostingId, setExistingPostingId] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [workingModel, setWorkingModel] = useState<WorkingModel>('ONSITE');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [showSalary, setShowSalary] = useState(true);
  const [salaryType, setSalaryType] = useState<SalaryType>('RANGE');
  const [salaryMin, setSalaryMin] = useState<string>('');
  const [salaryMax, setSalaryMax] = useState<string>('');
  const [currency] = useState('VND');
  const [jobDescription, setJobDescription] = useState('');
  const [candidateRequirements, setCandidateRequirements] = useState('');
  const [benefits, setBenefits] = useState('');

  // Validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset or load data
  const loadData = useCallback(async () => {
    if (!isOpen) return;

    setIsLoading(true);
    setApiError(null);
    setFormErrors({});
    setActiveTab('edit');

    // 1. Nếu mở từ ID tin cụ thể
    if (postingId) {
      try {
        const posting = await jobPostingApi.getById(postingId);
        setExistingPostingId(posting.id);
        setTitle(posting.title);
        setWorkLocation(posting.workLocation);
        setWorkingModel(posting.workingModel);
        setApplicationDeadline(posting.applicationDeadline);
        setShowSalary(posting.showSalary);
        setSalaryType(posting.salaryType);
        setSalaryMin(posting.salaryMin ? String(posting.salaryMin) : '');
        setSalaryMax(posting.salaryMax ? String(posting.salaryMax) : '');
        setJobDescription(posting.jobDescription);
        setCandidateRequirements(posting.candidateRequirements);
        setBenefits(posting.benefits || '');
      } catch (err: any) {
        setApiError(err.response?.data?.message || 'Không thể tải thông tin tin tuyển dụng.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. Mở từ Requisition nguồn
    if (!requisition) {
      setIsLoading(false);
      return;
    }

    // Kiểm tra trạng thái yêu cầu tuyển dụng: chỉ được APPROVED
    if (requisition.status !== 'APPROVED') {
      setApiError('Chỉ có thể tạo tin tuyển dụng từ yêu cầu đã được phê duyệt.');
      setIsLoading(false);
      return;
    }

    try {
      // Kiểm tra xem yêu cầu này đã có tin nháp trước đó chưa (tải lại không mất dữ liệu)
      const existing = await jobPostingApi.getByRequisitionId(requisition.id);
      if (existing) {
        setExistingPostingId(existing.id);
        setTitle(existing.title);
        setWorkLocation(existing.workLocation);
        setWorkingModel(existing.workingModel);
        setApplicationDeadline(existing.applicationDeadline);
        setShowSalary(existing.showSalary);
        setSalaryType(existing.salaryType);
        setSalaryMin(existing.salaryMin ? String(existing.salaryMin) : '');
        setSalaryMax(existing.salaryMax ? String(existing.salaryMax) : '');
        setJobDescription(existing.jobDescription);
        setCandidateRequirements(existing.candidateRequirements);
        setBenefits(existing.benefits || '');
      } else {
        // Kế thừa dữ liệu từ yêu cầu nguồn thông qua template API
        const tpl = await jobPostingApi.getTemplate(requisition.id);
        setExistingPostingId(null);
        setTitle(tpl.title);
        setWorkLocation(tpl.workLocation || 'Hà Nội');
        setWorkingModel(tpl.workingModel || 'ONSITE');
        setApplicationDeadline(tpl.applicationDeadline || '');
        setShowSalary(tpl.showSalary);
        setSalaryType(tpl.salaryType || 'RANGE');
        setSalaryMin(tpl.salaryMin ? String(tpl.salaryMin) : '');
        setSalaryMax(tpl.salaryMax ? String(tpl.salaryMax) : '');
        setJobDescription(tpl.jobDescription || '');
        setCandidateRequirements(tpl.candidateRequirements || '');
        setBenefits(tpl.benefits || '');
      }
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Không thể lấy dữ liệu kế thừa từ yêu cầu tuyển dụng.');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, requisition, postingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề tin tuyển dụng.';
    }
    if (!workLocation.trim()) {
      errors.workLocation = 'Vui lòng nhập địa điểm làm việc.';
    }
    if (!applicationDeadline) {
      errors.applicationDeadline = 'Vui lòng chọn hạn nhận hồ sơ.';
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      if (applicationDeadline < todayStr) {
        errors.applicationDeadline = 'Hạn nhận hồ sơ không thể trong quá khứ.';
      }
    }

    if (showSalary && salaryType === 'RANGE') {
      const minVal = salaryMin ? Number(salaryMin) : null;
      const maxVal = salaryMax ? Number(salaryMax) : null;
      if (minVal !== null && maxVal !== null && minVal > maxVal) {
        errors.salary = 'Mức lương tối thiểu không được lớn hơn mức lương tối đa.';
      }
    }

    if (!jobDescription.trim()) {
      errors.jobDescription = 'Vui lòng nhập mô tả công việc.';
    }
    if (!candidateRequirements.trim()) {
      errors.candidateRequirements = 'Vui lòng nhập yêu cầu ứng viên.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (status: 'DRAFT' | 'PENDING_APPROVAL') => {
    if (!validateForm()) {
      setActiveTab('edit');
      return;
    }

    const reqId = requisition?.id || 0;
    if (!reqId && !existingPostingId) {
      setApiError('Thiếu mã yêu cầu tuyển dụng nguồn.');
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    const payload: JobPostingPayload = {
      requisitionId: reqId,
      title: title.trim(),
      jobDescription: jobDescription.trim(),
      candidateRequirements: candidateRequirements.trim(),
      benefits: benefits.trim() || undefined,
      workLocation: workLocation.trim(),
      workingModel,
      applicationDeadline,
      showSalary,
      salaryType,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      currency,
      status,
    };

    try {
      let saved: JobPosting;
      if (existingPostingId) {
        saved = await jobPostingApi.update(existingPostingId, payload);
      } else {
        saved = await jobPostingApi.create(payload);
        setExistingPostingId(saved.id);
      }

      if (onSuccess) {
        onSuccess(saved);
      }
      onClose();
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu tin tuyển dụng.');
      setActiveTab('edit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency display helper for Preview
  const formattedSalary = useMemo(() => {
    if (!showSalary || salaryType === 'NEGOTIABLE') {
      return 'Thỏa thuận';
    }
    const formatNumber = (num: number) =>
      new Intl.NumberFormat('vi-VN').format(num);

    const min = salaryMin ? Number(salaryMin) : null;
    const max = salaryMax ? Number(salaryMax) : null;

    if (salaryType === 'EXACT') {
      return min ? `${formatNumber(min)} ₫` : 'Thỏa thuận';
    }
    if (min && max) {
      return `${formatNumber(min)} - ${formatNumber(max)} ₫`;
    }
    if (min) {
      return `Từ ${formatNumber(min)} ₫`;
    }
    if (max) {
      return `Lên đến ${formatNumber(max)} ₫`;
    }
    return 'Thỏa thuận';
  }, [showSalary, salaryType, salaryMin, salaryMax]);

  const workingModelLabel = useMemo(() => {
    switch (workingModel) {
      case 'HYBRID':
        return 'Kết hợp (Hybrid)';
      case 'REMOTE':
        return 'Từ xa (Remote)';
      case 'ONSITE':
      default:
        return 'Tại văn phòng (On-site)';
    }
  }, [workingModel]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      className="job-posting-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={20} color="#2563eb" />
          <span>{existingPostingId ? 'Chỉnh sửa tin tuyển dụng' : 'Soạn tin tuyển dụng từ yêu cầu đã duyệt'}</span>
        </div>
      }
      subtitle={
        requisition
          ? `Kế thừa từ yêu cầu: ${requisition.requisitionCode} — ${requisition.title}`
          : 'Tin tuyển dụng nội bộ'
      }
      footer={
        <div className="job-posting-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab(activeTab === 'edit' ? 'preview' : 'edit')}
              disabled={isLoading || !!apiError}
            >
              {activeTab === 'edit' ? 'Xem trước tin công khai' : 'Quay lại soạn thảo'}
            </Button>
          </div>

          <div className="job-posting-footer-right">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Đóng
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading || isSubmitting || !!apiError}
              onClick={() => handleSave('DRAFT')}
            >
              Lưu nháp
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isLoading || isSubmitting || !!apiError}
              onClick={() => handleSave('PENDING_APPROVAL')}
            >
              Gửi phê duyệt
            </Button>
          </div>
        </div>
      }
    >
      {/* Tabs */}
      <div className="job-posting-tabs">
        <button
          type="button"
          className={`job-posting-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          <Edit3 size={16} /> Soạn thảo nội dung
        </button>
        <button
          type="button"
          className={`job-posting-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={16} /> Xem trước giao diện công khai
        </button>
      </div>

      {/* Error alert */}
      {apiError && (
        <div className="job-posting-notice warning">
          <AlertTriangle size={18} />
          <div>
            <strong>Lỗi nghiệp vụ:</strong> {apiError}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
          <Clock size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Đang tải và kế thừa thông tin từ yêu cầu tuyển dụng...</p>
        </div>
      ) : activeTab === 'edit' ? (
        /* ================= FORM SOẠN THẢO ================= */
        <div className="job-posting-form">
          <div className="job-posting-notice">
            <Sparkles size={18} color="#2563eb" />
            <div>
              Hệ thống đã tự động kế thừa mô tả công việc, yêu cầu ứng viên, quyền lợi, địa điểm và dải lương từ yêu cầu tuyển dụng đã duyệt. Bạn có thể điều chỉnh lại câu từ cho hấp dẫn và phù hợp ngôn ngữ tuyển dụng.
            </div>
          </div>

          {/* Tiêu đề tin tuyển dụng */}
          <div className="job-posting-field">
            <label className="job-posting-label">
              Tiêu đề tin tuyển dụng <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`job-posting-input ${formErrors.title ? 'error' : ''}`}
              placeholder="Ví dụ: Tuyển dụng Senior Backend Java Developer (Spring Boot)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {formErrors.title && <span className="job-posting-error-text">{formErrors.title}</span>}
          </div>

          {/* Hàng 2: Hình thức làm việc, Địa điểm, Hạn nhận hồ sơ */}
          <div className="job-posting-form-row">
            <div className="job-posting-field">
              <label className="job-posting-label">
                Hình thức làm việc <span className="required">*</span>
              </label>
              <select
                className="job-posting-select"
                value={workingModel}
                onChange={(e) => setWorkingModel(e.target.value as WorkingModel)}
              >
                <option value="ONSITE">Tại văn phòng (On-site)</option>
                <option value="HYBRID">Kết hợp (Hybrid)</option>
                <option value="REMOTE">Từ xa (Remote)</option>
              </select>
            </div>

            <div className="job-posting-field">
              <label className="job-posting-label">
                Địa điểm làm việc <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`job-posting-input ${formErrors.workLocation ? 'error' : ''}`}
                placeholder="Ví dụ: Tòa nhà TechHub, Hà Nội"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
              />
              {formErrors.workLocation && (
                <span className="job-posting-error-text">{formErrors.workLocation}</span>
              )}
            </div>

            <div className="job-posting-field">
              <label className="job-posting-label">
                Hạn nhận hồ sơ <span className="required">*</span>
              </label>
              <input
                type="date"
                className={`job-posting-input ${formErrors.applicationDeadline ? 'error' : ''}`}
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
              />
              {formErrors.applicationDeadline && (
                <span className="job-posting-error-text">{formErrors.applicationDeadline}</span>
              )}
            </div>
          </div>

          {/* Tùy chọn lương */}
          <div className="job-posting-salary-box">
            <label className="job-posting-toggle">
              <input
                type="checkbox"
                checked={showSalary}
                onChange={(e) => setShowSalary(e.target.checked)}
              />
              <span>Hiển thị mức lương trên tin tuyển dụng công khai</span>
            </label>

            {showSalary && (
              <div className="job-posting-form-row" style={{ marginTop: 8 }}>
                <div className="job-posting-field">
                  <label className="job-posting-label">Kiểu hiển thị lương</label>
                  <select
                    className="job-posting-select"
                    value={salaryType}
                    onChange={(e) => setSalaryType(e.target.value as SalaryType)}
                  >
                    <option value="RANGE">Dải lương (Từ - Đến)</option>
                    <option value="EXACT">Lương cố định</option>
                    <option value="NEGOTIABLE">Thỏa thuận</option>
                  </select>
                </div>

                {salaryType === 'RANGE' && (
                  <>
                    <div className="job-posting-field">
                      <label className="job-posting-label">Lương tối thiểu (VND)</label>
                      <input
                        type="number"
                        className="job-posting-input"
                        placeholder="Ví dụ: 15000000"
                        value={salaryMin}
                        onChange={(e) => setSalaryMin(e.target.value)}
                      />
                    </div>
                    <div className="job-posting-field">
                      <label className="job-posting-label">Lương tối đa (VND)</label>
                      <input
                        type="number"
                        className="job-posting-input"
                        placeholder="Ví dụ: 30000000"
                        value={salaryMax}
                        onChange={(e) => setSalaryMax(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {salaryType === 'EXACT' && (
                  <div className="job-posting-field">
                    <label className="job-posting-label">Mức lương cụ thể (VND)</label>
                    <input
                      type="number"
                      className="job-posting-input"
                      placeholder="Ví dụ: 20000000"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
            {formErrors.salary && <span className="job-posting-error-text">{formErrors.salary}</span>}
          </div>

          {/* Mô tả công việc */}
          <div className="job-posting-field">
            <label className="job-posting-label">
              Mô tả công việc (Job Description) <span className="required">*</span>
            </label>
            <textarea
              className={`job-posting-textarea ${formErrors.jobDescription ? 'error' : ''}`}
              rows={5}
              placeholder="Chi tiết trách nhiệm, nhiệm vụ chính của vị trí..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            {formErrors.jobDescription && (
              <span className="job-posting-error-text">{formErrors.jobDescription}</span>
            )}
          </div>

          {/* Yêu cầu ứng viên */}
          <div className="job-posting-field">
            <label className="job-posting-label">
              Yêu cầu ứng viên (Requirements) <span className="required">*</span>
            </label>
            <textarea
              className={`job-posting-textarea ${formErrors.candidateRequirements ? 'error' : ''}`}
              rows={5}
              placeholder="Trình độ học vấn, kinh nghiệm làm việc, kỹ năng chuyên môn..."
              value={candidateRequirements}
              onChange={(e) => setCandidateRequirements(e.target.value)}
            />
            {formErrors.candidateRequirements && (
              <span className="job-posting-error-text">{formErrors.candidateRequirements}</span>
            )}
          </div>

          {/* Quyền lợi */}
          <div className="job-posting-field">
            <label className="job-posting-label">Quyền lợi & Chế độ đãi ngộ (Benefits)</label>
            <textarea
              className="job-posting-textarea"
              rows={4}
              placeholder="Chế độ bảo hiểm, thưởng tháng 13, phụ cấp, môi trường làm việc..."
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
            />
          </div>
        </div>
      ) : (
        /* ================= BẢN XEM TRƯỚC GIAO DIỆN CÔNG KHAI ================= */
        <div className="job-preview-container">
          <div className="job-preview-banner">
            <div className="job-preview-header-top">
              <h1 className="job-preview-title">{title || 'Tiêu đề tin tuyển dụng'}</h1>
              <div className="job-preview-badges">
                <Badge variant="info">Bản xem trước công khai</Badge>
                <Badge variant="neutral">{workingModelLabel}</Badge>
              </div>
            </div>

            <div className="job-preview-company">
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <Building2 size={16} /> Công ty Tuyển dụng Nội bộ
              </span>
              <span>•</span>
              <span>{requisition?.departmentName || 'Phòng ban tuyển dụng'}</span>
              <span>•</span>
              <span style={{ color: '#94a3b8' }}>Mã yêu cầu: {requisition?.requisitionCode}</span>
            </div>
          </div>

          {/* Quick info cards */}
          <div className="job-preview-grid">
            <div className="job-preview-card">
              <div className="job-preview-card-icon salary">
                <DollarSign size={20} />
              </div>
              <div>
                <div className="job-preview-card-label">Mức lương</div>
                <div className="job-preview-card-value" style={{ color: '#059669' }}>
                  {formattedSalary}
                </div>
              </div>
            </div>

            <div className="job-preview-card">
              <div className="job-preview-card-icon">
                <MapPin size={20} />
              </div>
              <div>
                <div className="job-preview-card-label">Địa điểm</div>
                <div className="job-preview-card-value">{workLocation || 'Chưa cập nhật'}</div>
              </div>
            </div>

            <div className="job-preview-card">
              <div className="job-preview-card-icon">
                <Briefcase size={20} />
              </div>
              <div>
                <div className="job-preview-card-label">Hình thức</div>
                <div className="job-preview-card-value">{workingModelLabel}</div>
              </div>
            </div>

            <div className="job-preview-card">
              <div className="job-preview-card-icon">
                <Calendar size={20} />
              </div>
              <div>
                <div className="job-preview-card-label">Hạn nộp hồ sơ</div>
                <div className="job-preview-card-value">
                  {applicationDeadline || 'Chưa thiết lập'}
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="job-preview-section">
            <div className="job-preview-section-title">
              <FileText size={18} color="#2563eb" /> Mô tả công việc
            </div>
            <div className="job-preview-section-content">
              {jobDescription || 'Chưa có mô tả công việc'}
            </div>
          </div>

          <div className="job-preview-section">
            <div className="job-preview-section-title">
              <CheckCircle size={18} color="#2563eb" /> Yêu cầu ứng viên
            </div>
            <div className="job-preview-section-content">
              {candidateRequirements || 'Chưa có yêu cầu ứng viên'}
            </div>
          </div>

          {benefits && (
            <div className="job-preview-section">
              <div className="job-preview-section-title">
                <Sparkles size={18} color="#2563eb" /> Quyền lợi & Chế độ đãi ngộ
              </div>
              <div className="job-preview-section-content">{benefits}</div>
            </div>
          )}

          {/* Mock Apply Section */}
          <div className="job-preview-apply-bar">
            <div className="job-preview-apply-info">
              <strong>Quan tâm tới vị trí này?</strong>
              <span>Ứng viên trên cổng công khai sẽ bấm nút dưới đây để nộp CV</span>
            </div>
            <button type="button" className="job-preview-apply-btn" disabled>
              Ứng tuyển ngay (Xem trước)
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default JobPostingEditorModal;
