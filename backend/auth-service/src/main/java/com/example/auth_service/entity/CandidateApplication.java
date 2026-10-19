package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

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
    private String phone;

    @Column(length = 50)
    private String stage = "APPLIED";

    @Column(name = "candidate_source_id")
    private Long candidateSourceId;

    @Column(name = "rejection_reason_id")
    private Long rejectionReasonId;

    // S4-04: CV and parsing fields
    @Column(name = "cv_url", length = 500)
    private String cvUrl;

    @Column(name = "cv_file_name", length = 255)
    private String cvFileName;

    @Column(name = "parsed_full_name", length = 150)
    private String parsedFullName;

    @Column(name = "parsed_email", length = 100)
    private String parsedEmail;

    @Column(name = "parsed_phone", length = 50)
    private String parsedPhone;

    @Column(name = "parsed_status", length = 50)
    private String parsedStatus = "NOT_PARSED";

    @Column(name = "parsed_message", columnDefinition = "TEXT")
    private String parsedMessage;

    @Column(name = "is_parsed_confirmed")
    private Boolean isParsedConfirmed = false;

    @Column(name = "confirmed_by_user_id")
    private Long confirmedByUserId;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();
}
