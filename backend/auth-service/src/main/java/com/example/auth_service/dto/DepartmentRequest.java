package com.example.auth_service.dto;

import jakarta.validation.constraints.*;

public record DepartmentRequest(
        @NotBlank(message = "Tên phòng ban không được để trống")
        @Size(max = 100, message = "Tên phòng ban tối đa 100 ký tự") String name,
        @NotBlank(message = "Mã phòng ban không được để trống")
        @Size(max = 20, message = "Mã phòng ban tối đa 20 ký tự")
        @Pattern(regexp = "[a-zA-Z0-9_-]+", message = "Mã phòng ban chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới") String code,
        @Size(max = 255, message = "Mô tả tối đa 255 ký tự") String description,
        @Positive(message = "ID phòng ban cha phải là số dương") Long parentDepartmentId,
        @NotNull(message = "Phòng ban phải có người phụ trách")
        @Positive(message = "ID người phụ trách phải là số dương") Long managerUserId) {}
