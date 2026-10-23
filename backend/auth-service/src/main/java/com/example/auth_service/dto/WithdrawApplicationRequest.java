package com.example.auth_service.dto;

import jakarta.validation.constraints.NotBlank;

public record WithdrawApplicationRequest(
        @NotBlank(message = "Mã token không được để trống")
        String token,
        String reason
) {}
