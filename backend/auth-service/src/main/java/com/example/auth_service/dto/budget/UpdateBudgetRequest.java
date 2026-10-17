package com.example.auth_service.dto.budget;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateBudgetRequest(
        @NotNull(message = "Chỉ tiêu Headcount không được để trống")
        @Min(value = 0, message = "Chỉ tiêu Headcount không được âm")
        Integer headcountQuota,

        @NotNull(message = "Ngân sách lương không được để trống")
        @Min(value = 0, message = "Ngân sách lương không được âm")
        Long salaryBudgetVnd,

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
        String note
) {}
