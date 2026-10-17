package com.example.auth_service.dto.budget;

import java.time.Instant;

/**
 * DTO phản hồi sau khi HR Manager ghi đè ngoại lệ ngân sách/định biên thành công.
 */
public record BudgetOverrideResponse(
        Long requisitionId,
        String requisitionCode,
        String title,
        Long departmentId,
        String departmentName,
        String status,
        boolean budgetOverridden,
        boolean headcountOverridden,
        String overrideReason,
        Long overrideByUserId,
        String overrideByUserEmail,
        String overrideByUserName,
        Instant overrideAt,
        int excessHeadcount,
        long excessSalaryVnd,
        String message
) {}
