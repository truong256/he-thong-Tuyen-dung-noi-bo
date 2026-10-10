package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "candidate_evaluations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidateEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "candidate_id", nullable = false)
    private Long candidateId;

    @Column(name = "interviewer_user_id", nullable = false)
    private Long interviewerUserId;

    @Column(nullable = false)
    private Integer score = 5;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "submitted_at")
    private Instant submittedAt = Instant.now();
}
