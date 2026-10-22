package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.JobTitle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobTitleRepository extends JpaRepository<JobTitle, Long> {
    Optional<JobTitle> findByCodeIgnoreCase(String code);
    Optional<JobTitle> findByTitleIgnoreCase(String title);

    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    boolean existsByTitleIgnoreCase(String title);
    boolean existsByTitleIgnoreCaseAndIdNot(String title, Long id);

    List<JobTitle> findByActive(boolean active);
    List<JobTitle> findByDepartmentId(Long departmentId);
    List<JobTitle> findByCompetencyFrameworkId(Long competencyFrameworkId);
    boolean existsByCompetencyFrameworkId(Long competencyFrameworkId);

    @Query("SELECT j FROM JobTitle j WHERE " +
           "(:active IS NULL OR j.active = :active) AND " +
           "(:departmentId IS NULL OR (j.department IS NOT NULL AND j.department.id = :departmentId)) AND " +
           "(:level IS NULL OR UPPER(j.level) = UPPER(:level)) AND " +
           "(:jobFamily IS NULL OR UPPER(j.jobFamily) = UPPER(:jobFamily)) AND " +
           "(:search IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR LOWER(j.code) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR (j.department IS NOT NULL AND LOWER(j.department.name) LIKE LOWER(CONCAT('%', :search, '%'))))")
    List<JobTitle> searchJobTitles(
            @Param("search") String search,
            @Param("active") Boolean active,
            @Param("departmentId") Long departmentId,
            @Param("level") String level,
            @Param("jobFamily") String jobFamily
    );

    default List<JobTitle> searchJobTitles(String search, Boolean active, Long departmentId) {
        return searchJobTitles(search, active, departmentId, null, null);
    }
}
