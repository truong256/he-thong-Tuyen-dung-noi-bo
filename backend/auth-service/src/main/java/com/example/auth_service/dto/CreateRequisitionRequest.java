package com.example.auth_service.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
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
 * Hỗ trợ alias để tương thích các luồng gọi API và kiểm thử.
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

    private String recruitmentType = "NEW";

    @NotBlank(message = "Lý do tuyển dụng không được để trống")
    private String reason;

    @PositiveOrZero(message = "Lương tối thiểu không được âm")
    @JsonAlias({"proposedMinSalary", "salaryMin"})
    private Long salaryMin;

    @PositiveOrZero(message = "Lương tối đa không được âm")
    @JsonAlias({"proposedMaxSalary", "salaryMax"})
    private Long salaryMax;

    private String currency;

    private String salaryExplanation;

    @NotNull(message = "Ngày cần người không được để trống")
    @JsonAlias({"targetDate", "neededDate"})
    private LocalDate neededDate;

    @NotBlank(message = "Mô tả công việc không được để trống")
    private String jobDescription;

    @NotBlank(message = "Yêu cầu ứng viên không được để trống")
    @JsonAlias({"requirements", "candidateRequirements"})
    private String candidateRequirements;

    private String benefits;

    private String workLocation;

    private String workingModel;

    @JsonAlias({"isDraft"})
    private Boolean isDraft;

    public CreateRequisitionRequest(
            String title,
            Long departmentId,
            Long jobTitleId,
            Integer quantity,
            String recruitmentType,
            String reason,
            Long salaryMin,
            Long salaryMax,
            String currency,
            String salaryExplanation,
            LocalDate neededDate,
            String jobDescription,
            String candidateRequirements,
            String benefits,
            String workLocation,
            String workingModel
    ) {
        this.title = title;
        this.departmentId = departmentId;
        this.jobTitleId = jobTitleId;
        this.quantity = quantity;
        this.recruitmentType = recruitmentType;
        this.reason = reason;
        this.salaryMin = salaryMin;
        this.salaryMax = salaryMax;
        this.currency = currency;
        this.salaryExplanation = salaryExplanation;
        this.neededDate = neededDate;
        this.jobDescription = jobDescription;
        this.candidateRequirements = candidateRequirements;
        this.benefits = benefits;
        this.workLocation = workLocation;
        this.workingModel = workingModel;
        this.isDraft = false;
    }

    public void setTargetDate(LocalDate targetDate) {
        if (this.neededDate == null) {
            this.neededDate = targetDate;
        }
    }

    public void setRequirements(String requirements) {
        if (this.candidateRequirements == null) {
            this.candidateRequirements = requirements;
        }
    }

    public void setProposedMinSalary(Long min) {
        if (this.salaryMin == null) {
            this.salaryMin = min;
        }
    }

    public void setProposedMaxSalary(Long max) {
        if (this.salaryMax == null) {
            this.salaryMax = max;
        }
    }

    public void setReason(String reason) {
        this.reason = reason;
        if (this.recruitmentType == null || "NEW".equals(this.recruitmentType)) {
            this.recruitmentType = reason;
        }
    }

    // Fluent accessors for record compatibility
    public String title() { return title; }
    public Long departmentId() { return departmentId; }
    public Long jobTitleId() { return jobTitleId; }
    public Integer quantity() { return quantity; }
    public String recruitmentType() {
        if (recruitmentType != null && !recruitmentType.isBlank()) {
            return recruitmentType;
        }
        if (reason != null && !reason.isBlank()) {
            return reason;
        }
        return "NEW";
    }
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
    public Boolean isDraft() { return isDraft; }

    public RequisitionDraftRequest toDraftRequest() {
        return new RequisitionDraftRequest(
                title,
                departmentId,
                jobTitleId,
                quantity,
                recruitmentType(),
                reason,
                salaryMin,
                salaryMax,
                currency != null ? currency : "VND",
                salaryExplanation,
                neededDate,
                jobDescription,
                candidateRequirements,
                benefits,
                workLocation,
                workingModel != null ? workingModel : "ONSITE"
        );
    }
}
