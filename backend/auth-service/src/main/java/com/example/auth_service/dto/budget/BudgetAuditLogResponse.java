package com.example.auth_service.dto.budget;

import java.time.Instant;

public record BudgetAuditLogResponse(
        Long id,
        String action,
        Long departmentId,
        String departmentName,
        int year,
        Long requisitionId,
        String requisitionTitle,
        Long userId,
        String userEmail,
        String userFullName,
        String reason,
        String detail,
        Instant createdAt
) {}
