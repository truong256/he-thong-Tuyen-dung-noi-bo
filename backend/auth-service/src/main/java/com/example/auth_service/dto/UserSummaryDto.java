package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {
    private Long id;
    private String email;
    private String fullName;
    private String department;
    private String role;
    private Set<String> roles = new HashSet<>();
    private String status;
    private String lockReason;
    private String lockNote;
    private Instant lockedAt;
    private String lockedBy;
    private List<String> handoverWarnings = new ArrayList<>();

    public UserSummaryDto(Long id, String email, String role) {
        this.id = id;
        this.email = email;
        this.role = role;
        if (role != null) {
            this.roles.add(role);
        }
    }

    public UserSummaryDto(Long id, String email, String fullName, Set<String> roles, String status) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.roles = roles != null ? roles : new HashSet<>();
        this.role = !this.roles.isEmpty() ? this.roles.iterator().next() : "RECRUITER";
        this.status = status;
    }

    public UserSummaryDto(Long id, String email, String fullName, String department, Set<String> roles, String status) {
        this(id, email, fullName, roles, status);
        this.department = department;
    }
}
