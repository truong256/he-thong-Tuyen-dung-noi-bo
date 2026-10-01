package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.SalaryRange;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalaryRangeRepository extends JpaRepository<SalaryRange, Long> {}
