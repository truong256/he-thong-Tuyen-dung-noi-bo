package com.example.auth_service.dto.budget;

public record BudgetEvaluationResponse(
        boolean budgetExists,
        Long departmentId,
        String departmentName,
        int year,
        int headcountQuota,
        int headcountUsed,
        int headcountRemaining,
        long salaryBudgetVnd,
        long salaryBudgetUsedVnd,
        long salaryBudgetRemainingVnd,
        int proposedQuantity,
        long proposedMonthlySalaryVnd,
        long proposedAnnualizedSalaryVnd,
        boolean exceedsHeadcount,
        int excessHeadcount,
        boolean exceedsSalary,
        long excessSalaryVnd,
        boolean requiresOverride,
        String warningMessage
) {}
