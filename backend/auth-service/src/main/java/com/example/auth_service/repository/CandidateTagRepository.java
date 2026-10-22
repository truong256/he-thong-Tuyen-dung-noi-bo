package com.example.auth_service.repository;

import com.example.auth_service.entity.CandidateTag;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CandidateTagRepository extends JpaRepository<CandidateTag, Long> {
    List<CandidateTag> findByApplicationIdOrderByCreatedAtAsc(Long applicationId);

    List<CandidateTag> findByApplicationIdIn(List<Long> applicationIds);

    List<CandidateTag> findByCandidateUserId(Long candidateUserId);

    Optional<CandidateTag> findByApplicationIdAndTagName(Long applicationId, String tagName);

    boolean existsByApplicationIdAndTagName(Long applicationId, String tagName);

    void deleteByApplicationIdAndTagName(Long applicationId, String tagName);
}
