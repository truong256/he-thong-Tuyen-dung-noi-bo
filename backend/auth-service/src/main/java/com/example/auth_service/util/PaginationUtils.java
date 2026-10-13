package com.example.auth_service.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

/**
 * Utility class for standardized, secure, and stable pagination across all services.
 * Features:
 * - Bounds sanitization (page >= 0, 1 <= size <= 100).
 * - Sort field whitelisting to prevent SQL injection / invalid property query errors.
 * - Mandatory secondary tie-breaker sorting by 'id' to ensure deterministic pagination.
 */
public final class PaginationUtils {

    public static final int DEFAULT_PAGE = 0;
    public static final int DEFAULT_PAGE_SIZE = 10;
    public static final int MAX_PAGE_SIZE = 100;
    public static final int MIN_PAGE_SIZE = 1;

    private PaginationUtils() {}

    public static int sanitizePage(Integer page) {
        if (page == null || page < 0) {
            return DEFAULT_PAGE;
        }
        return page;
    }

    public static int sanitizeSize(Integer size, int defaultSize) {
        if (size == null || size <= 0) {
            return defaultSize > 0 ? Math.min(defaultSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
        }
        return Math.clamp(size, MIN_PAGE_SIZE, MAX_PAGE_SIZE);
    }

    public static Sort createStableSort(
            String sortBy,
            String sortOrder,
            String defaultField,
            Sort.Direction defaultDirection,
            Set<String> allowedFields,
            String idField
    ) {
        String effectiveField = defaultField;
        if (sortBy != null && !sortBy.isBlank() && allowedFields != null && allowedFields.contains(sortBy.trim())) {
            effectiveField = sortBy.trim();
        }

        Sort.Direction direction = defaultDirection != null ? defaultDirection : Sort.Direction.DESC;
        if ("asc".equalsIgnoreCase(sortOrder)) {
            direction = Sort.Direction.ASC;
        } else if ("desc".equalsIgnoreCase(sortOrder)) {
            direction = Sort.Direction.DESC;
        }

        Sort primarySort = Sort.by(direction, effectiveField);

        String effectiveIdField = (idField != null && !idField.isBlank()) ? idField.trim() : "id";
        if (!effectiveField.equals(effectiveIdField)) {
            return primarySort.and(Sort.by(direction, effectiveIdField));
        }

        return primarySort;
    }

    public static Pageable createPageable(
            Integer page,
            Integer size,
            String sortBy,
            String sortOrder,
            String defaultField,
            Sort.Direction defaultDirection,
            Set<String> allowedFields
    ) {
        int safePage = sanitizePage(page);
        int safeSize = sanitizeSize(size, DEFAULT_PAGE_SIZE);
        Sort sort = createStableSort(sortBy, sortOrder, defaultField, defaultDirection, allowedFields, "id");
        return PageRequest.of(safePage, safeSize, sort);
    }

    public static Pageable createPageable(
            Integer page,
            Integer size,
            String sortBy,
            String sortOrder,
            String defaultField,
            Set<String> allowedFields
    ) {
        return createPageable(page, size, sortBy, sortOrder, defaultField, Sort.Direction.DESC, allowedFields);
    }

    public static Pageable createPageable(
            Integer page,
            Integer size,
            String defaultField,
            Sort.Direction defaultDirection
    ) {
        return createPageable(page, size, null, null, defaultField, defaultDirection, Set.of(defaultField));
    }
}
