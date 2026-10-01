package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "requisition_assignments", uniqueConstraints =
        @UniqueConstraint(columnNames = {"requisition_id", "user_id"}))
@Data
@NoArgsConstructor
public class RequisitionAssignment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "requisition_id", nullable = false)
    private Long requisitionId;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private RoleName role;

    @Column(name = "handover_required", nullable = false)
    private boolean handoverRequired = false;
}
