package com.example.auth_service.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRolesRequest {
    @NotEmpty(message = "Danh sách vai trò không được để trống")
    private Set<String> roles;
}
