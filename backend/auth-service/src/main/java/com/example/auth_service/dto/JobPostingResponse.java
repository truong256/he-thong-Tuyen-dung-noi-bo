package com.example.auth_service.dto;

import java.time.Instant;
import java.time.LocalDate;

/**
 * DTO phản hồi chi tiết tin tuyển dụng (S3-09).
 */
public record JobPostingResponse(
        Long id,
        String postingCode,
        Long requisitionId,
        String requisitionCode,
        String requisitionTitle,
        Long departmentId,
        String departmentName,
        Long jobTitleId,
        String jobTitleName,
        String title,
        String jobDescription,
        String candidateRequirements,
        String benefits,
        String workLocation,
        Long workLocationId,
        String workingModel,
        LocalDate applicationDeadline,
        boolean showSalary,
        String salaryType,
        Long salaryMin,
        Long salaryMax,
        String currency,
        String status,
        Long createdByUserId,
        String createdByName,
        String createdByEmail,
        Long updatedByUserId,
        Instant createdAt,
        Instant updatedAt
) {}
