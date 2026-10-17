package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPostingPublicResponse {

    private Long id;
    private String jobCode;
    private String title;
    private Long departmentId;
    private String departmentName;
    private Long jobTitleId;
    private String jobTitleName;
    private String workLocation;
    private String workingModel;
    private int quantity;
    private String jobDescription;
    private String requirements;
    private String benefits;

    private boolean salaryVisible;
    private Long salaryMin;
    private Long salaryMax;
    private String currency;
    private String salaryDisplay; // e.g., "15,000,000 - 25,000,000 VND" hoặc "Thỏa thuận"

    private LocalDate applicationDeadline;
    private Instant publishedAt;
}
