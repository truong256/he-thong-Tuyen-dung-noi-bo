package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Sprint 2 Foundation Entity: SalaryRange (Khung lương theo VND)
 */
@Entity
@Table(name = "salary_ranges")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SalaryRange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private BigDecimal minSalary;

    @Column(nullable = false)
    private BigDecimal maxSalary;

    @Column(length = 10)
    private String currency = "VND";

    private boolean active = true;
}
