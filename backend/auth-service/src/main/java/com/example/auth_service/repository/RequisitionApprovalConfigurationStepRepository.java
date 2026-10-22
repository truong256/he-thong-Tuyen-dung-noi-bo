package com.example.auth_service.repository;

import com.example.auth_service.entity.RequisitionApprovalConfigurationStep;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequisitionApprovalConfigurationStepRepository
        extends JpaRepository<RequisitionApprovalConfigurationStep, Long> {
    List<RequisitionApprovalConfigurationStep> findAllByConfigurationIdOrderByStepOrderAsc(Long configurationId);
}