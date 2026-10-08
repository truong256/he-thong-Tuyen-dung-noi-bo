package com.example.auth_service.dto;

import java.time.Instant;
import java.time.LocalDate;

public record RequisitionResponse(
        Long id,
        String requisitionCode,
        String title,
        Long departmentId,
        String departmentName,
        Long jobTitleId,
        String jobTitleName,
        int quantity,
        LocalDate targetDate,
        String status,
        String reason,
        Long proposedMinSalary,
        Long proposedMaxSalary,
        String salaryExplanation,
        String jobDescription,
        String requirements,
        Long createdByUserId,
        String createdByName,
        Instant createdAt
) {}
