package com.example.auth_service.controller;

import com.example.auth_service.dto.ApproveRequisitionRequest;
import com.example.auth_service.dto.RejectRequisitionRequest;
import com.example.auth_service.dto.RequisitionApprovalTimelineResponse;
import com.example.auth_service.service.RequisitionApprovalService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller xử lý theo dõi tiến độ, lịch sử phê duyệt và các thao tác duyệt/từ chối (S3-03).
 */
@RestController
@RequestMapping("/api/requisitions/{id}")
public class RequisitionApprovalController {

    private final RequisitionApprovalService approvalService;

    public RequisitionApprovalController(RequisitionApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    /**
     * API xem dòng thời gian và lịch sử phê duyệt của yêu cầu tuyển dụng (S3-03).
     * Chỉ người tạo, người duyệt được phân công, hoặc HR Manager/Admin mới có quyền truy cập.
     */
    @GetMapping("/approval-history")
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_OWN', 'REQUISITION_READ_ALL', 'REQUISITION_APPROVE')")
    public ResponseEntity<RequisitionApprovalTimelineResponse> getApprovalHistory(@PathVariable Long id) {
        RequisitionApprovalTimelineResponse timeline = approvalService.getApprovalTimeline(id);
        return ResponseEntity.ok(timeline);
    }

    /**
     * API phê duyệt yêu cầu tuyển dụng tại cấp duyệt tương ứng hoặc bởi cấp có thẩm quyền (S3-03).
     */
    @PutMapping("/approve")
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<RequisitionApprovalTimelineResponse> approveRequisition(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveRequisitionRequest request
    ) {
        String comments = (request != null) ? request.comments() : null;
        RequisitionApprovalTimelineResponse updated = approvalService.approveRequisition(id, comments);
        return ResponseEntity.ok(updated);
    }

    /**
     * API từ chối yêu cầu tuyển dụng với lý do bắt buộc (S3-03).
     */
    @PutMapping("/reject")
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<RequisitionApprovalTimelineResponse> rejectRequisition(
            @PathVariable Long id,
            @Valid @RequestBody RejectRequisitionRequest request
    ) {
        RequisitionApprovalTimelineResponse updated = approvalService.rejectRequisition(
                id,
                request.rejectionReason(),
                request.comments()
        );
        return ResponseEntity.ok(updated);
    }
}
