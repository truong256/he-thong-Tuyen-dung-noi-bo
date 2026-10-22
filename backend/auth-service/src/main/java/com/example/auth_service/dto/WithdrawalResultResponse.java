package com.example.auth_service.dto;

import java.time.Instant;

public record WithdrawalResultResponse(
        boolean success,
        String message,
        Long applicationId,
        String stage,
        Instant withdrawnAt
) {}
