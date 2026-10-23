package com.example.auth_service.dto;

import java.time.Instant;

public record AssignmentHistoryDto(
        Long id,
        Long requisitionId,
        Long userId,
        String userFullName,
        String userEmail,
        String role,
        String assignmentType,
        String action,
        Long previousUserId,
        String previousUserFullName,
        Long performedByUserId,
        String performedByFullName,
        String reason,
        String notes,
        Instant createdAt
) {}
