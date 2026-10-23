package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPostingResponse {

    private Long id;
    private Long requisitionId;
    private String requisitionCode;
    private String jobCode;
    private String title;
    private Long departmentId;
    private String departmentName;
    private Long jobTitleId;
    private String jobTitleName;
    private String workLocation;
    private Long workLocationId;
    private Long employmentTypeId;
    private String workingModel;
    private int quantity;
    private String jobDescription;
    private String requirements;
    private String benefits;
    private Long salaryMin;
    private Long salaryMax;
    private String currency;
    private boolean salaryVisible;
    private LocalDate applicationDeadline;
    private String status;

    private Long approvedByUserId;
    private String approvedByUserName;
    private Instant approvedAt;
    private String approvalNotes;

    private Long publishedByUserId;
    private String publishedByUserName;
    private Instant publishedAt;

    private Long unpublishedByUserId;
    private String unpublishedByUserName;
    private Instant unpublishedAt;
    private String unpublishReason;

    private Long createdByUserId;
    private String createdByUserName;
    private Instant createdAt;
    private Instant updatedAt;

    private List<JobPostingAuditLogResponse> auditLogs;
}
