package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sprint 2 Foundation Entity: InterviewQuestion (Ngân hàng câu hỏi phỏng vấn)
 */
@Entity
@Table(name = "interview_questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InterviewQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(length = 50)
    private String category;

    @Column(length = 20)
    private String difficultyLevel; // EASY, MEDIUM, HARD

    @Column(columnDefinition = "TEXT")
    private String suggestedAnswer;
}
