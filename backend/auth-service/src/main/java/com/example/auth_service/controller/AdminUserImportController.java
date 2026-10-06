package com.example.auth_service.controller;

import com.example.auth_service.dto.excel.ExcelImportPreviewResponse;
import com.example.auth_service.dto.excel.ExcelImportResultResponse;
import com.example.auth_service.service.UserExcelImportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/users/import")
@PreAuthorize("hasAuthority('USER_MANAGE')")
public class AdminUserImportController {

    private final UserExcelImportService userExcelImportService;

    public AdminUserImportController(UserExcelImportService userExcelImportService) {
        this.userExcelImportService = userExcelImportService;
    }

    /**
     * Tải file Excel mẫu (.xlsx) chuẩn doanh nghiệp
     */
    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] templateBytes = userExcelImportService.generateTemplate();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Mau_nhap_nhan_su.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(templateBytes);
    }

    /**
     * Xem trước (Preview) dữ liệu và kiểm tra lỗi từng dòng từ file Excel
     */
    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExcelImportPreviewResponse> previewImport(@RequestParam("file") MultipartFile file) {
        ExcelImportPreviewResponse response = userExcelImportService.previewImport(file);
        return ResponseEntity.ok(response);
    }

    /**
     * Thực hiện Import nhân sự theo cơ chế Partial Success
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExcelImportResultResponse> executeImport(@RequestParam("file") MultipartFile file) {
        ExcelImportResultResponse response = userExcelImportService.executeImport(file);
        return ResponseEntity.ok(response);
    }
}
