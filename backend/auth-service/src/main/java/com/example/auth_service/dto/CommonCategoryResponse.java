package com.example.auth_service.dto;

import com.example.auth_service.domain.sprint2.CommonCategory;

public record CommonCategoryResponse(
    Long id,
    String type,
    String code,
    String name,
    int sortOrder,
    boolean active
) {
    public static CommonCategoryResponse fromEntity(CommonCategory category) {
        return new CommonCategoryResponse(
            category.getId(),
            category.getType(),
            category.getCode(),
            category.getName(),
            category.getSortOrder(),
            category.isActive()
        );
    }
}
