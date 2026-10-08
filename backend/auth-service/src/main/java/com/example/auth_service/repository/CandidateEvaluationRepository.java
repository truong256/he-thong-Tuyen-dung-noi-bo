package com.example.auth_service.repository;

import com.example.auth_service.entity.CandidateEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateEvaluationRepository extends JpaRepository<CandidateEvaluation, Long> {
    List<CandidateEvaluation> findByCandidateId(Long candidateId);
    Optional<CandidateEvaluation> findTopByCandidateIdOrderBySubmittedAtDesc(Long candidateId);
    boolean existsByCandidateId(Long candidateId);
}
