package com.example.auth_service.domain.sprint3;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Entity: JobPosting (Tin tuyển dụng) - Sprint 3 / S3-10 (SCRUM-105)
 * Quản lý vòng đời tin tuyển dụng từ bản nháp (DRAFT), chờ duyệt (PENDING_APPROVAL),
 * đã duyệt (APPROVED), xuất bản công khai (PUBLISHED), gỡ tin (UNPUBLISHED),
 * từ chối (REJECTED) đến đóng (CLOSED).
 */
@Entity
@Table(name = "job_postings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobPosting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requisition_id")
    private Long requisitionId;

    @Column(name = "job_code", nullable = false, unique = true, length = 50)
    private String jobCode;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "job_title_id")
    private Long jobTitleId;

    @Column(name = "work_location", length = 255)
    private String workLocation;

    @Column(name = "work_location_id")
    private Long workLocationId;

    @Column(name = "employment_type_id")
    private Long employmentTypeId;

    @Column(name = "working_model", length = 50)
    private String workingModel = "ONSITE"; // ONSITE, HYBRID, REMOTE

    private int quantity = 1;

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @Column(name = "salary_min")
    private Long salaryMin;

    @Column(name = "salary_max")
    private Long salaryMax;

    @Column(length = 10)
    private String currency = "VND";

    @Column(name = "is_salary_visible")
    private boolean salaryVisible = true;

    @Column(name = "application_deadline")
    private LocalDate applicationDeadline;

    @Column(nullable = false, length = 30)
    private String status = "DRAFT"; // DRAFT, PENDING_APPROVAL, APPROVED, PUBLISHED, UNPUBLISHED, REJECTED, CLOSED

    @Column(name = "approved_by_user_id")
    private Long approvedByUserId;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "approval_notes", columnDefinition = "TEXT")
    private String approvalNotes;

    @Column(name = "published_by_user_id")
    private Long publishedByUserId;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "unpublished_by_user_id")
    private Long unpublishedByUserId;

    @Column(name = "unpublished_at")
    private Instant unpublishedAt;

    @Column(name = "unpublish_reason", columnDefinition = "TEXT")
    private String unpublishReason;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (currency == null) currency = "VND";
        if (status == null) status = "DRAFT";
        if (workingModel == null) workingModel = "ONSITE";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
