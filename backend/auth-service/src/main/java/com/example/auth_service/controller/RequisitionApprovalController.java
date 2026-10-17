package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.ApprovalActionRequest;
import com.example.auth_service.dto.RejectRequisitionRequest;
import com.example.auth_service.dto.RequisitionApprovalLogResponse;
import com.example.auth_service.dto.RequisitionApprovalTimelineResponse;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.RequisitionAssignmentRepository;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.RequisitionApprovalService;
import com.example.auth_service.service.RequisitionApprovalWorkflowService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.example.auth_service.domain.sprint3.RequisitionApprovalHistory;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.RequisitionApprovalHistoryRepository;
import com.example.auth_service.repository.RequisitionApprovalSnapshotRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.service.HeadcountBudgetService;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Controller xử lý theo dõi tiến độ, lịch sử phê duyệt và các thao tác duyệt/từ chối/yêu cầu bổ sung (S3-01, S3-02 & S3-03).
 */
@RestController
@RequestMapping("/api/requisitions/{id}")
public class RequisitionApprovalController {

    private final RecruitmentRequisitionRepository requisitions;
    private final RequisitionAssignmentRepository assignments;
    private final RequisitionApprovalWorkflowService approvalWorkflow;
    private final RequisitionApprovalService approvalService;
    private final DepartmentRepository departments;
    private final RequisitionApprovalSnapshotRepository snapshots;
    private final RequisitionApprovalHistoryRepository historyRepository;
    private final HeadcountBudgetService headcountBudgetService;
    private final UserRepository users;

    @Autowired
    public RequisitionApprovalController(
            RecruitmentRequisitionRepository requisitions,
            RequisitionAssignmentRepository assignments,
            RequisitionApprovalWorkflowService approvalWorkflow,
            RequisitionApprovalService approvalService,
            @Autowired(required = false) DepartmentRepository departments,
            @Autowired(required = false) RequisitionApprovalSnapshotRepository snapshots,
            @Autowired(required = false) RequisitionApprovalHistoryRepository historyRepository,
            @Autowired(required = false) HeadcountBudgetService headcountBudgetService,
            @Autowired(required = false) UserRepository users
    ) {
        this.requisitions = requisitions;
        this.assignments = assignments;
        this.approvalWorkflow = approvalWorkflow;
        this.approvalService = approvalService;
        this.departments = departments;
        this.snapshots = snapshots;
        this.historyRepository = historyRepository;
        this.headcountBudgetService = headcountBudgetService;
        this.users = users;
    }

    public RequisitionApprovalController(
            RecruitmentRequisitionRepository requisitions,
            RequisitionAssignmentRepository assignments,
            RequisitionApprovalWorkflowService approvalWorkflow,
            RequisitionApprovalService approvalService
    ) {
        this(requisitions, assignments, approvalWorkflow, approvalService, null, null, null, null, null);
    }

    private void checkCanViewApprovalData(RecruitmentRequisition req, UserPrincipal principal) {
        boolean isHrOrAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_HR_MANAGER") || a.getAuthority().equals("ROLE_ADMIN")
                            || a.getAuthority().equals("REQUISITION_READ_ALL"));
        if (isHrOrAdmin) {
            return;
        }

        Long userId = principal.getId();
        boolean isOwner = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(userId);
        boolean isDeptManager = req.getDepartmentId() != null && departments != null && departments.findById(req.getDepartmentId())
                .map(d -> userId.equals(d.getManagerUserId()))
                .orElse(false);
        boolean isAssignedRecruiter = assignments.findByRequisitionIdAndUserId(req.getId(), userId).isPresent();

        // Nếu chưa có snapshot hay history, khởi tạo chuỗi phê duyệt chuẩn để xác định đúng người được phân công
        if ((snapshots == null || snapshots.findAllByRequisitionIdOrderByStepOrderAsc(req.getId()).isEmpty())
                && (historyRepository != null && historyRepository.findByRequisitionIdOrderByStepOrderAsc(req.getId()).isEmpty())) {
            if (approvalService != null) {
                approvalService.ensureApprovalChainInitialized(req);
            }
        }

        if (approvalWorkflow != null && req.getDepartmentId() != null) {
            long proposedSalary = req.getSalaryMax() != null
                    ? req.getSalaryMax()
                    : (req.getSalaryMin() != null ? req.getSalaryMin() : 0L);
            approvalWorkflow.syncMissingSubsequentSteps(req, proposedSalary);
        }

        boolean isAssignedApprover = (snapshots != null && snapshots.findAllByRequisitionIdOrderByStepOrderAsc(req.getId()).stream()
                .anyMatch(s -> userId.equals(s.getApproverUserId())))
                || (historyRepository != null && historyRepository.findByRequisitionIdOrderByStepOrderAsc(req.getId()).stream()
                .anyMatch(h -> userId.equals(h.getApproverId())))
                || assignments.findByRequisitionIdAndUserId(req.getId(), userId)
                .filter(a -> a.getRole() == RoleName.APPROVER || a.getRole() == RoleName.HIRING_MANAGER)
                .isPresent();

        if (!isOwner && !isDeptManager && !isAssignedRecruiter && !isAssignedApprover) {
            throw new AccessDeniedException("Bạn không có quyền xem thông tin phê duyệt của yêu cầu tuyển dụng này.");
        }
    }

    /**
     * GET /api/requisitions/{id}/timeline, /api/requisitions/{id}/approve/timeline
     * Lấy dòng thời gian phê duyệt (ưu tiên snapshot thực tế S3-01).
     */
    @GetMapping({"/timeline", "/approve/timeline", "/approve"})
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_OWN', 'REQUISITION_READ_ALL', 'REQUISITION_APPROVE')")
    public ResponseEntity<RequisitionApprovalTimelineResponse> getApprovalTimeline(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Vui lòng đăng nhập.");
        }
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));
        checkCanViewApprovalData(req, principal);

        if (approvalWorkflow.hasWorkflowSnapshot(id)) {
            return ResponseEntity.ok(approvalWorkflow.getTimelineResponse(id, principal.getId()));
        }
        return ResponseEntity.ok(approvalService.getApprovalTimeline(id));
    }

    /**
     * PUT /api/requisitions/{id}/approve
     * Phê duyệt yêu cầu tuyển dụng (hỗ trợ cả luồng snapshot tuần tự S3-01/S3-02 và luồng timeline S3-03).
     */
    @PutMapping("/approve")
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<?> approveRequisition(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        String comment = null;
        String overrideReason = null;
        if (body != null) {
            if (body.get("comments") != null) {
                comment = body.get("comments").toString();
            } else if (body.get("comment") != null) {
                comment = body.get("comment").toString();
            }
            if (body.get("overrideReason") != null) {
                overrideReason = body.get("overrideReason").toString();
            }
        }
        return executeApprovalAction(id, "APPROVE", comment, overrideReason);
    }

    /**
     * PUT /api/requisitions/{id}/reject
     * Từ chối yêu cầu tuyển dụng với lý do bắt buộc (S3-03).
     */
    @PutMapping("/reject")
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<?> rejectRequisition(
            @PathVariable Long id,
            @Valid @RequestBody RejectRequisitionRequest request
    ) {
        if (request == null || request.rejectionReason() == null || request.rejectionReason().trim().isEmpty()) {
            throw new BadRequestException("Lý do từ chối không được để trống.");
        }
        return executeApprovalAction(id, "REJECT", request.rejectionReason(), null);
    }

    /**
     * POST /api/requisitions/{id}/approve
     * Phê duyệt yêu cầu tuyển dụng (S3-02).
     */
    @PostMapping("/approve")
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<?> approvePost(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequest request
    ) {
        String comment = request != null ? request.effectiveComment() : null;
        String overrideReason = request != null ? request.overrideReason() : null;
        return executeApprovalAction(id, "APPROVE", comment, overrideReason);
    }

    /**
     * POST /api/requisitions/{id}/reject
     * Từ chối yêu cầu tuyển dụng (bắt buộc có ý kiến, S3-02).
     */
    @PostMapping("/reject")
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<?> rejectPost(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequest request
    ) {
        String comment = request != null ? request.effectiveComment() : null;
        return executeApprovalAction(id, "REJECT", comment, null);
    }

    /**
     * POST /api/requisitions/{id}/request-changes
     * Yêu cầu bổ sung thông tin (bắt buộc có ý kiến, trả hồ sơ về người tạo nhưng giữ lịch sử, S3-02).
     */
    @PostMapping("/request-changes")
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<?> requestChangesPost(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequest request
    ) {
        String comment = request != null ? request.effectiveComment() : null;
        return executeApprovalAction(id, "REQUEST_CHANGES", comment, null);
    }

    /**
     * PUT /api/requisitions/{id}/request-changes
     * Yêu cầu bổ sung thông tin (bắt buộc có ý kiến, trả hồ sơ về người tạo nhưng giữ lịch sử, S3-02).
     */
    @PutMapping("/request-changes")
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<?> requestChangesPut(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequest request
    ) {
        String comment = request != null ? request.effectiveComment() : null;
        return executeApprovalAction(id, "REQUEST_CHANGES", comment, null);
    }

    /**
     * POST /api/requisitions/{id}/approval-actions hoặc /api/requisitions/{id}/approval-action
     * API chung cho cả 3 hành động: APPROVE, REJECT, REQUEST_CHANGES (S3-02).
     */
    @PostMapping({"/approval-actions", "/approval-action"})
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<?> performApprovalAction(
            @PathVariable Long id,
            @RequestBody ApprovalActionRequest request
    ) {
        if (request == null) {
            throw new BadRequestException("Dữ liệu hành động phê duyệt không được để trống.");
        }
        String action = request.normalizedAction();
        String comment = request.effectiveComment();
        String overrideReason = request.overrideReason();
        return executeApprovalAction(id, action, comment, overrideReason);
    }


    /**
     * GET /api/requisitions/{id}/approval-history
     * Đọc dòng thời gian phê duyệt (S3-01 & S3-03 timeline) với cấu trúc DTO thống nhất.
     */
    @GetMapping("/approval-history")
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_OWN', 'REQUISITION_READ_ALL', 'REQUISITION_APPROVE')")
    public ResponseEntity<RequisitionApprovalTimelineResponse> getApprovalHistory(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Vui lòng đăng nhập.");
        }
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));
        checkCanViewApprovalData(req, principal);

        if (approvalWorkflow.hasWorkflowSnapshot(id)) {
            return ResponseEntity.ok(approvalWorkflow.getTimelineResponse(id, principal.getId()));
        }
        return ResponseEntity.ok(approvalService.getApprovalTimeline(id));
    }

    /**
     * GET /api/requisitions/{id}/approval-logs, /approve/logs, /approve/history
     * Đọc nhật ký quyết định phê duyệt bất biến (S3-02).
     */
    @GetMapping({"/approval-logs", "/approve/logs", "/approve/history"})
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_OWN', 'REQUISITION_READ_ALL', 'REQUISITION_APPROVE')")
    public ResponseEntity<List<RequisitionApprovalLogResponse>> getApprovalLogs(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Vui lòng đăng nhập.");
        }
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));
        checkCanViewApprovalData(req, principal);

        List<RequisitionApprovalLogResponse> history = approvalWorkflow.getApprovalLogs(id);
        return ResponseEntity.ok(history);
    }

    private ResponseEntity<?> executeApprovalAction(
            Long id,
            String requestedAction,
            String comment
    ) {
        return executeApprovalAction(id, requestedAction, comment, null);
    }

    private ResponseEntity<?> executeApprovalAction(
            Long id,
            String requestedAction,
            String comment,
            String overrideReason
    ) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Vui lòng đăng nhập.");
        }

        String action = RequisitionApprovalWorkflowService.normalizeAction(requestedAction);
        RequisitionApprovalWorkflowService.validateActionAndComment(action, comment);

        // Trường hợp 1: Có snapshot quy trình phê duyệt nhiều cấp (S3-01 / S3-02)
        Optional<RecruitmentRequisition> workflowResult = approvalWorkflow.processApprovalAction(
                id, principal.getId(), action, comment, overrideReason
        );
        if (workflowResult.isPresent()) {
            RecruitmentRequisition wReq = workflowResult.get();
            return ResponseEntity.ok(buildApprovalResponseMap(wReq, id));
        }

        // Trường hợp 2: Dự phòng cho yêu cầu chưa gắn luồng snapshot
        if (!"PENDING_APPROVAL".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Yêu cầu tuyển dụng không ở trạng thái chờ phê duyệt.");
        }

        // S3-04: Chốt chặn kiểm tra ngân sách Headcount & Lương
        if ("APPROVE".equals(action) && headcountBudgetService != null) {
            User currentUser = users != null ? users.findById(principal.getId()).orElse(null) : null;
            if (currentUser != null) {
                headcountBudgetService.enforceOnApproval(req, currentUser, overrideReason);
            }
        }

        boolean isAssigned = assignments.findByRequisitionIdAndUserId(id, principal.getId())
                .filter(a -> a.getRole() == RoleName.APPROVER || a.getRole() == RoleName.HIRING_MANAGER)
                .isPresent();
        List<RequisitionApprovalHistory> historyList = historyRepository != null
                ? historyRepository.findByRequisitionIdOrderByStepOrderAsc(id)
                : List.of();
        boolean isInHistory = historyList.stream().anyMatch(h -> principal.getId().equals(h.getApproverId()));

        if (!isAssigned && !isInHistory) {
            throw new AccessDeniedException("Bạn không được phân công phê duyệt yêu cầu tuyển dụng này.");
        }

        Optional<RequisitionApprovalHistory> pendingStepOpt = historyList.stream()
                .filter(h -> "PENDING".equalsIgnoreCase(h.getStatus()))
                .findFirst();
        if (!historyList.isEmpty() && pendingStepOpt.isEmpty()) {
            throw new BadRequestException("Luồng phê duyệt này đã hoàn tất.");
        }
        if (pendingStepOpt.isPresent()) {
            RequisitionApprovalHistory currentStep = pendingStepOpt.get();
            if (currentStep.getApproverId() != null && !currentStep.getApproverId().equals(principal.getId())) {
                throw new AccessDeniedException("Bạn không phải người phê duyệt ở cấp hiện tại.");
            }
        }

        String trimmedComment = comment != null && !comment.isBlank() ? comment.trim() : null;
        Instant now = Instant.now();

        if (pendingStepOpt.isPresent()) {
            RequisitionApprovalHistory currentStep = pendingStepOpt.get();
            if ("APPROVE".equals(action)) {
                currentStep.setStatus("COMPLETED");
                currentStep.setAction("APPROVE");
                currentStep.setActionAt(now);
                currentStep.setComments(trimmedComment != null ? trimmedComment : "Đồng ý phê duyệt.");
                historyRepository.save(currentStep);

                int nextOrder = currentStep.getStepOrder() + 1;
                Optional<RequisitionApprovalHistory> nextStepOpt = historyList.stream()
                        .filter(h -> h.getStepOrder() == nextOrder)
                        .findFirst();
                if (nextStepOpt.isPresent()) {
                    RequisitionApprovalHistory nextStep = nextStepOpt.get();
                    nextStep.setStatus("PENDING");
                    nextStep.setAction("WAITING");
                    historyRepository.save(nextStep);
                } else {
                    req.setStatus("APPROVED");
                    req.setApprovedByUserId(principal.getId());
                    req.setApprovedAt(now);
                }
            } else if ("REJECT".equals(action)) {
                currentStep.setStatus("REJECTED");
                currentStep.setAction("REJECT");
                currentStep.setActionAt(now);
                currentStep.setComments(trimmedComment);
                historyRepository.save(currentStep);

                req.setStatus("REJECTED");
                req.setRejectionReason(trimmedComment);
            } else if ("REQUEST_CHANGES".equals(action)) {
                currentStep.setStatus("REQUEST_CHANGES");
                currentStep.setAction("REQUEST_CHANGES");
                currentStep.setActionAt(now);
                currentStep.setComments(trimmedComment);
                historyRepository.save(currentStep);

                req.setStatus("DRAFT");
                req.setRejectionReason(trimmedComment);
            }
        } else {
            if ("APPROVE".equals(action)) {
                req.setStatus("APPROVED");
                req.setApprovedByUserId(principal.getId());
                req.setApprovedAt(now);
            } else if ("REJECT".equals(action)) {
                req.setStatus("REJECTED");
                req.setRejectionReason(trimmedComment);
            } else if ("REQUEST_CHANGES".equals(action)) {
                req.setStatus("DRAFT");
                req.setRejectionReason(trimmedComment);
            }
        }

        req.setUpdatedAt(now);
        RecruitmentRequisition updated = requisitions.save(req);

        // Ghi nhật ký quyết định phê duyệt bất biến trong cùng giao dịch
        approvalWorkflow.recordFallbackApprovalLog(id, principal.getId(), action, trimmedComment);

        return ResponseEntity.ok(buildApprovalResponseMap(updated, id));
    }

    private Map<String, Object> buildApprovalResponseMap(RecruitmentRequisition r, Long id) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", r.getId());
        resp.put("requisitionId", r.getId());
        resp.put("requisitionCode", r.getRequisitionCode());
        resp.put("title", r.getTitle());
        resp.put("status", r.getStatus());
        resp.put("rejectionReason", r.getRejectionReason());
        resp.put("isRejected", "REJECTED".equalsIgnoreCase(r.getStatus()));
        resp.put("isCompleted", "APPROVED".equalsIgnoreCase(r.getStatus()));
        try {
            RequisitionApprovalTimelineResponse timeline;
            if (approvalWorkflow.hasWorkflowSnapshot(id)) {
                timeline = approvalWorkflow.getTimelineResponse(id, r.getCreatedByUserId() != null ? r.getCreatedByUserId() : 1L);
            } else {
                timeline = approvalService.getApprovalTimeline(id);
            }
            resp.put("steps", timeline.getSteps());
            resp.put("totalSteps", timeline.getTotalSteps());
            resp.put("completedSteps", timeline.getCompletedSteps());
            resp.put("currentStepOrder", timeline.getCurrentStepOrder());
            resp.put("currentWaitingOn", timeline.getCurrentWaitingOn());
        } catch (Exception e) {
            resp.put("steps", List.of());
            resp.put("totalSteps", 1);
            resp.put("completedSteps", "APPROVED".equalsIgnoreCase(r.getStatus()) ? 1 : 0);
        }
        return resp;
    }
}
