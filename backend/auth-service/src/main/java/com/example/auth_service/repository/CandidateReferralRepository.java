package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint4.CandidateReferral;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateReferralRepository extends JpaRepository<CandidateReferral, Long>, JpaSpecificationExecutor<CandidateReferral> {

    Page<CandidateReferral> findByReferrerUserId(Long referrerUserId, Pageable pageable);

    List<CandidateReferral> findByReferrerUserIdOrderByCreatedAtDesc(Long referrerUserId);

    Optional<CandidateReferral> findByIdAndReferrerUserId(Long id, Long referrerUserId);

    boolean existsByCandidateEmailAndJobPostingId(String candidateEmail, Long jobPostingId);

    boolean existsByCandidateEmailAndRequisitionId(String candidateEmail, Long requisitionId);

    @Query("""
        SELECT r FROM CandidateReferral r
        WHERE (:referrerUserId IS NULL OR r.referrerUserId = :referrerUserId)
          AND (:generalStatus IS NULL OR LOWER(r.generalStatus) = LOWER(:generalStatus))
          AND (:keyword IS NULL OR (
                LOWER(r.candidateName) LIKE LOWER(CONCAT('%', :keyword, '%'))
             OR LOWER(r.candidateEmail) LIKE LOWER(CONCAT('%', :keyword, '%'))
             OR LOWER(r.candidatePhone) LIKE LOWER(CONCAT('%', :keyword, '%'))
             OR LOWER(r.relationship) LIKE LOWER(CONCAT('%', :keyword, '%'))
             OR LOWER(r.referrerName) LIKE LOWER(CONCAT('%', :keyword, '%'))
          ))
    """)
    Page<CandidateReferral> findWithFilters(
            @Param("referrerUserId") Long referrerUserId,
            @Param("generalStatus") String generalStatus,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    long countByReferrerUserId(Long referrerUserId);

    long countByReferrerUserIdAndGeneralStatus(Long referrerUserId, String generalStatus);
}
