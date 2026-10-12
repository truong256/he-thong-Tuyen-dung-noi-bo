package com.example.auth_service.domain.sprint3;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Entity lưu vết lịch sử và trạng thái phê duyệt yêu cầu tuyển dụng (S3-03).
 * Dữ liệu đóng vai trò là nhật ký bất biến (immutable audit log), không cho phép sửa/xóa.
 */
@Entity
@Table(name = "requisition_approval_histories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequisitionApprovalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requisition_id", nullable = false)
    private Long requisitionId;

    @Column(name = "step_order", nullable = false)
    private int stepOrder;

    @Column(name = "step_name", nullable = false, length = 120)
    private String stepName;

    @Column(name = "approver_id")
    private Long approverId;

    @Column(name = "approver_name", length = 150)
    private String approverName;

    @Column(name = "approver_email", length = 150)
    private String approverEmail;

    @Column(name = "approver_role", length = 50)
    private String approverRole;

    @Column(nullable = false, length = 50)
    private String action; // SUBMIT, APPROVE, REJECT, PENDING

    @Column(nullable = false, length = 30)
    private String status; // COMPLETED, PENDING, UPCOMING, REJECTED

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(name = "action_at")
    private Instant actionAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
