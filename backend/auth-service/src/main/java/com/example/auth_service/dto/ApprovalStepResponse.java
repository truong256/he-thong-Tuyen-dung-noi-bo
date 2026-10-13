package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalStepResponse {
    private Integer stepOrder;
    private String stepName;
    private Long approverId;
    private String approverName;
    private String approverEmail;
    private String approverRole;
    private Long minimumSalary;
    private String status; // COMPLETED, PENDING, UPCOMING, REJECTED
    private String action; // SUBMIT, APPROVE, REJECT, WAITING
    private Instant actionAt;
    private String comments;
}
