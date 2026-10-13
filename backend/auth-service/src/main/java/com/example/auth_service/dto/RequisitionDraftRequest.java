package com.example.auth_service.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO lưu bản nháp yêu cầu tuyển dụng.
 * Hầu hết các trường là tùy chọn để người dùng có thể lưu dở dang bất kỳ lúc nào.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequisitionDraftRequest {
    private String title;
    private Long departmentId;
    private Long jobTitleId;
    private Integer quantity;
    private String recruitmentType;
    private String reason;

    @JsonAlias({"proposedMinSalary", "salaryMin"})
    private Long salaryMin;

    @JsonAlias({"proposedMaxSalary", "salaryMax"})
    private Long salaryMax;

    private String currency;
    private String salaryExplanation;

    @JsonAlias({"targetDate", "neededDate"})
    private LocalDate neededDate;

    private String jobDescription;

    @JsonAlias({"requirements", "candidateRequirements"})
    private String candidateRequirements;

    private String benefits;
    private String workLocation;
    private String workingModel;
    private Long workLocationId;
    private Long employmentTypeId;

    public RequisitionDraftRequest(String title, Long departmentId, Long jobTitleId, Integer quantity,
                                 String recruitmentType, String reason, Long salaryMin, Long salaryMax,
                                 String currency, String salaryExplanation, LocalDate neededDate,
                                 String jobDescription, String candidateRequirements, String benefits,
                                 String workLocation, String workingModel) {
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
        this.workLocationId = null;
        this.employmentTypeId = null;
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
    public Long workLocationId() { return workLocationId; }
    public Long employmentTypeId() { return employmentTypeId; }
}
