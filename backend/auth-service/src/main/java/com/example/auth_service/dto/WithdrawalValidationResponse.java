package com.example.auth_service.dto;

public record WithdrawalValidationResponse(
        boolean valid,
        Long applicationId,
        String candidateName,
        String positionTitle,
        String requisitionCode,
        String departmentName,
        boolean alreadyWithdrawn,
        String currentStage,
        String message
) {}
