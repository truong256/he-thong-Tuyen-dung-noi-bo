package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface RecruitmentRequisitionRepository extends JpaRepository<RecruitmentRequisition, Long> {
    boolean existsByDepartmentId(Long departmentId);

    boolean existsByJobTitleId(Long jobTitleId);

    boolean existsByRequisitionCode(String requisitionCode);

    boolean existsByRequisitionCodeIgnoreCase(String requisitionCode);

    Optional<RecruitmentRequisition> findByRequisitionCode(String requisitionCode);

    long countByRequisitionCodeStartingWith(String prefix);

    @Query("""
        select count(r) > 0 from RecruitmentRequisition r where r.departmentId = :departmentId
        and (r.status is null or upper(r.status) not in ('CLOSED', 'REJECTED', 'CANCELLED'))
        """)
    boolean hasOpenRequisitions(@Param("departmentId") Long departmentId);

    @Query("""
        select count(r) from RecruitmentRequisition r where r.departmentId = :departmentId
        and (r.status is null or upper(r.status) not in ('CLOSED', 'REJECTED', 'CANCELLED'))
        """)
    long countOpenRequisitions(@Param("departmentId") Long departmentId);

    @Query("""
        SELECT r FROM RecruitmentRequisition r
        WHERE (:createdByUserId IS NULL OR r.createdByUserId = :createdByUserId)
          AND (:status IS NULL OR UPPER(r.status) = UPPER(:status))
          AND (:departmentId IS NULL OR r.departmentId = :departmentId)
          AND (:keyword IS NULL OR LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.requisitionCode) LIKE LOWER(CONCAT('%', :keyword, '%')))
        ORDER BY r.createdAt DESC
        """)
    Page<RecruitmentRequisition> search(
            @Param("createdByUserId") Long createdByUserId,
            @Param("status") String status,
            @Param("departmentId") Long departmentId,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    Page<RecruitmentRequisition> findByDepartmentIdIn(Collection<Long> departmentIds, Pageable pageable);

    Page<RecruitmentRequisition> findByCreatedByUserId(Long createdByUserId, Pageable pageable);
}
