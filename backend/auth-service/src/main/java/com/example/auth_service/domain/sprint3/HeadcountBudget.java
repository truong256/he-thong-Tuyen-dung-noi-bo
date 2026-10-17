package com.example.auth_service.domain.sprint3;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;

/**
 * Entity Quản lý Ngân sách Headcount & Lương theo phòng ban và năm (S3-04 / SCRUM-101 / SCRUM-123).
 */
@Entity
@Table(name = "headcount_budgets", uniqueConstraints = {
        @UniqueConstraint(name = "uq_headcount_budget_dept_year", columnNames = {"department_id", "year"})
})
public class HeadcountBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "department_id", nullable = false)
    private Long departmentId;

    @Column(name = "\"year\"", nullable = false)
    private int year;

    @Column(name = "headcount_quota", nullable = false)
    private int headcountQuota;

    @Column(name = "salary_budget_vnd", nullable = false)
    private Long salaryBudgetVnd;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "updated_by", nullable = false)
    private Long updatedBy;

    @Column(name = "version", nullable = false)
    private int version = 1;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public HeadcountBudget() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.version = 1;
    }

    public HeadcountBudget(Long departmentId, int year, int headcountQuota, Long salaryBudgetVnd, String note, Long createdBy, Long updatedBy) {
        this.departmentId = departmentId;
        this.year = year;
        this.headcountQuota = headcountQuota;
        this.salaryBudgetVnd = salaryBudgetVnd;
        this.note = note;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
        this.version = 1;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public HeadcountBudget(Long id, Long departmentId, int year, int headcountQuota, Long salaryBudgetVnd, String note, Long createdBy, Long updatedBy, int version, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.departmentId = departmentId;
        this.year = year;
        this.headcountQuota = headcountQuota;
        this.salaryBudgetVnd = salaryBudgetVnd;
        this.note = note;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
        this.version = version;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (version == 0) version = 1;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
        version++;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public int getHeadcountQuota() {
        return headcountQuota;
    }

    public void setHeadcountQuota(int headcountQuota) {
        this.headcountQuota = headcountQuota;
    }

    public Long getSalaryBudgetVnd() {
        return salaryBudgetVnd;
    }

    public void setSalaryBudgetVnd(Long salaryBudgetVnd) {
        this.salaryBudgetVnd = salaryBudgetVnd;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(Long updatedBy) {
        this.updatedBy = updatedBy;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        HeadcountBudget that = (HeadcountBudget) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
