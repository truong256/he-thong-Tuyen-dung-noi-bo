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
}
