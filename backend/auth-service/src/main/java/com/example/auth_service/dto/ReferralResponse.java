package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * DTO: ReferralResponse (S4-07 / SCRUM-184)
 * Trả dữ liệu hồ sơ giới thiệu cho người giới thiệu và nhà tuyển dụng.
 * Người giới thiệu theo dõi trạng thái ở mức tổng quát (generalStatus, generalStatusLabel).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReferralResponse {

    private Long id;
    private Long candidateApplicationId;
    private Long jobPostingId;
    private String jobPostingCode;
    private String jobTitle;
    private Long departmentId;
    private String departmentName;
    private Long requisitionId;
    private String requisitionCode;

    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String cvUrl;
    private String relationship;
    private String referralNotes;

    private Long referrerUserId;
    private String referrerName;
    private String referrerEmail;
    private String source;

    /** Trạng thái tổng quát: SUBMITTED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED */
    private String generalStatus;
    private String generalStatusLabel;

    private Instant createdAt;
    private Instant updatedAt;
}
