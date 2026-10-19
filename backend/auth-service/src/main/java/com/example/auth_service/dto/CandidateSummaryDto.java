package com.example.auth_service.dto;

import com.example.auth_service.entity.CandidateApplication;

/** Deliberately excludes compensation and internal security assignment fields. */
public record CandidateSummaryDto(
    Long id,
    Long requisitionId,
    String fullName,
    String email,
    String stage,
    String phone,
    String parsedStatus,
    Boolean isParsedConfirmed,
    String cvFileName,
    String cvUrl
) {
    public CandidateSummaryDto(Long id, Long requisitionId, String fullName, String email) {
        this(id, requisitionId, fullName, email, "APPLIED", null, "NOT_PARSED", false, null, null);
    }

    public CandidateSummaryDto(Long id, Long requisitionId, String fullName, String email, String stage) {
        this(id, requisitionId, fullName, email, stage, null, "NOT_PARSED", false, null, null);
    }

    public static CandidateSummaryDto from(CandidateApplication application) {
        return new CandidateSummaryDto(
            application.getId(),
            application.getRequisitionId(),
            application.getFullName(),
            application.getEmail(),
            application.getStage() != null ? application.getStage() : "APPLIED",
            application.getPhone(),
            application.getParsedStatus() != null ? application.getParsedStatus() : "NOT_PARSED",
            application.getIsParsedConfirmed() != null ? application.getIsParsedConfirmed() : false,
            application.getCvFileName(),
            application.getCvUrl()
        );
    }
}
