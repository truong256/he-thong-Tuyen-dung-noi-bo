package com.example.auth_service.dto.budget;

import java.time.Instant;

public record BudgetSummaryResponse(
        Long id,
        Long departmentId,
        String departmentName,
        String departmentCode,
        int year,
        int headcountQuota,
        int headcountUsed,
        int headcountRemaining,
        double headcountUtilizationRate,
        long salaryBudgetVnd,
        long salaryBudgetUsedVnd,
        long salaryBudgetRemainingVnd,
        double salaryUtilizationRate,
        BudgetStatus status,
        String note,
        Long createdBy,
        String createdByName,
        Long updatedBy,
        String updatedByName,
        int version,
        Instant createdAt,
        Instant updatedAt
) {}
