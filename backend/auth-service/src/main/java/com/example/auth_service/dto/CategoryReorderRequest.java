package com.example.auth_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryReorderRequest(
    @NotEmpty(message = "Danh sách sắp xếp không được để trống")
    @Valid
    List<CategoryReorderItem> items
) {
    public record CategoryReorderItem(
        @NotNull(message = "ID danh mục không được để trống")
        Long id,

        @NotNull(message = "Thứ tự sắp xếp không được để trống")
        Integer sortOrder
    ) {}
}
