package com.example.auth_service.dto;

import java.util.List;

public record CompetencyFrameworkResponse(
        Long id,
        String competencyName,
        String description,
        String category,
        Integer weightPercent,
        List<CompetencyCriterionResponse> criteria
) {}
