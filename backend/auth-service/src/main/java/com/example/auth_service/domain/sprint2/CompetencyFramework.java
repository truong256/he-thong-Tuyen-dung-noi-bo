package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sprint 2 Foundation Entity: CompetencyFramework (Khung năng lực đánh giá)
 */
@Entity
@Table(name = "competency_frameworks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompetencyFramework {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String competencyName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String category; // Technical, Behavioral, Leadership

    private int weightPercent = 100;
}
