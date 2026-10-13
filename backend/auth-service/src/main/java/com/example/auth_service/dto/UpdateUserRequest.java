package com.example.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @Email(message = "Email khôi phục không hợp lệ")
    private String recoveryEmail;

    @Pattern(regexp = "^(\\+?84|0)[35789]\\d{8}$", message = "Số điện thoại không đúng định dạng")
    private String phone;

    private String department;

    public UpdateUserRequest(String fullName, String email) {
        this.fullName = fullName;
        this.email = email;
    }

    public UpdateUserRequest(String fullName, String email, String phone) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
    }
}
