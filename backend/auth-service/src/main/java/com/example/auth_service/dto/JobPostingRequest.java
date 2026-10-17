package com.example.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPostingRequest {

    @NotBlank(message = "Tiêu đề tin tuyển dụng không được để trống")
    private String title;

    private Long requisitionId;

    private Long departmentId;

    private Long jobTitleId;

    private String workLocation;

    private Long workLocationId;

    private Long employmentTypeId;

    private String workingModel; // ONSITE, HYBRID, REMOTE

    private Integer quantity;

    private String jobDescription;

    private String requirements;

    private String benefits;

    private Long salaryMin;

    private Long salaryMax;

    private String currency;

    private Boolean salaryVisible;

    private LocalDate applicationDeadline;
}
