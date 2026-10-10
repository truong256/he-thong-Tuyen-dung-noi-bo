import React, { useState, useEffect, useCallback, FormEvent, useMemo } from 'react';
import {
  FileText,
  Building2,
  Briefcase,
  Users,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Edit3,
  MapPin,
  Check,
  Search,
  Info,
  ChevronRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { requisitionApi, RequisitionResponse } from '../api/requisition';
import { PageHeader } from '../components/common/PageHeader';
import '../styles/recruitment-request.css';

interface DepartmentItem {
  id: number;
  name: string;
  code: string;
}

interface JobTitleItem {
  id: number;
  title: string;
  code: string;
  minSalary?: number;
  maxSalary?: number;
  departmentId?: number;
}

interface FormState {
  id?: number;
  requisitionCode?: string;
  title: string;
  departmentId: string;
  jobTitleId: string;
  quantity: string;
  recruitmentType: string;
  reason: string;
  salaryMin: string;
  salaryMax: string;
  salaryExplanation: string;
  neededDate: string;
  jobDescription: string;
  candidateRequirements: string;
  benefits: string;
  workLocation: string;
  workingModel: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  departmentId: '',
  jobTitleId: '',
  quantity: '1',
  recruitmentType: 'NEW',
  reason: '',
  salaryMin: '',
  salaryMax: '',
  salaryExplanation: '',
  neededDate: '',
  jobDescription: '',
  candidateRequirements: '',
  benefits: '',
  workLocation: 'Trụ sở chính',
  workingModel: 'ONSITE',
};

export const RecruitmentRequestPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Danh mục dữ liệu thật từ Backend
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleItem[]>([]);
  const [requisitions, setRequisitions] = useState<RequisitionResponse[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Ngày hôm nay theo chuẩn ISO YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadMetadata = useCallback(async () => {
    try {
      const [deptRes, jobRes] = await Promise.all([
        apiClient.get<DepartmentItem[]>('/api/departments?active=true'),
        apiClient.get<JobTitleItem[]>('/api/job-titles?active=true'),
      ]);
      setDepartments(deptRes.data || []);
      setJobTitles(jobRes.data || []);
    } catch {
      // Giữ danh sách rỗng nếu lỗi
    }
  }, []);

  const loadRequisitions = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const res = await requisitionApi.list({ size: 50 });
      setRequisitions((res.content || []) as unknown as RequisitionResponse[]);
    } catch {
      // Bỏ qua lỗi
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Load danh mục khi mount
  useEffect(() => {
    loadMetadata();
    loadRequisitions();
  }, [loadMetadata, loadRequisitions]);

  // Chức danh và phòng ban đang chọn
  const selectedJob = jobTitles.find((j) => String(j.id) === form.jobTitleId);
  const selectedDept = departments.find((d) => String(d.id) === form.departmentId);

  // --- REAL-TIME VALIDATION CHO DẢI LƯƠNG ---
  const salaryValidation = useMemo(() => {
    const minNum = form.salaryMin !== '' && !isNaN(Number(form.salaryMin)) ? Number(form.salaryMin) : null;
    const maxNum = form.salaryMax !== '' && !isNaN(Number(form.salaryMax)) ? Number(form.salaryMax) : null;

    let minError: string | null = null;
    let maxError: string | null = null;

    if (minNum !== null && minNum < 0) {
      minError = 'Lương tối thiểu không được là số âm';
    }
    if (maxNum !== null && maxNum < 0) {
      maxError = 'Lương tối đa không được là số âm';
    }

    const isMinGreaterThanMax = minNum !== null && maxNum !== null && minNum > maxNum;
    if (isMinGreaterThanMax) {
      maxError = `Lương tối đa (${maxNum.toLocaleString('vi-VN')} đ) phải lớn hơn hoặc bằng lương tối thiểu (${minNum.toLocaleString('vi-VN')} đ)`;
    }

    const isMinBelowStandard = Boolean(
      selectedJob && selectedJob.minSalary && minNum !== null && minNum < selectedJob.minSalary
    );
    const isMaxAboveStandard = Boolean(
      selectedJob && selectedJob.maxSalary && maxNum !== null && maxNum > selectedJob.maxSalary
    );

    const isOutsideSalaryRange = isMinBelowStandard || isMaxAboveStandard;
    const isValid = !minError && !maxError && !isMinGreaterThanMax;

    return {
      minNum,
      maxNum,
      minError,
      maxError,
      isMinGreaterThanMax,
      isMinBelowStandard,
      isMaxAboveStandard,
      isOutsideSalaryRange,
      isValid,
    };
  }, [form.salaryMin, form.salaryMax, selectedJob]);

  // --- REAL-TIME VALIDATION CHO NGÀY CẦN NGƯỜI ---
  const dateValidation = useMemo(() => {
    if (!form.neededDate) return { isPast: false, error: null, daysDiff: null };
    const isPast = form.neededDate < todayStr;
    const target = new Date(form.neededDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const daysDiff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isPast,
      error: isPast ? 'Ngày cần người không được ở trong quá khứ (từ hôm nay trở đi)' : null,
      daysDiff,
    };
  }, [form.neededDate, todayStr]);

  const formatMoney = (val?: number | string) => {
    if (!val) return 'Chưa thiết lập';
    const num = typeof val === 'string' ? Number(val) : val;
    if (isNaN(num)) return 'Chưa thiết lập';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const formatSalaryPreview = (min?: string, max?: string) => {
    if (!min && !max) return 'Thỏa thuận theo năng lực';
    if (min && max) {
      const minMil = Number(min) / 1000000;
      const maxMil = Number(max) / 1000000;
      return `${minMil} - ${maxMil} triệu đ/tháng`;
    }
    if (min) return `Từ ${(Number(min) / 1000000).toLocaleString('vi-VN')} triệu đ/tháng`;
    if (max) return `Đến ${(Number(max) / 1000000).toLocaleString('vi-VN')} triệu đ/tháng`;
    return 'Thỏa thuận';
  };

  const updateField = (key: keyof FormState, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Nút tiện ích: Tự động điền dải lương chuẩn của Chức danh
  const handleApplyStandardSalary = () => {
    if (selectedJob) {
      if (selectedJob.minSalary) updateField('salaryMin', String(selectedJob.minSalary));
      if (selectedJob.maxSalary) updateField('salaryMax', String(selectedJob.maxSalary));
      setMessage({
        text: `Đã áp dụng khung lương chuẩn: ${formatMoney(selectedJob.minSalary)} – ${formatMoney(selectedJob.maxSalary)}/tháng`,
        type: 'info',
      });
    }
  };

  // Tự động điền mô tả chức danh nếu chọn chức danh
  const handleJobSelect = (jobId: string) => {
    updateField('jobTitleId', jobId);
    const j = jobTitles.find((item) => String(item.id) === jobId);
    if (j) {
      if (!form.title) {
        updateField('title', `Tuyển dụng ${j.title}`);
      }
      if (j.departmentId && !form.departmentId) {
        updateField('departmentId', String(j.departmentId));
      }
      if (j.minSalary && !form.salaryMin) {
        updateField('salaryMin', String(j.minSalary));
      }
      if (j.maxSalary && !form.salaryMax) {
        updateField('salaryMax', String(j.maxSalary));
      }
    }
  };

  // 1. Thao tác Lưu Bản Nháp
  const handleSaveDraft = async () => {
    // Kiểm tra tính hợp lệ tức thời của dải lương & ngày nếu có nhập
    if (!salaryValidation.isValid) {
      setMessage({
        text: salaryValidation.maxError || salaryValidation.minError || 'Dải lương không hợp lệ. Vui lòng kiểm tra lại.',
        type: 'error',
      });
      return;
    }
    if (dateValidation.isPast) {
      setMessage({
        text: dateValidation.error || 'Ngày cần người không được ở trong quá khứ.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const payload = {
      title: form.title.trim() || undefined,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined,
      jobTitleId: form.jobTitleId ? Number(form.jobTitleId) : undefined,
      quantity: form.quantity ? Number(form.quantity) : 1,
      recruitmentType: form.recruitmentType || undefined,
      reason: form.reason || undefined,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      currency: 'VND',
      salaryExplanation: form.salaryExplanation || undefined,
      neededDate: form.neededDate || undefined,
      jobDescription: form.jobDescription || undefined,
      candidateRequirements: form.candidateRequirements || undefined,
      benefits: form.benefits || undefined,
      workLocation: form.workLocation || undefined,
      workingModel: form.workingModel || 'ONSITE',
    };

    try {
      let saved: RequisitionResponse;
      if (form.id) {
        saved = await requisitionApi.updateDraft(form.id, payload);
      } else {
        saved = await requisitionApi.saveDraft(payload);
      }

      setForm((prev) => ({
        ...prev,
        id: saved.id,
        requisitionCode: saved.requisitionCode,
        title: saved.title || prev.title,
      }));

      setMessage({
        text: `Đã lưu bản nháp thành công! Mã yêu cầu: ${saved.requisitionCode}`,
        type: 'success',
      });
      loadRequisitions();
    } catch (err: any) {
      const errText = err.response?.data?.message || 'Không thể lưu bản nháp. Vui lòng thử lại.';
      setMessage({ text: errText, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Thao tác Gửi Phê Duyệt Chính Thức
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề yêu cầu';
    if (!form.departmentId) newErrors.departmentId = 'Vui lòng chọn phòng ban';
    if (!form.jobTitleId) newErrors.jobTitleId = 'Vui lòng chọn chức danh';
    if (!form.quantity || Number(form.quantity) < 1) newErrors.quantity = 'Số lượng tuyển dụng phải lớn hơn 0';
    if (!form.reason.trim()) newErrors.reason = 'Vui lòng nhập lý do tuyển dụng';
    if (!form.jobDescription.trim()) newErrors.jobDescription = 'Vui lòng nhập mô tả công việc';
    if (!form.candidateRequirements.trim()) newErrors.candidateRequirements = 'Vui lòng nhập yêu cầu ứng viên';

    // KIỂM TRA NGÀY CẦN NGƯỜI
    if (!form.neededDate) {
      newErrors.neededDate = 'Vui lòng chọn ngày cần nhân sự nhận việc';
    } else if (dateValidation.isPast) {
      newErrors.neededDate = dateValidation.error || 'Ngày cần người không được ở trong quá khứ';
    }

    // KIỂM TRA DẢI LƯƠNG
    if (!salaryValidation.isValid) {
      if (salaryValidation.minError) newErrors.salaryMin = salaryValidation.minError;
      if (salaryValidation.maxError) newErrors.salaryMax = salaryValidation.maxError;
    }

    // KIỂM TRA BẮT BUỘC GIẢI TRÌNH KHI VƯỢT KHUNG LƯƠNG CHỨC DANH
    if (salaryValidation.isOutsideSalaryRange && !form.salaryExplanation.trim()) {
      newErrors.salaryExplanation =
        'Dải lương đề xuất nằm ngoài khung lương tiêu chuẩn của chức danh. Vui lòng nhập lý do giải trình.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setMessage({
        text: 'Vui lòng kiểm tra lại các thông tin lỗi (đặc biệt là dải lương và ngày cần người).',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const payload = {
      title: form.title.trim(),
      departmentId: Number(form.departmentId),
      jobTitleId: Number(form.jobTitleId),
      quantity: Number(form.quantity),
      recruitmentType: form.recruitmentType,
      reason: form.reason.trim(),
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      currency: 'VND',
      salaryExplanation: form.salaryExplanation.trim() || undefined,
      neededDate: form.neededDate,
      jobDescription: form.jobDescription.trim(),
      candidateRequirements: form.candidateRequirements.trim(),
      benefits: form.benefits.trim() || undefined,
      workLocation: form.workLocation.trim() || undefined,
      workingModel: form.workingModel || 'ONSITE',
    };

    try {
      let result: RequisitionResponse;
      if (form.id) {
        // Cập nhật nháp trước rồi submit
        await requisitionApi.updateDraft(form.id, payload);
        result = await requisitionApi.submitDraft(form.id);
      } else {
        result = await requisitionApi.createAndSubmit(payload);
      }

      setMessage({
        text: `Đã gửi yêu cầu tuyển dụng thành công! Mã: ${result.requisitionCode} đang chờ phê duyệt.`,
        type: 'success',
      });
      setForm(EMPTY_FORM);
      setErrors({});
      loadRequisitions();
      setActiveTab('list');
    } catch (err: any) {
      const errText = err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.';
      setMessage({ text: errText, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nạp bản nháp để sửa tiếp
  const handleEditDraft = (item: RequisitionResponse) => {
    setForm({
      id: item.id,
      requisitionCode: item.requisitionCode,
      title: item.title || '',
      departmentId: item.departmentId ? String(item.departmentId) : '',
      jobTitleId: item.jobTitleId ? String(item.jobTitleId) : '',
      quantity: String(item.quantity || 1),
      recruitmentType: item.recruitmentType || 'NEW',
      reason: item.reason || '',
      salaryMin: item.salaryMin ? String(item.salaryMin) : '',
      salaryMax: item.salaryMax ? String(item.salaryMax) : '',
      salaryExplanation: item.salaryExplanation || '',
      neededDate: item.neededDate || item.targetDate || '',
      jobDescription: item.jobDescription || '',
      candidateRequirements: item.candidateRequirements || '',
      benefits: item.benefits || '',
      workLocation: item.workLocation || 'Trụ sở chính',
      workingModel: item.workingModel || 'ONSITE',
    });
    setErrors({});
    setMessage(null);
    setActiveTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDraft = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản nháp yêu cầu này không?')) return;
    try {
      await requisitionApi.deleteDraft(id);
      setMessage({ text: 'Đã xóa bản nháp thành công.', type: 'info' });
      loadRequisitions();
      if (form.id === id) {
        setForm(EMPTY_FORM);
      }
    } catch {
      setMessage({ text: 'Không thể xóa bản nháp này.', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="rr-status-badge rr-status-draft">Bản nháp</span>;
      case 'PENDING_APPROVAL':
        return <span className="rr-status-badge rr-status-pending">Chờ phê duyệt</span>;
      case 'APPROVED':
        return <span className="rr-status-badge rr-status-approved">Đã phê duyệt</span>;
      case 'REJECTED':
        return <span className="rr-status-badge rr-status-rejected">Từ chối</span>;
      default:
        return <span className="rr-status-badge">{status}</span>;
    }
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    return {
      total: requisitions.length,
      draft: requisitions.filter((r) => r.status === 'DRAFT').length,
      pending: requisitions.filter((r) => r.status === 'PENDING_APPROVAL').length,
      approved: requisitions.filter((r) => r.status === 'APPROVED').length,
    };
  }, [requisitions]);

  // Lọc danh sách yêu cầu ở Tab Danh sách
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((item) => {
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchSearch =
        !searchQuery ||
        item.requisitionCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.departmentName && item.departmentName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [requisitions, statusFilter, searchQuery]);

  return (
    <div className="rr-page-container">
      {/* Standardized Enterprise Page Header */}
      <PageHeader
        title="Quản lý & Đề xuất Yêu cầu Tuyển dụng"
        subtitle="Khởi tạo phiếu đề xuất nhân sự, lưu nháp và luân chuyển phê duyệt định biên ngân sách"
        breadcrumbs={[
          { label: 'Tổng quan', path: '/dashboard' },
          { label: 'Đề xuất tuyển dụng' },
        ]}
        badge={
          <span className="rr-badge-catalog">
            Quy trình Phê duyệt Chuẩn hóa
          </span>
        }
        actions={
          <div className="rr-hero-tabs" style={{ margin: 0 }}>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`rr-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            >
              {form.id ? 'Chỉnh sửa bản nháp' : 'Tạo yêu cầu mới'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('list');
                loadRequisitions();
              }}
              className={`rr-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            >
              Danh sách yêu cầu
              <span className="rr-tab-count">{stats.total}</span>
            </button>
          </div>
        }
      />

      {/* Metrics Summary Pills */}
      <div className="rr-metrics-bar">
        <div className="rr-metric-pill">
          <span>Tổng số yêu cầu:</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="rr-metric-pill">
          <span>Bản nháp đang lưu:</span>
          <strong style={{ color: '#d97706' }}>{stats.draft}</strong>
        </div>
        <div className="rr-metric-pill">
          <span>Đang chờ phê duyệt:</span>
          <strong style={{ color: '#2563eb' }}>{stats.pending}</strong>
        </div>
        <div className="rr-metric-pill">
          <span>Đã phê duyệt hoàn tất:</span>
          <strong style={{ color: '#059669' }}>{stats.approved}</strong>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`rr-alert-banner ${
            message.type === 'success'
              ? 'rr-alert-success'
              : message.type === 'error'
              ? 'rr-alert-error'
              : 'rr-alert-info'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : (
            <AlertCircle size={18} className="shrink-0" />
          )}
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="rr-alert-close">
            ✕
          </button>
        </div>
      )}

      {/* ====================================================================
          TAB 1: FORM TẠO / SỬA YÊU CẦU
          ==================================================================== */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} className="rr-form-layout">
          {/* Main Column: Form Sections */}
          <div className="rr-form-sections">
            {/* Draft Notice if Editing */}
            {form.requisitionCode && (
              <div className="rr-draft-banner">
                <div className="rr-draft-banner-info">
                  <Info size={18} />
                  <span>
                    Đang làm việc trên bản nháp:{' '}
                    <span className="rr-draft-code">{form.requisitionCode}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setMessage({ text: 'Đã chuyển sang chế độ soạn mới yêu cầu.', type: 'info' });
                  }}
                  className="rr-draft-new-btn"
                >
                  + Soạn mới yêu cầu khác
                </button>
              </div>
            )}

            {/* CARD 1: VỊ TRÍ & PHÒNG BAN */}
            <div className="rr-card">
              <div className="rr-card-header">
                <div className="rr-card-icon rr-icon-blue">
                  <Building2 size={20} />
                </div>
                <div className="rr-card-title-group">
                  <h2>1. Thông tin Vị trí & Đơn vị tiếp nhận</h2>
                  <p>Chọn chức danh chuẩn hóa để tự động liên kết khung năng lực và mức lương gợi ý</p>
                </div>
              </div>

              <div className="rr-grid-2">
                {/* Chức danh */}
                <div className="rr-field">
                  <label className="rr-label">
                    <span>
                      Chức danh tuyển dụng <span className="rr-req">*</span>
                    </span>
                  </label>
                  <select
                    value={form.jobTitleId}
                    onChange={(e) => handleJobSelect(e.target.value)}
                    className={`rr-select ${errors.jobTitleId ? 'error' : ''}`}
                  >
                    <option value="">-- Chọn chức danh tiêu chuẩn --</option>
                    {jobTitles.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.code})
                      </option>
                    ))}
                  </select>
                  {errors.jobTitleId && <p className="rr-error-text">{errors.jobTitleId}</p>}
                  <p className="rr-helper-text">Khung năng lực sẽ được đồng bộ từ Danh mục chức danh</p>
                </div>

                {/* Phòng ban */}
                <div className="rr-field">
                  <label className="rr-label">
                    <span>
                      Phòng ban tiếp nhận <span className="rr-req">*</span>
                    </span>
                  </label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => updateField('departmentId', e.target.value)}
                    className={`rr-select ${errors.departmentId ? 'error' : ''}`}
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                  {errors.departmentId && <p className="rr-error-text">{errors.departmentId}</p>}
                </div>

                {/* Tiêu đề yêu cầu */}
                <div className="rr-field rr-col-span-2">
                  <label className="rr-label">
                    <span>
                      Tiêu đề hiển thị của đợt tuyển dụng <span className="rr-req">*</span>
                    </span>
                  </label>
                  <div className="rr-input-wrapper">
                    <Briefcase className="rr-input-icon" />
                    <input
                      type="text"
                      placeholder="Ví dụ: Tuyển dụng Kỹ sư Backend Spring Boot tháng 10"
                      value={form.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      className={`rr-input rr-input-with-icon ${errors.title ? 'error' : ''}`}
                    />
                  </div>
                  {errors.title && <p className="rr-error-text">{errors.title}</p>}
                </div>

                {/* Số lượng */}
                <div className="rr-field">
                  <label className="rr-label">
                    <span>
                      Số lượng nhân sự cần tuyển <span className="rr-req">*</span>
                    </span>
                  </label>
                  <div className="rr-input-wrapper">
                    <Users className="rr-input-icon" />
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => updateField('quantity', e.target.value)}
                      className={`rr-input rr-input-with-icon ${errors.quantity ? 'error' : ''}`}
                    />
                    <span className="rr-unit-badge">Nhân sự</span>
                  </div>
                  {errors.quantity && <p className="rr-error-text">{errors.quantity}</p>}
                </div>

                {/* Loại tuyển dụng */}
                <div className="rr-field">
                  <label className="rr-label">
                    <span>
                      Hình thức tuyển dụng <span className="rr-req">*</span>
                    </span>
                  </label>
                  <select
                    value={form.recruitmentType}
                    onChange={(e) => updateField('recruitmentType', e.target.value)}
                    className="rr-select"
                  >
                    <option value="NEW">Tuyển mới (Mở rộng Headcount)</option>
                    <option value="REPLACEMENT">Tuyển thay thế (Nhân sự nghỉ việc)</option>
                  </select>
                </div>

                {/* Lý do tuyển dụng */}
                <div className="rr-field rr-col-span-2">
                  <label className="rr-label">
                    <span>
                      Lý do & Căn cứ đề xuất tuyển dụng <span className="rr-req">*</span>
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Mô tả mục tiêu kinh doanh, khối lượng công việc phát sinh hoặc nhân sự cũ bàn giao..."
                    value={form.reason}
                    onChange={(e) => updateField('reason', e.target.value)}
                    className={`rr-textarea ${errors.reason ? 'error' : ''}`}
                  />
                  {errors.reason && <p className="rr-error-text">{errors.reason}</p>}
                </div>
              </div>
            </div>

            {/* CARD 2: KẾ HOẠCH LƯƠNG & THỜI GIAN */}
            <div className="rr-card">
              <div className="rr-card-header">
                <div className="rr-card-icon rr-icon-green">
                  <DollarSign size={20} />
                </div>
                <div className="rr-card-title-group">
                  <h2>2. Dự toán Ngân sách Lương & Thời gian tiếp nhận</h2>
                  <p>Mức lương dự kiến theo tháng và ngày mục tiêu nhân sự bắt đầu thử việc</p>
                </div>
              </div>

              {/* Thông tin dải lương chuẩn của Chức danh nếu có */}
              {selectedJob && (
                <div className="rr-salary-standard-box">
                  <div className="rr-salary-standard-label">
                    <Check size={16} />
                    <span>
                      Khung lương chuẩn của vị trí &quot;<strong>{selectedJob.title}</strong>&quot;:
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div className="rr-salary-standard-value">
                      {formatMoney(selectedJob.minSalary)} – {formatMoney(selectedJob.maxSalary)}/tháng
                    </div>
                    {(selectedJob.minSalary || selectedJob.maxSalary) && (
                      <button
                        type="button"
                        onClick={handleApplyStandardSalary}
                        className="rr-salary-apply-btn"
                        title="Tự động áp dụng khung lương này vào ô nhập"
                      >
                        <Zap size={13} /> Áp dụng dải lương chuẩn
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="rr-grid-3">
                {/* Lương min */}
                <div className="rr-field">
                  <label className="rr-label">
                    <span>Lương tối thiểu (Min)</span>
                    {salaryValidation.isMinBelowStandard && (
                      <span className="rr-status-chip-warn">⚠️ Dưới sàn</span>
                    )}
                  </label>
                  <div className="rr-input-wrapper">
                    <input
                      type="number"
                      step="500000"
                      min="0"
                      placeholder="Ví dụ: 15000000"
                      value={form.salaryMin}
                      onChange={(e) => updateField('salaryMin', e.target.value)}
                      className={`rr-input ${salaryValidation.minError || errors.salaryMin ? 'error' : ''}`}
                    />
                    <span className="rr-unit-badge">VND</span>
                  </div>
                  {(salaryValidation.minError || errors.salaryMin) && (
                    <p className="rr-error-text" style={{ color: '#dc2626', fontWeight: 600 }}>
                      {salaryValidation.minError || errors.salaryMin}
                    </p>
                  )}
                  {form.salaryMin && !salaryValidation.minError && !errors.salaryMin && (
                    <p className="rr-helper-text" style={{ color: '#059669', fontWeight: 600 }}>
                      ≈ {formatMoney(form.salaryMin)}
                    </p>
                  )}
                  {Number(form.salaryMin) > 0 && Number(form.salaryMin) < 1000000 && (
                    <p className="rr-helper-text" style={{ color: '#d97706' }}>
                      Lưu ý: Đơn vị tính VNĐ/tháng
                    </p>
                  )}
                </div>

                {/* Lương max */}
                <div className="rr-field">
                  <label className="rr-label">
                    <span>Lương tối đa (Max)</span>
                    {salaryValidation.isMinGreaterThanMax ? (
                      <span style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600 }}>
                        ❌ Min &gt; Max
                      </span>
                    ) : salaryValidation.isMaxAboveStandard ? (
                      <span className="rr-status-chip-warn">⚠️ Vượt trần</span>
                    ) : form.salaryMin && form.salaryMax && salaryValidation.isValid && !salaryValidation.isOutsideSalaryRange ? (
                      <span className="rr-status-chip-ok">✓ Hợp lệ</span>
                    ) : null}
                  </label>
                  <div className="rr-input-wrapper">
                    <input
                      type="number"
                      step="500000"
                      min="0"
                      placeholder="Ví dụ: 30000000"
                      value={form.salaryMax}
                      onChange={(e) => updateField('salaryMax', e.target.value)}
                      className={`rr-input ${salaryValidation.maxError || errors.salaryMax ? 'error' : ''}`}
                    />
                    <span className="rr-unit-badge">VND</span>
                  </div>
                  {(salaryValidation.maxError || errors.salaryMax) && (
                    <p className="rr-error-text" style={{ color: '#dc2626', fontWeight: 600 }}>
                      {salaryValidation.maxError || errors.salaryMax}
                    </p>
                  )}
                  {form.salaryMax && !salaryValidation.maxError && !errors.salaryMax && (
                    <p className="rr-helper-text" style={{ color: '#059669', fontWeight: 600 }}>
                      ≈ {formatMoney(form.salaryMax)}
                    </p>
                  )}
                </div>

                {/* Ngày nhận việc */}
                <div className="rr-field">
                  <label className="rr-label">
                    <span>
                      Ngày cần nhân sự nhận việc <span className="rr-req">*</span>
                    </span>
                    {dateValidation.daysDiff !== null && (
                      dateValidation.isPast ? (
                        <span className="rr-date-badge-urgent">Quá khứ</span>
                      ) : dateValidation.daysDiff === 0 ? (
                        <span className="rr-date-badge-normal">Hôm nay</span>
                      ) : dateValidation.daysDiff < 7 ? (
                        <span className="rr-date-badge-urgent">⚡ Còn {dateValidation.daysDiff} ngày</span>
                      ) : dateValidation.daysDiff < 14 ? (
                        <span className="rr-date-badge-warning">Còn {dateValidation.daysDiff} ngày</span>
                      ) : (
                        <span className="rr-date-badge-normal">Còn {dateValidation.daysDiff} ngày</span>
                      )
                    )}
                  </label>
                  <div className="rr-input-wrapper">
                    <Calendar className="rr-input-icon" />
                    <input
                      type="date"
                      min={todayStr}
                      value={form.neededDate}
                      onChange={(e) => updateField('neededDate', e.target.value)}
                      className={`rr-input rr-input-with-icon ${dateValidation.error || errors.neededDate ? 'error' : ''}`}
                    />
                  </div>
                  {(dateValidation.error || errors.neededDate) ? (
                    <p className="rr-error-text" style={{ color: '#dc2626', fontWeight: 600 }}>
                      {dateValidation.error || errors.neededDate}
                    </p>
                  ) : dateValidation.daysDiff !== null && dateValidation.daysDiff < 14 && dateValidation.daysDiff >= 0 ? (
                    <p className="rr-helper-text" style={{ color: '#c2410c' }}>
                      ⚡ Lưu ý: Yêu cầu nhân sự gấp (dưới 14 ngày làm việc)
                    </p>
                  ) : (
                    <p className="rr-helper-text">Ngày mục tiêu hoàn tất thử việc và onboard</p>
                  )}
                </div>
              </div>

              {/* Cảnh báo vượt khung lương & Ô giải trình bắt buộc */}
              {salaryValidation.isOutsideSalaryRange && (
                <div className="rr-salary-warning-box">
                  <div className="rr-salary-warning-header">
                    <ShieldAlert size={18} />
                    <span>Dải lương đề xuất nằm ngoài khung lương tiêu chuẩn của chức danh</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5 }}>
                    {salaryValidation.isMinBelowStandard && (
                      <p style={{ margin: '0 0 4px' }}>
                        • Lương tối thiểu <strong>{formatMoney(form.salaryMin)}</strong> thấp hơn mức sàn chuẩn (<strong>{formatMoney(selectedJob?.minSalary)}</strong>).
                      </p>
                    )}
                    {salaryValidation.isMaxAboveStandard && (
                      <p style={{ margin: '0 0 4px' }}>
                        • Lương tối đa <strong>{formatMoney(form.salaryMax)}</strong> vượt mức trần chuẩn (<strong>{formatMoney(selectedJob?.maxSalary)}</strong>).
                      </p>
                    )}
                    <p style={{ margin: 0, fontWeight: 500 }}>
                      Quy định tuyển dụng yêu cầu cung cấp lý do giải trình để Hội đồng tuyển dụng và HR Manager xem xét phê duyệt ngoại lệ.
                    </p>
                  </div>
                  <div className="rr-field" style={{ marginTop: '4px' }}>
                    <label className="rr-label">
                      <span>
                        Lý do giải trình dải lương ngoài khung chuẩn <span className="rr-req">*</span>
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Giải trình lý do đề xuất ngoài khung (ví dụ: công nghệ hiếm, tuyển Lead chuyên sâu, ứng viên vượt bậc năng lực, thị trường biến động...)"
                      value={form.salaryExplanation}
                      onChange={(e) => updateField('salaryExplanation', e.target.value)}
                      className={`rr-textarea ${errors.salaryExplanation ? 'error' : ''}`}
                    />
                    {errors.salaryExplanation && (
                      <p className="rr-error-text">{errors.salaryExplanation}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CARD 3: BẢN MÔ TẢ CÔNG VIỆC JD */}
            <div className="rr-card">
              <div className="rr-card-header">
                <div className="rr-card-icon rr-icon-purple">
                  <FileText size={20} />
                </div>
                <div className="rr-card-title-group">
                  <h2>3. Bản Mô tả Công việc (JD) & Tiêu chuẩn Tuyển chọn</h2>
                  <p>Căn cứ quan trọng để HR đăng tin tuyển dụng và thiết lập bài phỏng vấn</p>
                </div>
              </div>

              <div className="rr-grid-2">
                {/* Hình thức làm việc */}
                <div className="rr-field">
                  <label className="rr-label">
                    <span>Hình thức làm việc</span>
                  </label>
                  <select
                    value={form.workingModel}
                    onChange={(e) => updateField('workingModel', e.target.value)}
                    className="rr-select"
                  >
                    <option value="ONSITE">Toàn thời gian tại văn phòng (Onsite)</option>
                    <option value="HYBRID">Linh hoạt kết hợp (Hybrid)</option>
                    <option value="REMOTE">Làm việc từ xa (Remote 100%)</option>
                  </select>
                </div>

                {/* Địa điểm */}
                <div className="rr-field">
                  <label className="rr-label">
                    <span>Địa điểm làm việc</span>
                  </label>
                  <div className="rr-input-wrapper">
                    <MapPin className="rr-input-icon" />
                    <input
                      type="text"
                      placeholder="Ví dụ: Tòa nhà FPT Tower, Cầu Giấy, Hà Nội"
                      value={form.workLocation}
                      onChange={(e) => updateField('workLocation', e.target.value)}
                      className="rr-input rr-input-with-icon"
                    />
                  </div>
                </div>

                {/* Mô tả công việc */}
                <div className="rr-field rr-col-span-2">
                  <label className="rr-label">
                    <span>
                      Mô tả công việc (Job Description) <span className="rr-req">*</span>
                    </span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="- Phát triển các module backend trên nền Spring Boot, PostgreSQL&#10;- Tối ưu hóa hiệu năng cơ sở dữ liệu và xử lý caching&#10;- Phối hợp cùng Product Team phân tích yêu cầu..."
                    value={form.jobDescription}
                    onChange={(e) => updateField('jobDescription', e.target.value)}
                    className={`rr-textarea ${errors.jobDescription ? 'error' : ''}`}
                  />
                  {errors.jobDescription && (
                    <p className="rr-error-text">{errors.jobDescription}</p>
                  )}
                </div>

                {/* Yêu cầu ứng viên */}
                <div className="rr-field rr-col-span-2">
                  <label className="rr-label">
                    <span>
                      Yêu cầu ứng viên (Requirements) <span className="rr-req">*</span>
                    </span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="- Tối thiểu 2 năm kinh nghiệm lập trình Java/Spring Boot&#10;- Nắm vững kiến thức RESTful API, Docker, CI/CD cơ bản&#10;- Kỹ năng làm việc nhóm, giao tiếp chủ động..."
                    value={form.candidateRequirements}
                    onChange={(e) => updateField('candidateRequirements', e.target.value)}
                    className={`rr-textarea ${errors.candidateRequirements ? 'error' : ''}`}
                  />
                  {errors.candidateRequirements && (
                    <p className="rr-error-text">{errors.candidateRequirements}</p>
                  )}
                </div>

                {/* Quyền lợi đãi ngộ */}
                <div className="rr-field rr-col-span-2">
                  <label className="rr-label">
                    <span>Quyền lợi & Chế độ đãi ngộ (Benefits)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="- Lương tháng 13 + thưởng hiệu quả dự án hằng quý&#10;- Bảo hiểm sức khỏe cao cấp Bảo Việt / PVI&#10;- Xem xét điều chỉnh lương 2 lần/năm, hỗ trợ học chứng chỉ quốc tế..."
                    value={form.benefits}
                    onChange={(e) => updateField('benefits', e.target.value)}
                    className="rr-textarea"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Sidebar Preview & Actions */}
          <div className="rr-sidebar">
            {/* Live Requisition Card Preview */}
            <div className="rr-preview-card">
              <div className="rr-preview-header">
                <span className="rr-preview-badge-live">Xem trước hiển thị</span>
                <span className="rr-preview-type-badge">
                  {form.recruitmentType === 'NEW' ? 'Tuyển mới' : 'Tuyển thay thế'}
                </span>
              </div>

              <h3 className="rr-preview-title">
                {form.title.trim() || 'Chưa đặt tiêu đề yêu cầu tuyển dụng'}
              </h3>

              <div className="rr-preview-chips">
                <span className="rr-chip">
                  <Building2 size={13} />
                  {selectedDept ? selectedDept.name : 'Chưa chọn phòng ban'}
                </span>
                <span className="rr-chip">
                  <Users size={13} />
                  SL: {form.quantity || 1} người
                </span>
                <span className="rr-chip">
                  <MapPin size={13} />
                  {form.workingModel === 'ONSITE'
                    ? 'Onsite'
                    : form.workingModel === 'HYBRID'
                    ? 'Hybrid'
                    : 'Remote'}
                </span>
              </div>

              <div className="rr-preview-salary-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="rr-preview-salary-label">Mức lương dự kiến</span>
                  {salaryValidation.isOutsideSalaryRange ? (
                    <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>Ngoài khung chuẩn</span>
                  ) : form.salaryMin || form.salaryMax ? (
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>Khung chuẩn</span>
                  ) : null}
                </div>
                <span className="rr-preview-salary-value">
                  {formatSalaryPreview(form.salaryMin, form.salaryMax)}
                </span>
              </div>

              {form.neededDate && (
                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} />
                  <span>
                    Mục tiêu nhận việc: <strong>{form.neededDate}</strong>
                    {dateValidation.daysDiff !== null && dateValidation.daysDiff >= 0 && (
                      <span style={{ marginLeft: '4px', color: dateValidation.daysDiff < 14 ? '#ea580c' : '#059669', fontWeight: 600 }}>
                        (còn {dateValidation.daysDiff} ngày)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Approval Workflow Info */}
            <div className="rr-workflow-card">
              <h3>
                <ChevronRight size={16} /> Quy trình phê duyệt dự kiến
              </h3>
              <div className="rr-steps">
                <div className="rr-step-item active">
                  <div className="rr-step-num">1</div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block' }}>Khởi tạo & Lưu nháp</strong>
                    <span>Hiring Manager soạn thảo và kiểm tra khung lương & ngày nhận việc</span>
                  </div>
                </div>
                <div className="rr-step-item">
                  <div className="rr-step-num">2</div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block' }}>Thẩm định & Phê duyệt</strong>
                    <span>HR Manager và BOD duyệt định biên & dải lương (xem xét giải trình)</span>
                  </div>
                </div>
                <div className="rr-step-item">
                  <div className="rr-step-num">3</div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block' }}>Kích hoạt tuyển dụng</strong>
                    <span>Tự động phân bổ Recruiter và đăng tin tuyển dụng</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="rr-actions-card">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rr-btn-primary"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Gửi yêu cầu phê duyệt'}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveDraft}
                className="rr-btn-secondary"
              >
                Lưu bản nháp
              </button>

              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textAlign: 'center', lineHeight: 1.4 }}>
                Bản nháp có thể chỉnh sửa tự do bất cứ lúc nào trước khi gửi phê duyệt chính thức.
              </p>
            </div>
          </div>
        </form>
      )}

      {/* ====================================================================
          TAB 2: DANH SÁCH YÊU CẦU TUYỂN DỤNG
          ==================================================================== */}
      {activeTab === 'list' && (
        <div className="rr-list-card">
          <div className="rr-list-toolbar">
            <div className="rr-list-title-group">
              <h2>Danh sách Yêu cầu tuyển dụng của bạn</h2>
              <p>Quản lý toàn bộ các bản nháp và tiến độ các yêu cầu đã gửi phê duyệt</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div className="rr-input-wrapper" style={{ minWidth: '220px' }}>
                <Search className="rr-input-icon" />
                <input
                  type="text"
                  placeholder="Tìm mã hoặc tiêu đề..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rr-input rr-input-with-icon"
                  style={{ padding: '8px 12px 8px 36px', fontSize: '0.84rem' }}
                />
              </div>

              {/* Status filter dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rr-select"
                style={{ width: 'auto', padding: '8px 12px', fontSize: '0.84rem' }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="DRAFT">Chỉ bản nháp</option>
                <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
                <option value="APPROVED">Đã phê duyệt</option>
                <option value="REJECTED">Bị từ chối</option>
              </select>

              <button
                type="button"
                onClick={loadRequisitions}
                className="rr-btn-secondary"
                style={{ width: 'auto', padding: '8px 14px', fontSize: '0.84rem' }}
              >
                <RefreshCw size={14} className={isLoadingList ? 'animate-spin' : ''} />
                Làm mới
              </button>
            </div>
          </div>

          <div className="rr-table-wrapper">
            <table className="rr-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Mã yêu cầu</th>
                  <th>Tiêu đề & Chức danh</th>
                  <th>Phòng ban</th>
                  <th style={{ textAlign: 'center', width: '70px' }}>SL</th>
                  <th>Dải lương dự kiến</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="rr-empty-state">
                        <div className="rr-empty-icon">
                          <FileText size={32} />
                        </div>
                        <h4 className="rr-empty-title">Không tìm thấy yêu cầu tuyển dụng nào</h4>
                        <p className="rr-empty-desc">
                          Bạn chưa tạo yêu cầu nào hoặc không có yêu cầu nào khớp với bộ lọc hiện tại.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('create');
                            setForm(EMPTY_FORM);
                          }}
                          className="rr-btn-primary"
                          style={{ width: 'auto', padding: '9px 18px', marginTop: '6px' }}
                        >
                          Tạo yêu cầu tuyển dụng ngay
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequisitions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="rr-code-pill">{item.requisitionCode}</span>
                      </td>
                      <td>
                        <div className="rr-job-main-col">
                          <span className="rr-job-title-text">{item.title}</span>
                          <span className="rr-job-sub-text">
                            <Briefcase size={12} />
                            {item.jobTitleName || 'Chưa gán chức danh'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{item.departmentName || '-'}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#1e40af' }}>
                        {item.quantity}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
                          {formatSalaryPreview(item.salaryMin ? String(item.salaryMin) : '', item.salaryMax ? String(item.salaryMax) : '')}
                        </span>
                      </td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>
                        <div className="rr-actions-cell">
                          {item.status === 'DRAFT' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditDraft(item)}
                                className="rr-btn-table-edit"
                                title="Chỉnh sửa bản nháp"
                              >
                                <Edit3 size={13} />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDraft(item.id)}
                                className="rr-btn-table-del"
                                title="Xóa bản nháp"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              Đang xử lý
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentRequestPage;