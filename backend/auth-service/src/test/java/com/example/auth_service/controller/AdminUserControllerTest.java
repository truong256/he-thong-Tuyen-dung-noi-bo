package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.exception.GlobalExceptionHandler;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.service.AdminUserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminUserControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AdminUserService adminUserService;

    @InjectMocks
    private AdminUserController adminUserController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminUserController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Admin API: GET /api/admin/users trả về danh sách phân trang")
    void testListUsers() throws Exception {
        UserSummaryDto user1 = new UserSummaryDto(1L, "admin@company.com", "Admin User", null, null, Set.of("ADMIN"), "ACTIVE");
        UserSummaryDto user2 = new UserSummaryDto(2L, "recruiter@company.com", "Recruiter User", null, null, Set.of("RECRUITER"), "ACTIVE");

        when(adminUserService.listUsers(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(user1, user2), PageRequest.of(0, 20), 2));

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].email").value("admin@company.com"))
                .andExpect(jsonPath("$.content[1].email").value("recruiter@company.com"));
    }

    @Test
    @DisplayName("Admin API: POST /api/admin/users tạo người dùng mới thành công")
    void testCreateUser() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("new_hr@company.com");
        request.setFullName("Nguyễn Thị HR");
        request.setRoles(Set.of("HR_MANAGER"));
        request.setStatus("ACTIVE");
        // Note: password is NOT set - server generates it server-side (S1-08 hardening)
        UserSummaryDto response = new UserSummaryDto(3L, "new_hr@company.com", "Nguyễn Thị HR", null, null, Set.of("HR_MANAGER"), "ACTIVE");

        when(adminUserService.createUser(any(CreateUserRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("new_hr@company.com"))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Thị HR"));
    }

    @Test
    @DisplayName("Admin API: GET /api/admin/users/{id} không tìm thấy trả về 404")
    void testGetUserNotFound() throws Exception {
        when(adminUserService.getUserById(eq(999L)))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy người dùng với ID: 999"));

        mockMvc.perform(get("/api/admin/users/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
