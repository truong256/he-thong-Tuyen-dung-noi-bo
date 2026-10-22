package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.JobPostingService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/job-postings")
public class JobPostingController {

    private final JobPostingService jobPostingService;

    public JobPostingController(JobPostingService jobPostingService) {
        this.jobPostingService = jobPostingService;
    }

    /**
     * GET /api/job-postings
     * Danh sách tin tuyển dụng nội bộ (phân trang, lọc theo trạng thái, phòng ban, từ khóa).
     */
    @GetMapping
    public ResponseEntity<Page<JobPostingResponse>> getJobPostings(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        Pageable pageable = createPageable(page, size, sort);
        return ResponseEntity.ok(jobPostingService.getJobPostings(status, departmentId, keyword, pageable));
    }

    /**
     * GET /api/job-postings/{id}
     * Chi tiết tin tuyển dụng nội bộ kèm nhật ký kiểm toán.
     */
    @GetMapping("/{id}")
    public ResponseEntity<JobPostingResponse> getJobPostingDetail(@PathVariable Long id) {
        return ResponseEntity.ok(jobPostingService.getJobPostingDetail(id));
    }

    /**
     * POST /api/job-postings
     * Soạn tin tuyển dụng mới.
     */
    @PostMapping
    public ResponseEntity<JobPostingResponse> createJobPosting(
            @Valid @RequestBody JobPostingRequest request
    ) {
        Long userId = getCurrentUserId();
        JobPostingResponse created = jobPostingService.createJobPosting(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * POST /api/job-postings/from-requisition/{requisitionId}
     * Kế thừa thông tin từ Requisition đã Approved để tạo nhanh tin tuyển dụng.
     */
    @PostMapping("/from-requisition/{requisitionId}")
    public ResponseEntity<JobPostingResponse> createFromRequisition(@PathVariable Long requisitionId) {
        Long userId = getCurrentUserId();
        JobPostingResponse created = jobPostingService.createFromRequisition(requisitionId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/job-postings/{id}
     * Cập nhật thông tin tin tuyển dụng.
     */
    @PutMapping("/{id}")
    public ResponseEntity<JobPostingResponse> updateJobPosting(
            @PathVariable Long id,
            @Valid @RequestBody JobPostingRequest request
    ) {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(jobPostingService.updateJobPosting(id, request, userId));
    }

    /**
     * POST /api/job-postings/{id}/submit-approval
     * Nộp tin chờ Trưởng phòng Nhân sự duyệt (DRAFT -> PENDING_APPROVAL).
     */
    @PostMapping("/{id}/submit-approval")
    public ResponseEntity<JobPostingResponse> submitApproval(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(jobPostingService.submitForApproval(id, userId));
    }

    /**
     * POST /api/job-postings/{id}/approve
     * SCRUM-149: Duyệt tin tuyển dụng.
     * Chỉ HR Manager được duyệt.
     */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('HR_MANAGER')")
    public ResponseEntity<JobPostingResponse> approveJobPosting(
            @PathVariable Long id,
            @RequestBody(required = false) JobPostingApprovalRequest request
    ) {
        Long userId = getCurrentUserId();
        String notes = request != null ? request.getNotes() : null;
        return ResponseEntity.ok(jobPostingService.approveJobPosting(id, notes, userId));
    }

    /**
     * POST /api/job-postings/{id}/publish
     * SCRUM-149: Xuất bản tin tuyển dụng công khai.
     * Chỉ HR Manager được xuất bản. Tin phải qua trạng thái duyệt trước khi công khai.
     */
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('HR_MANAGER')")
    public ResponseEntity<JobPostingResponse> publishJobPosting(
            @PathVariable Long id,
            @RequestBody(required = false) JobPostingApprovalRequest request
    ) {
        Long userId = getCurrentUserId();
        String notes = request != null ? request.getNotes() : null;
        return ResponseEntity.ok(jobPostingService.publishJobPosting(id, notes, userId));
    }

    /**
     * POST /api/job-postings/{id}/approve-and-publish
     * SCRUM-149: Duyệt và xuất bản ngay trong 1 bước (dành cho HR Manager).
     */
    @PostMapping("/{id}/approve-and-publish")
    @PreAuthorize("hasRole('HR_MANAGER')")
    public ResponseEntity<JobPostingResponse> approveAndPublish(
            @PathVariable Long id,
            @RequestBody(required = false) JobPostingApprovalRequest request
    ) {
        Long userId = getCurrentUserId();
        String notes = request != null ? request.getNotes() : null;
        return ResponseEntity.ok(jobPostingService.approveAndPublishJobPosting(id, notes, userId));
    }

    /**
     * POST /api/job-postings/{id}/reject
     * Từ chối duyệt tin tuyển dụng kèm lý do.
     * Chỉ HR Manager có quyền từ chối duyệt.
     */
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('HR_MANAGER')")
    public ResponseEntity<JobPostingResponse> rejectJobPosting(
            @PathVariable Long id,
            @Valid @RequestBody JobPostingRejectRequest request
    ) {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(jobPostingService.rejectJobPosting(id, request.getReason(), userId));
    }

    /**
     * POST /api/job-postings/{id}/unpublish
     * SCRUM-150: Gỡ tin tuyển dụng khỏi trang công khai (kèm lý do).
     */
    @PostMapping("/{id}/unpublish")
    @PreAuthorize("hasAnyAuthority('JOB_MANAGE', 'ROLE_HR_MANAGER', 'ROLE_ADMIN', 'ROLE_RECRUITER')")
    public ResponseEntity<JobPostingResponse> unpublishJobPosting(
            @PathVariable Long id,
            @Valid @RequestBody JobPostingUnpublishRequest request
    ) {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(jobPostingService.unpublishJobPosting(id, request.getReason(), userId));
    }

    /**
     * POST /api/job-postings/auto-expire
     * S4-08 / SCRUM-187: Kích hoạt kiểm tra và tự động hết hạn các tin tuyển dụng quá hạn nhận hồ sơ.
     */
    @PostMapping("/auto-expire")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AutoExpireResult> triggerAutoExpire(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        if (date != null && !date.equals(today)) {
            throw new com.example.auth_service.exception.BadRequestException("Chỉ được quét hết hạn theo ngày hiện tại tại Việt Nam.");
        }
        LocalDate checkDate = today;
        return ResponseEntity.ok(jobPostingService.expireDueJobPostings(checkDate));
    }

    /**
     * GET /api/job-postings/{id}/audit-logs
     * SCRUM-150: Lấy nhật ký duyệt, xuất bản và gỡ tin.
     */
    @GetMapping({"/{id}/audit-logs", "/{id}/logs", "/{id}/history"})
    public ResponseEntity<List<JobPostingAuditLogResponse>> getAuditLogs(@PathVariable Long id) {
        return ResponseEntity.ok(jobPostingService.getAuditLogs(id));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Vui lòng đăng nhập để thực hiện thao tác này.");
        }
        return principal.getId();
    }

    private Pageable createPageable(int page, int size, String sortParam) {
        int safePage = Math.max(page, 0);
        int safeSize = (size <= 0 || size > 100) ? 10 : size;

        String[] sortParts = sortParam.split(",");
        String property = sortParts[0].trim();
        Sort.Direction direction = (sortParts.length > 1 && "asc".equalsIgnoreCase(sortParts[1].trim()))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        return PageRequest.of(safePage, safeSize, Sort.by(direction, property));
    }
}
