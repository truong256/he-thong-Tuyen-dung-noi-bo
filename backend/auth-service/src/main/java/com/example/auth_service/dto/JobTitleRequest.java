package com.example.auth_service.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record JobTitleRequest(
        @NotBlank(message = "Tên chức danh không được để trống")
        @Size(max = 150, message = "Tên chức danh tối đa 150 ký tự")
        String title,

        @NotBlank(message = "Mã chức danh không được để trống")
        @Size(max = 50, message = "Mã chức danh tối đa 50 ký tự")
        @Pattern(regexp = "[a-zA-Z0-9_-]+", message = "Mã chức danh chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới")
        String code,

        Long departmentId,
        String level,
        String jobFamily,
        @PositiveOrZero(message = "Lương tối thiểu không được âm")
        Long minSalary,
        @PositiveOrZero(message = "Lương tối đa không được âm")
        Long maxSalary,
        String jobDescription,
        List<String> keyResponsibilities,
        List<String> requirements,
        List<String> competencies,
        Integer standardHeadcount,
        Integer currentHeadcount,
        Boolean active
) {}
