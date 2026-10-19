package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.JobPosting;
import com.example.auth_service.domain.sprint3.JobPostingAuditLog;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.DecimalFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class JobPostingService {

    private final JobPostingRepository jobPostings;
    private final JobPostingAuditLogRepository auditLogs;
    private final RecruitmentRequisitionRepository requisitions;
    private final DepartmentRepository departments;
    private final JobTitleRepository jobTitles;
    private final UserRepository users;
    private final RequisitionAssignmentRepository assignments;

    @Autowired
    public JobPostingService(
            JobPostingRepository jobPostings,
            JobPostingAuditLogRepository auditLogs,
            RecruitmentRequisitionRepository requisitions,
            DepartmentRepository departments,
            JobTitleRepository jobTitles,
            UserRepository users,
            @Autowired(required = false) RequisitionAssignmentRepository assignments
    ) {
        this.jobPostings = jobPostings;
        this.auditLogs = auditLogs;
        this.requisitions = requisitions;
        this.departments = departments;
        this.jobTitles = jobTitles;
        this.users = users;
        this.assignments = assignments;
    }

    public JobPostingService(
            JobPostingRepository jobPostings,
            JobPostingAuditLogRepository auditLogs,
            RecruitmentRequisitionRepository requisitions,
            DepartmentRepository departments,
            JobTitleRepository jobTitles,
            UserRepository users
    ) {
        this(jobPostings, auditLogs, requisitions, departments, jobTitles, users, null);
    }

    /**
     * Tạo tin tuyển dụng mới.
     */
    @Transactional
    public JobPostingResponse createJobPosting(JobPostingRequest req, Long userId) {
        validateRequest(req);

        if (req.getRequisitionId() != null) {
            RecruitmentRequisition reqEntity = requisitions.findById(req.getRequisitionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng ID: " + req.getRequisitionId()));
            if (!"APPROVED".equalsIgnoreCase(reqEntity.getStatus())) {
                throw new BadRequestException("Chỉ yêu cầu tuyển dụng ở trạng thái 'Đã duyệt' mới có thể tạo tin tuyển dụng.");
            }
            checkRecruiterScope(userId, req.getRequisitionId());
        }

        JobPosting posting = new JobPosting();
        applyRequestToEntity(posting, req);

        String generatedCode = generateJobCode();
        posting.setJobCode(generatedCode);
        posting.setStatus("DRAFT");
        posting.setCreatedByUserId(userId);
        posting.setCreatedAt(Instant.now());
        posting.setUpdatedAt(Instant.now());

        JobPosting saved = jobPostings.save(posting);
        recordAuditLog(saved.getId(), userId, "CREATE", null, "DRAFT", "Tạo bản nháp tin tuyển dụng");

        return mapToResponse(saved);
    }

    /**
     * Tạo tin tuyển dụng kế thừa từ một Yêu cầu tuyển dụng đã APPROVED (S3-09).
     */
    @Transactional
    public JobPostingResponse createFromRequisition(Long requisitionId, Long userId) {
        RecruitmentRequisition req = requisitions.findById(requisitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng ID: " + requisitionId));

        if (!"APPROVED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ yêu cầu tuyển dụng ở trạng thái 'Đã duyệt' mới có thể tạo tin tuyển dụng.");
        }
        checkRecruiterScope(userId, requisitionId);

        JobPosting posting = new JobPosting();
        posting.setRequisitionId(req.getId());
        posting.setTitle("Tuyển dụng " + req.getTitle());
        posting.setDepartmentId(req.getDepartmentId());
        posting.setJobTitleId(req.getJobTitleId());
        posting.setWorkLocation(req.getWorkLocation());
        posting.setWorkLocationId(req.getWorkLocationId());
        posting.setEmploymentTypeId(req.getEmploymentTypeId());
        posting.setWorkingModel(req.getWorkingModel() != null ? req.getWorkingModel() : "ONSITE");
        posting.setQuantity(req.getQuantity() > 0 ? req.getQuantity() : 1);
        posting.setJobDescription(req.getJobDescription());
        posting.setRequirements(req.getRequirements() != null ? req.getRequirements() : req.getCandidateRequirements());
        posting.setBenefits(req.getBenefits());
        posting.setSalaryMin(req.getSalaryMin() != null ? req.getSalaryMin() : req.getProposedMinSalary());
        posting.setSalaryMax(req.getSalaryMax() != null ? req.getSalaryMax() : req.getProposedMaxSalary());
        posting.setCurrency(req.getCurrency() != null ? req.getCurrency() : "VND");
        posting.setSalaryVisible(true);
        posting.setApplicationDeadline(req.getTargetDate() != null ? req.getTargetDate() : LocalDate.now().plusDays(30));

        posting.setJobCode(generateJobCode());
        posting.setStatus("DRAFT");
        posting.setCreatedByUserId(userId);
        posting.setCreatedAt(Instant.now());
        posting.setUpdatedAt(Instant.now());

        JobPosting saved = jobPostings.save(posting);
        recordAuditLog(saved.getId(), userId, "CREATE", null, "DRAFT", "Tạo tin tuyển dụng kế thừa từ yêu cầu " + req.getRequisitionCode());

        return mapToResponse(saved);
    }

    /**
     * Cập nhật thông tin tin tuyển dụng.
     */
    @Transactional
    public JobPostingResponse updateJobPosting(Long id, JobPostingRequest req, Long userId) {
        JobPosting posting = findPosting(id);

        if ("PUBLISHED".equals(posting.getStatus())) {
            throw new BadRequestException("Không thể chỉnh sửa tin tuyển dụng đang ở trạng thái xuất bản (PUBLISHED). Vui lòng gỡ tin trước khi chỉnh sửa.");
        }

        if (posting.getRequisitionId() != null) {
            checkRecruiterScope(userId, posting.getRequisitionId());
        }

        validateRequest(req);
        applyRequestToEntity(posting, req);
        posting.setUpdatedAt(Instant.now());

        JobPosting updated = jobPostings.save(posting);
        recordAuditLog(updated.getId(), userId, "UPDATE", updated.getStatus(), updated.getStatus(), "Cập nhật nội dung tin tuyển dụng");

        return mapToResponse(updated);
    }

    /**
     * Gửi duyệt tin tuyển dụng (từ DRAFT sang PENDING_APPROVAL).
     */
    @Transactional
    public JobPostingResponse submitForApproval(Long id, Long userId) {
        JobPosting posting = findPosting(id);

        if (posting.getRequisitionId() != null) {
            checkRecruiterScope(userId, posting.getRequisitionId());
        }

        if (!"DRAFT".equals(posting.getStatus()) && !"REJECTED".equals(posting.getStatus())) {
            throw new BadRequestException("Chỉ tin ở trạng thái 'Bản nháp' hoặc 'Bị từ chối' mới có thể gửi phê duyệt.");
        }

        String fromStatus = posting.getStatus();
        posting.setStatus("PENDING_APPROVAL");
        posting.setUpdatedAt(Instant.now());

        JobPosting updated = jobPostings.save(posting);
        recordAuditLog(updated.getId(), userId, "SUBMIT_APPROVAL", fromStatus, "PENDING_APPROVAL", "Gửi tin tuyển dụng chờ Trưởng phòng Nhân sự duyệt");

        return mapToResponse(updated);
    }

    /**
     * SCRUM-149: Duyệt tin tuyển dụng.
     * Acceptance Criteria:
     * - Chỉ HR Manager được duyệt.
     */
    @Transactional
    public JobPostingResponse approveJobPosting(Long id, String notes, Long hrManagerUserId) {
        verifyHrManagerRole(hrManagerUserId);

        JobPosting posting = findPosting(id);
        if ("APPROVED".equals(posting.getStatus())) {
            throw new BadRequestException("Tin tuyển dụng này đã được phê duyệt trước đó.");
        }
        if ("PUBLISHED".equals(posting.getStatus())) {
            throw new BadRequestException("Tin tuyển dụng đã xuất bản công khai.");
        }

        String fromStatus = posting.getStatus();
        posting.setStatus("APPROVED");
        posting.setApprovedByUserId(hrManagerUserId);
        posting.setApprovedAt(Instant.now());
        posting.setApprovalNotes(notes);
        posting.setUpdatedAt(Instant.now());

        JobPosting updated = jobPostings.save(posting);
        recordAuditLog(updated.getId(), hrManagerUserId, "APPROVE", fromStatus, "APPROVED",
                notes != null && !notes.isBlank() ? notes : "Trưởng phòng Nhân sự đã phê duyệt tin tuyển dụng");

        return mapToResponse(updated);
    }

    /**
     * SCRUM-149: Xuất bản tin tuyển dụng.
     * Acceptance Criteria:
     * - Chỉ HR Manager được xuất bản.
     * - Tin phải qua trạng thái duyệt trước khi công khai.
     * - Ghi người xuất bản và thời điểm.
     */
    @Transactional
    public JobPostingResponse publishJobPosting(Long id, String notes, Long hrManagerUserId) {
        verifyHrManagerRole(hrManagerUserId);

        JobPosting posting = findPosting(id);

        // Ràng buộc nghiêm ngặt: Tin phải qua trạng thái duyệt trước khi công khai
        if (!"APPROVED".equals(posting.getStatus())) {
            throw new BadRequestException("Tin tuyển dụng phải qua trạng thái phê duyệt trước khi công khai (trạng thái hiện tại: " + posting.getStatus() + ").");
        }

        String fromStatus = posting.getStatus();
        posting.setStatus("PUBLISHED");
        posting.setPublishedByUserId(hrManagerUserId);
        posting.setPublishedAt(Instant.now());
        posting.setUpdatedAt(Instant.now());

        JobPosting updated = jobPostings.save(posting);
        recordAuditLog(updated.getId(), hrManagerUserId, "PUBLISH", fromStatus, "PUBLISHED",
                notes != null && !notes.isBlank() ? notes : "Xuất bản tin tuyển dụng lên cổng thông tin công khai");

        return mapToResponse(updated);
    }

    /**
     * SCRUM-149: Duyệt và Xuất bản trong 1 thao tác (Dành cho HR Manager).
     * Đi qua trạng thái APPROVED -> PUBLISHED, ghi đầy đủ người xuất bản và thời điểm.
     */
    @Transactional
    public JobPostingResponse approveAndPublishJobPosting(Long id, String notes, Long hrManagerUserId) {
        verifyHrManagerRole(hrManagerUserId);

        JobPosting posting = findPosting(id);
        if ("PUBLISHED".equals(posting.getStatus())) {
            throw new BadRequestException("Tin tuyển dụng này đã ở trạng thái xuất bản công khai.");
        }

        String fromStatus = posting.getStatus();
        Instant now = Instant.now();

        // 1. Ghi nhận duyệt
        posting.setApprovedByUserId(hrManagerUserId);
        posting.setApprovedAt(now);
        posting.setApprovalNotes(notes);

        // 2. Chuyển trạng thái xuất bản
        posting.setStatus("PUBLISHED");
        posting.setPublishedByUserId(hrManagerUserId);
        posting.setPublishedAt(now);
        posting.setUpdatedAt(now);

        JobPosting updated = jobPostings.save(posting);
        recordAuditLog(updated.getId(), hrManagerUserId, "APPROVE_AND_PUBLISH", fromStatus, "PUBLISHED",
                notes != null && !notes.isBlank() ? notes : "Trưởng phòng Nhân sự duyệt và xuất bản tin tuyển dụng");

        return mapToResponse(updated);
    }

    /**
     * Từ chối duyệt tin tuyển dụng.
     */
    @Transactional
    public JobPostingResponse rejectJobPosting(Long id, String reason, Long hrManagerUserId) {
        verifyHrManagerRole(hrManagerUserId);

        if (reason == null || reason.trim().isEmpty()) {
            throw new BadRequestException("Vui lòng nhập lý do từ chối phê duyệt tin tuyển dụng.");
        }

        JobPosting posting = findPosting(id);
        if ("PUBLISHED".equals(posting.getStatus())) {
            throw new BadRequestException("Tin đã xuất bản, nếu muốn dừng hiển thị vui lòng dùng tính năng 'Gỡ tin'.");
        }

        String fromStatus = posting.getStatus();
        posting.setStatus("REJECTED");
        posting.setApprovalNotes("Từ chối duyệt: " + reason.trim());
        posting.setUpdatedAt(Instant.now());

        JobPosting updated = jobPostings.save(posting);
        recordAuditLog(updated.getId(), hrManagerUserId, "REJECT", fromStatus, "REJECTED", reason.trim());

        return mapToResponse(updated);
    }

    /**
     * SCRUM-150: Gỡ tin tuyển dụng khỏi trang công khai (Unpublish).
     * Bắt buộc có lý do và ghi lại nhật ký.
     */
    @Transactional
    public JobPostingResponse unpublishJobPosting(Long id, String reason, Long userId) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new BadRequestException("Vui lòng cung cấp lý do gỡ tin tuyển dụng.");
        }

        JobPosting posting = findPosting(id);
        if (!"PUBLISHED".equals(posting.getStatus())) {
            throw new BadRequestException("Chỉ tin tuyển dụng đang xuất bản mới có thể thực hiện gỡ tin.");
        }

        String fromStatus = posting.getStatus();
        posting.setStatus("UNPUBLISHED");
        posting.setUnpublishedByUserId(userId);
        posting.setUnpublishedAt(Instant.now());
        posting.setUnpublishReason(reason.trim());
        posting.setUpdatedAt(Instant.now());

        JobPosting updated = jobPostings.save(posting);
        recordAuditLog(updated.getId(), userId, "UNPUBLISH", fromStatus, "UNPUBLISHED", "Lý do gỡ tin: " + reason.trim());

        return mapToResponse(updated);
    }

    /**
     * Lấy danh sách tin tuyển dụng nội bộ (Internal Management).
     */
    @Transactional(readOnly = true)
    public Page<JobPostingResponse> getJobPostings(
            String status,
            Long departmentId,
            String keyword,
            Pageable pageable
    ) {
        String filterStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status))
                ? status.trim().toUpperCase()
                : null;
        String filterKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;

        Page<JobPosting> page = jobPostings.findWithFilters(filterStatus, departmentId, filterKeyword, pageable);
        return page.map(this::mapToResponse);
    }

    /**
     * Lấy chi tiết tin tuyển dụng nội bộ (kèm toàn bộ nhật ký kiểm toán).
     */
    @Transactional(readOnly = true)
    public JobPostingResponse getJobPostingDetail(Long id) {
        JobPosting posting = findPosting(id);
        JobPostingResponse response = mapToResponse(posting);

        List<JobPostingAuditLogResponse> logs = auditLogs.findByJobPostingIdOrderByCreatedAtDesc(id)
                .stream()
                .map(this::mapAuditLogToResponse)
                .collect(Collectors.toList());
        response.setAuditLogs(logs);

        return response;
    }

    /**
     * SCRUM-150: Lấy danh sách tin tuyển dụng công khai cho ứng viên.
     * Acceptance Criteria:
     * - Chỉ trả tin đang hiệu lực và chưa hết hạn.
     * - Tin bị gỡ không xuất hiện công khai.
     */
    @Transactional(readOnly = true)
    public Page<JobPostingPublicResponse> getPublicJobPostings(
            Long departmentId,
            String workingModel,
            String workLocation,
            String keyword,
            Pageable pageable
    ) {
        LocalDate today = LocalDate.now();
        String filterWorkingModel = (workingModel != null && !workingModel.isBlank() && !"ALL".equalsIgnoreCase(workingModel))
                ? workingModel.trim() : null;
        String filterLocation = (workLocation != null && !workLocation.isBlank()) ? workLocation.trim() : null;
        String filterKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;

        Page<JobPosting> page = jobPostings.findPublicPostings(today, departmentId, filterWorkingModel, filterLocation, filterKeyword, pageable);
        return page.map(this::mapToPublicResponse);
    }

    /** Department filter options drawn exclusively from visible public postings. */
    @Transactional(readOnly = true)
    public List<PublicJobDepartmentResponse> getPublicDepartments() {
        return jobPostings.findPublicDepartments(LocalDate.now());
    }

    /** Public detail returns 404 for unpublished or expired postings. */
    @Transactional(readOnly = true)
    public JobPostingPublicResponse getPublicJobPostingDetail(Long id) {
        LocalDate today = LocalDate.now();
        JobPosting posting = jobPostings.findPublicById(id, today)
                .orElseThrow(() -> new ResourceNotFoundException("Tin tuyển dụng không tồn tại, đã hết hạn hoặc đã được gỡ xuống."));

        return mapToPublicResponse(posting);
    }

    /**
     * Đọc nhật ký kiểm toán của một tin tuyển dụng.
     */
    @Transactional(readOnly = true)
    public List<JobPostingAuditLogResponse> getAuditLogs(Long jobPostingId) {
        findPosting(jobPostingId);
        return auditLogs.findByJobPostingIdOrderByCreatedAtDesc(jobPostingId)
                .stream()
                .map(this::mapAuditLogToResponse)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private JobPosting findPosting(Long id) {
        return jobPostings.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin tuyển dụng với ID: " + id));
    }

    private void verifyHrManagerRole(Long userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản người dùng ID: " + userId));

        boolean isHrManager = user.getRoles() != null && user.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER);

        if (!isHrManager) {
            throw new AccessDeniedException("Chỉ Trưởng phòng Nhân sự (HR Manager) mới có quyền duyệt và xuất bản tin tuyển dụng.");
        }
    }

    private void checkRecruiterScope(Long userId, Long requisitionId) {
        if (userId == null || requisitionId == null || assignments == null) {
            return;
        }
        User user = users.findById(userId).orElse(null);
        if (user == null || user.getRoles() == null) {
            return;
        }
        boolean isRecruiterOnly = user.getRoles().stream().anyMatch(r -> r.getName() == RoleName.RECRUITER)
                && user.getRoles().stream().noneMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);
        if (isRecruiterOnly) {
            boolean isAssigned = assignments.existsByRequisitionIdAndUserId(requisitionId, userId);
            if (!isAssigned) {
                throw new AccessDeniedException("Chuyên viên tuyển dụng chỉ có quyền tạo và quản lý tin tuyển dụng trong phạm vi yêu cầu được phân công.");
            }
        }
    }

    private void recordAuditLog(Long jobPostingId, Long userId, String action, String fromStatus, String toStatus, String note) {
        JobPostingAuditLog log = new JobPostingAuditLog();
        log.setJobPostingId(jobPostingId);
        log.setUserId(userId);
        log.setAction(action);
        log.setFromStatus(fromStatus);
        log.setToStatus(toStatus);
        log.setNote(note);
        log.setCreatedAt(Instant.now());
        auditLogs.save(log);
    }

    private synchronized String generateJobCode() {
        String year = String.valueOf(LocalDate.now().getYear());
        String prefix = "JP-" + year + "-";
        long count = jobPostings.countByJobCodeStartingWith(prefix) + 1;
        String code = prefix + String.format("%04d", count);
        while (jobPostings.existsByJobCode(code)) {
            count++;
            code = prefix + String.format("%04d", count);
        }
        return code;
    }

    private void validateRequest(JobPostingRequest req) {
        if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
            throw new BadRequestException("Tiêu đề tin tuyển dụng không được để trống.");
        }
        if (req.getSalaryMin() != null && req.getSalaryMax() != null && req.getSalaryMin() > req.getSalaryMax()) {
            throw new BadRequestException("Mức lương tối thiểu không được lớn hơn mức lương tối đa.");
        }
    }

    private void applyRequestToEntity(JobPosting posting, JobPostingRequest req) {
        posting.setTitle(req.getTitle().trim());
        if (req.getRequisitionId() != null) posting.setRequisitionId(req.getRequisitionId());
        if (req.getDepartmentId() != null) posting.setDepartmentId(req.getDepartmentId());
        if (req.getJobTitleId() != null) posting.setJobTitleId(req.getJobTitleId());
        posting.setWorkLocation(req.getWorkLocation());
        posting.setWorkLocationId(req.getWorkLocationId());
        posting.setEmploymentTypeId(req.getEmploymentTypeId());
        if (req.getWorkingModel() != null) posting.setWorkingModel(req.getWorkingModel());
        if (req.getQuantity() != null && req.getQuantity() > 0) posting.setQuantity(req.getQuantity());
        posting.setJobDescription(req.getJobDescription());
        posting.setRequirements(req.getRequirements());
        posting.setBenefits(req.getBenefits());
        posting.setSalaryMin(req.getSalaryMin());
        posting.setSalaryMax(req.getSalaryMax());
        if (req.getCurrency() != null) posting.setCurrency(req.getCurrency());
        if (req.getSalaryVisible() != null) posting.setSalaryVisible(req.getSalaryVisible());
        if (req.getApplicationDeadline() != null) posting.setApplicationDeadline(req.getApplicationDeadline());
    }

    private JobPostingResponse mapToResponse(JobPosting j) {
        String deptName = null;
        if (j.getDepartmentId() != null) {
            deptName = departments.findById(j.getDepartmentId()).map(Department::getName).orElse(null);
        }

        String jobTitleName = null;
        if (j.getJobTitleId() != null) {
            jobTitleName = jobTitles.findById(j.getJobTitleId()).map(JobTitle::getTitle).orElse(null);
        }

        String reqCode = null;
        if (j.getRequisitionId() != null) {
            reqCode = requisitions.findById(j.getRequisitionId()).map(RecruitmentRequisition::getRequisitionCode).orElse(null);
        }

        String createdByName = getUserName(j.getCreatedByUserId());
        String approvedByName = getUserName(j.getApprovedByUserId());
        String publishedByName = getUserName(j.getPublishedByUserId());
        String unpublishedByName = getUserName(j.getUnpublishedByUserId());

        return JobPostingResponse.builder()
                .id(j.getId())
                .requisitionId(j.getRequisitionId())
                .requisitionCode(reqCode)
                .jobCode(j.getJobCode())
                .title(j.getTitle())
                .departmentId(j.getDepartmentId())
                .departmentName(deptName)
                .jobTitleId(j.getJobTitleId())
                .jobTitleName(jobTitleName)
                .workLocation(j.getWorkLocation())
                .workLocationId(j.getWorkLocationId())
                .employmentTypeId(j.getEmploymentTypeId())
                .workingModel(j.getWorkingModel())
                .quantity(j.getQuantity())
                .jobDescription(j.getJobDescription())
                .requirements(j.getRequirements())
                .benefits(j.getBenefits())
                .salaryMin(j.getSalaryMin())
                .salaryMax(j.getSalaryMax())
                .currency(j.getCurrency())
                .salaryVisible(j.isSalaryVisible())
                .applicationDeadline(j.getApplicationDeadline())
                .status(j.getStatus())
                .approvedByUserId(j.getApprovedByUserId())
                .approvedByUserName(approvedByName)
                .approvedAt(j.getApprovedAt())
                .approvalNotes(j.getApprovalNotes())
                .publishedByUserId(j.getPublishedByUserId())
                .publishedByUserName(publishedByName)
                .publishedAt(j.getPublishedAt())
                .unpublishedByUserId(j.getUnpublishedByUserId())
                .unpublishedByUserName(unpublishedByName)
                .unpublishedAt(j.getUnpublishedAt())
                .unpublishReason(j.getUnpublishReason())
                .createdByUserId(j.getCreatedByUserId())
                .createdByUserName(createdByName)
                .createdAt(j.getCreatedAt())
                .updatedAt(j.getUpdatedAt())
                .build();
    }

    private JobPostingPublicResponse mapToPublicResponse(JobPosting j) {
        String deptName = null;
        if (j.getDepartmentId() != null) {
            deptName = departments.findById(j.getDepartmentId()).map(Department::getName).orElse(null);
        }

        String jobTitleName = null;
        if (j.getJobTitleId() != null) {
            jobTitleName = jobTitles.findById(j.getJobTitleId()).map(JobTitle::getTitle).orElse(null);
        }

        String salaryDisplay = "Thỏa thuận";
        if (j.isSalaryVisible() && (j.getSalaryMin() != null || j.getSalaryMax() != null)) {
            DecimalFormat fmt = new DecimalFormat("#,###");
            String curr = j.getCurrency() != null ? j.getCurrency() : "VND";
            if (j.getSalaryMin() != null && j.getSalaryMax() != null) {
                salaryDisplay = fmt.format(j.getSalaryMin()) + " - " + fmt.format(j.getSalaryMax()) + " " + curr;
            } else if (j.getSalaryMin() != null) {
                salaryDisplay = "Từ " + fmt.format(j.getSalaryMin()) + " " + curr;
            } else {
                salaryDisplay = "Lên đến " + fmt.format(j.getSalaryMax()) + " " + curr;
            }
        }

        return JobPostingPublicResponse.builder()
                .id(j.getId())
                .requisitionId(j.getRequisitionId())
                .jobCode(j.getJobCode())
                .title(j.getTitle())
                .departmentId(j.getDepartmentId())
                .departmentName(deptName)
                .jobTitleId(j.getJobTitleId())
                .jobTitleName(jobTitleName)
                .workLocation(j.getWorkLocation())
                .workingModel(j.getWorkingModel())
                .quantity(j.getQuantity())
                .jobDescription(j.getJobDescription())
                .requirements(j.getRequirements())
                .benefits(j.getBenefits())
                .salaryVisible(j.isSalaryVisible())
                .salaryMin(j.isSalaryVisible() ? j.getSalaryMin() : null)
                .salaryMax(j.isSalaryVisible() ? j.getSalaryMax() : null)
                .currency(j.getCurrency())
                .salaryDisplay(salaryDisplay)
                .applicationDeadline(j.getApplicationDeadline())
                .publishedAt(j.getPublishedAt())
                .build();
    }

    private JobPostingAuditLogResponse mapAuditLogToResponse(JobPostingAuditLog log) {
        String userName = "Hệ thống";
        String email = "";
        if (log.getUserId() != null) {
            Optional<User> u = users.findById(log.getUserId());
            if (u.isPresent()) {
                userName = u.get().getFullName() != null ? u.get().getFullName() : u.get().getEmail();
                email = u.get().getEmail();
            }
        }

        return JobPostingAuditLogResponse.builder()
                .id(log.getId())
                .jobPostingId(log.getJobPostingId())
                .userId(log.getUserId())
                .userName(userName)
                .userEmail(email)
                .action(log.getAction())
                .fromStatus(log.getFromStatus())
                .toStatus(log.getToStatus())
                .note(log.getNote())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private String getUserName(Long userId) {
        if (userId == null) return null;
        return users.findById(userId)
                .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getEmail())
                .orElse(null);
    }
}
