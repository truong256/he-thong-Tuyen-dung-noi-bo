package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(
    name = "interview_questions",
    indexes = {
        @Index(name = "idx_interview_questions_criterion", columnList = "competency_criterion_id"),
        @Index(name = "idx_interview_questions_difficulty", columnList = "difficulty_level"),
        @Index(name = "idx_interview_questions_active", columnList = "active"),
        @Index(name = "idx_interview_questions_created_at", columnList = "created_at")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InterviewQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(length = 50)
    private String category;

    @Column(name = "difficulty_level", length = 20)
    private String difficultyLevel;

    @Column(name = "suggested_answer", columnDefinition = "TEXT")
    private String suggestedAnswer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "competency_criterion_id",
        foreignKey = @ForeignKey(name = "fk_interview_question_criterion")
    )
    private CompetencyCriterion competencyCriterion;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
