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
public class JobPostingAuditLogResponse {
    private Long id;
    private Long jobPostingId;
    private Long userId;
    private String userName;
    private String userEmail;
    private String action;
    private String fromStatus;
    private String toStatus;
    private String note;
    private Instant createdAt;
}
