package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.CompanyProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyProfileRepository extends JpaRepository<CompanyProfile, Long> {
}
