package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Sprint 2 Foundation Entity: Department (Phòng ban / Đơn vị tổ chức)
 */
@Entity
@Table(name = "departments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(unique = true, length = 20)
    private String code;

    @Column(length = 255)
    private String description;

    private Long parentDepartmentId;

    private Long managerUserId;

    private boolean active = true;

    private Instant createdAt = Instant.now();
}
