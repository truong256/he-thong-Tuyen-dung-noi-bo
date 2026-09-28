package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sprint 2 Foundation Entity: CommonCategory (Danh mục dùng chung)
 */
@Entity
@Table(name = "common_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommonCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String type; // e.g. EMPLOYMENT_TYPE, WORK_LOCATION, EDUCATION_LEVEL

    @Column(nullable = false, length = 100)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    private int sortOrder = 0;

    private boolean active = true;
}
