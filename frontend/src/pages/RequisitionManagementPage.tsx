import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  X,
  Briefcase,
  Copy,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import requisitionApi from '../api/requisition';
import organizationApi from '../api/organization';
import jobTitleApi from '../api/jobTitle';
import { Requisition, RequisitionPayload, RequisitionAssignments } from '../types/requisition';
import { Department } from '../types/organization';
import { JobTitle } from '../types/jobTitle';
import { PageHeader } from '../components/common/PageHeader';
import { ApprovalTimelineModal } from '../components/requisition/ApprovalTimelineModal';
import { AssignRecruiterModal } from '../components/requisition/AssignRecruiterModal';
import { formatNumberWithCommas, handleNumberInputChange, parseNumberFromCommas } from '../utils/numberFormat';
import '../styles/requisitions.css';

export const RequisitionManagementPage: React.FC = () => {
  const { user, hasPermission, hasAnyRole } = useAuth();
  const isHrOrAdmin = hasAnyRole(['HR_MANAGER', 'ADMIN']) || (user?.roles || []).some((r: any) => r === 'HR_MANAGER' || r === 'ADMIN');
  const isHiringManagerOnly = !isHrOrAdmin && (hasAnyRole(['HIRING_MANAGER']) || (user?.roles || []).some((r: any) => r === 'HIRING_MANAGER'));

  const canCreate = hasPermission ? hasPermission('REQUISITION_CREATE') : hasAnyRole(['HIRING_MANAGER', 'HR_MANAGER', 'ADMIN']);
  const canApprove = hasPermission ? hasPermission('REQUISITION_APPROVE') : hasAnyRole(['HIRING_MANAGER', 'APPROVER', 'HR_MANAGER', 'ADMIN']);
  const canAssign = hasPermission ? hasPermission('RECRUITER_ASSIGN') : hasAnyRole(['HR_MANAGER', 'ADMIN']);

  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timelineReqId, setTimelineReqId] = useState<number | null>(null);

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
  const [recruitmentType, setRecruitmentType] = useState<'REPLACEMENT' | 'NEW_HEADCOUNT'>('NEW_HEADCOUNT');
  const [reason, setReason] = useState<string>('');
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

  // Assign Recruiter Modal (S3-06)
  const [assignModalReq, setAssignModalReq] = useState<Requisition | null>(null);
  const [assignmentMap, setAssignmentMap] = useState<Record<number, RequisitionAssignments>>({});

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
      const items = reqRes.content || [];
      setRequisitions(items);
      setDepartments(deptRes || []);
      setJobTitles(jtRes || []);

      // Load assignments for visible requisitions
      if (items.length > 0) {
        Promise.allSettled(
          items.map((r) => requisitionApi.getAssignments(r.id))
        ).then((results) => {
          const map: Record<number, RequisitionAssignments> = {};
          results.forEach((res) => {
            if (res.status === 'fulfilled' && res.value) {
              map[res.value.requisitionId] = res.value;
            }
          });
          setAssignmentMap(map);
        });
      }
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

  const availableDepartments = useMemo(() => {
    if (isHiringManagerOnly) {
      const filtered = departments.filter((d: any) => d.managerUserId === user?.id);
      return filtered.length > 0 ? filtered : departments;
    }
    return departments;
  }, [departments, isHiringManagerOnly, user]);

  // Selected Job Title for standard salary validation & headcount
  const selectedJobTitleObj = useMemo(() => {
    if (!jobTitleId) return null;
    return jobTitles.find((j) => j.id === Number(jobTitleId)) || null;
  }, [jobTitleId, jobTitles]);

  const jobHeadcountInfo = useMemo(() => {
    if (!selectedJobTitleObj) return null;
    const std = selectedJobTitleObj.standardHeadcount;
    const curr = selectedJobTitleObj.currentHeadcount || 0;
    if (std === undefined || std === null) return null;
    const remaining = Math.max(0, std - curr);
    const isOverQuota = quantity > remaining;
    return { std, curr, remaining, isOverQuota };
  }, [selectedJobTitleObj, quantity]);

  // Check if proposed salary is out of standard range
  const isOutOfSalaryRange = useMemo(() => {
    if (!selectedJobTitleObj) return false;
    const cleanMin = parseNumberFromCommas(proposedMinSalary);
    const cleanMax = parseNumberFromCommas(proposedMaxSalary);
    const minVal = cleanMin ? Number(cleanMin) : null;
    const maxVal = cleanMax ? Number(cleanMax) : null;
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
    setTitle('');
    // If Hiring Manager, prefill or default to managed department if available
    const managedDept = departments.find((d: any) => d.managerUserId === user?.id) || availableDepartments[0];
    const initialDeptId = managedDept ? managedDept.id : '';
    setDepartmentId(initialDeptId);

    // Pick job title corresponding to department if possible
    const matchingJt = jobTitles.find((j) => j.departmentId === initialDeptId) || jobTitles[0];
    setJobTitleId(matchingJt ? matchingJt.id : '');
    setQuantity(1);
    setRecruitmentType('NEW_HEADCOUNT');
    setReason('');
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
    setTitle(req.title || '');
    setDepartmentId(req.departmentId);
    setJobTitleId(req.jobTitleId);
    setQuantity(req.quantity);
    const rType = (req.recruitmentType === 'REPLACEMENT' || req.reason === 'REPLACEMENT') ? 'REPLACEMENT' : 'NEW_HEADCOUNT';
    setRecruitmentType(rType);
    setReason(req.reason && req.reason !== 'REPLACEMENT' && req.reason !== 'NEW_HEADCOUNT' ? req.reason : '');
    const minSal = req.proposedMinSalary ?? req.salaryMin;
    const maxSal = req.proposedMaxSalary ?? req.salaryMax;
    setProposedMinSalary(minSal !== undefined && minSal !== null ? String(minSal) : '');
    setProposedMaxSalary(maxSal !== undefined && maxSal !== null ? String(maxSal) : '');
    setSalaryExplanation(req.salaryExplanation || '');
    setTargetDate(req.targetDate || req.neededDate || '');
    setJobDescription(req.jobDescription || '');
    setRequirements(req.requirements || req.candidateRequirements || '');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (isDraft: boolean): boolean => {
    const errors: Record<string, string> = {};
    const todayStr = new Date().toISOString().split('T')[0];

    const cleanMin = parseNumberFromCommas(proposedMinSalary);
    const cleanMax = parseNumberFromCommas(proposedMaxSalary);
    const minSal = cleanMin ? Number(cleanMin) : null;
    const maxSal = cleanMax ? Number(cleanMax) : null;

    if (minSal !== null && minSal < 0) {
      errors.salary = 'Mức lương không được là số âm.';
    } else if (maxSal !== null && maxSal < 0) {
      errors.salary = 'Mức lương không được là số âm.';
    } else if (minSal !== null && maxSal !== null && minSal > maxSal) {
      errors.salary = 'Lương tối thiểu không được lớn hơn lương tối đa.';
    }

    if (targetDate && targetDate < todayStr) {
      errors.targetDate = 'Ngày cần người không được ở quá khứ.';
    }

    if (isHiringManagerOnly && departmentId) {
      const isAllowed = availableDepartments.some((d) => d.id === Number(departmentId));
      if (!isAllowed) {
        errors.departmentId = 'Bạn chỉ có quyền tạo yêu cầu tuyển dụng cho phòng ban mình quản lý.';
      }
    }

    // Nếu lưu nháp, cho phép thiếu dữ liệu bắt buộc
    if (isDraft) {
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }

    // Gửi duyệt bắt buộc nhập đầy đủ
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
    if (!reason.trim()) {
      errors.reason = 'Vui lòng nhập giải trình nhu cầu tuyển dụng.';
    }
    if (!targetDate) {
      errors.targetDate = 'Vui lòng chọn ngày cần người.';
    }
    if (!cleanMin || !cleanMax) {
      errors.salary = 'Vui lòng nhập đầy đủ dải lương đề xuất (tối thiểu và tối đa).';
    }
    if (!jobDescription.trim()) {
      errors.jobDescription = 'Vui lòng nhập mô tả công việc.';
    }
    if (!requirements.trim()) {
      errors.requirements = 'Vui lòng nhập yêu cầu ứng viên.';
    }

    if (isOutOfSalaryRange && !salaryExplanation.trim()) {
      errors.salaryExplanation = 'Dải lương đề xuất nằm ngoài khung chuẩn, bắt buộc nhập giải trình.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!validateForm(isDraft)) return;

    const cleanMin = parseNumberFromCommas(proposedMinSalary);
    const cleanMax = parseNumberFromCommas(proposedMaxSalary);

    const payload: RequisitionPayload = {
      title: title.trim() || (isDraft ? 'Bản nháp' : ''),
      departmentId: departmentId ? Number(departmentId) : (departments[0]?.id || 1),
      jobTitleId: jobTitleId ? Number(jobTitleId) : (jobTitles[0]?.id || 1),
      quantity: quantity >= 1 ? quantity : 1,
      recruitmentType,
      reason: reason.trim() || (isDraft ? undefined : ''),
      proposedMinSalary: cleanMin ? Number(cleanMin) : undefined,
      proposedMaxSalary: cleanMax ? Number(cleanMax) : undefined,
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
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu yêu cầu tuyển dụng.';
      if (msg.includes('khung lương tiêu chuẩn') || msg.includes('khung chuẩn')) {
        setFormErrors((prev) => ({
          ...prev,
          salaryExplanation: 'Dải lương đề xuất nằm ngoài khung lương tiêu chuẩn của chức danh. Vui lòng nhập lý do giải trình.',
        }));
      }
      showToast(msg, 'error');
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

  const handleClone = async (req: Requisition) => {
    try {
      setIsLoading(true);
      const cloned = await requisitionApi.clone(req.id);
      showToast(`Đã sao chép thành công bản nháp mới: ${cloned.requisitionCode}`);
      // Mở ngay modal form nháp để người dùng chỉnh sửa
      openEditModal(cloned as any);
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể sao chép yêu cầu tuyển dụng.', 'error');
    } finally {
      setIsLoading(false);
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

      {/* Standardized Enterprise Page Header */}
      <PageHeader
        title="Yêu cầu Tuyển dụng (Requisition)"
        subtitle="Khai báo nhu cầu nhân sự, quản lý và theo dõi trạng thái yêu cầu tuyển dụng nội bộ"
        breadcrumbs={[
          { label: 'Tổng quan', path: '/dashboard' },
          { label: 'Yêu cầu tuyển dụng' },
        ]}
        actions={
          canCreate ? (
            <div className="req-hero-actions">
              <button
                type="button"
                id="btn-create-requisition"
                className="btn btn-primary"
                onClick={openCreateModal}
              >
                <span>Tạo yêu cầu mới</span>
              </button>
            </div>
          ) : undefined
        }
      />

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
                <th>Người Phụ Trách</th>
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
                  <td>
                    {assignmentMap[req.id]?.primaryRecruiter ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0369a1', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserCheck size={13} />
                          {assignmentMap[req.id].primaryRecruiter?.fullName}
                        </span>
                        {assignmentMap[req.id].supportRecruiters.length > 0 && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            +{assignmentMap[req.id].supportRecruiters.length} hỗ trợ
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        Chưa phân công
                      </span>
                    )}
                  </td>
                  <td>{renderStatusBadge(req.status)}</td>
                  <td>
                    <div className="req-actions-cell">
                      {canAssign && (
                        <button
                          type="button"
                          className="req-action-btn"
                          title="Phân công Recruiter phụ trách"
                          style={{ color: '#0284c7' }}
                          onClick={() => setAssignModalReq(req)}
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="req-action-btn"
                        title="Xem chi tiết"
                        onClick={() => setDetailReq(req)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="req-action-btn"
                        title="Theo dõi tiến độ & lịch sử phê duyệt"
                        onClick={() => setTimelineReqId(req.id)}
                        style={{ color: '#d97706' }}
                      >
                        <Clock size={16} />
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
                      <button
                        type="button"
                        className="req-action-btn"
                        title="Sao chép yêu cầu tuyển dụng"
                        onClick={() => handleClone(req)}
                      >
                        <Copy size={16} />
                      </button>
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
              {editingReq?.rejectionReason && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <AlertCircle size={18} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: '#b45309', fontSize: '0.875rem' }}>Ý kiến yêu cầu bổ sung / phản hồi từ người duyệt:</div>
                    <div style={{ color: '#92400e', fontSize: '0.875rem', marginTop: '2px', whiteSpace: 'pre-wrap' }}>{editingReq.rejectionReason}</div>
                  </div>
                </div>
              )}

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
                    {availableDepartments.map((d) => (
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
                  {isHrOrAdmin && selectedJobTitleObj && (selectedJobTitleObj.minSalary != null || selectedJobTitleObj.maxSalary != null) && (
                    <span className="req-salary-info">
                      Khung chuẩn: {formatCurrency(selectedJobTitleObj.minSalary)} - {formatCurrency(selectedJobTitleObj.maxSalary)}
                    </span>
                  )}
                  {selectedJobTitleObj && jobHeadcountInfo && (
                    <div style={{ fontSize: '0.8125rem', marginTop: '4px', color: '#64748b', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Định biên: <strong>{jobHeadcountInfo.std}</strong></span>
                      <span>• Hiện có: <strong>{jobHeadcountInfo.curr}</strong></span>
                      <span>• Còn lại: <strong style={{ color: jobHeadcountInfo.remaining > 0 ? '#10b981' : '#ef4444' }}>{jobHeadcountInfo.remaining}</strong></span>
                    </div>
                  )}
                  {jobHeadcountInfo?.isOverQuota && (
                    <div className="req-salary-warning" style={{ marginTop: '8px', backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#b45309', padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <AlertTriangle size={15} />
                        <span>Cảnh báo vượt chỉ tiêu headcount</span>
                      </div>
                      <span style={{ fontSize: '0.8125rem', marginTop: '2px', display: 'block' }}>
                        Số lượng tuyển ({quantity}) vượt chỉ tiêu headcount còn lại ({jobHeadcountInfo.remaining}) của chức danh này.
                      </span>
                    </div>
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
                    Loại nhu cầu tuyển <span className="required">*</span>
                  </label>
                  <select
                    className="req-input"
                    value={recruitmentType}
                    onChange={(e) => setRecruitmentType(e.target.value as any)}
                  >
                    <option value="NEW_HEADCOUNT">Tăng mới định biên (Headcount)</option>
                    <option value="REPLACEMENT">Thay thế nhân sự nghỉ việc</option>
                  </select>
                </div>

                <div className="req-form-group">
                  <label className="req-label">
                    Mức lương tối thiểu đề xuất (VND) <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="req-input"
                    placeholder="Ví dụ: 20,000,000"
                    value={formatNumberWithCommas(proposedMinSalary)}
                    onChange={(e) => handleNumberInputChange(e, (raw) => setProposedMinSalary(raw))}
                  />
                </div>

                <div className="req-form-group">
                  <label className="req-label">
                    Mức lương tối đa đề xuất (VND) <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="req-input"
                    placeholder="Ví dụ: 35,000,000"
                    value={formatNumberWithCommas(proposedMaxSalary)}
                    onChange={(e) => handleNumberInputChange(e, (raw) => setProposedMaxSalary(raw))}
                  />
                </div>
              </div>

              {formErrors.salary && <span className="req-error-text">{formErrors.salary}</span>}

              {/* Ô Giải trình nhu cầu tuyển dụng - tách biệt với loại nhu cầu */}
              <div className="req-form-group">
                <label className="req-label">
                  Giải trình nhu cầu tuyển dụng <span className="required">*</span>
                </label>
                <textarea
                  className="req-textarea"
                  placeholder="Nêu rõ căn cứ, khối lượng công việc và giải trình nhu cầu tuyển dụng..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {formErrors.reason && <span className="req-error-text">{formErrors.reason}</span>}
              </div>

              {/* Cảnh báo dải lương ngoài chuẩn & bắt buộc giải trình */}
              {isOutOfSalaryRange && (
                <div className="req-salary-warning">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <AlertTriangle size={18} />
                    <span>Dải lương đề xuất nằm ngoài khung chuẩn của chức danh</span>
                  </div>
                  <span>
                    {isHrOrAdmin
                      ? `Chức danh này có khung chuẩn từ ${formatCurrency(selectedJobTitleObj?.minSalary)} đến ${formatCurrency(selectedJobTitleObj?.maxSalary)}. Vui lòng cung cấp giải trình chi tiết lý do vượt khung.`
                      : 'Dải lương đề xuất nằm ngoài khung lương tiêu chuẩn của chức danh. Vui lòng cung cấp giải trình chi tiết lý do đề xuất mức lương này.'}
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
                <label className="req-label">
                  Mô tả công việc <span className="required">*</span>
                </label>
                <textarea
                  className="req-textarea"
                  placeholder="Mô tả các nhiệm vụ chính của vị trí..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                {formErrors.jobDescription && <span className="req-error-text">{formErrors.jobDescription}</span>}
              </div>

              <div className="req-form-group">
                <label className="req-label">
                  Yêu cầu ứng viên <span className="required">*</span>
                </label>
                <textarea
                  className="req-textarea"
                  placeholder="Kỹ năng, kinh nghiệm, bằng cấp cần thiết..."
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
                {formErrors.requirements && <span className="req-error-text">{formErrors.requirements}</span>}
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
                <span>Lưu nháp</span>
              </button>
              <button
                type="button"
                id="btn-submit-requisition"
                className="req-btn-primary"
                onClick={() => handleSubmit(false)}
              >
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
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Recruiter chính:</span>
                  <div style={{ fontWeight: 600, color: '#0369a1' }}>
                    {assignmentMap[detailReq.id]?.primaryRecruiter?.fullName || 'Chưa phân công'}
                  </div>
                </div>
                {assignmentMap[detailReq.id]?.supportRecruiters && assignmentMap[detailReq.id]!.supportRecruiters.length > 0 && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Recruiter hỗ trợ:</span>
                    <div style={{ fontWeight: 500, color: '#475569', fontSize: '0.875rem' }}>
                      {assignmentMap[detailReq.id]!.supportRecruiters.map((s) => s.fullName).join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {detailReq.rejectionReason && (
                <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertCircle size={16} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b45309' }}>Ý kiến yêu cầu bổ sung / phản hồi:</span>
                    <p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: '#92400e', whiteSpace: 'pre-wrap' }}>{detailReq.rejectionReason}</p>
                  </div>
                </div>
              )}

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

            <div className="req-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="req-btn-secondary"
                  onClick={() => {
                    const id = detailReq.id;
                    setDetailReq(null);
                    setTimelineReqId(id);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Clock size={15} color="#d97706" />
                  Tiến độ & Lịch sử phê duyệt
                </button>
                {canAssign && (
                  <button
                    type="button"
                    className="req-btn-secondary"
                    onClick={() => {
                      const r = detailReq;
                      setDetailReq(null);
                      setAssignModalReq(r);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UserCheck size={16} />
                    <span>Phân công Recruiter</span>
                  </button>
                )}
              </div>
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

      {/* Modal Theo dõi trạng thái & Lịch sử phê duyệt (S3-03) */}
      {timelineReqId !== null && (
        <ApprovalTimelineModal
          requisitionId={timelineReqId}
          isOpen={true}
          onClose={() => setTimelineReqId(null)}
          canApprove={canApprove}
          onStatusChange={loadData}
        />
      )}

      {/* Modal Phân công Recruiter (S3-06) */}
      <AssignRecruiterModal
        isOpen={Boolean(assignModalReq)}
        onClose={() => setAssignModalReq(null)}
        requisition={assignModalReq}
        onSuccess={() => {
          showToast('Đã lưu phân công recruiter thành công!');
          loadData();
        }}
      />
    </div>
  );
};

export default RequisitionManagementPage;
