package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.service.RequisitionAssignmentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requisitions")
public class RequisitionAssignmentController {

    private final RequisitionAssignmentService service;

    public RequisitionAssignmentController(RequisitionAssignmentService service) {
        this.service = service;
    }

    public record AssignmentRequest(
            @NotBlank(message = "Vai trò không được để trống") String role,
            Boolean isPrimary,
            String reason,
            String notes
    ) {}

    /**
     * Lấy danh sách tài khoản Recruiter đang hoạt động có thể phân công.
     */
    @GetMapping("/assignable-recruiters")
    public ResponseEntity<List<AssignableRecruiterDto>> getAssignableRecruiters() {
        return ResponseEntity.ok(service.getAssignableRecruiters());
    }

    /**
     * Lấy chi tiết thông tin phân công của một yêu cầu tuyển dụng (Recruiter chính & hỗ trợ).
     */
    @GetMapping("/{id}/assignments")
    public ResponseEntity<RequisitionAssignmentsResponse> getAssignments(@PathVariable Long id) {
        return ResponseEntity.ok(service.getAssignments(id));
    }

    /**
     * Lấy toàn bộ lịch sử phân công và chuyển giao trách nhiệm của yêu cầu tuyển dụng.
     */
    @GetMapping("/{id}/assignments/history")
    public ResponseEntity<List<AssignmentHistoryDto>> getAssignmentHistory(@PathVariable Long id) {
        return ResponseEntity.ok(service.getAssignmentHistory(id));
    }

    /**
     * S3-06: Phân công một recruiter chính và nhiều recruiter hỗ trợ trong một thao tác.
     * Tự động lưu lịch sử chuyển giao nếu có sự thay đổi người phụ trách chính.
     */
    @PutMapping("/{id}/assignments")
    public ResponseEntity<RequisitionAssignmentsResponse> assignRecruiters(
            @PathVariable Long id,
            @Valid @RequestBody AssignRecruiterPayload payload
    ) {
        RequisitionAssignmentsResponse response = service.assignRecruiters(id, payload);
        return ResponseEntity.ok(response);
    }

    /**
     * Legacy & granular API: Gán hoặc cập nhật vai trò phân công cho một người dùng cụ thể.
     */
    @PutMapping("/{id}/assignments/{userId}")
    public ResponseEntity<Void> assign(
            @PathVariable Long id,
            @PathVariable Long userId,
            @Valid @RequestBody AssignmentRequest request
    ) {
        boolean isPrimary = Boolean.TRUE.equals(request.isPrimary());
        service.assign(id, userId, request.role(), isPrimary, request.reason(), request.notes());
        return ResponseEntity.noContent().build();
    }

    /**
     * Legacy & granular API: Hủy phân công một người dùng khỏi vị trí tuyển dụng.
     */
    @DeleteMapping("/{id}/assignments/{userId}")
    public ResponseEntity<Void> unassign(
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestParam(required = false) String reason
    ) {
        service.unassign(id, userId, reason);
        return ResponseEntity.noContent().build();
    }
}
