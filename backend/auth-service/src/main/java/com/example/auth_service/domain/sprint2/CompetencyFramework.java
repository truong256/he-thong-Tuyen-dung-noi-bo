package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "competency_frameworks")
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

    @OneToMany(mappedBy = "competencyFramework")
    private List<JobTitle> jobTitles = new ArrayList<>();

    public JobTitle getJobTitle() {
        return (jobTitles != null && !jobTitles.isEmpty()) ? jobTitles.get(0) : null;
    }

    public void setJobTitle(JobTitle jobTitle) {
        if (this.jobTitles == null) {
            this.jobTitles = new ArrayList<>();
        }
        if (jobTitle != null) {
            jobTitle.setCompetencyFramework(this);
            if (!this.jobTitles.contains(jobTitle)) {
                this.jobTitles.add(jobTitle);
            }
        }
    }

    @OneToMany(
        mappedBy = "competencyFramework",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<CompetencyCriterion> criteria = new ArrayList<>();
}
