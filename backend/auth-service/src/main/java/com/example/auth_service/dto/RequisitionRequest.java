package com.example.auth_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record RequisitionRequest(
        @NotBlank(message = "Tiêu đề yêu cầu tuyển dụng không được để trống")
        @Size(max = 150, message = "Tiêu đề không được vượt quá 150 ký tự")
        String title,

        @NotNull(message = "Phòng ban không được để trống")
        Long departmentId,

        @NotNull(message = "Chức danh không được để trống")
        Long jobTitleId,

        @NotNull(message = "Số lượng tuyển không được để trống")
        @Min(value = 1, message = "Số lượng tuyển tối thiểu là 1")
        Integer quantity,

        @NotBlank(message = "Lý do tuyển dụng không được để trống (REPLACEMENT hoặc NEW_HEADCOUNT)")
        String reason,

        Long proposedMinSalary,

        Long proposedMaxSalary,

        String salaryExplanation,

        @NotNull(message = "Ngày cần người không được để trống")
        LocalDate targetDate,

        String jobDescription,

        String requirements,

        Boolean isDraft
) {}
