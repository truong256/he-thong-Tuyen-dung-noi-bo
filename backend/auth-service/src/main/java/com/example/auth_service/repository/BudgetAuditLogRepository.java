package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint3.BudgetAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BudgetAuditLogRepository extends JpaRepository<BudgetAuditLog, Long> {

    Page<BudgetAuditLog> findByDepartmentIdAndYearOrderByCreatedAtDesc(Long departmentId, int year, Pageable pageable);

    Page<BudgetAuditLog> findByDepartmentIdOrderByCreatedAtDesc(Long departmentId, Pageable pageable);

    Page<BudgetAuditLog> findByYearOrderByCreatedAtDesc(int year, Pageable pageable);

    Page<BudgetAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<BudgetAuditLog> findByRequisitionIdOrderByCreatedAtDesc(Long requisitionId);
}
