package com.example.auth_service.dto;

import jakarta.validation.constraints.NotNull;

public record DepartmentStatusRequest(
        @NotNull(message = "Trạng thái áp dụng không được để trống") Boolean active) {}
