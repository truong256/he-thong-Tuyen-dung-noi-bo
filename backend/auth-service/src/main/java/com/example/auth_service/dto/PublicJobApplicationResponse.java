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
public class PublicJobApplicationResponse {
    private Long applicationId;
    private Long jobPostingId;
    private String jobCode;
    private String title;
    private String fullName;
    private String email;
    private String status;
    private String message;
    private Instant appliedAt;
}
