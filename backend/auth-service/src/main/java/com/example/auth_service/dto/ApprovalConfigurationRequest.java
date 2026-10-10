package com.example.auth_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record ApprovalConfigurationRequest(
        @NotNull Long departmentId,
        @NotEmpty List<@Valid ApprovalStepRequest> steps
) {
    public record ApprovalStepRequest(
            @NotNull @Min(0) Long minimumSalary,
            @NotNull @Positive Long approverUserId
    ) {}
}