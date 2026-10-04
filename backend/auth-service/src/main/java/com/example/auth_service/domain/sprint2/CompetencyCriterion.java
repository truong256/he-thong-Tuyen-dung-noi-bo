package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(
    name = "competency_criteria",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_competency_criterion_code",
            columnNames = {"competency_framework_id", "criterion_code"}
        )
    },
    indexes = {
        @Index(name = "idx_competency_criteria_framework", columnList = "competency_framework_id"),
        @Index(name = "idx_competency_criteria_active", columnList = "active")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompetencyCriterion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "competency_framework_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_competency_criterion_framework")
    )
    private CompetencyFramework competencyFramework;

    @Column(name = "criterion_code", nullable = false, length = 50)
    private String criterionCode;

    @Column(name = "criterion_name", nullable = false, length = 150)
    private String criterionName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "weight_percent", nullable = false)
    private Integer weightPercent = 100;

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
