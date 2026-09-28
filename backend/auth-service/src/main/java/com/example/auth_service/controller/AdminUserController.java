package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.service.AdminUserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public ResponseEntity<Page<UserSummaryDto>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserSummaryDto> users = adminUserService.listUsers(search, status, pageable);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserSummaryDto> getUserById(@PathVariable Long id) {
        UserSummaryDto user = adminUserService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @PostMapping
    public ResponseEntity<UserSummaryDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserSummaryDto created = adminUserService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserSummaryDto> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        UserSummaryDto updated = adminUserService.updateUser(id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserSummaryDto> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request) {
        UserSummaryDto updated = adminUserService.updateStatus(id, request);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/roles")
    public ResponseEntity<UserSummaryDto> updateRoles(@PathVariable Long id, @Valid @RequestBody UpdateRolesRequest request) {
        UserSummaryDto updated = adminUserService.updateRoles(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa người dùng thành công"));
    }
}
