package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO: ReferralActivePositionResponse (S4-07 / SCRUM-184)
 * Danh sách vị trí đang tuyển để nhân viên nội bộ lựa chọn giới thiệu ứng viên.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReferralActivePositionResponse {

    private Long jobPostingId;
    private Long requisitionId;
    private String jobCode;
    private String requisitionCode;
    private String title;
    private Long departmentId;
    private String departmentName;
    private String workLocation;
    private String workingModel;
    private LocalDate applicationDeadline;
    private int quantity;
}
