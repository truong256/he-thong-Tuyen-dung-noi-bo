package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint3.JobPostingAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobPostingAuditLogRepository extends JpaRepository<JobPostingAuditLog, Long> {

    List<JobPostingAuditLog> findByJobPostingIdOrderByCreatedAtDesc(Long jobPostingId);

    List<JobPostingAuditLog> findByJobPostingIdOrderByCreatedAtAsc(Long jobPostingId);
}
