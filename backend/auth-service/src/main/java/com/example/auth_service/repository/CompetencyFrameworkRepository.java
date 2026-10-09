package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.CompetencyFramework;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompetencyFrameworkRepository extends JpaRepository<CompetencyFramework, Long> {
    boolean existsByCompetencyNameIgnoreCase(String competencyName);
    boolean existsByCompetencyNameIgnoreCaseAndIdNot(String competencyName, Long id);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(cf) > 0 FROM CompetencyFramework cf JOIN cf.jobTitles jt WHERE jt.id = :jobTitleId")
    boolean existsByJobTitleId(@org.springframework.data.repository.query.Param("jobTitleId") Long jobTitleId);
}

