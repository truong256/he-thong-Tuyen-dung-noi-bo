package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.ApprovalActionRequest;
import com.example.auth_service.dto.RequisitionApprovalLogResponse;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.RequisitionAssignmentRepository;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.RequisitionApprovalWorkflowService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/requisitions/{id}")
public class RequisitionApprovalController {

    private final RecruitmentRequisitionRepository requisitions;
    private final RequisitionAssignmentRepository assignments;
    private final RequisitionApprovalWorkflowService approvalWorkflow;

    public RequisitionApprovalController(
            RecruitmentRequisitionRepository requisitions,
            RequisitionAssignmentRepository assignments,
            RequisitionApprovalWorkflowService approvalWorkflow
    ) {
        this.requisitions = requisitions;
        this.assignments = assignments;
        this.approvalWorkflow = approvalWorkflow;
    }

    /**
     * PUT /api/requisitions/{id}/approve
     * Giữ nguyên tính tương thích ngược cho endpoint cũ, hỗ trợ kèm request body tùy chọn.
     */
    @PutMapping("/approve")
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<RecruitmentRequisition> approveRequisition(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequest request
    ) {
        String comment = request != null ? request.effectiveComment() : null;
        return executeApprovalAction(id, "APPROVE", comment);
    }

    /**
     * POST /api/requisitions/{id}/approve
     * Phê duyệt yêu cầu tuyển dụng.
     */
    @PostMapping("/approve")
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<RecruitmentRequisition> approvePost(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequest request
    ) {
        String comment = request != null ? request.effectiveComment() : null;
        return executeApprovalAction(id, "APPROVE", comment);
    }

    /**
     * POST /api/requisitions/{id}/reject
     * Từ chối yêu cầu tuyển dụng (bắt buộc có ý kiến).
     */
    @PostMapping("/reject")
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<RecruitmentRequisition> rejectPost(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequest request
    ) {
        String comment = request != null ? request.effectiveComment() : null;
        return executeApprovalAction(id, "REJECT", comment);
    }

    /**
     * POST /api/requisitions/{id}/request-changes
     * Yêu cầu bổ sung thông tin (bắt buộc có ý kiến, trả hồ sơ về người tạo nhưng giữ lịch sử).
     */
    @PostMapping("/request-changes")
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<RecruitmentRequisition> requestChangesPost(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequest request
    ) {
        String comment = request != null ? request.effectiveComment() : null;
        return executeApprovalAction(id, "REQUEST_CHANGES", comment);
    }

    /**
     * POST /api/requisitions/{id}/approval-actions hoặc /api/requisitions/{id}/approval-action
     * API chung cho cả 3 hành động: APPROVE, REJECT, REQUEST_CHANGES.
     */
    @PostMapping({"/approval-actions", "/approval-action"})
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<RecruitmentRequisition> performApprovalAction(
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
     * GET /api/requisitions/{id}/approval-logs hoặc /api/requisitions/{id}/approval-history
     * Đọc nhật ký quyết định phê duyệt bất biến.
     */
    @GetMapping({"/approval-logs", "/approval-history", "/approve/logs", "/approve/history"})
    @Transactional(readOnly = true)
    public ResponseEntity<List<RequisitionApprovalLogResponse>> getApprovalHistory(@PathVariable Long id) {
        List<RequisitionApprovalLogResponse> history = approvalWorkflow.getApprovalLogs(id);
        return ResponseEntity.ok(history);
    }

    private ResponseEntity<RecruitmentRequisition> executeApprovalAction(
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
            return ResponseEntity.ok(workflowResult.get());
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

        return ResponseEntity.ok(updated);
    }
}
