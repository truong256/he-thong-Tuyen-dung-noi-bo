package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "requisition_approval_configuration_steps", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"configuration_id", "step_order"}),
        @UniqueConstraint(columnNames = {"configuration_id", "approver_user_id"})
})
@Data
@NoArgsConstructor
public class RequisitionApprovalConfigurationStep {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "configuration_id", nullable = false)
    private Long configurationId;

    @Column(name = "step_order", nullable = false)
    private int stepOrder;

    @Column(name = "minimum_salary", nullable = false)
    private long minimumSalary;

    @Column(name = "approver_user_id", nullable = false)
    private Long approverUserId;
}