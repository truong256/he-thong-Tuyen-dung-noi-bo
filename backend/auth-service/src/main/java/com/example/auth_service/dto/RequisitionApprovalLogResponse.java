package com.example.auth_service.dto;

import java.time.Instant;

public record RequisitionApprovalLogResponse(
        Long id,
        Long requisitionId,
        Integer stepOrder,
        String action,
        String comment,
        Long approverUserId,
        String approverName,
        String approverEmail,
        Instant createdAt
) {
}
