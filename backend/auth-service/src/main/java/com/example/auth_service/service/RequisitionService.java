package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.CreateRequisitionRequest;
import com.example.auth_service.dto.RequisitionDraftRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.repository.RequisitionApprovalHistoryRepository;
import com.example.auth_service.repository.RequisitionApprovalSnapshotRepository;
import com.example.auth_service.repository.RequisitionAssignmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
@Transactional
public class RequisitionService {

    private final RecruitmentRequisitionRepository requisitions;
    private final DepartmentRepository departments;
    private final JobTitleRepository jobTitles;
    private final UserRepository users;
    private final RequisitionApprovalWorkflowService approvalWorkflow;
    private final RequisitionAssignmentRepository assignments;
    private final RequisitionApprovalSnapshotRepository snapshots;
    private final RequisitionApprovalHistoryRepository historyRepository;

    @Autowired(required = false)
    private RequisitionApprovalService approvalService;

    @Autowired(required = false)
    private com.example.auth_service.repository.JobPostingRepository jobPostings;

    @Autowired
    public RequisitionService(
            RecruitmentRequisitionRepository requisitions,
            DepartmentRepository departments,
            JobTitleRepository jobTitles,
            UserRepository users,
            RequisitionApprovalWorkflowService approvalWorkflow,
            @Autowired(required = false) RequisitionAssignmentRepository assignments,
            @Autowired(required = false) RequisitionApprovalSnapshotRepository snapshots,
            @Autowired(required = false) RequisitionApprovalHistoryRepository historyRepository
    ) {
        this.requisitions = requisitions;
        this.departments = departments;
        this.jobTitles = jobTitles;
        this.users = users;
        this.approvalWorkflow = approvalWorkflow;
        this.assignments = assignments;
        this.snapshots = snapshots;
        this.historyRepository = historyRepository;
    }

    public RequisitionService(
            RecruitmentRequisitionRepository requisitions,
            DepartmentRepository departments,
            JobTitleRepository jobTitles,
            UserRepository users,
            RequisitionApprovalWorkflowService approvalWorkflow
    ) {
        this(requisitions, departments, jobTitles, users, approvalWorkflow, null, null, null);
    }

    /**
     * Lưu mới bản nháp yêu cầu tuyển dụng.
     * Cho phép lưu cả khi thiếu thông tin bắt buộc để người dùng có thể quay lại điền tiếp.
     */
    public RequisitionResponse saveDraft(RequisitionDraftRequest request) {
        User currentUser = getCurrentUser();

        // Kiểm tra phòng ban nếu có truyền
        if (request.departmentId() != null) {
            Department dept = departments.findById(request.departmentId())
                    .orElseThrow(() -> new BadRequestException("Phòng ban không tồn tại"));
            if (!dept.isActive()) {
                throw new BadRequestException("Phòng ban đã ngừng áp dụng");
            }
            boolean isHrOrAdmin = currentUser.getRoles().stream()
                    .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);
            if (!isHrOrAdmin && (dept.getManagerUserId() == null || !dept.getManagerUserId().equals(currentUser.getId()))) {
                throw new AccessDeniedException("Bạn không có quyền tạo yêu cầu tuyển dụng cho phòng ban này.");
            }
        }

        // Kiểm tra chức danh nếu có truyền
        if (request.jobTitleId() != null) {
            JobTitle job = jobTitles.findById(request.jobTitleId())
                    .orElseThrow(() -> new BadRequestException("Chức danh không tồn tại"));
            if (!Boolean.TRUE.equals(job.getActive())) {
                throw new BadRequestException("Chức danh đã tạm ngưng");
            }
            validateSalaryAgainstJobTitle(job, request.salaryMin(), request.salaryMax(), request.salaryExplanation());
        }

        // Kiểm tra mức lương không được là số âm
        if ((request.salaryMin() != null && request.salaryMin() < 0) || (request.salaryMax() != null && request.salaryMax() < 0)) {
            throw new BadRequestException("Mức lương không được là số âm");
        }

        // Kiểm tra dải lương cơ bản nếu cả hai đều có
        if (request.salaryMin() != null && request.salaryMax() != null && request.salaryMin() > request.salaryMax()) {
            throw new BadRequestException("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu");
        }

        // Kiểm tra ngày cần người nếu có truyền
        if (request.neededDate() != null && request.neededDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được ở quá khứ.");
        }

        RecruitmentRequisition requisition = new RecruitmentRequisition();
        requisition.setRequisitionCode(generateRequisitionCode());

        String title = (request.title() != null && !request.title().isBlank())
                ? request.title().trim()
                : "Bản nháp - " + requisition.getRequisitionCode();
        requisition.setTitle(title);

        requisition.setDepartmentId(request.departmentId());
        requisition.setJobTitleId(request.jobTitleId());
        requisition.setQuantity(request.quantity() != null && request.quantity() >= 1 ? request.quantity() : 1);
        requisition.setRecruitmentType(request.recruitmentType());
        requisition.setReason(request.reason());
        requisition.setSalaryMin(request.salaryMin());
        requisition.setSalaryMax(request.salaryMax());
        requisition.setCurrency(request.currency() != null ? request.currency() : "VND");
        requisition.setSalaryExplanation(request.salaryExplanation());
        requisition.setNeededDate(request.neededDate());
        requisition.setTargetDate(request.neededDate());
        requisition.setJobDescription(request.jobDescription());
        requisition.setCandidateRequirements(request.candidateRequirements());
        requisition.setBenefits(request.benefits());
        requisition.setWorkLocation(request.workLocation());
        requisition.setWorkingModel(request.workingModel() != null ? request.workingModel() : "ONSITE");

        requisition.setStatus("DRAFT");
        requisition.setCreatedByUserId(currentUser.getId());
        requisition.setCreatedAt(Instant.now());
        requisition.setUpdatedAt(Instant.now());

        RecruitmentRequisition saved = requisitions.save(requisition);
        return toResponse(saved);
    }

    /**
     * Cập nhật bản nháp đã lưu trước đó.
     */
    public RequisitionResponse updateDraft(Long id, RequisitionDraftRequest request) {
        RecruitmentRequisition requisition = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        if (!"DRAFT".equalsIgnoreCase(requisition.getStatus())) {
            throw new BadRequestException("Chỉ được chỉnh sửa yêu cầu ở trạng thái bản nháp (DRAFT). Trạng thái hiện tại: " + requisition.getStatus());
        }

        User currentUser = getCurrentUser();
        boolean isOwner = requisition.getCreatedByUserId() != null && requisition.getCreatedByUserId().equals(currentUser.getId());
        boolean hasManageAll = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);

        if (!isOwner && !hasManageAll) {
            throw new AccessDeniedException("Bạn không có quyền chỉnh sửa bản nháp này");
        }

        if (request.departmentId() != null) {
            Department dept = departments.findById(request.departmentId())
                    .orElseThrow(() -> new BadRequestException("Phòng ban không tồn tại"));
            if (!dept.isActive()) {
                throw new BadRequestException("Phòng ban đã ngừng áp dụng");
            }
            requisition.setDepartmentId(request.departmentId());
        }

        if (request.jobTitleId() != null) {
            JobTitle job = jobTitles.findById(request.jobTitleId())
                    .orElseThrow(() -> new BadRequestException("Chức danh không tồn tại"));
            if (!Boolean.TRUE.equals(job.getActive())) {
                throw new BadRequestException("Chức danh đã tạm ngưng");
            }
            requisition.setJobTitleId(request.jobTitleId());
        }

        if (request.title() != null && !request.title().isBlank()) {
            requisition.setTitle(request.title().trim());
        }
        if (request.quantity() != null && request.quantity() >= 1) {
            requisition.setQuantity(request.quantity());
        }
        if (request.recruitmentType() != null) {
            requisition.setRecruitmentType(request.recruitmentType());
        }
        if (request.reason() != null) {
            requisition.setReason(request.reason());
        }
        if (request.salaryMin() != null) {
            requisition.setSalaryMin(request.salaryMin());
        }
        if (request.salaryMax() != null) {
            requisition.setSalaryMax(request.salaryMax());
        }
        if (request.currency() != null) {
            requisition.setCurrency(request.currency());
        }
        if (request.salaryExplanation() != null) {
            requisition.setSalaryExplanation(request.salaryExplanation());
        }
        if (request.neededDate() != null) {
            requisition.setNeededDate(request.neededDate());
            requisition.setTargetDate(request.neededDate());
        }
        if (request.jobDescription() != null) {
            requisition.setJobDescription(request.jobDescription());
        }
        if (request.candidateRequirements() != null) {
            requisition.setCandidateRequirements(request.candidateRequirements());
        }
        if (request.benefits() != null) {
            requisition.setBenefits(request.benefits());
        }
        if (request.workLocation() != null) {
            requisition.setWorkLocation(request.workLocation());
        }
        if (request.workingModel() != null) {
            requisition.setWorkingModel(request.workingModel());
        }

        if ((requisition.getSalaryMin() != null && requisition.getSalaryMin() < 0) ||
            (requisition.getSalaryMax() != null && requisition.getSalaryMax() < 0)) {
            throw new BadRequestException("Mức lương không được là số âm");
        }

        if (requisition.getSalaryMin() != null && requisition.getSalaryMax() != null && requisition.getSalaryMin() > requisition.getSalaryMax()) {
            throw new BadRequestException("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu");
        }

        if (requisition.getNeededDate() != null && requisition.getNeededDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được ở trong quá khứ");
        }

        requisition.setUpdatedAt(Instant.now());
        RecruitmentRequisition saved = requisitions.save(requisition);
        return toResponse(saved);
    }

    /**
     * Tạo và gửi yêu cầu tuyển dụng chính thức đi phê duyệt.
     * Kiểm tra toàn bộ dữ liệu hợp lệ và ràng buộc khung lương.
     */
    public RequisitionResponse createAndSubmit(CreateRequisitionRequest request) {
        User currentUser = getCurrentUser();

        Department dept = departments.findById(request.departmentId())
                .orElseThrow(() -> new BadRequestException("Phòng ban không tồn tại"));
        if (!dept.isActive()) {
            throw new BadRequestException("Phòng ban đã ngừng áp dụng, không thể tạo yêu cầu tuyển dụng");
        }

        boolean isHrOrAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);
        if (!isHrOrAdmin && (dept.getManagerUserId() == null || !dept.getManagerUserId().equals(currentUser.getId()))) {
            throw new AccessDeniedException("Bạn không có quyền tạo yêu cầu tuyển dụng cho phòng ban này.");
        }

        JobTitle job = jobTitles.findById(request.jobTitleId())
                .orElseThrow(() -> new BadRequestException("Chức danh không tồn tại"));
        if (!Boolean.TRUE.equals(job.getActive())) {
            throw new BadRequestException("Chức danh đã tạm ngưng, không thể tạo yêu cầu tuyển dụng");
        }

        if (request.title() == null || request.title().trim().isBlank()) {
            throw new BadRequestException("Vui lòng nhập tiêu đề yêu cầu tuyển dụng");
        }

        if (request.quantity() == null || request.quantity() < 1) {
            throw new BadRequestException("Số lượng tuyển dụng phải lớn hơn 0");
        }

        if (request.recruitmentType() == null || request.recruitmentType().isBlank()) {
            throw new BadRequestException("Vui lòng chọn loại nhu cầu tuyển dụng (Tuyển mới hoặc Tuyển thay thế)");
        }

        if (request.reason() == null || request.reason().isBlank()) {
            throw new BadRequestException("Vui lòng nhập giải trình nhu cầu tuyển dụng");
        }

        if (request.neededDate() == null) {
            throw new BadRequestException("Vui lòng chọn ngày cần người");
        }

        if (request.neededDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được ở quá khứ.");
        }

        if (request.salaryMin() == null || request.salaryMax() == null) {
            throw new BadRequestException("Dải lương đề xuất không được để trống khi gửi yêu cầu tuyển dụng");
        }

        if (request.salaryMin() < 0 || request.salaryMax() < 0) {
            throw new BadRequestException("Mức lương không được là số âm");
        }

        if (request.salaryMin() > request.salaryMax()) {
            throw new BadRequestException("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu");
        }

        if (request.jobDescription() == null || request.jobDescription().isBlank()) {
            throw new BadRequestException("Vui lòng nhập mô tả công việc");
        }

        if (request.candidateRequirements() == null || request.candidateRequirements().isBlank()) {
            throw new BadRequestException("Vui lòng nhập yêu cầu ứng viên");
        }

        // Kiểm tra khung lương tiêu chuẩn của chức danh
        validateSalaryAgainstJobTitle(job, request.salaryMin(), request.salaryMax(), request.salaryExplanation());

        RecruitmentRequisition requisition = new RecruitmentRequisition();
        requisition.setRequisitionCode(generateRequisitionCode());
        requisition.setTitle(request.title().trim());
        requisition.setDepartmentId(request.departmentId());
        requisition.setJobTitleId(request.jobTitleId());
        requisition.setQuantity(request.quantity());
        requisition.setRecruitmentType(request.recruitmentType());
        requisition.setReason(request.reason());
        requisition.setSalaryMin(request.salaryMin());
        requisition.setSalaryMax(request.salaryMax());
        requisition.setCurrency(request.currency() != null ? request.currency() : "VND");
        requisition.setSalaryExplanation(request.salaryExplanation());
        requisition.setNeededDate(request.neededDate());
        requisition.setTargetDate(request.neededDate());
        requisition.setJobDescription(request.jobDescription());
        requisition.setCandidateRequirements(request.candidateRequirements());
        requisition.setBenefits(request.benefits());
        requisition.setWorkLocation(request.workLocation());
        requisition.setWorkingModel(request.workingModel() != null ? request.workingModel() : "ONSITE");

        requisition.setStatus("PENDING_APPROVAL");
        requisition.setSubmittedAt(Instant.now());
        requisition.setCreatedByUserId(currentUser.getId());
        requisition.setCreatedAt(Instant.now());
        requisition.setUpdatedAt(Instant.now());

        RecruitmentRequisition saved = requisitions.save(requisition);
        approvalWorkflow.snapshotForSubmission(saved);
        if (approvalService != null) {
            try {
                approvalService.initializeApprovalChainOnSubmit(saved, currentUser);
            } catch (Exception ignored) {
            }
        }
        return toResponse(saved);
    }

    /**
     * Gửi duyệt từ bản nháp hiện có.
     * Validate chặt chẽ thông tin để đảm bảo đủ điều kiện gửi phê duyệt.
     */
    public RequisitionResponse submitDraft(Long id) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        if (!"DRAFT".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ được gửi phê duyệt yêu cầu ở trạng thái bản nháp. Trạng thái hiện tại: " + req.getStatus());
        }

        User currentUser = getCurrentUser();
        boolean isOwner = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(currentUser.getId());
        boolean hasManageAll = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);

        if (!isOwner && !hasManageAll) {
            throw new AccessDeniedException("Bạn không có quyền gửi phê duyệt bản nháp này");
        }

        // Kiểm tra tính đầy đủ
        if (req.getTitle() == null || req.getTitle().trim().isEmpty() || req.getTitle().startsWith("Bản nháp - ")) {
            throw new BadRequestException("Vui lòng nhập tiêu đề yêu cầu tuyển dụng trước khi gửi phê duyệt");
        }
        if (req.getDepartmentId() == null) {
            throw new BadRequestException("Vui lòng chọn phòng ban trước khi gửi phê duyệt");
        }
        Department dept = departments.findById(req.getDepartmentId())
                .orElseThrow(() -> new BadRequestException("Phòng ban không tồn tại"));
        if (!dept.isActive()) {
            throw new BadRequestException("Phòng ban đã ngừng áp dụng");
        }
        if (!hasManageAll && (dept.getManagerUserId() == null || !dept.getManagerUserId().equals(currentUser.getId()))) {
            throw new AccessDeniedException("Bạn không có quyền tạo hoặc gửi yêu cầu tuyển dụng cho phòng ban này.");
        }

        if (req.getJobTitleId() == null) {
            throw new BadRequestException("Vui lòng chọn chức danh trước khi gửi phê duyệt");
        }
        JobTitle job = jobTitles.findById(req.getJobTitleId())
                .orElseThrow(() -> new BadRequestException("Chức danh không tồn tại"));
        if (!Boolean.TRUE.equals(job.getActive())) {
            throw new BadRequestException("Chức danh đã tạm ngưng");
        }

        if (req.getQuantity() < 1) {
            throw new BadRequestException("Số lượng tuyển dụng phải lớn hơn 0");
        }
        if (req.getRecruitmentType() == null || req.getRecruitmentType().isBlank()) {
            throw new BadRequestException("Vui lòng chọn loại tuyển dụng (Tuyển mới hoặc Tuyển thay thế)");
        }
        if (req.getReason() == null || req.getReason().isBlank()) {
            throw new BadRequestException("Vui lòng nhập lý do tuyển dụng");
        }
        if (req.getNeededDate() == null) {
            throw new BadRequestException("Vui lòng chọn ngày cần người");
        }
        if (req.getNeededDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được ở trong quá khứ");
        }
        if (req.getJobDescription() == null || req.getJobDescription().isBlank()) {
            throw new BadRequestException("Vui lòng nhập mô tả công việc");
        }
        if (req.getCandidateRequirements() == null || req.getCandidateRequirements().isBlank()) {
            throw new BadRequestException("Vui lòng nhập yêu cầu ứng viên");
        }

        if (req.getSalaryMin() == null || req.getSalaryMax() == null) {
            throw new BadRequestException("Dải lương đề xuất không được để trống khi gửi phê duyệt");
        }

        if (req.getSalaryMin() < 0 || req.getSalaryMax() < 0) {
            throw new BadRequestException("Mức lương không được là số âm");
        }

        if (req.getSalaryMin() > req.getSalaryMax()) {
            throw new BadRequestException("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu");
        }

        // Kiểm tra khung lương chức danh
        validateSalaryAgainstJobTitle(job, req.getSalaryMin(), req.getSalaryMax(), req.getSalaryExplanation());

        req.setStatus("PENDING_APPROVAL");
        req.setSubmittedAt(Instant.now());
        req.setUpdatedAt(Instant.now());

        RecruitmentRequisition saved = requisitions.save(req);
        approvalWorkflow.snapshotForSubmission(saved);
        if (approvalService != null) {
            try {
                approvalService.initializeApprovalChainOnSubmit(saved, currentUser);
            } catch (Exception ignored) {
            }
        }
        return toResponse(saved);
    }

    /**
     * Lấy chi tiết yêu cầu tuyển dụng theo ID với kiểm tra phân quyền dữ liệu.
     */
    @Transactional(readOnly = true)
    public RequisitionResponse getById(Long id) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        User currentUser = getCurrentUser();
        boolean isHrOrAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);

        if (!isHrOrAdmin) {
            boolean isOwner = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(currentUser.getId());
            boolean isDeptManager = req.getDepartmentId() != null && departments.findById(req.getDepartmentId())
                    .map(d -> currentUser.getId().equals(d.getManagerUserId()))
                    .orElse(false);
            boolean isAssignedRecruiter = assignments != null && assignments.findByRequisitionIdAndUserId(id, currentUser.getId()).isPresent();
            boolean isAssignedApprover = (snapshots != null && snapshots.findAllByRequisitionIdOrderByStepOrderAsc(id).stream()
                    .anyMatch(s -> currentUser.getId().equals(s.getApproverUserId())))
                    || (historyRepository != null && historyRepository.findByRequisitionIdOrderByStepOrderAsc(id).stream()
                    .anyMatch(h -> currentUser.getId().equals(h.getApproverId())));

            if (!isOwner && !isDeptManager && !isAssignedRecruiter && !isAssignedApprover) {
                throw new AccessDeniedException("Bạn không có quyền truy cập yêu cầu tuyển dụng này");
            }
        }

        return toResponse(req);
    }

    /**
     * Danh sách yêu cầu tuyển dụng phân trang kèm lọc trạng thái, phòng ban, từ khóa.
     * Chỉ HR_MANAGER và ADMIN được xem tất cả. Các vai trò khác chỉ xem phạm vi được giao/sở hữu.
     */
    @Transactional(readOnly = true)
    public Page<RequisitionResponse> list(String status, Long departmentId, String keyword, Pageable pageable) {
        User currentUser = getCurrentUser();
        boolean canReadAll = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);

        if (canReadAll) {
            return requisitions.search(null, status, departmentId, keyword, pageable).map(this::toResponse);
        }

        java.util.Set<Long> assignedIds = new java.util.HashSet<>();
        if (assignments != null) {
            assignments.findByUserId(currentUser.getId()).forEach(a -> assignedIds.add(a.getRequisitionId()));
        }
        if (snapshots != null) {
            snapshots.findAllByApproverUserId(currentUser.getId()).forEach(s -> assignedIds.add(s.getRequisitionId()));
        }
        if (historyRepository != null) {
            historyRepository.findAll().stream()
                    .filter(h -> currentUser.getId().equals(h.getApproverId()))
                    .forEach(h -> assignedIds.add(h.getRequisitionId()));
        }
        if (assignedIds.isEmpty()) {
            assignedIds.add(-1L);
        }

        java.util.List<Long> managedDeptIds = departments.findByManagerUserId(currentUser.getId()).stream()
                .map(Department::getId)
                .toList();
        if (managedDeptIds.isEmpty()) {
            managedDeptIds = java.util.List.of(-1L);
        }

        Page<RecruitmentRequisition> page = requisitions.searchScoped(
                false,
                currentUser.getId(),
                assignedIds,
                managedDeptIds,
                status,
                departmentId,
                keyword,
                pageable
        );
        return page.map(this::toResponse);
    }

    /**
     * Xóa bản nháp yêu cầu tuyển dụng.
     */
    public void delete(Long id) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        if (!"DRAFT".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ có thể xóa yêu cầu ở trạng thái bản nháp. Trạng thái hiện tại: " + req.getStatus());
        }

        User currentUser = getCurrentUser();
        boolean isOwner = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(currentUser.getId());
        boolean canManageAll = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);

        if (!isOwner && !canManageAll) {
            throw new AccessDeniedException("Bạn không có quyền xóa bản nháp này");
        }

        requisitions.delete(req);
    }

    /**
     * Phê duyệt yêu cầu tuyển dụng (dành cho APPROVER, HR_MANAGER, ADMIN).
     */
    public RequisitionResponse approve(Long id) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        if (!"PENDING_APPROVAL".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ có thể phê duyệt yêu cầu ở trạng thái Chờ phê duyệt (PENDING_APPROVAL). Trạng thái hiện tại: " + req.getStatus());
        }

        User currentUser = getCurrentUser();
        req.setStatus("APPROVED");
        req.setApprovedByUserId(currentUser.getId());
        req.setApprovedAt(Instant.now());
        req.setUpdatedAt(Instant.now());

        RecruitmentRequisition saved = requisitions.save(req);
        return toResponse(saved);
    }

    /**
     * Từ chối yêu cầu tuyển dụng kèm lý do (dành cho APPROVER, HR_MANAGER, ADMIN).
     */
    public RequisitionResponse reject(Long id, String reason) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        if (!"PENDING_APPROVAL".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ có thể từ chối yêu cầu ở trạng thái Chờ phê duyệt (PENDING_APPROVAL). Trạng thái hiện tại: " + req.getStatus());
        }

        if (reason == null || reason.trim().isEmpty()) {
            throw new BadRequestException("Vui lòng nhập lý do từ chối yêu cầu tuyển dụng");
        }

        User currentUser = getCurrentUser();
        req.setStatus("REJECTED");
        req.setRejectionReason(reason.trim());
        req.setApprovedByUserId(currentUser.getId());
        req.setUpdatedAt(Instant.now());

        RecruitmentRequisition saved = requisitions.save(req);
        return toResponse(saved);
    }

    /**
     * Tạm dừng yêu cầu tuyển dụng (S3-07).
     * Yêu cầu chuyển sang ON_HOLD, tạm dừng xuất bản tin tuyển dụng liên quan.
     */
    public RequisitionResponse hold(Long id, String reason) {
        if (reason == null || reason.trim().length() < 5) {
            throw new BadRequestException("Lý do tạm dừng yêu cầu phải có tối thiểu 5 ký tự.");
        }
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        User currentUser = getCurrentUser();
        checkCanManageRequisitionLifecycle(req, currentUser);

        if (!"APPROVED".equalsIgnoreCase(req.getStatus()) && !"OPEN".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ yêu cầu đang ở trạng thái 'Đã duyệt' hoặc 'Đang tuyển' mới có thể tạm dừng.");
        }

        req.setStatus("ON_HOLD");
        req.setRejectionReason(reason.trim());
        req.setUpdatedAt(Instant.now());
        RecruitmentRequisition saved = requisitions.save(req);

        // Ghi nhật ký chuyển trạng thái bất biến
        approvalWorkflow.recordFallbackApprovalLog(id, currentUser.getId(), "HOLD", reason.trim());

        // Đồng bộ tin tuyển dụng: Gỡ tin đang xuất bản
        syncJobPostingsOnStatusChange(id, "ON_HOLD", "Yêu cầu tuyển dụng tạm dừng: " + reason.trim());

        return toResponse(saved);
    }

    /**
     * Tiếp tục yêu cầu tuyển dụng đang tạm dừng (S3-07).
     * Yêu cầu chuyển từ ON_HOLD trở lại APPROVED.
     */
    public RequisitionResponse resume(Long id) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        User currentUser = getCurrentUser();
        checkCanManageRequisitionLifecycle(req, currentUser);

        if (!"ON_HOLD".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ yêu cầu đang ở trạng thái 'Tạm dừng' mới có thể tiếp tục.");
        }

        req.setStatus("APPROVED");
        req.setUpdatedAt(Instant.now());
        RecruitmentRequisition saved = requisitions.save(req);

        // Ghi nhật ký chuyển trạng thái bất biến
        approvalWorkflow.recordFallbackApprovalLog(id, currentUser.getId(), "RESUME", "Tiếp tục thực hiện yêu cầu tuyển dụng");

        return toResponse(saved);
    }

    /**
     * Đóng yêu cầu tuyển dụng (S3-07).
     * Áp dụng khi đã tuyển đủ hoặc kết thúc đợt tuyển (APPROVED hoặc ON_HOLD chuyển sang CLOSED).
     */
    public RequisitionResponse close(Long id, String reason) {
        if (reason == null || reason.trim().length() < 5) {
            throw new BadRequestException("Lý do đóng yêu cầu phải có tối thiểu 5 ký tự.");
        }
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        User currentUser = getCurrentUser();
        checkCanManageRequisitionLifecycle(req, currentUser);

        if ("CLOSED".equalsIgnoreCase(req.getStatus()) || "CANCELLED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Yêu cầu tuyển dụng đã đóng hoặc đã hủy trước đó.");
        }

        req.setStatus("CLOSED");
        req.setRejectionReason(reason.trim());
        req.setUpdatedAt(Instant.now());
        RecruitmentRequisition saved = requisitions.save(req);

        // Ghi nhật ký chuyển trạng thái bất biến
        approvalWorkflow.recordFallbackApprovalLog(id, currentUser.getId(), "CLOSE", reason.trim());

        // Đồng bộ tin tuyển dụng: Gỡ tin đang xuất bản
        syncJobPostingsOnStatusChange(id, "CLOSED", "Yêu cầu tuyển dụng đã đóng: " + reason.trim());

        return toResponse(saved);
    }

    /**
     * Hủy yêu cầu tuyển dụng (S3-07).
     * Áp dụng cho các trạng thái chưa đóng/chưa hủy.
     */
    public RequisitionResponse cancel(Long id, String reason) {
        if (reason == null || reason.trim().length() < 5) {
            throw new BadRequestException("Lý do hủy yêu cầu phải có tối thiểu 5 ký tự.");
        }
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        User currentUser = getCurrentUser();
        checkCanManageRequisitionLifecycle(req, currentUser);

        if ("CLOSED".equalsIgnoreCase(req.getStatus()) || "CANCELLED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Yêu cầu tuyển dụng đã đóng hoặc đã hủy trước đó.");
        }

        req.setStatus("CANCELLED");
        req.setRejectionReason(reason.trim());
        req.setUpdatedAt(Instant.now());
        RecruitmentRequisition saved = requisitions.save(req);

        // Ghi nhật ký chuyển trạng thái bất biến
        approvalWorkflow.recordFallbackApprovalLog(id, currentUser.getId(), "CANCEL", reason.trim());

        // Đồng bộ tin tuyển dụng: Gỡ tin đang xuất bản
        syncJobPostingsOnStatusChange(id, "CANCELLED", "Yêu cầu tuyển dụng đã hủy: " + reason.trim());

        return toResponse(saved);
    }

    private void checkCanManageRequisitionLifecycle(RecruitmentRequisition req, User currentUser) {
        boolean isHrOrAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);
        boolean isCreator = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(currentUser.getId());
        boolean isDeptManager = req.getDepartmentId() != null && departments.findById(req.getDepartmentId())
                .map(d -> currentUser.getId().equals(d.getManagerUserId()))
                .orElse(false);

        if (!isHrOrAdmin && !isCreator && !isDeptManager) {
            throw new AccessDeniedException("Bạn không có quyền thay đổi trạng thái vòng đời của yêu cầu tuyển dụng này.");
        }
    }

    private void syncJobPostingsOnStatusChange(Long requisitionId, String newStatus, String reason) {
        if (jobPostings == null) return;
        java.util.List<com.example.auth_service.domain.sprint3.JobPosting> postings = jobPostings.findByRequisitionId(requisitionId);
        for (var posting : postings) {
            if ("PUBLISHED".equalsIgnoreCase(posting.getStatus())) {
                posting.setStatus("UNPUBLISHED");
                posting.setUnpublishReason(reason);
                posting.setUnpublishedAt(Instant.now());
                jobPostings.save(posting);
            }
        }
    }

    private void validateSalaryAgainstJobTitle(JobTitle job, Long salaryMin, Long salaryMax, String salaryExplanation) {
        boolean outside = false;
        if (salaryMin != null && job.getMinSalary() != null && salaryMin < job.getMinSalary()) {
            outside = true;
        }
        if (salaryMax != null && job.getMaxSalary() != null && salaryMax > job.getMaxSalary()) {
            outside = true;
        }

        if (outside && (salaryExplanation == null || salaryExplanation.trim().isEmpty())) {
            throw new BadRequestException(
                    "Dải lương nằm ngoài khung lương tiêu chuẩn của chức danh. Vui lòng nhập lý do giải trình dải lương."
            );
        }
    }

    private String generateRequisitionCode() {
        String prefix = "REQ-" + DateTimeFormatter.ofPattern("yyyyMM").format(LocalDate.now()) + "-";
        long count = requisitions.countByRequisitionCodeStartingWith(prefix) + 1;
        String candidate = String.format("%s%04d", prefix, count);
        while (requisitions.existsByRequisitionCode(candidate)) {
            count++;
            candidate = String.format("%s%04d", prefix, count);
        }
        return candidate;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Vui lòng đăng nhập để thực hiện chức năng này");
        }
        return users.findByEmail(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Không tìm thấy thông tin tài khoản đang đăng nhập"));
    }

    private RequisitionResponse toResponse(RecruitmentRequisition req) {
        String deptName = null;
        String deptCode = null;
        if (req.getDepartmentId() != null) {
            Optional<Department> dept = departments.findById(req.getDepartmentId());
            if (dept.isPresent()) {
                deptName = dept.get().getName();
                deptCode = dept.get().getCode();
            }
        }

        String jobName = null;
        if (req.getJobTitleId() != null) {
            Optional<JobTitle> job = jobTitles.findById(req.getJobTitleId());
            if (job.isPresent()) {
                jobName = job.get().getTitle();
            }
        }

        String creatorName = null;
        if (req.getCreatedByUserId() != null) {
            Optional<User> creator = users.findById(req.getCreatedByUserId());
            if (creator.isPresent()) {
                creatorName = creator.get().getFullName();
            }
        }

        Long minSalary = req.getSalaryMin() != null ? req.getSalaryMin() : req.getProposedMinSalary();
        Long maxSalary = req.getSalaryMax() != null ? req.getSalaryMax() : req.getProposedMaxSalary();
        String reqs = (req.getCandidateRequirements() != null && !req.getCandidateRequirements().isBlank())
                ? req.getCandidateRequirements()
                : req.getRequirements();
        LocalDate neededDate = req.getNeededDate() != null ? req.getNeededDate() : req.getTargetDate();
        LocalDate targetDate = req.getTargetDate() != null ? req.getTargetDate() : req.getNeededDate();

        return new RequisitionResponse(
                req.getId(),
                req.getRequisitionCode(),
                req.getTitle(),
                req.getDepartmentId(),
                deptName,
                deptCode,
                req.getJobTitleId(),
                jobName,
                req.getQuantity(),
                req.getRecruitmentType(),
                minSalary,
                maxSalary,
                req.getCurrency(),
                req.getSalaryExplanation(),
                neededDate,
                targetDate,
                req.getJobDescription(),
                reqs,
                req.getBenefits(),
                req.getWorkLocation(),
                req.getWorkingModel(),
                req.getStatus(),
                req.getReason(),
                req.getRejectionReason(),
                req.getCreatedByUserId(),
                creatorName,
                req.getSubmittedAt(),
                req.getApprovedByUserId(),
                req.getApprovedAt(),
                req.getCreatedAt(),
                req.getUpdatedAt()
        );
    }

    public com.example.auth_service.dto.RequisitionApprovalTimelineResponse getTimeline(Long id) {
        User currentUser = getCurrentUser();
        return approvalWorkflow.getTimelineResponse(id, currentUser.getId());
    }
}
