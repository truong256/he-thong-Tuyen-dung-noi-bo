package com.example.auth_service.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class PaginationUtilsTest {

    private static final Set<String> ALLOWED_FIELDS = Set.of("id", "createdAt", "fullName", "email");

    @Test
    @DisplayName("TC-BE-01: Page âm (-1) được tự động điều chỉnh về 0")
    void testNegativePageSanitizedToZero() {
        Pageable pageable = PaginationUtils.createPageable(-1, 10, "createdAt", "desc", "createdAt", ALLOWED_FIELDS);
        assertEquals(0, pageable.getPageNumber());
        assertEquals(10, pageable.getPageSize());
    }

    @Test
    @DisplayName("TC-BE-02: Size <= 0 được tự động điều chỉnh về mặc định 10")
    void testZeroOrNegativeSizeSanitizedToDefault() {
        Pageable pageableZero = PaginationUtils.createPageable(0, 0, "createdAt", "desc", "createdAt", ALLOWED_FIELDS);
        assertEquals(10, pageableZero.getPageSize());

        Pageable pageableNegative = PaginationUtils.createPageable(0, -5, "createdAt", "desc", "createdAt", ALLOWED_FIELDS);
        assertEquals(10, pageableNegative.getPageSize());
    }

    @Test
    @DisplayName("TC-BE-03: Size vượt quá 100 được tự động giới hạn tối đa 100")
    void testSizeGreaterThanMaxCappedAt100() {
        Pageable pageable = PaginationUtils.createPageable(0, 500, "createdAt", "desc", "createdAt", ALLOWED_FIELDS);
        assertEquals(100, pageable.getPageSize());
    }

    @Test
    @DisplayName("TC-BE-04: Sắp xếp tăng dần (ASC) và giảm dần (DESC)")
    void testSortingDirections() {
        Pageable pageableAsc = PaginationUtils.createPageable(0, 10, "fullName", "asc", "createdAt", ALLOWED_FIELDS);
        Sort.Order orderAsc = pageableAsc.getSort().getOrderFor("fullName");
        assertNotNull(orderAsc);
        assertTrue(orderAsc.isAscending());

        Pageable pageableDesc = PaginationUtils.createPageable(0, 10, "fullName", "desc", "createdAt", ALLOWED_FIELDS);
        Sort.Order orderDesc = pageableDesc.getSort().getOrderFor("fullName");
        assertNotNull(orderDesc);
        assertTrue(orderDesc.isDescending());
    }

    @Test
    @DisplayName("TC-BE-05: Sort field không hợp lệ (SQL injection hoặc field lạ) fallback về defaultSort")
    void testInvalidSortFieldFallsBackToDefault() {
        Pageable pageable = PaginationUtils.createPageable(0, 10, "malicious_column; DROP TABLE users;", "asc", "createdAt", ALLOWED_FIELDS);
        assertNull(pageable.getSort().getOrderFor("malicious_column; DROP TABLE users;"));
        assertNotNull(pageable.getSort().getOrderFor("createdAt"));
    }

    @Test
    @DisplayName("TC-BE-06: Khóa sắp xếp phụ 'id' luôn được bổ sung để đảm bảo thứ tự phân trang ổn định")
    void testSecondarySortKeyIdAlwaysAppended() {
        Pageable pageable = PaginationUtils.createPageable(0, 10, "fullName", "asc", "createdAt", ALLOWED_FIELDS);
        assertNotNull(pageable.getSort().getOrderFor("fullName"));
        assertNotNull(pageable.getSort().getOrderFor("id"));
    }
}
