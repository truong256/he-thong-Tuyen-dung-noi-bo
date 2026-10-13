package com.example.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * DTO yêu cầu tạo/cập nhật tin tuyển dụng từ yêu cầu đã duyệt (S3-09).
 */
public record JobPostingRequest(
        @NotNull(message = "Mã yêu cầu tuyển dụng nguồn không được để trống")
        Long requisitionId,

        @NotBlank(message = "Tiêu đề tin tuyển dụng không được để trống")
        @Size(max = 255, message = "Tiêu đề tin tuyển dụng không được vượt quá 255 ký tự")
        String title,

        @NotBlank(message = "Mô tả công việc không được để trống")
        String jobDescription,

        @NotBlank(message = "Yêu cầu ứng viên không được để trống")
        String candidateRequirements,

        String benefits,

        @NotBlank(message = "Địa điểm làm việc không được để trống")
        @Size(max = 255, message = "Địa điểm làm việc không được vượt quá 255 ký tự")
        String workLocation,

        Long workLocationId,

        @NotBlank(message = "Hình thức làm việc không được để trống")
        String workingModel,

        @NotNull(message = "Hạn nhận hồ sơ không được để trống")
        LocalDate applicationDeadline,

        Boolean showSalary,

        String salaryType,

        Long salaryMin,

        Long salaryMax,

        String currency,

        String status
) {
    public boolean isShowSalary() {
        return showSalary == null || showSalary;
    }

    public String resolveSalaryType() {
        return (salaryType == null || salaryType.isBlank()) ? "RANGE" : salaryType;
    }

    public String resolveCurrency() {
        return (currency == null || currency.isBlank()) ? "VND" : currency;
    }

    public String resolveStatus() {
        return (status == null || status.isBlank()) ? "DRAFT" : status;
    }

    public String resolveWorkingModel() {
        return (workingModel == null || workingModel.isBlank()) ? "ONSITE" : workingModel;
    }
}
