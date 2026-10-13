package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint3.JobPosting;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    Optional<JobPosting> findByPostingCode(String postingCode);

    boolean existsByPostingCode(String postingCode);

    long countByPostingCodeStartingWith(String prefix);

    List<JobPosting> findByRequisitionId(Long requisitionId);

    Optional<JobPosting> findTopByRequisitionIdOrderByCreatedAtDesc(Long requisitionId);

    Page<JobPosting> findByStatus(String status, Pageable pageable);

    @Query("""
        SELECT j FROM JobPosting j
        WHERE (:status IS NULL OR j.status = :status)
          AND (:keyword IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(j.postingCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(j.workLocation) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:requisitionId IS NULL OR j.requisitionId = :requisitionId)
        ORDER BY j.createdAt DESC
    """)
    Page<JobPosting> search(
            @Param("status") String status,
            @Param("keyword") String keyword,
            @Param("requisitionId") Long requisitionId,
            Pageable pageable
    );
}
