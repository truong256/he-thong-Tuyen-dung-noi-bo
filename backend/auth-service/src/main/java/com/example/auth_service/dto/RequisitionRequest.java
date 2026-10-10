package com.example.auth_service.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * DTO for creating or updating a Recruitment Requisition (S2-10).
 * Supports both formal field names and frontend aliases.
 */
public record RequisitionRequest(
        @Size(max = 50, message = "Mã yêu cầu tuyển dụng tối đa 50 ký tự")
        String requisitionCode,

        @Size(max = 150, message = "Tiêu đề yêu cầu tuyển dụng tối đa 150 ký tự")
        String title,

        Long jobTitleId,

        String jobTitle,

        Long departmentId,

        String department,

        @Positive(message = "Số lượng cần tuyển phải là số nguyên lớn hơn 0")
        Integer quantity,

        String recruitmentType,

        String reason,

        @PositiveOrZero(message = "Lương tối thiểu không được âm")
        Long salaryMin,

        @PositiveOrZero(message = "Lương tối đa không được âm")
        Long salaryMax,

        String salaryExplanation,

        @JsonAlias("neededDate")
        LocalDate targetDate,

        LocalDate neededDate,

        String jobDescription,

        String candidateRequirements,

        String status,

        Boolean isDraft
) {
    public LocalDate effectiveTargetDate() {
        return targetDate != null ? targetDate : neededDate;
    }
}
