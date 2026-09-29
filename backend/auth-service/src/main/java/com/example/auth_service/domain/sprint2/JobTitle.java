package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Sprint 2 Foundation Entity: JobTitle (Chức danh / Vị trí công việc)
 */
@Entity
@Table(name = "job_titles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobTitle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String title;

    @Column(length = 20)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String jobDescription;

    private boolean active = true;

    private Instant createdAt = Instant.now();
}
