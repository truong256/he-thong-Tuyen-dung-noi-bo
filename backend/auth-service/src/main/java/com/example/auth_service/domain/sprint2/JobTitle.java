package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Sprint 2 Foundation Entity: JobTitle (Chức danh / Vị trí công việc)
 */
@Entity
@Table(
    name = "job_titles",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_job_titles_title", columnNames = {"title"}),
        @UniqueConstraint(name = "uk_job_titles_code", columnNames = {"code"})
    },
    indexes = {
        @Index(name = "idx_job_titles_department", columnList = "department_id"),
        @Index(name = "idx_job_titles_level", columnList = "level"),
        @Index(name = "idx_job_titles_active", columnList = "active")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobTitle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", foreignKey = @ForeignKey(name = "fk_job_titles_department"))
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competency_framework_id", foreignKey = @ForeignKey(name = "fk_job_titles_framework"))
    private CompetencyFramework competencyFramework;

    @Column(length = 50)
    private String level;

    @Column(name = "job_family", length = 50)
    private String jobFamily;

    @Column(name = "min_salary")
    private Long minSalary;

    @Column(name = "max_salary")
    private Long maxSalary;

    @Column(columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "key_responsibilities", columnDefinition = "TEXT")
    private String keyResponsibilities;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(columnDefinition = "TEXT")
    private String competencies;

    @Column(name = "standard_headcount")
    private Integer standardHeadcount = 1;

    @Column(name = "current_headcount")
    private Integer currentHeadcount = 0;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
