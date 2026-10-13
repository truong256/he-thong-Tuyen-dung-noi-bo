package com.example.auth_service.controller;

import com.example.auth_service.dto.DepartmentResponse;
import com.example.auth_service.dto.JobTitleResponse;
import com.example.auth_service.dto.UserSummaryDto;
import com.example.auth_service.service.AdminUserService;
import com.example.auth_service.service.DepartmentService;
import com.example.auth_service.service.JobTitleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class PaginationControllerIntegrationTest {

    private MockMvc departmentMockMvc;
    private MockMvc jobTitleMockMvc;
    private MockMvc adminUserMockMvc;

    @Mock
    private DepartmentService departmentService;

    @InjectMocks
    private DepartmentController departmentController;

    @Mock
    private JobTitleService jobTitleService;

    @InjectMocks
    private JobTitleController jobTitleController;

    @Mock
    private AdminUserService adminUserService;

    @InjectMocks
    private AdminUserController adminUserController;

    @BeforeEach
    void setUp() {
        departmentMockMvc = MockMvcBuilders.standaloneSetup(departmentController).build();
        jobTitleMockMvc = MockMvcBuilders.standaloneSetup(jobTitleController).build();
        adminUserMockMvc = MockMvcBuilders.standaloneSetup(adminUserController).build();
    }

    @Test
    @DisplayName("Department: Có tham số page -> trả về Page JSON có content, totalElements, totalPages")
    void testDepartmentPagedResponse() throws Exception {
        DepartmentResponse dept = new DepartmentResponse(
                1L, "Phòng Kỹ Thuật", "TECH", "Mô tả", null, null, null, null, 10L, true, null, 0L
        );

        Page<DepartmentResponse> pageResult = new PageImpl<>(List.of(dept), PageRequest.of(0, 10), 15);

        when(departmentService.listPaged(any(), any(), any(Pageable.class)))
                .thenReturn(pageResult);

        departmentMockMvc.perform(get("/api/departments")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sortBy", "name")
                        .param("sortOrder", "asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Phòng Kỹ Thuật"))
                .andExpect(jsonPath("$.totalElements").value(15))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    @DisplayName("Department: Không có tham số page -> trả về List JSON thuần túy để không vỡ dropdown")
    void testDepartmentUnpagedDropdownResponse() throws Exception {
        DepartmentResponse dept1 = new DepartmentResponse(
                1L, "Phòng Kỹ Thuật", "TECH", "Mô tả", null, null, null, null, 10L, true, null, 0L
        );
        DepartmentResponse dept2 = new DepartmentResponse(
                2L, "Phòng Nhân Sự", "HR", "Mô tả", null, null, null, null, 5L, true, null, 0L
        );

        when(departmentService.list(any()))
                .thenReturn(List.of(dept1, dept2));

        departmentMockMvc.perform(get("/api/departments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Phòng Kỹ Thuật"))
                .andExpect(jsonPath("$[1].name").value("Phòng Nhân Sự"));
    }

    @Test
    @DisplayName("JobTitle: Có tham số page -> trả về Page JSON")
    void testJobTitlePagedResponse() throws Exception {
        JobTitleResponse jt = new JobTitleResponse(
                10L, "Senior Backend Developer", "BE-SR", 1L, "IT", "SENIOR", "TECH",
                30000000L, 50000000L, "30M - 50M", null, null, null, null,
                5, 2, 0, true, null, null
        );

        Page<JobTitleResponse> pageResult = new PageImpl<>(List.of(jt), PageRequest.of(0, 10), 25);

        when(jobTitleService.listPaged(any(), any(), any(), any(), any(), any(Pageable.class), anyBoolean()))
                .thenReturn(pageResult);

        jobTitleMockMvc.perform(get("/api/job-titles")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].title").value("Senior Backend Developer"))
                .andExpect(jsonPath("$.totalElements").value(25))
                .andExpect(jsonPath("$.totalPages").value(3));
    }

    @Test
    @DisplayName("JobTitle: Không có tham số page -> trả về List JSON thuần túy cho dropdown và tree view")
    void testJobTitleUnpagedDropdownResponse() throws Exception {
        JobTitleResponse jt = new JobTitleResponse(
                10L, "Senior Backend Developer", "BE-SR", 1L, "IT", "SENIOR", "TECH",
                30000000L, 50000000L, "30M - 50M", null, null, null, null,
                5, 2, 0, true, null, null
        );

        when(jobTitleService.list(any(), any(), any(), any(), any(), any(), any(), anyBoolean()))
                .thenReturn(List.of(jt));

        jobTitleMockMvc.perform(get("/api/job-titles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Senior Backend Developer"));
    }

    @Test
    @DisplayName("Admin Users: Sanitize page âm và size vượt ngưỡng thành công")
    void testAdminUsersSanitization() throws Exception {
        UserSummaryDto user = new UserSummaryDto(1L, "admin@company.com", "Admin User", null, null, Set.of("ADMIN"), "ACTIVE");
        Page<UserSummaryDto> pageResult = new PageImpl<>(List.of(user), PageRequest.of(0, 10), 1);

        when(adminUserService.listUsers(any(), any(), any(), any(Pageable.class)))
                .thenReturn(pageResult);

        // Truyền page=-2, size=999
        adminUserMockMvc.perform(get("/api/admin/users")
                        .param("page", "-2")
                        .param("size", "999")
                        .param("sortBy", "invalid_col")
                        .param("sortOrder", "desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(1));
    }
}
