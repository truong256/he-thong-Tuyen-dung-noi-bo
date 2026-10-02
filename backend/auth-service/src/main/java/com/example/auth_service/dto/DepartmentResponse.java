package com.example.auth_service.dto;

import com.example.auth_service.domain.sprint2.Department;
import java.time.Instant;

public record DepartmentResponse(Long id, String name, String code, String description,
        Long parentDepartmentId, Long managerUserId, boolean active, Instant createdAt) {
    public static DepartmentResponse from(Department department) {
        return new DepartmentResponse(department.getId(), department.getName(), department.getCode(),
                department.getDescription(), department.getParentDepartmentId(), department.getManagerUserId(),
                department.isActive(), department.getCreatedAt());
    }
}
