package com.example.auth_service.domain.sprint3;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Entity: JobPostingAuditLog - Nhật ký bất biến cho các hành động duyệt, xuất bản, gỡ tin tuyển dụng (SCRUM-150).
 */
@Entity
@Table(name = "job_posting_audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobPostingAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_posting_id", nullable = false)
    private Long jobPostingId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 50)
    private String action; // CREATE, SUBMIT_APPROVAL, APPROVE, PUBLISH, APPROVE_AND_PUBLISH, UNPUBLISH, REJECT, UPDATE

    @Column(name = "from_status", length = 30)
    private String fromStatus;

    @Column(name = "to_status", length = 30)
    private String toStatus;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
