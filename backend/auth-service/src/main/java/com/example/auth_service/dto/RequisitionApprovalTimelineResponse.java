package com.example.auth_service.dto;

import java.time.Instant;
import java.util.List;

/**
 * DTO tổng hợp toàn bộ chuỗi cấp duyệt và dòng thời gian lịch sử phê duyệt (S3-03).
 */
public record RequisitionApprovalTimelineResponse(
        Long requisitionId,
        String requisitionCode,
        String title,
        String status,
        Integer currentStepOrder,
        String currentWaitingOn,
        int totalSteps,
        int completedSteps,
        boolean isCompleted,
        boolean isRejected,
        String rejectionReason,
        Instant submittedAt,
        List<ApprovalStepResponse> steps
) {}
