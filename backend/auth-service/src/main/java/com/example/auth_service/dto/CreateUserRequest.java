package com.example.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
public class CreateUserRequest {
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @Email(message = "Email khôi phục không hợp lệ")
    private String recoveryEmail;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^(\\+?84|0)[35789]\\d{8}$", message = "Số điện thoại không đúng định dạng")
    private String phone;

    /**
     * @deprecated Password cannot be specified by the client. The system strictly generates
     * a secure 12-character temporary password server-side and dispatches it via activation email.
     * Any value supplied in this field will be completely ignored.
     */
    @Deprecated
    private String password;

    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    private String department;

    @NotEmpty(message = "Phải gán ít nhất 1 vai trò")
    private Set<String> roles;

    private String status = "ACTIVE";

    public CreateUserRequest(String email, String fullName, String department, Set<String> roles, String status) {
        this.email = email;
        this.fullName = fullName;
        this.department = department;
        this.roles = roles;
        this.status = status;
    }

    public CreateUserRequest(String email, String fullName, Set<String> roles, String status) {
        this(email, fullName, null, roles, status);
    }

    public CreateUserRequest(String email, String fullName, String phone, String department, Set<String> roles, String status) {
        this.email = email;
        this.fullName = fullName;
        this.phone = phone;
        this.department = department;
        this.roles = roles;
        this.status = status;
    }

    // NOTE: @Deprecated password field is set via setter only. No constructor accepts it to prevent accidental use.
}
