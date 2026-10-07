package com.example.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(max = 150, message = "Họ và tên tối đa 150 ký tự")
    private String fullName;

    @Pattern(regexp = "^(0|\\+84)[35789]\\d{8}$", message = "Số điện thoại không đúng định dạng")
    private String phone;

    @Size(max = 150, message = "Chức danh hiển thị tối đa 150 ký tự")
    private String displayName;

    @Size(max = 100, message = "Phòng ban tối đa 100 ký tự")
    private String department;

    @Email(message = "Email khôi phục không đúng định dạng")
    private String recoveryEmail;
}
