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

    public RequisitionApprovalController(
            RecruitmentRequisitionRepository requisitions,
            RequisitionAssignmentRepository assignments,
            RequisitionApprovalWorkflowService approvalWorkflow,
            RequisitionApprovalService approvalService
    ) {
        this.requisitions = requisitions;
        this.assignments = assignments;
        this.approvalWorkflow = approvalWorkflow;
        this.approvalService = approvalService;
    }

    /**
     * GET /api/requisitions/{id}/timeline, /api/requisitions/{id}/approve/timeline
     * Lấy dòng thời gian phê duyệt (ưu tiên snapshot thực tế S3-01).
     */
    @GetMapping({"/timeline", "/approve/timeline", "/approve"})
    public ResponseEntity<RequisitionApprovalTimelineResponse> getApprovalTimeline(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Vui lòng đăng nhập.");
        }
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
        if (body != null) {
            if (body.get("comments") != null) {
                comment = body.get("comments").toString();
            } else if (body.get("comment") != null) {
                comment = body.get("comment").toString();
            }
        }
        return executeApprovalAction(id, "APPROVE", comment);
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
        return executeApprovalAction(id, "REJECT", request.rejectionReason());
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
        return executeApprovalAction(id, "APPROVE", comment);
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
        return executeApprovalAction(id, "REJECT", comment);
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
        return executeApprovalAction(id, "REQUEST_CHANGES", comment);
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
        return executeApprovalAction(id, action, comment);
    }

    /**
     * GET /api/requisitions/{id}/approval-history
     * Đọc nhật ký quyết định phê duyệt (S3-02 và S3-03 timeline).
     */
    @GetMapping("/approval-history")
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_OWN', 'REQUISITION_READ_ALL', 'REQUISITION_APPROVE')")
    public ResponseEntity<?> getApprovalHistory(@PathVariable Long id) {
        List<RequisitionApprovalLogResponse> logs = approvalWorkflow.getApprovalLogs(id);
        if (logs != null && !logs.isEmpty()) {
            return ResponseEntity.ok(logs);
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
        List<RequisitionApprovalLogResponse> history = approvalWorkflow.getApprovalLogs(id);
        return ResponseEntity.ok(history);
    }

    private ResponseEntity<?> executeApprovalAction(
            Long id,
            String requestedAction,
            String comment
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
                id, principal.getId(), action, comment
        );
        if (workflowResult.isPresent()) {
            RecruitmentRequisition wReq = workflowResult.get();
            return ResponseEntity.ok(buildApprovalResponseMap(wReq, id));
        }

        // Trường hợp 2: Dự phòng cho yêu cầu chưa gắn luồng snapshot
        if (!"PENDING_APPROVAL".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Yêu cầu tuyển dụng không ở trạng thái chờ phê duyệt.");
        }

        boolean isAssigned = assignments.findByRequisitionIdAndUserId(id, principal.getId())
                .filter(a -> a.getRole() == RoleName.APPROVER || a.getRole() == RoleName.HIRING_MANAGER)
                .isPresent();
        if (!isAssigned) {
            throw new AccessDeniedException("Bạn không được phân công phê duyệt yêu cầu tuyển dụng này.");
        }

        String trimmedComment = comment != null && !comment.isBlank() ? comment.trim() : null;

        if ("APPROVE".equals(action)) {
            req.setStatus("APPROVED");
            req.setApprovedByUserId(principal.getId());
            req.setApprovedAt(Instant.now());
        } else if ("REJECT".equals(action)) {
            req.setStatus("REJECTED");
            req.setRejectionReason(trimmedComment);
        } else if ("REQUEST_CHANGES".equals(action)) {
            req.setStatus("DRAFT");
            req.setRejectionReason(trimmedComment);
        }

        req.setUpdatedAt(Instant.now());
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
