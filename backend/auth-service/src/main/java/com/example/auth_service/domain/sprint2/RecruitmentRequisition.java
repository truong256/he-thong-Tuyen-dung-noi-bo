package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Sprint 2 Foundation Entity: RecruitmentRequisition (Yêu cầu tuyển dụng)
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

    private LocalDate targetDate;

    @Column(length = 30)
    private String status = "DRAFT"; // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, OPEN, CLOSED

    @Column(columnDefinition = "TEXT")
    private String reason;

    private Long createdByUserId;

    private Instant createdAt = Instant.now();
}
