package com.example.auth_service.repository;

import com.example.auth_service.entity.CandidateApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface CandidateApplicationRepository extends JpaRepository<CandidateApplication, Long>,
        JpaSpecificationExecutor<CandidateApplication> {
    boolean existsByCandidateSourceId(Long candidateSourceId);

    boolean existsByRejectionReasonId(Long rejectionReasonId);

    List<CandidateApplication> findByRequisitionId(Long requisitionId);

    List<CandidateApplication> findByCandidateUserId(Long candidateUserId);

    long countByRequisitionId(Long requisitionId);
}
