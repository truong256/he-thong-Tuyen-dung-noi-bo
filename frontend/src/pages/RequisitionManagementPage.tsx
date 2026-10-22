import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  PauseCircle,
  PlayCircle,
  Archive,
  Ban,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import requisitionApi from '../api/requisition';
import organizationApi from '../api/organization';
import jobTitleApi from '../api/jobTitle';
import { Requisition, RequisitionPayload, RequisitionAssignments, AssignableRecruiter } from '../types/requisition';
import { Department } from '../types/organization';
import { JobTitle } from '../types/jobTitle';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common';
import { ApprovalTimelineModal } from '../components/requisition/ApprovalTimelineModal';
import { AssignRecruiterModal } from '../components/requisition/AssignRecruiterModal';
import { formatNumberWithCommas, handleNumberInputChange, parseNumberFromCommas } from '../utils/numberFormat';
import { requisitionTiming } from '../utils/requisitionDates';
import '../styles/requisitions.css';

type LifecycleActionType = 'HOLD' | 'RESUME' | 'CLOSE' | 'CANCEL';

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
  const [recruiters, setRecruiters] = useState<AssignableRecruiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timelineReqId, setTimelineReqId] = useState<number | null>(null);

  // URL Query Parameters (S3-08: Giữ nguyên bộ lọc khi chuyển trang, phân trang backend)
  const [searchParams, setSearchParams] = useSearchParams();

  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
  const sizeFromUrl = parseInt(searchParams.get('size') || '10', 10);
  const searchParam = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || 'ALL';
  const deptFilter = searchParams.get('dept') ? Number(searchParams.get('dept')) : undefined;
  const recruiterFilter = searchParams.get('recruiter') || 'ALL';
  const slaFilter = (searchParams.get('sla') || 'ALL') as 'ALL' | 'OVERDUE' | 'WARNING' | 'SAFE' | 'INACTIVE';
  const fromDateFilter = searchParams.get('fromDate') || '';
  const toDateFilter = searchParams.get('toDate') || '';

  const currentPage = Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1;
  const pageSize = [10, 20, 50].includes(sizeFromUrl) ? sizeFromUrl : 10;

  const [dateError, setDateError] = useState<string>('');
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState(searchParam);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

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
  const [showSalaryExplanationInput, setShowSalaryExplanationInput] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Detail Modal
  const [detailReq, setDetailReq] = useState<Requisition | null>(null);

  // Assign Recruiter Modal (S3-06)
  const [assignModalReq, setAssignModalReq] = useState<Requisition | null>(null);
  const [assignmentMap, setAssignmentMap] = useState<Record<number, RequisitionAssignments>>({});

  // Reject Modal (S2-10 Approval)
  const [rejectModalReq, setRejectModalReq] = useState<Requisition | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Lifecycle Action Modal (S3-07: HOLD, RESUME, CLOSE, CANCEL)
  const [lifecycleAction, setLifecycleAction] = useState<{
    type: LifecycleActionType;
    req: Requisition;
  } | null>(null);
  const [lifecycleReasonCode, setLifecycleReasonCode] = useState('');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [lifecycleError, setLifecycleError] = useState('');
  const [isSubmittingLifecycle, setIsSubmittingLifecycle] = useState(false);
  const [pipelineWarning, setPipelineWarning] = useState<{ activeCount: number; totalCount: number } | null>(null);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);


  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Cập nhật bộ lọc và tự động quay về trang 1 mà không mất các bộ lọc khác
  const updateFilter = useCallback((updates: Record<string, string | number | undefined | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', '1');

      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined || val === null || val === '' || val === 'ALL') {
          next.delete(key);
        } else {
          next.set(key, String(val));
        }
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Handle date range change with validation
  const handleDateRangeChange = (from: string, to: string) => {
    if (from && to && from > to) {
      setDateError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    setDateError('');
    updateFilter({ fromDate: from || undefined, toDate: to || undefined });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
  };

  const handlePageSizeChange = (newSize: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('size', String(newSize));
      next.set('page', '1');
      return next;
    });
  };

  // Debounce search update
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== searchParam) {
        updateFilter({ search: searchInput.trim() || undefined });
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput, searchParam, updateFilter]);

  // Load reference catalogs once on mount
  useEffect(() => {
    let mounted = true;
    Promise.all([
      organizationApi.getDepartments(),
      jobTitleApi.getJobTitles(),
      Promise.resolve(requisitionApi.getAssignableRecruiters?.()).then((r) => r || []).catch(() => []),
    ]).then(([deptRes, jtRes, recList]) => {
      if (mounted) {
        setDepartments(deptRes || []);
        setJobTitles(jtRes || []);
        setRecruiters(Array.isArray(recList) ? recList : []);
      }
    }).catch((err) => {
      console.error('Failed to load reference catalogs:', err);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Load requisitions & reference catalogs
  const loadData = useCallback(async () => {
    if (fromDateFilter && toDateFilter && fromDateFilter > toDateFilter) {
      return;
    }
    setIsLoading(true);
    try {
      const reqRes = await requisitionApi.list({
        search: searchParam.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        departmentId: deptFilter,
        recruiterId: recruiterFilter !== 'ALL' ? Number(recruiterFilter) : undefined,
        sla: slaFilter !== 'ALL' ? slaFilter : undefined,
        fromDate: fromDateFilter || undefined,
        toDate: toDateFilter || undefined,
        page: currentPage - 1,
        size: pageSize,
      });

      const items = reqRes?.content || [];
      setRequisitions(items);
      setTotalElements(reqRes?.totalElements || 0);
      setTotalPages(reqRes?.totalPages || 1);

      // Load assignments for visible requisitions
      if (items.length > 0 && typeof requisitionApi.getAssignments === 'function') {
        Promise.allSettled(
          items.map((r) => Promise.resolve(requisitionApi.getAssignments(r.id)).catch(() => null))
        ).then((results) => {
          const map: Record<number, RequisitionAssignments> = {};
          results.forEach((res) => {
            if (res.status === 'fulfilled' && res.value) {
              map[res.value.requisitionId] = res.value;
            }
          });
          setAssignmentMap(map);
        });
      } else {
        setAssignmentMap({});
      }
    } catch (err: any) {
      console.error('Failed to load requisitions:', err);
      showToast(err.response?.data?.message || 'Không thể tải danh sách yêu cầu tuyển dụng.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [
    searchParam,
    statusFilter,
    deptFilter,
    recruiterFilter,
    slaFilter,
    fromDateFilter,
    toDateFilter,
    currentPage,
    pageSize,
  ]);

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

  // Bộ lọc đã được áp dụng toàn diện ở backend trước khi phân trang
  const filteredRequisitions = requisitions;

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
    setShowSalaryExplanationInput(false);
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
    setShowSalaryExplanationInput(Boolean(req.salaryExplanation));
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
      if (msg.includes('khung lương tiêu chuẩn') || msg.includes('khung chuẩn') || msg.includes('giải trình dải lương') || msg.includes('giải trình')) {
        setShowSalaryExplanationInput(true);
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

  const handleApprove = async (req: Requisition) => {
    if (!window.confirm(`Bạn có chắc chắn muốn phê duyệt yêu cầu tuyển dụng "${req.title}" (${req.requisitionCode})?`)) {
      return;
    }
    try {
      await requisitionApi.approve(req.id);
      showToast(`Đã phê duyệt thành công yêu cầu tuyển dụng ${req.requisitionCode}.`);
      if (detailReq?.id === req.id) {
        setDetailReq((prev) => (prev ? { ...prev, status: 'APPROVED' } : null));
      }
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt yêu cầu.', 'error');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalReq) return;
    if (!rejectReason.trim()) {
      setRejectError('Vui lòng nhập lý do từ chối yêu cầu tuyển dụng.');
      return;
    }
    setIsRejecting(true);
    try {
      await requisitionApi.reject(rejectModalReq.id, rejectReason.trim());
      showToast(`Đã từ chối yêu cầu tuyển dụng ${rejectModalReq.requisitionCode}.`);
      if (detailReq?.id === rejectModalReq.id) {
        setDetailReq((prev) => (prev ? { ...prev, status: 'REJECTED', rejectionReason: rejectReason.trim() } : null));
      }
      setRejectModalReq(null);
      setRejectReason('');
      setRejectError('');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra khi từ chối yêu cầu.', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  const LIFECYCLE_REASONS: Record<string, { code: string; label: string }[]> = {
    HOLD: [
      { code: 'BUDGET_FREEZE', label: 'Đóng băng ngân sách' },
      { code: 'PLAN_CHANGE', label: 'Thay đổi kế hoạch nhân sự' },
      { code: 'WAITING_FOR_DECISION', label: 'Chờ quyết định từ cấp trên' },
      { code: 'OTHER', label: 'Lý do khác' },
    ],
    CLOSE: [
      { code: 'HEADCOUNT_REACHED', label: 'Đã tuyển đủ số lượng' },
      { code: 'INTERNAL_TRANSFER', label: 'Đã bố trí nhân sự nội bộ' },
      { code: 'OTHER', label: 'Lý do khác' },
    ],
    CANCEL: [
      { code: 'NO_LONGER_NEEDED', label: 'Không còn nhu cầu tuyển' },
      { code: 'BUDGET_CUT', label: 'Cắt giảm ngân sách' },
      { code: 'DUPLICATE_REQUEST', label: 'Yêu cầu bị trùng' },
      { code: 'OTHER', label: 'Lý do khác' },
    ],
  };

  const openLifecycleModal = async (type: LifecycleActionType, req: Requisition) => {
    setLifecycleAction({ type, req });
    setLifecycleReason('');
    setLifecycleReasonCode('');
    setLifecycleError('');
    setPipelineWarning(null);

    if (type === 'CLOSE' || type === 'CANCEL' || type === 'HOLD') {
      setIsLoadingPipeline(true);
      try {
        const summary = await requisitionApi.getPipelineSummary(req.id);
        if (summary && summary.activeCount > 0) {
          setPipelineWarning({ activeCount: summary.activeCount, totalCount: summary.totalCount });
        }
      } catch (err) {
        console.error('Failed to load pipeline summary:', err);
      } finally {
        setIsLoadingPipeline(false);
      }
    }
  };

  const handleLifecycleConfirm = async () => {
    if (!lifecycleAction) return;
    const { type, req } = lifecycleAction;

    let effectiveReason = '';
    if (type !== 'RESUME') {
      const reasons = LIFECYCLE_REASONS[type] || [];
      if (!lifecycleReasonCode) {
        setLifecycleError('Vui lòng chọn lý do.');
        return;
      }
      const selectedOption = reasons.find((r) => r.code === lifecycleReasonCode);
      const label = selectedOption ? selectedOption.label : lifecycleReasonCode;

      if (lifecycleReasonCode === 'OTHER') {
        if (!lifecycleReason.trim() || lifecycleReason.trim().length < 5) {
          setLifecycleError('Khi chọn "Lý do khác", vui lòng nhập nội dung chi tiết tối thiểu 5 ký tự.');
          return;
        }
        effectiveReason = lifecycleReason.trim();
      } else {
        effectiveReason = lifecycleReason.trim()
          ? `${label}: ${lifecycleReason.trim()}`
          : label;
      }
    }

    setIsSubmittingLifecycle(true);
    try {
      if (type === 'HOLD') {
        await requisitionApi.hold(req.id, effectiveReason);
        showToast(`Đã tạm hoãn yêu cầu tuyển dụng ${req.requisitionCode}.`);
      } else if (type === 'RESUME') {
        await requisitionApi.resume(req.id, lifecycleReason.trim() || undefined);
        showToast(`Đã tiếp tục triển khai yêu cầu tuyển dụng ${req.requisitionCode}.`);
      } else if (type === 'CLOSE') {
        await requisitionApi.close(req.id, effectiveReason);
        showToast(`Đã đóng yêu cầu tuyển dụng ${req.requisitionCode}.`);
      } else if (type === 'CANCEL') {
        await requisitionApi.cancel(req.id, effectiveReason);
        showToast(`Đã hủy yêu cầu tuyển dụng ${req.requisitionCode}.`);
      }
      setLifecycleAction(null);
      setLifecycleReason('');
      setLifecycleReasonCode('');
      setLifecycleError('');
      setPipelineWarning(null);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện thao tác.', 'error');
    } finally {
      setIsSubmittingLifecycle(false);
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
      case 'ON_HOLD':
        return <span className="req-badge req-badge-on-hold"><PauseCircle size={12} /> Tạm hoãn</span>;
      case 'CLOSED':
        return <span className="req-badge req-badge-closed"><Archive size={12} /> Đã đóng</span>;
      case 'FILLED':
        return <span className="req-badge req-badge-closed"><CheckCircle size={12} /> Đã tuyển đủ</span>;
      case 'CANCELLED':
        return <span className="req-badge req-badge-cancelled"><Ban size={12} /> Đã hủy</span>;
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateFilter({ search: searchInput.trim() || undefined });
              }
            }}
          />
        </div>

        <select
          className="req-select"
          value={statusFilter}
          onChange={(e) => updateFilter({ status: e.target.value })}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="DRAFT">Lưu nháp (DRAFT)</option>
          <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
          <option value="APPROVED">Đã duyệt (APPROVED)</option>
          <option value="ON_HOLD">Tạm hoãn (ON_HOLD)</option>
          <option value="CLOSED">Đã đóng (CLOSED)</option>
          <option value="FILLED">Đã tuyển đủ (FILLED)</option>
          <option value="CANCELLED">Đã hủy (CANCELLED)</option>
          <option value="REJECTED">Từ chối (REJECTED)</option>
        </select>


        <select
          className="req-select"
          value={deptFilter !== undefined ? String(deptFilter) : ''}
          onChange={(e) => updateFilter({ dept: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Tất cả phòng ban</option>
          {availableDepartments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          className="req-select"
          value={recruiterFilter}
          onChange={(e) => updateFilter({ recruiter: e.target.value })}
        >
          <option value="ALL">Tất cả Recruiter phụ trách</option>
          {recruiters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.fullName}
            </option>
          ))}
        </select>

        <select
          className="req-select"
          value={slaFilter}
          onChange={(e) => updateFilter({ sla: e.target.value })}
        >
          <option value="ALL">Tất cả hạn SLA</option>
          <option value="OVERDUE">⚠️ Đã quá hạn (Overdue)</option>
          <option value="WARNING">⏳ Sắp đến hạn (≤ 7 ngày)</option>
          <option value="SAFE">✅ Còn hạn an toàn (&gt; 7 ngày)</option>
          <option value="INACTIVE">⏹️ Đã kết thúc / Không áp dụng</option>
        </select>

        {/* Date Range Filter (S3-08: Từ ngày - Đến ngày) */}
        <div className="req-filter-date-group">
          <label className="req-filter-date-label">Từ:</label>
          <input
            type="date"
            className="req-date-input"
            aria-label="Từ ngày tạo"
            value={fromDateFilter}
            onChange={(e) => handleDateRangeChange(e.target.value, toDateFilter)}
          />
          <label className="req-filter-date-label">Đến:</label>
          <input
            type="date"
            className="req-date-input"
            aria-label="Đến ngày tạo"
            value={toDateFilter}
            onChange={(e) => handleDateRangeChange(fromDateFilter, e.target.value)}
          />
          {(fromDateFilter || toDateFilter) && (
            <button
              type="button"
              className="req-date-clear-btn"
              title="Xóa bộ lọc ngày"
              onClick={() => handleDateRangeChange('', '')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {dateError && (
        <div className="req-filter-error-banner" role="alert">
          <AlertTriangle size={15} />
          <span>{dateError}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="req-table-card">
        {isLoading ? (
          <div className="req-empty-state">Đang tải danh sách yêu cầu tuyển dụng...</div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="req-empty-state">
            <Briefcase size={48} className="req-empty-icon" />
            <h3>Chưa có yêu cầu tuyển dụng phù hợp</h3>
            <p>Không tìm thấy yêu cầu tuyển dụng nào theo bộ lọc đã chọn.</p>
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
                <th>Thời Hạn & SLA</th>
                <th>Người Phụ Trách</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequisitions.map((req) => (
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
                  <td>
                    {(() => {
                      const timing = requisitionTiming(
                        req.createdAt,
                        req.targetDate || req.neededDate,
                        req.status,
                        new Date(),
                        req.approvedAt
                      );

                      let slaBadge = null;
                      if (['CLOSED', 'CANCELLED', 'REJECTED'].includes(req.status)) {
                        slaBadge = <span className="req-sla-badge inactive">Đã kết thúc</span>;
                      } else if (timing.daysRemaining === null) {
                        slaBadge = <span className="req-sla-badge inactive">Chưa có hạn</span>;
                      } else if (timing.overdue) {
                        slaBadge = (
                          <span className="req-sla-badge overdue" title={`Quá hạn ${timing.daysOverdue} ngày`}>
                            <AlertCircle size={11} />
                            {timing.remainingLabel}
                          </span>
                        );
                      } else if (timing.daysRemaining === 0) {
                        slaBadge = (
                          <span className="req-sla-badge warning" title="Đến hạn hôm nay">
                            <Clock size={11} />
                            Hạn hôm nay
                          </span>
                        );
                      } else if (timing.daysRemaining <= 7) {
                        slaBadge = (
                          <span className="req-sla-badge warning" title={`Sắp đến hạn (${timing.daysRemaining} ngày)`}>
                            <Clock size={11} />
                            {timing.remainingLabel}
                          </span>
                        );
                      } else {
                        slaBadge = (
                          <span className="req-sla-badge ok" title={`Còn hạn an toàn (${timing.daysRemaining} ngày)`}>
                            <Clock size={11} />
                            {timing.remainingLabel}
                          </span>
                        );
                      }

                      return (
                        <div className={`req-sla-cell-content ${timing.overdue ? 'is-overdue' : ''}`}>
                          <div className="req-deadline-date">
                            {req.targetDate || req.neededDate || '—'}
                          </div>
                          <div className="req-sla-badge-row">
                            {slaBadge}
                            <span
                              className={`req-days-open-badge ${timing.daysOpen !== null ? 'opened' : 'unopened'}`}
                              title={timing.daysOpen !== null ? `Đã mở ${timing.daysOpen} ngày` : 'Yêu cầu chưa mở chính thức'}
                            >
                              {timing.openLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
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
                      {canApprove && req.status === 'PENDING_APPROVAL' && (
                        <>
                          <button
                            type="button"
                            className="req-action-btn"
                            title="Phê duyệt yêu cầu tuyển dụng"
                            style={{ color: '#16a34a' }}
                            onClick={() => handleApprove(req)}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            type="button"
                            className="req-action-btn delete"
                            title="Từ chối yêu cầu tuyển dụng"
                            style={{ color: '#dc2626' }}
                            onClick={() => {
                              setRejectReason('');
                              setRejectError('');
                              setRejectModalReq(req);
                            }}
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}

                      {/* S3-07 Lifecycle Controls for HR / Admin */}
                      {isHrOrAdmin && (req.status === 'APPROVED' || req.status === 'OPEN') && (
                        <button
                          type="button"
                          className="req-action-btn"
                          title="Tạm hoãn yêu cầu tuyển dụng"
                          style={{ color: '#d97706' }}
                          onClick={() => openLifecycleModal('HOLD', req)}
                        >
                          <PauseCircle size={16} />
                        </button>
                      )}
                      {isHrOrAdmin && req.status === 'ON_HOLD' && (
                        <button
                          type="button"
                          className="req-action-btn"
                          title="Tiếp tục triển khai yêu cầu"
                          style={{ color: '#059669' }}
                          onClick={() => openLifecycleModal('RESUME', req)}
                        >
                          <PlayCircle size={16} />
                        </button>
                      )}
                      {isHrOrAdmin && (req.status === 'APPROVED' || req.status === 'ON_HOLD' || req.status === 'OPEN') && (
                        <button
                          type="button"
                          className="req-action-btn"
                          title="Đóng yêu cầu tuyển dụng (hoàn thành)"
                          style={{ color: '#475569' }}
                          onClick={() => openLifecycleModal('CLOSE', req)}
                        >
                          <Archive size={16} />
                        </button>
                      )}
                      {isHrOrAdmin && req.status !== 'CLOSED' && req.status !== 'CANCELLED' && req.status !== 'FILLED' && (
                        <button
                          type="button"
                          className="req-action-btn delete"
                          title="Hủy yêu cầu tuyển dụng"
                          style={{ color: '#dc2626' }}
                          onClick={() => openLifecycleModal('CANCEL', req)}
                        >
                          <Ban size={16} />
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

        {/* S3-08: Phân trang chuẩn giao diện Enterprise */}
        {!isLoading && requisitions.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalElements}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              itemUnitLabel="yêu cầu"
            />
          </div>
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

              {/* Tùy chọn mở ô giải trình lương nếu đề xuất ngoài khung */}
              {!isOutOfSalaryRange && !showSalaryExplanationInput && !formErrors.salaryExplanation && !salaryExplanation && (
                <div style={{ marginTop: '-4px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSalaryExplanationInput(true)}
                    style={{ fontSize: '0.8rem', color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    + Thêm giải trình dải lương (nếu đề xuất ngoài khung tiêu chuẩn)
                  </button>
                </div>
              )}

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
              {(isOutOfSalaryRange || formErrors.salaryExplanation || showSalaryExplanationInput) && (
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

              {(isOutOfSalaryRange || editingReq?.salaryExplanation || showSalaryExplanationInput || Boolean(formErrors.salaryExplanation) || Boolean(salaryExplanation)) && (
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

              {detailReq.status === 'REJECTED' && (detailReq as any).rejectionReason && (
                <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#dc2626' }}>Lý do từ chối:</span>
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#991b1b', whiteSpace: 'pre-wrap' }}>
                    {(detailReq as any).rejectionReason}
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
              {canApprove && detailReq.status === 'PENDING_APPROVAL' && (
                <>
                  <button
                    type="button"
                    className="req-btn-secondary"
                    style={{ color: '#dc2626', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      const r = detailReq;
                      setRejectReason('');
                      setRejectError('');
                      setRejectModalReq(r);
                    }}
                  >
                    <XCircle size={16} />
                    <span>Từ chối</span>
                  </button>
                  <button
                    type="button"
                    className="req-btn-primary"
                    style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleApprove(detailReq)}
                  >
                    <CheckCircle size={16} />
                    <span>Phê duyệt</span>
                  </button>
                </>
              )}
              </div>
              <button
                type="button"
                className="req-btn-secondary"
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

      {/* Modal Từ chối Yêu cầu Tuyển dụng */}
      {rejectModalReq && (
        <div className="req-modal-backdrop">
          <div className="req-modal-content" style={{ maxWidth: '520px' }}>
            <div className="req-modal-header">
              <h2>Từ chối yêu cầu tuyển dụng</h2>
              <button
                type="button"
                className="req-action-btn"
                onClick={() => setRejectModalReq(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="req-modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                Bạn đang từ chối yêu cầu: <strong>{rejectModalReq.title}</strong> (
                <code>{rejectModalReq.requisitionCode}</code>)
              </p>

              <div className="req-form-group" style={{ marginTop: '16px' }}>
                <label className="req-label">
                  Lý do từ chối <span className="required">*</span>
                </label>
                <textarea
                  className="req-textarea"
                  placeholder="Nhập lý do từ chối để người tạo yêu cầu nắm thông tin điều chỉnh..."
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError('');
                  }}
                  rows={4}
                />
                {rejectError && <span className="req-error-text">{rejectError}</span>}
              </div>
            </div>

            <div className="req-modal-footer">
              <button
                type="button"
                className="req-btn-secondary"
                onClick={() => setRejectModalReq(null)}
                disabled={isRejecting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="req-btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                onClick={handleRejectConfirm}
                disabled={isRejecting}
              >
                <span>{isRejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quản lý Vòng đời Tuyển dụng (S3-07: HOLD, RESUME, CLOSE, CANCEL) */}
      {lifecycleAction && (
        <div className="req-modal-backdrop">
          <div className="req-modal-content" style={{ maxWidth: '520px' }}>
            <div className="req-modal-header">
              <h2>
                {lifecycleAction.type === 'HOLD' && 'Tạm hoãn yêu cầu tuyển dụng'}
                {lifecycleAction.type === 'RESUME' && 'Tiếp tục triển khai yêu cầu tuyển dụng'}
                {lifecycleAction.type === 'CLOSE' && 'Đóng yêu cầu tuyển dụng (Hoàn tất)'}
                {lifecycleAction.type === 'CANCEL' && 'Hủy yêu cầu tuyển dụng'}
              </h2>
              <button
                type="button"
                className="req-action-btn"
                onClick={() => setLifecycleAction(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="req-modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                {lifecycleAction.type === 'HOLD' && 'Yêu cầu sẽ chuyển sang trạng thái Tạm hoãn (ON_HOLD). Các tin tuyển dụng đang đăng liên quan sẽ được tự động hạ đăng.'}
                {lifecycleAction.type === 'RESUME' && 'Yêu cầu sẽ được kích hoạt lại trạng thái Đã duyệt (APPROVED) để tiếp tục quy trình tuyển dụng.'}
                {lifecycleAction.type === 'CLOSE' && 'Yêu cầu sẽ được đóng (CLOSED) và giải phóng các hạn ngạch đang giữ. Tin tuyển dụng liên quan sẽ được hạ đăng.'}
                {lifecycleAction.type === 'CANCEL' && 'Yêu cầu sẽ bị hủy bỏ (CANCELLED) và hoàn lại chỉ tiêu định biên. Tin tuyển dụng liên quan sẽ bị hạ đăng.'}
              </p>
              <div style={{ marginTop: '8px', fontSize: '0.875rem', color: '#1e293b', fontWeight: 600 }}>
                {lifecycleAction.req.title} (<code>{lifecycleAction.req.requisitionCode}</code>)
              </div>

              {/* SCRUM-135 / SCRUM-139: Cảnh báo ứng viên còn trong pipeline */}
              {isLoadingPipeline && (
                <div style={{ marginTop: '12px', fontSize: '0.8125rem', color: '#64748b' }}>
                  Đang kiểm tra dữ liệu pipeline ứng viên...
                </div>
              )}

              {pipelineWarning && pipelineWarning.activeCount > 0 && (
                <div
                  className="req-pipeline-alert"
                  role="alert"
                  style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <AlertTriangle size={16} color="#d97706" />
                    <span>Cảnh báo: Còn {pipelineWarning.activeCount} ứng viên đang trong pipeline</span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.8125rem', color: '#78350f' }}>
                    Yêu cầu tuyển dụng này vẫn còn {pipelineWarning.activeCount} ứng viên đang trong quy trình tuyển dụng. Hồ sơ ứng viên sẽ không bị tự động loại hay làm mất. Vui lòng xác nhận trước khi tiếp tục.
                  </p>
                </div>
              )}

              {lifecycleAction.type !== 'RESUME' && (
                <div className="req-form-group" style={{ marginTop: '16px' }}>
                  <label className="req-label">
                    Lý do <span className="required">*</span>
                  </label>
                  <select
                    className="req-select"
                    style={{ width: '100%', marginTop: '4px' }}
                    value={lifecycleReasonCode}
                    onChange={(e) => {
                      setLifecycleReasonCode(e.target.value);
                      if (lifecycleError) setLifecycleError('');
                    }}
                  >
                    <option value="">-- Chọn lý do --</option>
                    {(LIFECYCLE_REASONS[lifecycleAction.type] || []).map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="req-form-group" style={{ marginTop: '14px' }}>
                <label className="req-label">
                  Ghi chú chi tiết {lifecycleReasonCode === 'OTHER' && <span className="required">*</span>}
                </label>
                <textarea
                  className="req-textarea"
                  placeholder={
                    lifecycleReasonCode === 'OTHER'
                      ? 'Nhập giải trình lý do chi tiết (tối thiểu 5 ký tự)...'
                      : 'Nhập ghi chú bổ sung (không bắt buộc)...'
                  }
                  value={lifecycleReason}
                  onChange={(e) => {
                    setLifecycleReason(e.target.value);
                    if (lifecycleError) setLifecycleError('');
                  }}
                  rows={3}
                />
                {lifecycleError && <span className="req-error-text">{lifecycleError}</span>}
              </div>
            </div>

            <div className="req-modal-footer">
              <button
                type="button"
                className="req-btn-secondary"
                onClick={() => setLifecycleAction(null)}
                disabled={isSubmittingLifecycle}
              >
                Đóng
              </button>
              <button
                type="button"
                className="req-btn-primary"
                style={{
                  backgroundColor:
                    lifecycleAction.type === 'CANCEL'
                      ? '#dc2626'
                      : lifecycleAction.type === 'HOLD'
                      ? '#d97706'
                      : lifecycleAction.type === 'RESUME'
                      ? '#059669'
                      : '#2563eb',
                  borderColor: 'transparent',
                }}
                onClick={handleLifecycleConfirm}
                disabled={isSubmittingLifecycle || isLoadingPipeline}
              >
                <span>
                  {isSubmittingLifecycle
                    ? 'Đang xử lý...'
                    : pipelineWarning && pipelineWarning.activeCount > 0
                    ? 'Vẫn tiếp tục xác nhận'
                    : 'Xác nhận'}
                </span>
              </button>
            </div>

          </div>
        </div>
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
