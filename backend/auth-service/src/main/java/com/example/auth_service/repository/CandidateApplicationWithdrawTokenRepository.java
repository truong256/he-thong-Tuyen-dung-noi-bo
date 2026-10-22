package com.example.auth_service.repository;

import com.example.auth_service.entity.CandidateApplicationWithdrawToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CandidateApplicationWithdrawTokenRepository extends JpaRepository<CandidateApplicationWithdrawToken, Long> {
    Optional<CandidateApplicationWithdrawToken> findByToken(String token);
    Optional<CandidateApplicationWithdrawToken> findTopByApplicationIdAndUsedFalseOrderByCreatedAtDesc(Long applicationId);
    List<CandidateApplicationWithdrawToken> findByApplicationId(Long applicationId);
    void deleteByApplicationId(Long applicationId);
}
