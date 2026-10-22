package com.example.auth_service.repository;

import com.example.auth_service.entity.CandidateNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CandidateNoteRepository extends JpaRepository<CandidateNote, Long> {
    List<CandidateNote> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);

    List<CandidateNote> findByApplicationIdInOrderByCreatedAtDesc(List<Long> applicationIds);

    List<CandidateNote> findByCandidateUserIdOrderByCreatedAtDesc(Long candidateUserId);
}
