package com.example.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConfirmCandidateInfoRequest(
    @NotBlank(message = "Họ tên ứng viên không được để trống")
    @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự")
    String fullName,

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    @Size(max = 100, message = "Email không được vượt quá 100 ký tự")
    String email,

    @Size(max = 50, message = "Số điện thoại không được vượt quá 50 ký tự")
    String phone,

    String stage
) {}
