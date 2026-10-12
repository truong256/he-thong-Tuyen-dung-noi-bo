package com.example.auth_service.repository;

import com.example.auth_service.entity.RequisitionAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RequisitionAssignmentRepository extends JpaRepository<RequisitionAssignment, Long> {
    Optional<RequisitionAssignment> findByRequisitionIdAndUserId(Long requisitionId, Long userId);
    java.util.List<RequisitionAssignment> findByUserId(Long userId);
    java.util.List<RequisitionAssignment> findByRequisitionId(Long requisitionId);
    java.util.List<RequisitionAssignment> findByRequisitionIdAndRole(Long requisitionId, com.example.auth_service.entity.RoleName role);
    void deleteByRequisitionIdAndUserId(Long requisitionId, Long userId);
}
