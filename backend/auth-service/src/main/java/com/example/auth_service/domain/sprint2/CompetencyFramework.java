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



    @OneToMany(
        mappedBy = "competencyFramework",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<CompetencyCriterion> criteria = new ArrayList<>();
}
