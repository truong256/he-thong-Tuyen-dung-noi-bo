package com.example.auth_service.dto.budget;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO yêu cầu Trưởng phòng Nhân sự ghi đè ngoại lệ ngân sách/định biên (S3-04 / SCRUM-101).
 */
public record BudgetOverrideRequest(
        @NotBlank(message = "Lý do ghi đè bắt buộc không được để trống.")
        @Size(min = 10, max = 2000, message = "Lý do ghi đè bắt buộc phải từ 10 đến 2000 ký tự.")
        String reason,

        Boolean overrideHeadcount,

        Boolean overrideSalary
) {
    public BudgetOverrideRequest(String reason) {
        this(reason, null, null);
    }
}
