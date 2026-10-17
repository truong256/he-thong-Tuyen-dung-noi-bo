package com.example.auth_service.domain.sprint3;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;

/**
 * Entity Nhật ký ngân sách & ghi đè vượt hạn mức bất biến (S3-04 / SCRUM-125).
 */
@Entity
@Table(name = "budget_audit_logs")
public class BudgetAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "action", nullable = false, length = 30)
    private String action; // BUDGET_CREATED, BUDGET_UPDATED, BUDGET_DELETED, BUDGET_OVERRIDE

    @Column(name = "department_id", nullable = false)
    private Long departmentId;

    @Column(name = "\"year\"", nullable = false)
    private int year;

    @Column(name = "requisition_id")
    private Long requisitionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(name = "user_full_name")
    private String userFullName;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public BudgetAuditLog() {
        this.createdAt = Instant.now();
    }

    public BudgetAuditLog(String action, Long departmentId, int year, Long requisitionId, Long userId, String userEmail, String userFullName, String reason, String detail) {
        this.action = action;
        this.departmentId = departmentId;
        this.year = year;
        this.requisitionId = requisitionId;
        this.userId = userId;
        this.userEmail = userEmail;
        this.userFullName = userFullName;
        this.reason = reason;
        this.detail = detail;
        this.createdAt = Instant.now();
    }

    public BudgetAuditLog(Long id, String action, Long departmentId, int year, Long requisitionId, Long userId, String userEmail, String userFullName, String reason, String detail, Instant createdAt) {
        this.id = id;
        this.action = action;
        this.departmentId = departmentId;
        this.year = year;
        this.requisitionId = requisitionId;
        this.userId = userId;
        this.userEmail = userEmail;
        this.userFullName = userFullName;
        this.reason = reason;
        this.detail = detail;
        this.createdAt = createdAt;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public Long getRequisitionId() {
        return requisitionId;
    }

    public void setRequisitionId(Long requisitionId) {
        this.requisitionId = requisitionId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BudgetAuditLog that = (BudgetAuditLog) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
