import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import '../styles/requisitions.css';
import { previewDepartments, previewRecruiters, previewRequisitionApi } from '../mocks/requisitionPreview';
import { requisitionTiming, vietnamDay } from '../utils/requisitionDates';
import type { AssignableRecruiter } from '../types/requisition';
export const RequisitionManagementPage: React.FC<{ preview?: boolean }> = ({ preview = false }) => {
  const isPreview = import.meta.env.DEV && preview;
  const readApi = isPreview ? previewRequisitionApi : requisitionApi;
  const { user, hasPermission, hasAnyRole } = useAuth();
  const canCreate = !isPreview && (hasPermission ? hasPermission('REQUISITION_CREATE') : hasAnyRole(['HIRING_MANAGER', 'HR_MANAGER', 'ADMIN']));
  const canApprove = !isPreview && (hasPermission ? hasPermission('REQUISITION_APPROVE') : hasAnyRole(['APPROVER', 'HR_MANAGER', 'ADMIN']));
  const canAssign = !isPreview && (hasPermission ? hasPermission('RECRUITER_ASSIGN') : hasAnyRole(['HR_MANAGER', 'ADMIN']));
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timelineReqId, setTimelineReqId] = useState<number | null>(null);
// Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState<number | undefined>(undefined);
  const [recruiters, setRecruiters] = useState<AssignableRecruiter[]>([]);
  const [recruiterFilter, setRecruiterFilter] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [assignmentError, setAssignmentError] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [today, setToday] = useState(() => new Date());
  const requestId = useRef(0);
  const dateError = createdFrom && createdTo && createdFrom > createdTo
    ? 'Ngày bắt đầu không được sau ngày kết thúc.' : '';
  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(0); setDebouncedSearch(search.trim()); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (isPreview) {
      setDepartments(previewDepartments);
      setRecruiters(previewRecruiters);
      setJobTitles([]);
      return;
    }
    let active = true;
    Promise.allSettled([
      organizationApi.getDepartments(), jobTitleApi.getJobTitles(), requisitionApi.getAssignableRecruiters(),
    ]).then(([depts, titles, people]) => {
      if (!active) return;
      if (depts.status === 'fulfilled') setDepartments(depts.value || []);
      if (titles.status === 'fulfilled') setJobTitles(titles.value || []);
      if (people.status === 'fulfilled') setRecruiters(people.value || []);
      if ([depts, titles, people].some((result) => result.status === 'rejected')) {
        setCatalogError('Không tải được một số danh mục bộ lọc. Vui lòng tải lại trang.');
      }
    });
    return () => { active = false; };
  }, [isPreview]);
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
// Assign Recruiter Modal (S3-06)
  const [assignModalReq, setAssignModalReq] = useState<Requisition | null>(null);
  const [assignmentMap, setAssignmentMap] = useState<Record<number, RequisitionAssignments>>({});
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
// Server filtering runs before pagination; never filter only the current page.
  const loadData = useCallback(async () => {
    const current = ++requestId.current;
    if (dateError) { setIsLoading(false); return; }
    setIsLoading(true);
    setLoadError('');
    setAssignmentError(false);
    setAssignmentMap({});
    try {
      const response = await readApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        departmentId: deptFilter,
        recruiterId: recruiterFilter ? Number(recruiterFilter) : undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
        page, size: pageSize,
      });
      if (current !== requestId.current) return;
      if (response.totalPages > 0 && page >= response.totalPages) {
        setPage(response.totalPages - 1);
        return;
      }
      const items = response.content || [];
      setRequisitions(items);
      setTotalElements(response.totalElements || 0);
      setTotalPages(response.totalPages || 0);
      setIsLoading(false);
      const results = await Promise.allSettled(items.map((r) => readApi.getAssignments(r.id)));
      if (current !== requestId.current) return;
      const map: Record<number, RequisitionAssignments> = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) map[result.value.requisitionId] = result.value;
      });
      setAssignmentMap(map);
      setAssignmentError(results.some((result) => result.status === 'rejected'));
    } catch {
      if (current !== requestId.current) return;
      setLoadError('Không thể tải danh sách yêu cầu tuyển dụng. Vui lòng thử lại.');
      setRequisitions([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally {
      if (current === requestId.current) setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, deptFilter, recruiterFilter, createdFrom, createdTo, dateError, page, pageSize, readApi]);
  useEffect(() => {
    void loadData();
    return () => { requestId.current += 1; };
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
      case 'CANCELLED':
        return <span className="req-badge req-badge-draft"><XCircle size={14} /> Đã hủy</span>;
      case 'REJECTED':
        return <span className="req-badge req-badge-rejected"><XCircle size={12} /> Bị từ chối</span>;
      default:
        return <span className="req-badge req-badge-draft">{status}</span>;
    }
  };
  return (
    <div className="req-container">
      {isPreview && <p role="status">Xem thử frontend · Dữ liệu mẫu · Không lưu lên hệ thống</p>}
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
          aria-label="Trạng thái"
          onChange={(e) => { setPage(0); setStatusFilter(e.target.value); }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="DRAFT">Lưu nháp (DRAFT)</option>
          <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
        <select
          className="req-select"
          value={deptFilter || ''}
          aria-label="Phòng ban"
          onChange={(e) => { setPage(0); setDeptFilter(e.target.value ? Number(e.target.value) : undefined); }}
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="req-filter-card req-extra-filters">
        <label>Người tuyển dụng
          <select className="req-select" value={recruiterFilter}
            onChange={(e) => { setPage(0); setRecruiterFilter(e.target.value); }}>
            <option value="">Tất cả người tuyển dụng</option>
            {recruiters.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
          </select>
        </label>
        <label>Ngày tạo từ
          <input type="date" className="req-input" value={createdFrom} aria-describedby={dateError ? 'req-date-error' : undefined}
            onChange={(e) => { setPage(0); setCreatedFrom(e.target.value); }} />
        </label>
        <label>Ngày tạo đến
          <input type="date" className="req-input" value={createdTo} aria-describedby={dateError ? 'req-date-error' : undefined}
            onChange={(e) => { setPage(0); setCreatedTo(e.target.value); }} />
        </label>
        <button type="button" className="req-btn-secondary" onClick={() => {
          setPage(0); setSearch(''); setDebouncedSearch(''); setStatusFilter('ALL'); setDeptFilter(undefined);
          setRecruiterFilter(''); setCreatedFrom(''); setCreatedTo('');
        }}>Xóa bộ lọc</button>
      </div>
      {dateError && <p role="alert" id="req-date-error" className="req-error-text">{dateError}</p>}
      {catalogError && <p role="alert">{catalogError}</p>}
      {assignmentError && <p role="alert">Không tải được một số thông tin phân công.</p>}
      <p className="req-salary-info">Ngày và thời hạn được tính theo múi giờ Việt Nam (Asia/Ho_Chi_Minh).</p>
      {/* Table Card */}
      <div className="req-table-card">
        {dateError ? <div className="req-empty-state">Hãy sửa khoảng ngày để xem kết quả.</div> : loadError ? (
          <div className="req-empty-state" role="alert">{loadError}
            <button type="button" className="req-btn-secondary" onClick={() => void loadData()}>Thử lại</button>
          </div>
        ) : isLoading ? (
          <div className="req-empty-state">Đang tải danh sách yêu cầu tuyển dụng...</div>
        ) : requisitions.length === 0 ? (
          <div className="req-empty-state">
            <Briefcase size={48} className="req-empty-icon" />
            <h3>Không có yêu cầu tuyển dụng phù hợp</h3>
            <p>Hãy thay đổi hoặc xóa bộ lọc để xem kết quả khác.</p>
          </div>
        ) : (
          <div className="req-table-scroll" tabIndex={0} role="region" aria-label="Danh sách yêu cầu tuyển dụng"><table className="req-table">
            <thead>
              <tr>
                <th>Mã Yêu Cầu</th>
                <th>Tiêu Đề & Vị Trí</th>
                <th>Phòng Ban</th>
                <th>Số Lượng</th>
                <th>Lý Do Tuyển</th>
                <th>Ngày Cần</th>
                <th>Số ngày đã mở</th>
                <th>Thời hạn</th>
                <th>Người Phụ Trách</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map((req) => (
                <tr key={req.id} className={requisitionTiming(req.createdAt, req.targetDate, req.status, today).overdue ? 'req-row-overdue' : undefined}>
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
                  <td>{req.targetDate ? vietnamDay(req.targetDate) || '—' : '—'}</td>
                  <td>{(() => {
                    const { daysOpen } = requisitionTiming(req.createdAt, req.targetDate, req.status, today);
                    return daysOpen === null ? '—' : `${daysOpen} ngày`;
                  })()}</td>
                  <td>{(() => {
                    const { daysRemaining, overdue } = requisitionTiming(req.createdAt, req.targetDate, req.status, today);
                    if (daysRemaining === null) return 'Chưa có hạn';
                    if (overdue) return <span className="req-deadline-overdue"><AlertTriangle size={14} />Quá hạn {Math.abs(daysRemaining)} ngày</span>;
                    if (['REJECTED', 'CANCELLED'].includes(req.status)) return 'Đã kết thúc';
                    if (req.status === 'DRAFT') return 'Bản nháp';
                    if (daysRemaining === 0) return <span className="req-deadline-today">Đến hạn hôm nay</span>;
                    return `Còn ${daysRemaining} ngày`;
                  })()}</td>
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
                        {assignmentMap[req.id] ? 'Chưa phân công' : 'Chưa có thông tin'}
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
                        disabled={isPreview}
                        onClick={() => setTimelineReqId(req.id)}
                        style={{ color: '#d97706' }}
                      >
                        <Clock size={16} />
                      </button>
                      {!isPreview && (req.status === 'DRAFT' || req.status === 'PENDING_APPROVAL') && (
                        <button
                          type="button"
                          className="req-action-btn"
                          title="Chỉnh sửa"
                          onClick={() => openEditModal(req)}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {!isPreview && req.status === 'DRAFT' && (
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
                        disabled={isPreview}
                        onClick={() => handleClone(req)}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      <nav className="req-pagination" aria-label="Phân trang yêu cầu">
        <p aria-live="polite">{totalElements} yêu cầu · Trang {totalPages ? page + 1 : 0}/{totalPages}</p>
        <label>Số dòng mỗi trang
          <select className="req-select" value={pageSize} onChange={(e) => { setPage(0); setPageSize(Number(e.target.value)); }}>
            {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <button type="button" className="req-btn-secondary" disabled={isLoading || !!dateError || !!loadError || page === 0}
          onClick={() => setPage((value) => value - 1)}>Trang trước</button>
        <button type="button" className="req-btn-secondary" disabled={isLoading || !!dateError || !!loadError || page + 1 >= totalPages}
          onClick={() => setPage((value) => value + 1)}>Trang sau</button>
      </nav>

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
                  disabled={isPreview}
                  onClick={() => {
                    if (isPreview) return;
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
