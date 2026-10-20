package com.example.auth_service.dto;

import java.time.Instant;

/**
 * DTO for candidate to view their application in their portal (S4-06).
 */
public record CandidateApplicationPortalDto(
        Long id,
        Long requisitionId,
        String positionTitle,
        String requisitionCode,
        String fullName,
        String email,
        String stage,
        boolean withdrawn,
        Instant withdrawnAt,
        String withdrawalReason,
        String withdrawToken
) {}
