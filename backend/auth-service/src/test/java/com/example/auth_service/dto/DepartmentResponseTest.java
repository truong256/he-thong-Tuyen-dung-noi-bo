package com.example.auth_service.dto;

import com.example.auth_service.domain.sprint2.Department;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;

class DepartmentResponseTest {
    private Department department() {
        return new Department(7L, "Kỹ thuật", "ENG", "Mô tả", 2L, 9L, true, Instant.parse("2026-01-01T00:00:00Z"));
    }

    @Test void minimalMappingPreservesHierarchyWithoutInventingManagerOrCounts() {
        var response = DepartmentResponse.from(department());
        assertThat(response.id()).isEqualTo(7L);
        assertThat(response.name()).isEqualTo("Kỹ thuật");
        assertThat(response.code()).isEqualTo("ENG");
        assertThat(response.description()).isEqualTo("Mô tả");
        assertThat(response.parentDepartmentId()).isEqualTo(2L);
        assertThat(response.managerUserId()).isEqualTo(9L);
        assertThat(response.managerName()).isNull();
        assertThat(response.managerEmail()).isNull();
        assertThat(response.employeeCount()).isZero();
        assertThat(response.openRequisitionsCount()).isZero();
        assertThat(response.active()).isTrue();
        assertThat(response.createdAt()).isEqualTo(department().getCreatedAt());
    }

    @Test void nullableAggregatesAreZeroAndExplicitCountsArePreserved() {
        var empty = DepartmentResponse.from(department(), "Trưởng phòng", "manager@example.invalid", null, null);
        assertThat(empty.employeeCount()).isZero();
        assertThat(empty.openRequisitionsCount()).isZero();
        var populated = DepartmentResponse.from(department(), "Trưởng phòng", "manager@example.invalid", 12L, 3L);
        assertThat(populated.employeeCount()).isEqualTo(12L);
        assertThat(populated.openRequisitionsCount()).isEqualTo(3L);
        assertThat(populated.managerName()).isEqualTo("Trưởng phòng");
        assertThat(populated.managerEmail()).isEqualTo("manager@example.invalid");
        assertThat(DepartmentResponse.from(department(), "Trưởng phòng", "manager@example.invalid", 12L)
                .openRequisitionsCount()).isZero();
    }

    @Test void legacyConstructorDefaultsOpenRequisitionsToZero() {
        var response = new DepartmentResponse(7L, "Kỹ thuật", "ENG", null, null, 9L, null, null, 0L, true, Instant.now());
        assertThat(response.openRequisitionsCount()).isZero();
    }
}
