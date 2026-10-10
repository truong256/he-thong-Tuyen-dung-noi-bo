package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "requisition_approval_configurations", uniqueConstraints =
        @UniqueConstraint(columnNames = {"department_id", "version"}))
@Data
@NoArgsConstructor
public class RequisitionApprovalConfiguration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "department_id", nullable = false)
    private Long departmentId;

    @Column(nullable = false)
    private int version;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "deactivated_at")
    private Instant deactivatedAt;
}