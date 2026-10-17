package com.example.auth_service.dto.budget;

public record BudgetDashboardStats(
        int year,
        int activeBudgetsCount,
        int totalHeadcountQuota,
        int totalHeadcountUsed,
        int totalHeadcountRemaining,
        double overallHeadcountUtilizationRate,
        long totalSalaryBudgetVnd,
        long totalSalaryBudgetUsedVnd,
        long totalSalaryBudgetRemainingVnd,
        double overallSalaryUtilizationRate
) {}
