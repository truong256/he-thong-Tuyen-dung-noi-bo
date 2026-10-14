package com.example.auth_service.repository;

import com.example.auth_service.entity.CandidateApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CandidateApplicationRepository extends JpaRepository<CandidateApplication, Long>,
        JpaSpecificationExecutor<CandidateApplication> {
    boolean existsByCandidateSourceId(Long candidateSourceId);

    boolean existsByRejectionReasonId(Long rejectionReasonId);
}
