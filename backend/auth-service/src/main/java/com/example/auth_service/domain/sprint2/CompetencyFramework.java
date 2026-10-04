package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "competency_frameworks",
    indexes = {
        @Index(name = "idx_competency_frameworks_job_title", columnList = "job_title_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompetencyFramework {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "competency_name", nullable = false, length = 100)
    private String competencyName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String category;

    @Column(name = "weight_percent", nullable = false)
    private Integer weightPercent = 100;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_title_id",
        foreignKey = @ForeignKey(name = "fk_competency_framework_job_title")
    )
    private JobTitle jobTitle;

    @OneToMany(
        mappedBy = "competencyFramework",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<CompetencyCriterion> criteria = new ArrayList<>();
}
