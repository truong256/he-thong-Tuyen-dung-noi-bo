package com.example.auth_service.dto;

import com.example.auth_service.entity.CandidateApplication;
import java.time.Instant;

public record CandidateDetailDto(
    Long id,
    Long requisitionId,
    Long candidateUserId,
    Long interviewerUserId,
    String fullName,
    String email,
    String phone,
    String stage,
    Long candidateSourceId,
    Long rejectionReasonId,
    String cvUrl,
    String cvFileName,
    String parsedFullName,
    String parsedEmail,
    String parsedPhone,
    String parsedStatus,
    String parsedMessage,
    Boolean isParsedConfirmed,
    Long confirmedByUserId,
    Instant confirmedAt,
    Instant createdAt,
    Instant updatedAt
) {
    public static CandidateDetailDto from(CandidateApplication app) {
        return new CandidateDetailDto(
            app.getId(),
            app.getRequisitionId(),
            app.getCandidateUserId(),
            app.getInterviewerUserId(),
            app.getFullName(),
            app.getEmail(),
            app.getPhone(),
            app.getStage() != null ? app.getStage() : "APPLIED",
            app.getCandidateSourceId(),
            app.getRejectionReasonId(),
            app.getCvUrl(),
            app.getCvFileName(),
            app.getParsedFullName(),
            app.getParsedEmail(),
            app.getParsedPhone(),
            app.getParsedStatus() != null ? app.getParsedStatus() : "NOT_PARSED",
            app.getParsedMessage(),
            app.getIsParsedConfirmed() != null ? app.getIsParsedConfirmed() : false,
            app.getConfirmedByUserId(),
            app.getConfirmedAt(),
            app.getCreatedAt(),
            app.getUpdatedAt()
        );
    }
}
