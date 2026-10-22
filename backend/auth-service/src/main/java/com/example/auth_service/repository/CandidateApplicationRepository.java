package com.example.auth_service.repository;

import com.example.auth_service.entity.CandidateApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CandidateApplicationRepository extends JpaRepository<CandidateApplication, Long>,
        JpaSpecificationExecutor<CandidateApplication> {
    boolean existsByCandidateSourceId(Long candidateSourceId);

    boolean existsByRejectionReasonId(Long rejectionReasonId);

    java.util.List<CandidateApplication> findByRequisitionId(Long requisitionId);

    java.util.List<CandidateApplication> findByCandidateUserId(Long candidateUserId);

    java.util.List<CandidateApplication> findByEmailIgnoreCase(String email);

    java.util.List<CandidateApplication> findByCandidateUserIdOrEmailIgnoreCase(Long candidateUserId, String email);

    long countByRequisitionId(Long requisitionId);
}

