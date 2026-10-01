package com.example.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
public class CreateUserRequest {
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

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

    // NOTE: @Deprecated password field is set via setter only. No constructor accepts it to prevent accidental use.
}
