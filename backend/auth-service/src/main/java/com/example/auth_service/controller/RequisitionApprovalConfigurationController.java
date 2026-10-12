package com.example.auth_service.controller;

import com.example.auth_service.dto.ApprovalConfigurationRequest;
import com.example.auth_service.dto.ApprovalConfigurationResponse;
import com.example.auth_service.service.RequisitionApprovalConfigurationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requisition-approval-configurations")
@PreAuthorize("hasRole('HR_MANAGER')")
public class RequisitionApprovalConfigurationController {
    private final RequisitionApprovalConfigurationService service;

    public RequisitionApprovalConfigurationController(RequisitionApprovalConfigurationService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ApprovalConfigurationResponse>> list(
            @RequestParam(required = false) Long departmentId
    ) {
        return ResponseEntity.ok(service.list(departmentId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApprovalConfigurationResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping
    public ResponseEntity<ApprovalConfigurationResponse> create(
            @Valid @RequestBody ApprovalConfigurationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApprovalConfigurationResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalConfigurationRequest request
    ) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}