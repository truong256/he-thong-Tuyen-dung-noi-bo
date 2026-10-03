package com.example.auth_service.controller;

import com.example.auth_service.service.RequisitionAssignmentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/requisitions/{id}/assignments/{userId}")
public class RequisitionAssignmentController {
    private final RequisitionAssignmentService service;
    public RequisitionAssignmentController(RequisitionAssignmentService service) { this.service = service; }
    public record AssignmentRequest(@NotBlank(message = "Vai trò không được để trống") String role) {}

    @PutMapping
    public ResponseEntity<Void> assign(@PathVariable Long id, @PathVariable Long userId,
                                      @Valid @RequestBody AssignmentRequest request) {
        service.assign(id, userId, request.role());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> unassign(@PathVariable Long id, @PathVariable Long userId) {
        service.unassign(id, userId);
        return ResponseEntity.noContent().build();
    }
}
