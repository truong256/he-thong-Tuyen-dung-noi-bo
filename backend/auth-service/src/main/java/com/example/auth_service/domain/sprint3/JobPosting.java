package com.example.auth_service.domain.sprint3;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Sprint 3 Entity: JobPosting (Tin tuyển dụng) - Triển khai cho S3-09
 * Quản lý tin tuyển dụng được soạn từ yêu cầu tuyển dụng đã duyệt.
 * Hỗ trợ lưu nháp (DRAFT), gửi duyệt (PENDING_APPROVAL), đã duyệt (APPROVED),
 * xuất bản (PUBLISHED) và đóng (CLOSED).
 */
@Entity
@Table(name = "job_postings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPosting {

    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_PENDING_APPROVAL = "PENDING_APPROVAL";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_PUBLISHED = "PUBLISHED";
    public static final String STATUS_CLOSED = "CLOSED";

    public static final String WORKING_MODEL_ONSITE = "ONSITE";
    public static final String WORKING_MODEL_HYBRID = "HYBRID";
    public static final String WORKING_MODEL_REMOTE = "REMOTE";

    public static final String SALARY_TYPE_RANGE = "RANGE";
    public static final String SALARY_TYPE_EXACT = "EXACT";
    public static final String SALARY_TYPE_NEGOTIABLE = "NEGOTIABLE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "posting_code", nullable = false, unique = true, length = 50)
    private String postingCode;

    @Column(name = "requisition_id", nullable = false)
    private Long requisitionId;

    @Column(nullable = false)
    private String title;

    @Column(name = "job_description", nullable = false, columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "candidate_requirements", nullable = false, columnDefinition = "TEXT")
    private String candidateRequirements;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @Column(name = "work_location", nullable = false)
    private String workLocation;

    @Column(name = "work_location_id")
    private Long workLocationId;

    @Column(name = "working_model", nullable = false, length = 30)
    @Builder.Default
    private String workingModel = WORKING_MODEL_ONSITE;

    @Column(name = "application_deadline", nullable = false)
    private LocalDate applicationDeadline;

    @Column(name = "show_salary", nullable = false)
    @Builder.Default
    private boolean showSalary = true;

    @Column(name = "salary_type", nullable = false, length = 30)
    @Builder.Default
    private String salaryType = SALARY_TYPE_RANGE;

    @Column(name = "salary_min")
    private Long salaryMin;

    @Column(name = "salary_max")
    private Long salaryMax;

    @Column(length = 10, nullable = false)
    @Builder.Default
    private String currency = "VND";

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = STATUS_DRAFT;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "updated_by_user_id")
    private Long updatedByUserId;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
        if (status == null || status.isBlank()) {
            status = STATUS_DRAFT;
        }
        if (workingModel == null || workingModel.isBlank()) {
            workingModel = WORKING_MODEL_ONSITE;
        }
        if (salaryType == null || salaryType.isBlank()) {
            salaryType = SALARY_TYPE_RANGE;
        }
        if (currency == null || currency.isBlank()) {
            currency = "VND";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
