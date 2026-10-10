package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.service.AdminUserService;
import com.example.auth_service.service.ExcelImportService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin user management controller.
 *
 * Access control strategy (S1-05, S1-08, S1-09, S1-10):
 * - READ operations: ADMIN (full) + HR_MANAGER (read-only per backlog "R" on Users & Logs)
 * - WRITE operations: ADMIN only (USER_MANAGE, ROLE_MANAGE)
 * - Class-level guard removed so each endpoint can declare its own permission.
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final ExcelImportService excelImportService;

    public AdminUserController(AdminUserService adminUserService, ExcelImportService excelImportService) {
        this.adminUserService = adminUserService;
        this.excelImportService = excelImportService;
    }

    @GetMapping({"/import-template", "/template"})
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] excelBytes = excelImportService.generateTemplate();
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Mau_nhap_nhan_su.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @PostMapping(value = "/import-preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExcelImportPreviewResponse> previewImport(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        ExcelImportPreviewResponse preview = excelImportService.previewExcel(file);
        return ResponseEntity.ok(preview);
    }

    @PostMapping(value = "/import-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExcelImportSummaryResponse> importExcel(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        ExcelImportSummaryResponse response = excelImportService.importExcel(file);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = {"/import-rows", "/import"}, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ExcelImportSummaryResponse> importRows(@RequestBody java.util.List<ExcelImportRowDto> rows) {
        ExcelImportSummaryResponse response = excelImportService.importRows(rows);
        return ResponseEntity.ok(response);
    }

    /** S1-08 / Backlog "Người dùng & nhật ký": HR_MANAGER có R, ADMIN có F */
    @GetMapping
    @PreAuthorize("hasAuthority('USER_READ')")
    public ResponseEntity<Page<UserSummaryDto>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserSummaryDto> users = adminUserService.listUsers(search, status, role, pageable);
        return ResponseEntity.ok(users);
    }

    /** HR_MANAGER can view individual user detail (R access) */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_READ')")
    public ResponseEntity<UserSummaryDto> getUserById(@PathVariable Long id) {
        UserSummaryDto user = adminUserService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    /** S1-08: Create user – ADMIN only */
    @PostMapping
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<UserSummaryDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserSummaryDto created = adminUserService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** S1-08: Update user profile fields – ADMIN only */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<UserSummaryDto> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        UserSummaryDto updated = adminUserService.updateUser(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * S1-10: Lock/unlock/deactivate account – ADMIN only.
     * HR_MANAGER has USER_READ but NOT USER_MANAGE, so cannot change status.
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<UserSummaryDto> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request) {
        UserSummaryDto updated = adminUserService.updateStatus(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * S1-09: Assign/revoke roles – ADMIN only (ROLE_MANAGE).
     * HR_MANAGER has ROLE_READ but NOT ROLE_MANAGE, so cannot change roles.
     */
    @PutMapping("/{id}/roles")
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    public ResponseEntity<UserSummaryDto> updateRoles(@PathVariable Long id, @Valid @RequestBody UpdateRolesRequest request) {
        UserSummaryDto updated = adminUserService.updateRoles(id, request);
        return ResponseEntity.ok(updated);
    }

    /** Delete user – ADMIN only */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa người dùng thành công"));
    }

    /** Admin reset user password – ADMIN only */
    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ResponseEntity<UserSummaryDto> resetUserPassword(@PathVariable Long id) {
        UserSummaryDto user = adminUserService.resetUserPasswordByAdmin(id);
        return ResponseEntity.ok(user);
    }
}
