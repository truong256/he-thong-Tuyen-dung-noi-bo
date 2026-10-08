package com.example.auth_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO tạo và gửi yêu cầu tuyển dụng chính thức.
 * Yêu cầu kiểm tra đầy đủ các trường bắt buộc.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateRequisitionRequest {
    @NotBlank(message = "Tiêu đề yêu cầu tuyển dụng không được để trống")
    @Size(max = 150, message = "Tiêu đề yêu cầu tối đa 150 ký tự")
    private String title;

    @NotNull(message = "Phòng ban không được để trống")
    private Long departmentId;

    @NotNull(message = "Chức danh không được để trống")
    private Long jobTitleId;

    @NotNull(message = "Số lượng tuyển dụng không được để trống")
    @Min(value = 1, message = "Số lượng tuyển dụng phải lớn hơn 0")
    private Integer quantity;

    @NotBlank(message = "Loại tuyển dụng không được để trống")
    private String recruitmentType;

    @NotBlank(message = "Lý do tuyển dụng không được để trống")
    private String reason;

    @PositiveOrZero(message = "Lương tối thiểu không được âm")
    private Long salaryMin;

    @PositiveOrZero(message = "Lương tối đa không được âm")
    private Long salaryMax;

    private String currency;

    private String salaryExplanation;

    @NotNull(message = "Ngày cần người không được để trống")
    private LocalDate neededDate;

    @NotBlank(message = "Mô tả công việc không được để trống")
    private String jobDescription;

    @NotBlank(message = "Yêu cầu ứng viên không được để trống")
    private String candidateRequirements;

    private String benefits;

    private String workLocation;

    private String workingModel;

    // Fluent accessors for record compatibility
    public String title() { return title; }
    public Long departmentId() { return departmentId; }
    public Long jobTitleId() { return jobTitleId; }
    public Integer quantity() { return quantity; }
    public String recruitmentType() { return recruitmentType; }
    public String reason() { return reason; }
    public Long salaryMin() { return salaryMin; }
    public Long salaryMax() { return salaryMax; }
    public String currency() { return currency; }
    public String salaryExplanation() { return salaryExplanation; }
    public LocalDate neededDate() { return neededDate; }
    public String jobDescription() { return jobDescription; }
    public String candidateRequirements() { return candidateRequirements; }
    public String benefits() { return benefits; }
    public String workLocation() { return workLocation; }
    public String workingModel() { return workingModel; }
}
