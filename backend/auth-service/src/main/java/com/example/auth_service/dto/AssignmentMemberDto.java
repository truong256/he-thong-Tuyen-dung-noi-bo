package com.example.auth_service.dto;

import java.time.Instant;

public record AssignmentMemberDto(
        Long userId,
        String fullName,
        String email,
        String department,
        String role,
        boolean isPrimary,
        Instant assignedAt,
        boolean handoverRequired
) {}
