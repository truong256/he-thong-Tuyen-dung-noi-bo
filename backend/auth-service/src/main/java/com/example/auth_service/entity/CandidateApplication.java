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
    @Column(name = "candidate_user_id")
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

    @Column(name = "candidate_source_code", length = 50)
    private String candidateSourceCode;

    @Column(name = "rejection_reason_id")
    private Long rejectionReasonId;

 feature/SCRUM-184
    @Column(name = "referrer_user_id")
    private Long referrerUserId;

    @Column(name = "referrer_name", length = 150)
    private String referrerName;

    @Column(name = "referral_notes", columnDefinition = "TEXT")
    private String referralNotes;

    @Column(name = "job_posting_id")
    private Long jobPostingId;

    @Column(length = 50)
    private String phone;

    @Column(name = "cv_url", length = 500)
    private String cvUrl;

    @Column(length = 100)
    private String relationship;

    @Column(name = "created_at")
    private java.time.Instant createdAt = java.time.Instant.now();

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
 dev
}
