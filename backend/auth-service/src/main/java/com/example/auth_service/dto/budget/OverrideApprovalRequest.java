package com.example.auth_service.dto.budget;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OverrideApprovalRequest(
        @NotBlank(message = "Lý do ghi đè bắt buộc phải nhập")
        @Size(min = 10, max = 1000, message = "Lý do ghi đè phải từ 10 đến 1000 ký tự")
        String reason
) {}
