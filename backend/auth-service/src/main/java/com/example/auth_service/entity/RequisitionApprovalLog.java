package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Entity lưu vết nhật ký phê duyệt bất biến (S3-02).
 * Không cung cấp thao tác sửa hoặc xóa lịch sử.
 */
@Entity
@Table(name = "requisition_approval_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequisitionApprovalLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requisition_id", nullable = false)
    private Long requisitionId;

    @Column(name = "approver_user_id", nullable = false)
    private Long approverUserId;

    @Column(name = "step_order")
    private Integer stepOrder;

    @Column(nullable = false, length = 30)
    private String action; // APPROVE, REJECT, REQUEST_CHANGES

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public RequisitionApprovalLog(Long requisitionId, Long approverUserId, Integer stepOrder, String action, String comment) {
        this.requisitionId = requisitionId;
        this.approverUserId = approverUserId;
        this.stepOrder = stepOrder;
        this.action = action;
        this.comment = comment;
        this.createdAt = Instant.now();
    }
}
