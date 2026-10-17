package com.example.auth_service.repository;

import com.example.auth_service.entity.RequisitionAssignmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequisitionAssignmentHistoryRepository extends JpaRepository<RequisitionAssignmentHistory, Long> {
    List<RequisitionAssignmentHistory> findByRequisitionIdOrderByCreatedAtDesc(Long requisitionId);
    List<RequisitionAssignmentHistory> findByUserIdOrderByCreatedAtDesc(Long userId);
}
