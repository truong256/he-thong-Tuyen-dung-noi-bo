package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "requisition_approval_snapshots", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"requisition_id", "step_order"})
})
@Data
@NoArgsConstructor
public class RequisitionApprovalSnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requisition_id", nullable = false)
    private Long requisitionId;

    @Column(name = "configuration_id", nullable = false)
    private Long configurationId;

    @Column(name = "configuration_version", nullable = false)
    private int configurationVersion;

    @Column(name = "step_order", nullable = false)
    private int stepOrder;

    @Column(name = "minimum_salary", nullable = false)
    private long minimumSalary;

    @Column(name = "approver_user_id", nullable = false)
    private Long approverUserId;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "approved_by_user_id")
    private Long approvedByUserId;

    @Column(name = "approved_at")
    private Instant approvedAt;
}