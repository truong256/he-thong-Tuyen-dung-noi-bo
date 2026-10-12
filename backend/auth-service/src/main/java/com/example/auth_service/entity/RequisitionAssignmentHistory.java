package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Lịch sử phân công và chuyển giao trách nhiệm yêu cầu tuyển dụng (S3-06).
 * Đảm bảo audit trail vĩnh viễn, không bao giờ bị xóa.
 */
@Entity
@Table(name = "requisition_assignment_histories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequisitionAssignmentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requisition_id", nullable = false)
    private Long requisitionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private RoleName role;

    @Column(name = "assignment_type", nullable = false, length = 20)
    private String assignmentType; // PRIMARY, SUPPORT

    @Column(nullable = false, length = 50)
    private String action; // ASSIGNED, HANDOVER, UNASSIGNED, ROLE_CHANGED

    @Column(name = "previous_user_id")
    private Long previousUserId;

    @Column(name = "performed_by_user_id")
    private Long performedByUserId;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
