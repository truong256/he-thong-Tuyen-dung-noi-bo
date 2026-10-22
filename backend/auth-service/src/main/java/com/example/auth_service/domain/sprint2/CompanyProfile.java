package com.example.auth_service.domain.sprint2;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Sprint 2 Foundation Entity: CompanyProfile (Hồ sơ công ty / Tổ chức)
 */
@Entity
@Table(name = "company_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String companyName;

    @Column(length = 100)
    private String shortName;

    @Column(length = 255)
    private String legalName;

    @Column(length = 50)
    private String taxCode;

    @Column(length = 255)
    private String businessLicense;

    @Column(length = 50)
    private String foundedDate;

    @Column(length = 150)
    private String industry;

    @Column(length = 100)
    private String companySize;

    @Column(length = 100)
    private String email;

    @Column(length = 50)
    private String phone;

    @Column(length = 150)
    private String website;

    @Column(length = 255)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String country;

    @Column(length = 255)
    private String logoUrl;

    @Column(length = 255)
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String mission;

    @Column(columnDefinition = "TEXT")
    private String vision;

    @Column(columnDefinition = "TEXT")
    private String coreValues;

    @Column(columnDefinition = "TEXT")
    private String legalRepresentative;

    @Column(columnDefinition = "TEXT")
    private String workPolicy;

    private Instant updatedAt = Instant.now();

    @Column(length = 100)
    private String updatedBy;
}
