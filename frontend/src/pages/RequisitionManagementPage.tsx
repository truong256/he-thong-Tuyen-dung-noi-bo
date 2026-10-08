import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  Save,
  Send,
  X,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import requisitionApi from '../api/requisition';
import organizationApi from '../api/organization';
import jobTitleApi from '../api/jobTitle';
import { Requisition, RequisitionPayload } from '../types/requisition';
import { Department } from '../types/organization';
import { JobTitle } from '../types/jobTitle';
import '../styles/requisitions.css';

export const RequisitionManagementPage: React.FC = () => {
  const { user, hasPermission, hasAnyRole } = useAuth();
  const canCreate = hasPermission ? hasPermission('REQUISITION_CREATE') : hasAnyRole(['HIRING_MANAGER', 'HR_MANAGER', 'ADMIN']);

  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState<number | undefined>(undefined);

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requisition | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [jobTitleId, setJobTitleId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<'REPLACEMENT' | 'NEW_HEADCOUNT'>('NEW_HEADCOUNT');
  const [proposedMinSalary, setProposedMinSalary] = useState<string>('');
  const [proposedMaxSalary, setProposedMaxSalary] = useState<string>('');
  const [salaryExplanation, setSalaryExplanation] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [requirements, setRequirements] = useState('');

  // Form validation errors & toast
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Detail Modal
  const [detailReq, setDetailReq] = useState<Requisition | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load requisitions & reference catalogs
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reqRes, deptRes, jtRes] = await Promise.all([
        requisitionApi.list({
          search: search.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          departmentId: deptFilter,
        }),
        organizationApi.getDepartments(),
        jobTitleApi.getJobTitles(),
      ]);
      setRequisitions(reqRes.content || []);
      setDepartments(deptRes || []);
      setJobTitles(jtRes || []);
    } catch (err: any) {
      console.error('Failed to load requisitions:', err);
      showToast(err.response?.data?.message || 'Không thể tải danh sách yêu cầu tuyển dụng.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, deptFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected Job Title for standard salary validation
  const selectedJobTitleObj = useMemo(() => {
    if (!jobTitleId) return null;
    return jobTitles.find((j) => j.id === Number(jobTitleId)) || null;
  }, [jobTitleId, jobTitles]);

  // Check if proposed salary is out of standard range
  const isOutOfSalaryRange = useMemo(() => {
    if (!selectedJobTitleObj) return false;
    const minVal = proposedMinSalary ? Number(proposedMinSalary) : null;
    const maxVal = proposedMaxSalary ? Number(proposedMaxSalary) : null;
    let out = false;
    if (selectedJobTitleObj.minSalary && minVal !== null && minVal < selectedJobTitleObj.minSalary) {
      out = true;
    }
    if (selectedJobTitleObj.maxSalary && maxVal !== null && maxVal > selectedJobTitleObj.maxSalary) {
      out = true;
    }
    return out;
  }, [selectedJobTitleObj, proposedMinSalary, proposedMaxSalary]);

  const openCreateModal = () => {
    setEditingReq(null);
    // If Hiring Manager, prefill or default to managed department if available
    const managedDept = departments.find((d) => (d as any).managerUserId === user?.id || d.code === 'DEV-BE') || departments[0];
    const initialDeptId = managedDept ? managedDept.id : '';
    setDepartmentId(initialDeptId);

    // Pick job title corresponding to department if possible
    const matchingJt = jobTitles.find((j) => j.departmentId === initialDeptId) || jobTitles[0];
    setJobTitleId(matchingJt ? matchingJt.id : '');
    setQuantity(1);
    setReason('NEW_HEADCOUNT');
    setProposedMinSalary('');
    setProposedMaxSalary('');
    setSalaryExplanation('');
    // default target date 30 days from now
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setTargetDate(nextMonth.toISOString().split('T')[0]);
    setJobDescription('');
    setRequirements('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (req: Requisition) => {
    setEditingReq(req);
    setTitle(req.title);
    setDepartmentId(req.departmentId);
    setJobTitleId(req.jobTitleId);
    setQuantity(req.quantity);
    setReason(req.reason);
    setProposedMinSalary(req.proposedMinSalary ? String(req.proposedMinSalary) : '');
    setProposedMaxSalary(req.proposedMaxSalary ? String(req.proposedMaxSalary) : '');
    setSalaryExplanation(req.salaryExplanation || '');
    setTargetDate(req.targetDate || '');
    setJobDescription(req.jobDescription || '');
    setRequirements(req.requirements || '');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề yêu cầu tuyển dụng.';
    }
    if (!departmentId) {
      errors.departmentId = 'Vui lòng chọn phòng ban.';
    }
    if (!jobTitleId) {
      errors.jobTitleId = 'Vui lòng chọn chức danh.';
    }
    if (!quantity || quantity < 1) {
      errors.quantity = 'Số lượng tuyển dụng phải từ 1 trở lên.';
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (targetDate && targetDate < todayStr) {
      errors.targetDate = 'Ngày cần người không được ở quá khứ.';
    }

    const minSal = proposedMinSalary ? Number(proposedMinSalary) : null;
    const maxSal = proposedMaxSalary ? Number(proposedMaxSalary) : null;
    if (minSal !== null && maxSal !== null && minSal > maxSal) {
      errors.salary = 'Lương tối thiểu không được lớn hơn lương tối đa.';
    }

    if (isOutOfSalaryRange && !salaryExplanation.trim()) {
      errors.salaryExplanation = 'Dải lương đề xuất nằm ngoài khung chuẩn, bắt buộc nhập giải trình.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!validateForm()) return;

    const payload: RequisitionPayload = {
      title: title.trim(),
      departmentId: Number(departmentId),
      jobTitleId: Number(jobTitleId),
      quantity,
      reason,
      proposedMinSalary: proposedMinSalary ? Number(proposedMinSalary) : undefined,
      proposedMaxSalary: proposedMaxSalary ? Number(proposedMaxSalary) : undefined,
      salaryExplanation: salaryExplanation.trim() || undefined,
      targetDate: targetDate || undefined,
      jobDescription: jobDescription.trim() || undefined,
      requirements: requirements.trim() || undefined,
      isDraft,
    };

    try {
      if (editingReq) {
        await requisitionApi.update(editingReq.id, payload);
        showToast(isDraft ? 'Đã lưu nháp yêu cầu thành công.' : 'Đã cập nhật và gửi yêu cầu thành công.');
      } else {
        await requisitionApi.create(payload);
        showToast(isDraft ? 'Đã lưu nháp yêu cầu tuyển dụng.' : 'Đã gửi yêu cầu tuyển dụng để phê duyệt.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra khi lưu yêu cầu tuyển dụng.', 'error');
    }
  };

  const handleDelete = async (req: Requisition) => {
    if (req.status !== 'DRAFT') {
      showToast('Chỉ có thể xóa yêu cầu ở trạng thái Lưu nháp (DRAFT).', 'error');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản nháp "${req.title}"?`)) {
      return;
    }
    try {
      await requisitionApi.delete(req.id);
      showToast('Đã xóa bản nháp yêu cầu tuyển dụng.');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể xóa bản nháp.', 'error');
    }
  };

  const formatCurrency = (val?: number) => {
    if (!val) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="req-badge req-badge-draft"><Clock size={12} /> Lưu nháp</span>;
      case 'PENDING_APPROVAL':
        return <span className="req-badge req-badge-pending"><AlertTriangle size={12} /> Chờ duyệt</span>;
      case 'APPROVED':
        return <span className="req-badge req-badge-approved"><CheckCircle size={12} /> Đã duyệt</span>;
      case 'REJECTED':
        return <span className="req-badge req-badge-rejected"><XCircle size={12} /> Bị từ chối</span>;
      default:
        return <span className="req-badge req-badge-draft">{status}</span>;
    }
  };

  return (
    <div className="req-container">
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontWeight: 500,
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Hero Banner */}
      <div className="req-hero-card">
        <div className="req-hero-info">
          <div className="req-hero-icon">
            <FileText size={28} />
          </div>
          <div className="req-hero-text">
            <h1>Yêu cầu Tuyển dụng (Requisition)</h1>
            <p>Khai báo nhu cầu nhân sự, quản lý và theo dõi trạng thái yêu cầu tuyển dụng</p>
          </div>
        </div>
        {canCreate && (
          <div className="req-hero-actions">
            <button
              type="button"
              id="btn-create-requisition"
              className="req-btn-primary"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              <span>Tạo yêu cầu mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="req-filter-card">
        <div className="req-search-box">
          <Search size={18} />
          <input
            type="text"
            className="req-search-input"
            placeholder="Tìm theo mã yêu cầu hoặc tiêu đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="req-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="DRAFT">Lưu nháp (DRAFT)</option>
          <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
        </select>

        <select
          className="req-select"
          value={deptFilter || ''}
          onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table Card */}
      <div className="req-table-card">
        {isLoading ? (
          <div className="req-empty-state">Đang tải danh sách yêu cầu tuyển dụng...</div>
        ) : requisitions.length === 0 ? (
          <div className="req-empty-state">
            <Briefcase size={48} className="req-empty-icon" />
            <h3>Chưa có yêu cầu tuyển dụng nào</h3>
            <p>Hãy tạo yêu cầu tuyển dụng mới cho phòng ban của bạn.</p>
          </div>
        ) : (
          <table className="req-table">
            <thead>
              <tr>
                <th>Mã Yêu Cầu</th>
                <th>Tiêu Đề & Vị Trí</th>
                <th>Phòng Ban</th>
                <th>Số Lượng</th>
                <th>Lý Do Tuyển</th>
                <th>Ngày Cần</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map((req) => (
                <tr key={req.id}>
                  <td>
                    <span className="req-code-badge">{req.requisitionCode}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{req.jobTitleName || '—'}</div>
                  </td>
                  <td>{req.departmentName || '—'}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{req.quantity}</span> người
                  </td>
                  <td>
                    <span className="req-reason-tag">
                      {req.reason === 'REPLACEMENT' ? 'Thay thế' : 'Tăng mới'}
                    </span>
                  </td>
                  <td>{req.targetDate || '—'}</td>
                  <td>{renderStatusBadge(req.status)}</td>
                  <td>
                    <div className="req-actions-cell">
                      <button
                        type="button"
                        className="req-action-btn"
                        title="Xem chi tiết"
                        onClick={() => setDetailReq(req)}
                      >
                        <Eye size={16} />
                      </button>
                      {(req.status === 'DRAFT' || req.status === 'PENDING_APPROVAL') && (
                        <button
                          type="button"
                          className="req-action-btn"
                          title="Chỉnh sửa"
                          onClick={() => openEditModal(req)}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {req.status === 'DRAFT' && (
                        <button
                          type="button"
                          className="req-action-btn delete"
                          title="Xóa bản nháp"
                          onClick={() => handleDelete(req)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Tạo / Sửa Yêu cầu Tuyển dụng */}
      {isModalOpen && (
        <div className="req-modal-backdrop">
          <div className="req-modal-content">
            <div className="req-modal-header">
              <h2>{editingReq ? 'Cập nhật yêu cầu tuyển dụng' : 'Tạo yêu cầu tuyển dụng mới'}</h2>
              <button
                type="button"
                className="req-action-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="req-modal-body">
              <div className="req-form-group">
                <label className="req-label">
                  Tiêu đề yêu cầu <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="req-input"
                  placeholder="Ví dụ: Tuyển dụng Senior Java Developer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {formErrors.title && <span className="req-error-text">{formErrors.title}</span>}
              </div>

              <div className="req-form-grid">
                <div className="req-form-group">
                  <label className="req-label">
                    Phòng ban <span className="required">*</span>
                  </label>
                  <select
                    className="req-input"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.departmentId && <span className="req-error-text">{formErrors.departmentId}</span>}
                </div>

                <div className="req-form-group">
                  <label className="req-label">
                    Chức danh chuẩn <span className="required">*</span>
                  </label>
                  <select
                    className="req-input"
                    value={jobTitleId}
                    onChange={(e) => setJobTitleId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- Chọn chức danh --</option>
                    {jobTitles.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} {j.level ? `(${j.level})` : ''}
                      </option>
                    ))}
                  </select>
                  {formErrors.jobTitleId && <span className="req-error-text">{formErrors.jobTitleId}</span>}
                  {selectedJobTitleObj && (
                    <span className="req-salary-info">
                      Khung chuẩn: {formatCurrency(selectedJobTitleObj.minSalary)} - {formatCurrency(selectedJobTitleObj.maxSalary)}
                    </span>
                  )}
                </div>

                <div className="req-form-group">
                  <label className="req-label">
                    Số lượng tuyển dụng <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="req-input"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                  {formErrors.quantity && <span className="req-error-text">{formErrors.quantity}</span>}
                </div>

                <div className="req-form-group">
                  <label className="req-label">
                    Lý do tuyển <span className="required">*</span>
                  </label>
                  <select
                    className="req-input"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as any)}
                  >
                    <option value="NEW_HEADCOUNT">Tăng mới headcount</option>
                    <option value="REPLACEMENT">Thay thế nhân sự nghỉ</option>
                  </select>
                </div>

                <div className="req-form-group">
                  <label className="req-label">Mức lương tối thiểu đề xuất (VND)</label>
                  <input
                    type="number"
                    className="req-input"
                    placeholder="Ví dụ: 20000000"
                    value={proposedMinSalary}
                    onChange={(e) => setProposedMinSalary(e.target.value)}
                  />
                </div>

                <div className="req-form-group">
                  <label className="req-label">Mức lương tối đa đề xuất (VND)</label>
                  <input
                    type="number"
                    className="req-input"
                    placeholder="Ví dụ: 35000000"
                    value={proposedMaxSalary}
                    onChange={(e) => setProposedMaxSalary(e.target.value)}
                  />
                </div>
              </div>

              {formErrors.salary && <span className="req-error-text">{formErrors.salary}</span>}

              {/* Cảnh báo dải lương ngoài chuẩn & bắt buộc giải trình */}
              {isOutOfSalaryRange && (
                <div className="req-salary-warning">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <AlertTriangle size={18} />
                    <span>Dải lương đề xuất nằm ngoài khung chuẩn của chức danh</span>
                  </div>
                  <span>
                    Chức danh này có khung chuẩn từ {formatCurrency(selectedJobTitleObj?.minSalary)} đến{' '}
                    {formatCurrency(selectedJobTitleObj?.maxSalary)}. Vui lòng cung cấp giải trình chi tiết lý do vượt khung.
                  </span>
                </div>
              )}

              {(isOutOfSalaryRange || editingReq?.salaryExplanation) && (
                <div className="req-form-group">
                  <label className="req-label">
                    Giải trình dải lương ngoài chuẩn <span className="required">*</span>
                  </label>
                  <textarea
                    className="req-textarea"
                    placeholder="Nêu rõ lý do đề xuất mức lương ngoài khung chuẩn..."
                    value={salaryExplanation}
                    onChange={(e) => setSalaryExplanation(e.target.value)}
                  />
                  {formErrors.salaryExplanation && (
                    <span className="req-error-text">{formErrors.salaryExplanation}</span>
                  )}
                </div>
              )}

              <div className="req-form-group">
                <label className="req-label">
                  Ngày cần người đi làm <span className="required">*</span>
                </label>
                <input
                  type="date"
                  className="req-input"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
                {formErrors.targetDate && <span className="req-error-text">{formErrors.targetDate}</span>}
              </div>

              <div className="req-form-group">
                <label className="req-label">Mô tả công việc</label>
                <textarea
                  className="req-textarea"
                  placeholder="Mô tả các nhiệm vụ chính của vị trí..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <div className="req-form-group">
                <label className="req-label">Yêu cầu ứng viên</label>
                <textarea
                  className="req-textarea"
                  placeholder="Kỹ năng, kinh nghiệm, bằng cấp cần thiết..."
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
              </div>
            </div>

            <div className="req-modal-footer">
              <button
                type="button"
                className="req-btn-secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                id="btn-save-draft"
                className="req-btn-secondary"
                onClick={() => handleSubmit(true)}
              >
                <Save size={16} />
                <span>Lưu nháp</span>
              </button>
              <button
                type="button"
                id="btn-submit-requisition"
                className="req-btn-primary"
                onClick={() => handleSubmit(false)}
              >
                <Send size={16} />
                <span>Gửi yêu cầu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi tiết Yêu cầu Tuyển dụng */}
      {detailReq && (
        <div className="req-modal-backdrop">
          <div className="req-modal-content">
            <div className="req-modal-header">
              <h2>Chi tiết Yêu cầu: {detailReq.requisitionCode}</h2>
              <button
                type="button"
                className="req-action-btn"
                onClick={() => setDetailReq(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="req-modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>{detailReq.title}</h3>
                {renderStatusBadge(detailReq.status)}
              </div>

              <div className="req-form-grid" style={{ marginTop: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Phòng ban:</span>
                  <div style={{ fontWeight: 600 }}>{detailReq.departmentName || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Chức danh:</span>
                  <div style={{ fontWeight: 600 }}>{detailReq.jobTitleName || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Số lượng cần tuyển:</span>
                  <div style={{ fontWeight: 600 }}>{detailReq.quantity} người</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Lý do tuyển dụng:</span>
                  <div style={{ fontWeight: 600 }}>
                    {detailReq.reason === 'REPLACEMENT' ? 'Thay thế nhân sự nghỉ' : 'Tăng mới headcount'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Dải lương đề xuất:</span>
                  <div style={{ fontWeight: 600 }}>
                    {formatCurrency(detailReq.proposedMinSalary)} - {formatCurrency(detailReq.proposedMaxSalary)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Ngày cần người:</span>
                  <div style={{ fontWeight: 600 }}>{detailReq.targetDate || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Người tạo yêu cầu:</span>
                  <div style={{ fontWeight: 600 }}>{detailReq.createdByName || '—'}</div>
                </div>
              </div>

              {detailReq.salaryExplanation && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Giải trình dải lương đề xuất:</span>
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#1e293b' }}>{detailReq.salaryExplanation}</p>
                </div>
              )}

              {detailReq.jobDescription && (
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Mô tả công việc:</span>
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                    {detailReq.jobDescription}
                  </p>
                </div>
              )}

              {detailReq.requirements && (
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Yêu cầu ứng viên:</span>
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                    {detailReq.requirements}
                  </p>
                </div>
              )}
            </div>

            <div className="req-modal-footer">
              <button
                type="button"
                className="req-btn-primary"
                onClick={() => setDetailReq(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisitionManagementPage;
