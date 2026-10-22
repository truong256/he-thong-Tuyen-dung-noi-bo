package com.example.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommonCategoryRequest(
    @NotBlank(message = "Loại danh mục không được để trống")
    @Size(max = 50, message = "Loại danh mục tối đa 50 ký tự")
    String type,

    @NotBlank(message = "Mã danh mục không được để trống")
    @Size(max = 100, message = "Mã danh mục tối đa 100 ký tự")
    String code,

    @NotBlank(message = "Tên danh mục không được để trống")
    @Size(max = 150, message = "Tên danh mục tối đa 150 ký tự")
    String name,

    Integer sortOrder,

    Boolean active
) {
    public CommonCategoryRequest {
        if (sortOrder == null) {
            sortOrder = 0;
        }
        if (active == null) {
            active = true;
        }
    }
}
