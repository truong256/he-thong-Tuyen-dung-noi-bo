package com.example.auth_service.dto;

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
    private Long salaryMin;
    private Long salaryMax;
    private String currency;
    private String salaryExplanation;
    private LocalDate neededDate;
    private String jobDescription;
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
