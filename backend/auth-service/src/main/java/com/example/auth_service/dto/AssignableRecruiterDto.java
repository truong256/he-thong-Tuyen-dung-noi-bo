package com.example.auth_service.dto;

public record AssignableRecruiterDto(
        Long id,
        String fullName,
        String email,
        String department,
        String username
) {}
