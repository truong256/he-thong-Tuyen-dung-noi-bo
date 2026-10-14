package com.example.auth_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CompetencyFrameworkRequest(
        @NotBlank(message = "Tên khung năng lực không được để trống")
        @Size(max = 100, message = "Tên khung năng lực không được vượt quá 100 ký tự")
        String competencyName,

        String description,

        @Size(max = 50, message = "Danh mục không được vượt quá 50 ký tự")
        String category,

        @NotEmpty(message = "Khung năng lực phải có ít nhất một tiêu chí")
        List<@Valid CompetencyCriterionRequest> criteria,

        List<Long> jobTitleIds
) {}
