package com.example.auth_service.repository;

import com.example.auth_service.entity.RequisitionApprovalLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequisitionApprovalLogRepository extends JpaRepository<RequisitionApprovalLog, Long> {
    List<RequisitionApprovalLog> findAllByRequisitionIdOrderByCreatedAtAsc(Long requisitionId);
    List<RequisitionApprovalLog> findAllByRequisitionIdOrderByIdAsc(Long requisitionId);
}
