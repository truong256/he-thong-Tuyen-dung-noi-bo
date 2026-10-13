package com.example.auth_service.dto;

import java.time.LocalDate;

/**
 * DTO dữ liệu khởi tạo tin tuyển dụng kế thừa từ yêu cầu đã duyệt (S3-09).
 */
public record JobPostingTemplateResponse(
        Long requisitionId,
        String requisitionCode,
        String requisitionTitle,
        Long departmentId,
        String departmentName,
        Long jobTitleId,
        String jobTitleName,
        Integer quantity,
        String recruitmentType,
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
        String requisitionStatus
) {}
