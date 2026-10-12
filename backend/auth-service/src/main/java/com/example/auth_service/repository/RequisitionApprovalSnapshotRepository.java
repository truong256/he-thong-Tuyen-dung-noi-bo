package com.example.auth_service.repository;

import com.example.auth_service.entity.RequisitionApprovalSnapshot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RequisitionApprovalSnapshotRepository extends JpaRepository<RequisitionApprovalSnapshot, Long> {
    List<RequisitionApprovalSnapshot> findAllByRequisitionIdOrderByStepOrderAsc(Long requisitionId);

    boolean existsByRequisitionId(Long requisitionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT step FROM RequisitionApprovalSnapshot step
        WHERE step.requisitionId = :requisitionId AND step.status = 'PENDING'
        ORDER BY step.stepOrder
        """)
    List<RequisitionApprovalSnapshot> findPendingForUpdate(@Param("requisitionId") Long requisitionId);
}