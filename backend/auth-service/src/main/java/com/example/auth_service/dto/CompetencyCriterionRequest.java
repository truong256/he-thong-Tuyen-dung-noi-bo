package com.example.auth_service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CompetencyCriterionRequest(
        Long id, // Can be null for new criterion, populated for update

        @NotBlank(message = "Mã tiêu chí không được để trống")
        @Size(max = 50, message = "Mã tiêu chí tối đa 50 ký tự")
        String criterionCode,

        @NotBlank(message = "Tên tiêu chí không được để trống")
        @Size(max = 150, message = "Tên tiêu chí tối đa 150 ký tự")
        String criterionName,

        String description,

        @NotNull(message = "Trọng số không được để trống")
        @Min(value = 1, message = "Trọng số phải lớn hơn 0")
        @Max(value = 100, message = "Trọng số tối đa 100")
        Integer weightPercent,

        Boolean active
) {}
