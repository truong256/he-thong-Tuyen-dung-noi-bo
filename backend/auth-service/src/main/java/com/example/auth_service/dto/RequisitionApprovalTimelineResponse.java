package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * DTO tổng hợp toàn bộ chuỗi cấp duyệt và dòng thời gian lịch sử phê duyệt (S3-01 & S3-03).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequisitionApprovalTimelineResponse {
    private Long requisitionId;
    private String requisitionCode;
    private String title;
    private String departmentName;
    private Long proposedSalary;
    private String status;
    private Integer currentStepOrder;
    private String currentWaitingOn;
    private int totalSteps;
    private int completedSteps;
    @com.fasterxml.jackson.annotation.JsonProperty("isCompleted")
    private boolean isCompleted;

    @com.fasterxml.jackson.annotation.JsonProperty("isRejected")
    private boolean isRejected;
    private String rejectionReason;
    private Instant submittedAt;
    private List<ApprovalStepResponse> steps;

    public RequisitionApprovalTimelineResponse(
            Long requisitionId,
            String requisitionCode,
            String title,
            String status,
            Integer currentStepOrder,
            String currentWaitingOn,
            int totalSteps,
            int completedSteps,
            boolean isCompleted,
            boolean isRejected,
            String rejectionReason,
            Instant submittedAt,
            List<ApprovalStepResponse> steps
    ) {
        this.requisitionId = requisitionId;
        this.requisitionCode = requisitionCode;
        this.title = title;
        this.departmentName = null;
        this.proposedSalary = null;
        this.status = status;
        this.currentStepOrder = currentStepOrder;
        this.currentWaitingOn = currentWaitingOn;
        this.totalSteps = totalSteps;
        this.completedSteps = completedSteps;
        this.isCompleted = isCompleted;
        this.isRejected = isRejected;
        this.rejectionReason = rejectionReason;
        this.submittedAt = submittedAt;
        this.steps = steps;
    }

    public Long requisitionId() { return requisitionId; }
    public String requisitionCode() { return requisitionCode; }
    public String title() { return title; }
    public String departmentName() { return departmentName; }
    public Long proposedSalary() { return proposedSalary; }
    public String status() { return status; }
    public Integer currentStepOrder() { return currentStepOrder; }
    public String currentWaitingOn() { return currentWaitingOn; }
    public int totalSteps() { return totalSteps; }
    public int completedSteps() { return completedSteps; }

    @com.fasterxml.jackson.annotation.JsonProperty("isCompleted")
    public boolean isCompleted() { return isCompleted; }

    @com.fasterxml.jackson.annotation.JsonProperty("isRejected")
    public boolean isRejected() { return isRejected; }

    public String rejectionReason() { return rejectionReason; }
    public Instant submittedAt() { return submittedAt; }
    public List<ApprovalStepResponse> steps() { return steps; }
}
