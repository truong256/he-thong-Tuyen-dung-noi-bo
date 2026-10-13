package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
    private int totalSteps;
    private int completedSteps;
    private String currentWaitingOn;
    private boolean isCompleted;
    private boolean isRejected;
    private String rejectionReason;
    private List<ApprovalStepResponse> steps;
}
