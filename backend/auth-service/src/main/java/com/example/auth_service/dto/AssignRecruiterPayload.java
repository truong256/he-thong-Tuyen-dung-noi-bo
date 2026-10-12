package com.example.auth_service.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AssignRecruiterPayload(
        @NotNull(message = "Recruiter chính không được để trống")
        Long primaryRecruiterId,
        List<Long> supportRecruiterIds,
        String reason,
        String notes
) {}
