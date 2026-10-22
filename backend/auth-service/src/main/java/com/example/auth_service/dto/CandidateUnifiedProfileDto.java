package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateUnifiedProfileDto {
    private Long id; // Application ID
    private Long candidateUserId;
    private String fullName;
    private String email;
    private String phone;
    private String avatarUrl;

    // Current position / requisition information
    private Long currentRequisitionId;
    private String currentPositionTitle;
    private String currentRequisitionCode;
    private String currentDepartmentName;
    private String currentStage;
    private Instant appliedAt;
    private String coverLetter;
    private boolean withdrawn;
    private Instant withdrawnAt;
    private String withdrawalReason;
    private String rejectionReason;

    // CV attachment metadata
    private String cvFileUrl;
    private String cvFileName;
    private Long cvFileSize;
    private String cvContentType;

    // Scoped application history (filtered strictly by user's assigned scope)
    @Builder.Default
    private List<ApplicationHistoryItemDto> applicationHistory = new ArrayList<>();

    // Internal tags
    @Builder.Default
    private List<CandidateTagDto> tags = new ArrayList<>();

    // Internal notes
    @Builder.Default
    private List<CandidateNoteDto> notes = new ArrayList<>();

    // User permissions on this profile
    private ProfilePermissionsDto permissions;
}
