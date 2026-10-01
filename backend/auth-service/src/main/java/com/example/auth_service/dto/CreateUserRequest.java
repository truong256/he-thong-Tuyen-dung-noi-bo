package com.example.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    private String password;

    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    private String department;

    @NotEmpty(message = "Phải gán ít nhất 1 vai trò")
    private Set<String> roles;

    private String status = "ACTIVE";

    public CreateUserRequest(String email, String password, String fullName, Set<String> roles, String status) {
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.roles = roles;
        this.status = status;
    }
}
