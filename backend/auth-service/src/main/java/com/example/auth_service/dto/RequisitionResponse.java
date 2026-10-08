package com.example.auth_service.dto;

import java.time.Instant;
import java.time.LocalDate;

/**
 * DTO phản hồi chi tiết yêu cầu tuyển dụng.
 */
public record RequisitionResponse(
        Long id,
        String requisitionCode,
        String title,
        Long departmentId,
        String departmentName,
        String departmentCode,
        Long jobTitleId,
        String jobTitleName,
        Integer quantity,
        String recruitmentType,
        Long salaryMin,
        Long salaryMax,
        String currency,
        String salaryExplanation,
        LocalDate neededDate,
        LocalDate targetDate,
        String jobDescription,
        String candidateRequirements,
        String benefits,
        String workLocation,
        String workingModel,
        String status,
        String reason,
        String rejectionReason,
        Long createdByUserId,
        String createdByName,
        Instant submittedAt,
        Long approvedByUserId,
        Instant approvedAt,
        Instant createdAt,
        Instant updatedAt
) {}
