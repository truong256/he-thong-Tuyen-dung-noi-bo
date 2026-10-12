package com.example.auth_service.dto;

import java.time.Instant;
import java.util.List;

public record ApprovalConfigurationResponse(
        Long id,
        Long departmentId,
        String departmentName,
        int version,
        boolean active,
        Instant createdAt,
        Instant deactivatedAt,
        List<ApprovalStepResponse> steps
) {
    public record ApprovalStepResponse(
            int stepOrder,
            long minimumSalary,
            Long approverUserId,
            String approverName
    ) {}
}