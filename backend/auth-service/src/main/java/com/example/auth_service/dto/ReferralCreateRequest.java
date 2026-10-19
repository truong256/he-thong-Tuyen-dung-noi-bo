package com.example.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO: ReferralCreateRequest (S4-07 / SCRUM-184)
 * Biểu mẫu nhân sự nội bộ giới thiệu ứng viên cho một vị trí đang tuyển.
 *
 * Chú ý kỹ thuật: Tuyệt đối KHÔNG có trường referrerId ở đây!
 * Danh tính người giới thiệu bắt buộc được lấy từ phiên xác thực (JWT / UserPrincipal).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReferralCreateRequest {

    private Long jobPostingId;

    private Long requisitionId;

    @NotBlank(message = "Họ tên ứng viên không được để trống")
    @Size(max = 150, message = "Họ tên ứng viên không được vượt quá 150 ký tự")
    private String candidateName;

    @NotBlank(message = "Email ứng viên không được để trống")
    @Email(message = "Định dạng email ứng viên không hợp lệ")
    @Size(max = 100, message = "Email ứng viên không được vượt quá 100 ký tự")
    private String candidateEmail;

    @Size(max = 50, message = "Số điện thoại không được vượt quá 50 ký tự")
    private String candidatePhone;

    @Size(max = 500, message = "Đường dẫn CV không được vượt quá 500 ký tự")
    private String cvUrl;

    @Size(max = 100, message = "Mối quan hệ không được vượt quá 100 ký tự")
    private String relationship;

    @NotBlank(message = "Ghi chú giới thiệu không được để trống")
    @Size(max = 2000, message = "Ghi chú giới thiệu không được vượt quá 2000 ký tự")
    private String referralNotes;
}
