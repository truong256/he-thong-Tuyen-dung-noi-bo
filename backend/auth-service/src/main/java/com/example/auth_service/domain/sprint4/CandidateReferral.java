package com.example.auth_service.domain.sprint4;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Entity: CandidateReferral (Giới thiệu ứng viên nội bộ) - Sprint 4 / S4-07 (SCRUM-184)
 * Cho phép nhân sự nội bộ giới thiệu người quen ứng tuyển cho vị trí đang mở,
 * tự động gắn nhãn nguồn "INTERNAL_REFERRAL", lưu danh tính người giới thiệu
 * và theo dõi trạng thái hồ sơ ở mức tổng quát.
 */
@Entity
@Table(name = "candidate_referrals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateReferral {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "candidate_application_id")
    private Long candidateApplicationId;

    @Column(name = "job_posting_id")
    private Long jobPostingId;

    @Column(name = "requisition_id")
    private Long requisitionId;

    @Column(name = "candidate_name", nullable = false, length = 150)
    private String candidateName;

    @Column(name = "candidate_email", nullable = false, length = 100)
    private String candidateEmail;

    @Column(name = "candidate_phone", length = 50)
    private String candidatePhone;

    @Column(name = "cv_url", length = 500)
    private String cvUrl;

    @Column(length = 100)
    private String relationship;

    @Column(name = "referral_notes", nullable = false, columnDefinition = "TEXT")
    private String referralNotes;

    @Column(name = "referrer_user_id", nullable = false)
    private Long referrerUserId;

    @Column(name = "referrer_name", nullable = false, length = 150)
    private String referrerName;

    @Column(name = "referrer_email", length = 100)
    private String referrerEmail;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String source = "INTERNAL_REFERRAL";

    /**
     * Trạng thái ở mức tổng quát:
     * SUBMITTED: Đã nộp / Tiếp nhận hồ sơ
     * SCREENING: Đang sàng lọc hồ sơ
     * INTERVIEW: Đang phỏng vấn
     * OFFER: Đã gửi đề xuất tuyển dụng
     * HIRED: Đã tuyển dụng thành công
     * REJECTED: Chưa phù hợp
     */
    @Builder.Default
    @Column(name = "general_status", nullable = false, length = 50)
    private String generalStatus = "SUBMITTED";

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (source == null) source = "INTERNAL_REFERRAL";
        if (generalStatus == null) generalStatus = "SUBMITTED";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
