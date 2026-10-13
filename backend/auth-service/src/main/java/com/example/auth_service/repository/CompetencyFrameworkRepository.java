package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.CompetencyFramework;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompetencyFrameworkRepository extends JpaRepository<CompetencyFramework, Long> {
    boolean existsByCompetencyNameIgnoreCase(String competencyName);
    boolean existsByCompetencyNameIgnoreCaseAndIdNot(String competencyName, Long id);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(cf) > 0 FROM CompetencyFramework cf JOIN cf.jobTitles jt WHERE jt.id = :jobTitleId")
    boolean existsByJobTitleId(@org.springframework.data.repository.query.Param("jobTitleId") Long jobTitleId);

    @org.springframework.data.jpa.repository.Query(value = "SELECT cf FROM CompetencyFramework cf WHERE " +
            "(:search IS NULL OR LOWER(cf.competencyName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "   OR LOWER(cf.description) LIKE LOWER(CONCAT('%', :search, '%')))",
            countQuery = "SELECT count(cf) FROM CompetencyFramework cf WHERE " +
            "(:search IS NULL OR LOWER(cf.competencyName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "   OR LOWER(cf.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<CompetencyFramework> searchFrameworks(
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable
    );
}

