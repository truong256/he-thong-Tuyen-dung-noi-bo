package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A candidate's application to one position; access is scoped to that application. */
@Entity
@Table(name = "candidate_applications")
@Data
@NoArgsConstructor
public class CandidateApplication {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long requisitionId;
    @Column(nullable = false)
    private Long candidateUserId;
    private Long interviewerUserId;
    @Column(nullable = false, length = 150)
    private String fullName;
    @Column(nullable = false, length = 100)
    private String email;
    @Column(length = 50)
    private String stage = "APPLIED";

    @Column(name = "candidate_source_id")
    private Long candidateSourceId;

    @Column(name = "rejection_reason_id")
    private Long rejectionReasonId;

    @Column(name = "withdrawn_at")
    private java.time.Instant withdrawnAt;

    @Column(name = "withdrawal_reason", columnDefinition = "TEXT")
    private String withdrawalReason;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "stage_changed_by_id")
    private Long stageChangedById;

    @Column(name = "stage_changed_at")
    private java.time.Instant stageChangedAt;

    @Column(length = 25)
    private String phone;

    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @Column(name = "cv_file_url", length = 500)
    private String cvFileUrl;

    @Column(name = "cv_file_name", length = 255)
    private String cvFileName;

    @Column(name = "stored_file_name", length = 255)
    private String storedFileName;

    @Column(name = "job_posting_id")
    private Long jobPostingId;

    @Column(name = "applied_at")
    private java.time.Instant appliedAt;
}

