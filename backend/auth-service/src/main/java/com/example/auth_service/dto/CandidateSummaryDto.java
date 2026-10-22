package com.example.auth_service.dto;

import com.example.auth_service.entity.CandidateApplication;
import java.time.Instant;

/** Candidate data visible to recruitment workflow screens. */
public record CandidateSummaryDto(
        Long id,
        Long requisitionId,
        String fullName,
        String email,
        String stage,
        String rejectionReason,
        Long stageChangedById,
        Instant stageChangedAt
) {
    public CandidateSummaryDto(Long id, Long requisitionId, String fullName, String email) {
        this(id, requisitionId, fullName, email, "APPLIED", null, null, null);
    }

    public CandidateSummaryDto(Long id, Long requisitionId, String fullName,
                               String email, String stage) {
        this(id, requisitionId, fullName, email, stage, null, null, null);
    }

    public static CandidateSummaryDto from(CandidateApplication application) {
        return new CandidateSummaryDto(
                application.getId(),
                application.getRequisitionId(),
                application.getFullName(),
                application.getEmail(),
                application.getStage() != null ? application.getStage() : "APPLIED",
                application.getRejectionReason(),
                application.getStageChangedById(),
                application.getStageChangedAt()
        );
    }
}