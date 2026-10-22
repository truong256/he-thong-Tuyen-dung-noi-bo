package com.example.auth_service.dto;

import com.example.auth_service.domain.sprint2.Department;
import java.time.Instant;

public record DepartmentResponse(
        Long id,
        String name,
        String code,
        String description,
        Long parentDepartmentId,
        Long managerUserId,
        String managerName,
        String managerEmail,
        Long employeeCount,
        boolean active,
        Instant createdAt,
        Long openRequisitionsCount) {

    public DepartmentResponse(
            Long id,
            String name,
            String code,
            String description,
            Long parentDepartmentId,
            Long managerUserId,
            String managerName,
            String managerEmail,
            Long employeeCount,
            boolean active,
            Instant createdAt) {
        this(id, name, code, description, parentDepartmentId, managerUserId, managerName, managerEmail, employeeCount, active, createdAt, 0L);
    }

    public static DepartmentResponse from(Department department) {
        return new DepartmentResponse(department.getId(), department.getName(), department.getCode(),
                department.getDescription(), department.getParentDepartmentId(), department.getManagerUserId(),
                null, null, 0L, department.isActive(), department.getCreatedAt(), 0L);
    }

    public static DepartmentResponse from(Department department, String managerName, String managerEmail, Long employeeCount) {
        return from(department, managerName, managerEmail, employeeCount, 0L);
    }

    public static DepartmentResponse from(Department department, String managerName, String managerEmail, Long employeeCount, Long openRequisitionsCount) {
        return new DepartmentResponse(department.getId(), department.getName(), department.getCode(),
                department.getDescription(), department.getParentDepartmentId(), department.getManagerUserId(),
                managerName, managerEmail, employeeCount != null ? employeeCount : 0L, department.isActive(), department.getCreatedAt(),
                openRequisitionsCount != null ? openRequisitionsCount : 0L);
    }
}
