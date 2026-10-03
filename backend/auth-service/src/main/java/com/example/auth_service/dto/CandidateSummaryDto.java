package com.example.auth_service.dto;

import com.example.auth_service.entity.CandidateApplication;

/** Deliberately excludes compensation and internal security assignment fields. */
public record CandidateSummaryDto(Long id, Long requisitionId, String fullName, String email) {
    public static CandidateSummaryDto from(CandidateApplication application) {
        return new CandidateSummaryDto(application.getId(), application.getRequisitionId(),
                application.getFullName(), application.getEmail());
    }
}
