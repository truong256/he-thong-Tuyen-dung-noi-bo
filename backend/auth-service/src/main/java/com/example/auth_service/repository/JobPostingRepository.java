package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint3.JobPosting;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    Optional<JobPosting> findByJobCode(String jobCode);

    boolean existsByJobCode(String jobCode);

    List<JobPosting> findByRequisitionId(Long requisitionId);

    long countByJobCodeStartingWith(String prefix);

    @Query("""
        SELECT j FROM JobPosting j
        WHERE (:status IS NULL OR j.status = :status)
          AND (:departmentId IS NULL OR j.departmentId = :departmentId)
          AND (:keyword IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))
               OR LOWER(j.jobCode) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')))
        ORDER BY j.createdAt DESC
    """)
    Page<JobPosting> findWithFilters(
            @Param("status") String status,
            @Param("departmentId") Long departmentId,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("""
        SELECT j FROM JobPosting j
        WHERE j.status = 'PUBLISHED'
          AND (j.applicationDeadline IS NULL OR j.applicationDeadline >= :currentDate)
          AND (:departmentId IS NULL OR j.departmentId = :departmentId)
          AND (:workingModel IS NULL OR UPPER(j.workingModel) = UPPER(CAST(:workingModel AS string)))
          AND (:workLocation IS NULL OR LOWER(j.workLocation) LIKE LOWER(CONCAT('%', CAST(:workLocation AS string), '%')))
          AND (:keyword IS NULL OR (
                LOWER(j.title) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))
                OR LOWER(j.jobDescription) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))
                OR LOWER(j.requirements) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))
          ))
        ORDER BY j.publishedAt DESC, j.createdAt DESC
    """)
    Page<JobPosting> findPublicPostings(
            @Param("currentDate") LocalDate currentDate,
            @Param("departmentId") Long departmentId,
            @Param("workingModel") String workingModel,
            @Param("workLocation") String workLocation,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("""
        SELECT j FROM JobPosting j
        WHERE j.id = :id
          AND j.status = 'PUBLISHED'
          AND (j.applicationDeadline IS NULL OR j.applicationDeadline >= :currentDate)
    """)
    Optional<JobPosting> findPublicById(
            @Param("id") Long id,
            @Param("currentDate") LocalDate currentDate
    );

    long countByStatus(String status);
}
