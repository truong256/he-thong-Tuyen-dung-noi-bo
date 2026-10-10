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

    @Mock
    private com.example.auth_service.service.ExcelImportService excelImportService;

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

    @Test
    @DisplayName("Admin API: GET /api/admin/users/import-template tải về tệp Excel mẫu")
    void testDownloadTemplate() throws Exception {
        byte[] dummyBytes = new byte[]{1, 2, 3};
        when(excelImportService.generateTemplate()).thenReturn(dummyBytes);

        mockMvc.perform(get("/api/admin/users/import-template"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string(
                        org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"Mau_nhap_nhan_su.xlsx\""
                ));
    }

    @Test
    @DisplayName("Admin API: POST /api/admin/users/import-preview xem trước dữ liệu thành công")
    void testPreviewImport() throws Exception {
        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[]{1, 2}
        );

        ExcelImportPreviewResponse previewResponse = ExcelImportPreviewResponse.builder()
                .totalRows(2)
                .validRows(2)
                .invalidRows(0)
                .rows(List.of(
                        ExcelImportRowDto.builder().rowNumber(2).email("user1@company.com").fullName("User 1").valid(true).build(),
                        ExcelImportRowDto.builder().rowNumber(3).email("user2@company.com").fullName("User 2").valid(true).build()
                ))
                .build();

        when(excelImportService.previewExcel(any())).thenReturn(previewResponse);

        mockMvc.perform(multipart("/api/admin/users/import-preview").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRows").value(2))
                .andExpect(jsonPath("$.validRows").value(2))
                .andExpect(jsonPath("$.rows[0].email").value("user1@company.com"));
    }

    @Test
    @DisplayName("Admin API: POST /api/admin/users/import-file thực hiện import và trả báo cáo tổng kết")
    void testImportExcel() throws Exception {
        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[]{1, 2}
        );

        ExcelImportSummaryResponse summaryResponse = ExcelImportSummaryResponse.builder()
                .totalRows(3)
                .successCount(2)
                .failedCount(1)
                .success(2)
                .skipped(1)
                .message("Nhập thành công 2/3 nhân sự. Bỏ qua 1 dòng không hợp lệ.")
                .build();

        when(excelImportService.importExcel(any())).thenReturn(summaryResponse);

        mockMvc.perform(multipart("/api/admin/users/import-file").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRows").value(3))
                .andExpect(jsonPath("$.successCount").value(2))
                .andExpect(jsonPath("$.failedCount").value(1));
    }

    @Test
    @DisplayName("Admin API: POST /api/admin/users/import-rows thực hiện import qua JSON")
    void testImportRows() throws Exception {
        List<ExcelImportRowDto> rows = List.of(
                ExcelImportRowDto.builder().rowNumber(2).email("u1@comp.com").fullName("User 1").valid(true).build()
        );

        ExcelImportSummaryResponse summaryResponse = ExcelImportSummaryResponse.builder()
                .totalRows(1)
                .successCount(1)
                .failedCount(0)
                .message("Nhập thành công 1/1 nhân sự.")
                .build();

        when(excelImportService.importRows(any())).thenReturn(summaryResponse);

        mockMvc.perform(post("/api/admin/users/import-rows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rows)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.successCount").value(1));
    }
}
