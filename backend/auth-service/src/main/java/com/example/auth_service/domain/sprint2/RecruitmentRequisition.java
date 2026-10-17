package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

/**
 * Sprint 2 & 3 Entity: RecruitmentRequisition (Yêu cầu tuyển dụng)
 * Quản lý vòng đời yêu cầu tuyển dụng từ bản nháp (DRAFT), chờ duyệt (PENDING_APPROVAL)
 * đến phê duyệt (APPROVED), mở tuyển (OPEN) và đóng tuyển (CLOSED).
 */
@Entity
@Table(name = "recruitment_requisitions")
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

    @Column(length = 30)
    private String recruitmentType; // NEW (Tuyển mới), REPLACEMENT (Tuyển thay thế)

    private Long salaryMin;

    private Long salaryMax;

    @Column(length = 10)
    private String currency = "VND";

    @Column(columnDefinition = "TEXT")
    private String salaryExplanation;

    private LocalDate neededDate;

    private LocalDate targetDate;

    @Column(columnDefinition = "TEXT")
    private String jobDescription;

    @Column(columnDefinition = "TEXT")
    private String candidateRequirements;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @Column(length = 255)
    private String workLocation;

    @Column(name = "work_location_id")
    private Long workLocationId;

    @Column(name = "employment_type_id")
    private Long employmentTypeId;

    @Column(length = 30)
    private String workingModel = "ONSITE"; // ONSITE, HYBRID, REMOTE

    @Column(length = 30)
    private String status = "DRAFT"; // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, OPEN, CLOSED, CANCELLED

    @Column(columnDefinition = "TEXT")
    private String reason; // REPLACEMENT, NEW_HEADCOUNT

    private Long proposedMinSalary;

    private Long proposedMaxSalary;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "rejection_reason_id")
    private Long rejectionReasonId;

    private Long createdByUserId;

    private Instant submittedAt;

    private Long approvedByUserId;

    private Instant approvedAt;

    @Column(name = "budget_overridden", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean budgetOverridden = false;

    @Column(name = "budget_override_reason", columnDefinition = "TEXT")
    private String budgetOverrideReason;

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();

    public RecruitmentRequisition() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.status = "DRAFT";
        this.currency = "VND";
        this.workingModel = "ONSITE";
        this.quantity = 1;
        this.budgetOverridden = false;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (currency == null) currency = "VND";
        if (status == null) status = "DRAFT";
        if (workingModel == null) workingModel = "ONSITE";
        if (neededDate == null && targetDate != null) neededDate = targetDate;
        if (targetDate == null && neededDate != null) targetDate = neededDate;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
        if (neededDate == null && targetDate != null) neededDate = targetDate;
        if (targetDate == null && neededDate != null) targetDate = neededDate;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRequisitionCode() {
        return requisitionCode;
    }

    public void setRequisitionCode(String requisitionCode) {
        this.requisitionCode = requisitionCode;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public Long getJobTitleId() {
        return jobTitleId;
    }

    public void setJobTitleId(Long jobTitleId) {
        this.jobTitleId = jobTitleId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getRecruitmentType() {
        return recruitmentType;
    }

    public void setRecruitmentType(String recruitmentType) {
        this.recruitmentType = recruitmentType;
    }

    public Long getSalaryMin() {
        return salaryMin;
    }

    public void setSalaryMin(Long salaryMin) {
        this.salaryMin = salaryMin;
    }

    public Long getSalaryMax() {
        return salaryMax;
    }

    public void setSalaryMax(Long salaryMax) {
        this.salaryMax = salaryMax;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getSalaryExplanation() {
        return salaryExplanation;
    }

    public void setSalaryExplanation(String salaryExplanation) {
        this.salaryExplanation = salaryExplanation;
    }

    public LocalDate getNeededDate() {
        return neededDate;
    }

    public void setNeededDate(LocalDate neededDate) {
        this.neededDate = neededDate;
    }

    public LocalDate getTargetDate() {
        return targetDate;
    }

    public void setTargetDate(LocalDate targetDate) {
        this.targetDate = targetDate;
    }

    public String getJobDescription() {
        return jobDescription;
    }

    public void setJobDescription(String jobDescription) {
        this.jobDescription = jobDescription;
    }

    public String getCandidateRequirements() {
        return candidateRequirements;
    }

    public void setCandidateRequirements(String candidateRequirements) {
        this.candidateRequirements = candidateRequirements;
    }

    public String getBenefits() {
        return benefits;
    }

    public void setBenefits(String benefits) {
        this.benefits = benefits;
    }

    public String getWorkLocation() {
        return workLocation;
    }

    public void setWorkLocation(String workLocation) {
        this.workLocation = workLocation;
    }

    public Long getWorkLocationId() {
        return workLocationId;
    }

    public void setWorkLocationId(Long workLocationId) {
        this.workLocationId = workLocationId;
    }

    public Long getEmploymentTypeId() {
        return employmentTypeId;
    }

    public void setEmploymentTypeId(Long employmentTypeId) {
        this.employmentTypeId = employmentTypeId;
    }

    public String getWorkingModel() {
        return workingModel;
    }

    public void setWorkingModel(String workingModel) {
        this.workingModel = workingModel;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Long getProposedMinSalary() {
        return proposedMinSalary;
    }

    public void setProposedMinSalary(Long proposedMinSalary) {
        this.proposedMinSalary = proposedMinSalary;
    }

    public Long getProposedMaxSalary() {
        return proposedMaxSalary;
    }

    public void setProposedMaxSalary(Long proposedMaxSalary) {
        this.proposedMaxSalary = proposedMaxSalary;
    }

    public String getRequirements() {
        return requirements;
    }

    public void setRequirements(String requirements) {
        this.requirements = requirements;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public Long getRejectionReasonId() {
        return rejectionReasonId;
    }

    public void setRejectionReasonId(Long rejectionReasonId) {
        this.rejectionReasonId = rejectionReasonId;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(Long createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Long getApprovedByUserId() {
        return approvedByUserId;
    }

    public void setApprovedByUserId(Long approvedByUserId) {
        this.approvedByUserId = approvedByUserId;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(Instant approvedAt) {
        this.approvedAt = approvedAt;
    }

    public boolean isBudgetOverridden() {
        return budgetOverridden;
    }

    public void setBudgetOverridden(boolean budgetOverridden) {
        this.budgetOverridden = budgetOverridden;
    }

    public String getBudgetOverrideReason() {
        return budgetOverrideReason;
    }

    public void setBudgetOverrideReason(String budgetOverrideReason) {
        this.budgetOverrideReason = budgetOverrideReason;
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
        RecruitmentRequisition that = (RecruitmentRequisition) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
