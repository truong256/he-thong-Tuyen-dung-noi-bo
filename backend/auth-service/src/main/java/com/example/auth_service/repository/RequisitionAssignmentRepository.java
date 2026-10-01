package com.example.auth_service.repository;

import com.example.auth_service.entity.RequisitionAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RequisitionAssignmentRepository extends JpaRepository<RequisitionAssignment, Long> {
    Optional<RequisitionAssignment> findByRequisitionIdAndUserId(Long requisitionId, Long userId);
    java.util.List<RequisitionAssignment> findByUserId(Long userId);
    void deleteByRequisitionIdAndUserId(Long requisitionId, Long userId);
}
