package com.example.auth_service.controller;

import com.example.auth_service.dto.excel.ExcelImportPreviewResponse;
import com.example.auth_service.dto.excel.ExcelImportResultResponse;
import com.example.auth_service.dto.excel.ExcelImportRowData;
import com.example.auth_service.dto.excel.ExcelImportRowPreview;
import com.example.auth_service.dto.excel.ExcelImportSuccessRow;
import com.example.auth_service.exception.GlobalExceptionHandler;
import com.example.auth_service.service.UserExcelImportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AdminUserImportControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserExcelImportService importService;

    @InjectMocks
    private AdminUserImportController controller;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/admin/users/import/template trả về file excel mẫu và header content-disposition")
    void testDownloadTemplate() throws Exception {
        byte[] dummyBytes = new byte[]{1, 2, 3, 4};
        when(importService.generateTemplate()).thenReturn(dummyBytes);

        mockMvc.perform(get("/api/admin/users/import/template"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Mau_nhap_nhan_su.xlsx\""))
                .andExpect(content().contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(content().bytes(dummyBytes));
    }

    @Test
    @DisplayName("POST /api/admin/users/import/preview trả về cấu trúc preview đầy đủ")
    void testPreviewImport() throws Exception {
        ExcelImportRowPreview row1 = ExcelImportRowPreview.builder()
                .rowNumber(2)
                .data(ExcelImportRowData.builder().fullName("An").email("an@test.com").role("INTERVIEWER").build())
                .valid(true)
                .errors(List.of())
                .build();

        ExcelImportPreviewResponse previewResponse = ExcelImportPreviewResponse.builder()
                .totalRows(1)
                .validCount(1)
                .invalidCount(0)
                .rows(List.of(row1))
                .build();

        when(importService.previewImport(any())).thenReturn(previewResponse);

        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", new byte[]{1, 2});

        mockMvc.perform(multipart("/api/admin/users/import/preview").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRows").value(1))
                .andExpect(jsonPath("$.validCount").value(1))
                .andExpect(jsonPath("$.invalidCount").value(0))
                .andExpect(jsonPath("$.rows[0].data.email").value("an@test.com"));
    }

    @Test
    @DisplayName("POST /api/admin/users/import trả về kết quả import thành công và thất bại")
    void testExecuteImport() throws Exception {
        ExcelImportSuccessRow success = ExcelImportSuccessRow.builder()
                .rowNumber(2)
                .userId(50L)
                .email("an@test.com")
                .fullName("An")
                .role("INTERVIEWER")
                .emailStatus("ACCOUNT_CREATED_EMAIL_SENT")
                .build();

        ExcelImportResultResponse resultResponse = ExcelImportResultResponse.builder()
                .totalRows(1)
                .successCount(1)
                .failedCount(0)
                .successRows(List.of(success))
                .failedRows(List.of())
                .build();

        when(importService.executeImport(any())).thenReturn(resultResponse);

        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", new byte[]{1, 2});

        mockMvc.perform(multipart("/api/admin/users/import").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRows").value(1))
                .andExpect(jsonPath("$.successCount").value(1))
                .andExpect(jsonPath("$.failedCount").value(0))
                .andExpect(jsonPath("$.successRows[0].emailStatus").value("ACCOUNT_CREATED_EMAIL_SENT"));
    }
}
