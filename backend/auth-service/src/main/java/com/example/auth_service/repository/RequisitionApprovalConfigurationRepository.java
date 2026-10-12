package com.example.auth_service.repository;

import com.example.auth_service.entity.RequisitionApprovalConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RequisitionApprovalConfigurationRepository
        extends JpaRepository<RequisitionApprovalConfiguration, Long> {
    Optional<RequisitionApprovalConfiguration> findByDepartmentIdAndActiveTrue(Long departmentId);
    Optional<RequisitionApprovalConfiguration> findFirstByDepartmentIdOrderByVersionDesc(Long departmentId);
    List<RequisitionApprovalConfiguration> findAllByOrderByDepartmentIdAscVersionDesc();
    List<RequisitionApprovalConfiguration> findAllByDepartmentIdOrderByVersionDesc(Long departmentId);
}