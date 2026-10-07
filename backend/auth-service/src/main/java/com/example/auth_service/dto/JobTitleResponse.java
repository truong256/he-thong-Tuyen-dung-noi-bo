package com.example.auth_service.dto;

import java.time.Instant;
import java.util.List;

public record JobTitleResponse(
        Long id,
        String title,
        String code,
        Long departmentId,
        String departmentName,
        String level,
        String jobFamily,
        Long minSalary,
        Long maxSalary,
        String salaryRangeDisplay,
        String jobDescription,
        List<String> keyResponsibilities,
        List<String> requirements,
        List<String> competencies,
        Integer standardHeadcount,
        Integer currentHeadcount,
        Integer openRequisitions,
        Boolean active,
        Instant createdAt,
        Instant updatedAt,
        Long competencyFrameworkId,
        String competencyFrameworkName
) {}
