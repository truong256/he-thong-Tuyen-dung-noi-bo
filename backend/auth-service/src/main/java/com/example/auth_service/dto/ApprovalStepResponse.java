package com.example.auth_service.dto;

import java.time.Instant;

/**
 * Chi tiết từng bước phê duyệt trong chuỗi cấp duyệt (S3-03).
 */
public record ApprovalStepResponse(
        int stepOrder,
        String stepName,
        Long approverId,
        String approverName,
        String approverEmail,
        String approverRole,
        String action, // SUBMIT, APPROVE, REJECT, PENDING
        String status, // COMPLETED, PENDING, UPCOMING, REJECTED
        Instant actionAt,
        String comments,
        boolean isCurrentStep
) {}
