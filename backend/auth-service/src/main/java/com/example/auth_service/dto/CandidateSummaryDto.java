package com.example.auth_service.dto;

import com.example.auth_service.entity.CandidateApplication;
import java.time.Instant;

/** Candidate data visible to recruitment workflow screens. */
public record CandidateSummaryDto(
        Long id,
        Long requisitionId,
        Long jobPostingId,
        String fullName,
        String email,
        String phone,
        String coverLetter,
        String cvFileUrl,
        String cvFileName,
        String stage,
        String rejectionReason,
        Long stageChangedById,
        Instant stageChangedAt,
        Instant appliedAt
) {
    public CandidateSummaryDto(Long id, Long requisitionId, String fullName, String email) {
        this(id, requisitionId, null, fullName, email, null, null, null, null, "APPLIED", null, null, null, null);
    }

    public CandidateSummaryDto(Long id, Long requisitionId, String fullName,
                               String email, String stage) {
        this(id, requisitionId, null, fullName, email, null, null, null, null, stage, null, null, null, null);
    }

    public CandidateSummaryDto(
            Long id,
            Long requisitionId,
            String fullName,
            String email,
            String stage,
            String rejectionReason,
            Long stageChangedById,
            Instant stageChangedAt
    ) {
        this(id, requisitionId, null, fullName, email, null, null, null, null, stage, rejectionReason, stageChangedById, stageChangedAt, null);
    }

    public static CandidateSummaryDto from(CandidateApplication application) {
        return new CandidateSummaryDto(
                application.getId(),
                application.getRequisitionId(),
                application.getJobPostingId(),
                application.getFullName(),
                application.getEmail(),
                application.getPhone(),
                application.getCoverLetter(),
                application.getCvFileUrl(),
                application.getCvFileName(),
                application.getStage() != null ? application.getStage() : "APPLIED",
                application.getRejectionReason(),
                application.getStageChangedById(),
                application.getStageChangedAt(),
                application.getAppliedAt()
        );
    }
}