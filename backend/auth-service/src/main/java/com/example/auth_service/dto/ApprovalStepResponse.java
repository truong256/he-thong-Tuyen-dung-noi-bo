package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Chi tiết từng bước phê duyệt trong chuỗi cấp duyệt (S3-01 & S3-03).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalStepResponse {
    private int stepOrder;
    private String stepName;
    private Long approverId;
    private String approverName;
    private String approverEmail;
    private String approverRole;
    private Long minimumSalary;
    private String status; // COMPLETED, PENDING, UPCOMING, REJECTED
    private String action; // SUBMIT, APPROVE, REJECT, WAITING, PENDING
    private Instant actionAt;
    private String comments;
    private boolean isCurrentStep;

    public ApprovalStepResponse(
            int stepOrder,
            String stepName,
            Long approverId,
            String approverName,
            String approverEmail,
            String approverRole,
            String action,
            String status,
            Instant actionAt,
            String comments,
            boolean isCurrentStep
    ) {
        this.stepOrder = stepOrder;
        this.stepName = stepName;
        this.approverId = approverId;
        this.approverName = approverName;
        this.approverEmail = approverEmail;
        this.approverRole = approverRole;
        this.minimumSalary = null;
        this.action = action;
        this.status = status;
        this.actionAt = actionAt;
        this.comments = comments;
        this.isCurrentStep = isCurrentStep;
    }

    public int stepOrder() { return stepOrder; }
    public String stepName() { return stepName; }
    public Long approverId() { return approverId; }
    public String approverName() { return approverName; }
    public String approverEmail() { return approverEmail; }
    public String approverRole() { return approverRole; }
    public Long minimumSalary() { return minimumSalary; }
    public String status() { return status; }
    public String action() { return action; }
    public Instant actionAt() { return actionAt; }
    public String comments() { return comments; }
    public boolean isCurrentStep() { return isCurrentStep; }
}
