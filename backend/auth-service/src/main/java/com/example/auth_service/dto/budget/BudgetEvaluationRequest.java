package com.example.auth_service.dto.budget;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record BudgetEvaluationRequest(
        @NotNull(message = "Phòng ban không được để trống")
        Long departmentId,

        Integer year,

        @NotNull(message = "Số lượng tuyển dụng không được để trống")
        @Min(value = 1, message = "Số lượng tuyển dụng tối thiểu là 1")
        Integer proposedQuantity,

        Long proposedMaxSalaryMonthlyVnd,

        Long requisitionId
) {}
