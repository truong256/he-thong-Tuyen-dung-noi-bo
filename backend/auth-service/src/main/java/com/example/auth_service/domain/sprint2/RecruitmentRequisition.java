package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Sprint 2 & 3 Entity: RecruitmentRequisition (Yêu cầu tuyển dụng)
 * Quản lý vòng đời yêu cầu tuyển dụng từ bản nháp (DRAFT), chờ duyệt (PENDING_APPROVAL)
 * đến phê duyệt (APPROVED), mở tuyển (OPEN) và đóng tuyển (CLOSED).
 */
@Entity
@Table(name = "recruitment_requisitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecruitmentRequisition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String requisitionCode;

    @Column(nullable = false, length = 150)
    private String title;

    private Long departmentId;

    private Long jobTitleId;

    private int quantity = 1;

    @Column(length = 30)
    private String recruitmentType; // NEW (Tuyển mới), REPLACEMENT (Tuyển thay thế)

    private Long salaryMin;

    private Long salaryMax;

    @Column(length = 10)
    private String currency = "VND";

    @Column(columnDefinition = "TEXT")
    private String salaryExplanation;

    private LocalDate neededDate;

    private LocalDate targetDate;

    @Column(columnDefinition = "TEXT")
    private String jobDescription;

    @Column(columnDefinition = "TEXT")
    private String candidateRequirements;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @Column(length = 255)
    private String workLocation;

    @Column(length = 30)
    private String workingModel = "ONSITE"; // ONSITE, HYBRID, REMOTE

    @Column(length = 30)
    private String status = "DRAFT"; // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, OPEN, CLOSED, CANCELLED

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    private Long createdByUserId;

    private Instant submittedAt;

    private Long approvedByUserId;

    private Instant approvedAt;

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (currency == null) currency = "VND";
        if (status == null) status = "DRAFT";
        if (workingModel == null) workingModel = "ONSITE";
        if (neededDate == null && targetDate != null) neededDate = targetDate;
        if (targetDate == null && neededDate != null) targetDate = neededDate;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
        if (neededDate == null && targetDate != null) neededDate = targetDate;
        if (targetDate == null && neededDate != null) targetDate = neededDate;
    }
}
