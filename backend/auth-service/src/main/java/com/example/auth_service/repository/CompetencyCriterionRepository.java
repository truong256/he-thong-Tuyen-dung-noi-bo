package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.CompetencyCriterion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CompetencyCriterionRepository extends JpaRepository<CompetencyCriterion, Long> {

    @Query("""
        SELECT DISTINCT c
        FROM CompetencyCriterion c
        JOIN FETCH c.competencyFramework f
        LEFT JOIN FETCH f.jobTitles j
        WHERE c.active = true
        ORDER BY c.criterionCode ASC
        """)
    List<CompetencyCriterion> findAllActiveWithDetails();

    List<CompetencyCriterion> findByCompetencyFrameworkId(Long frameworkId);
}
