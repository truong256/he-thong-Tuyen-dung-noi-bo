package com.example.auth_service.controller;

import com.example.auth_service.dto.RequisitionRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.service.RecruitmentRequisitionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/requisitions")
public class RecruitmentRequisitionController {

    private final RecruitmentRequisitionService service;

    public RecruitmentRequisitionController(RecruitmentRequisitionService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('REQUISITION_CREATE')")
    public ResponseEntity<RequisitionResponse> create(
            @Valid @RequestBody RequisitionRequest request,
            Authentication authentication
    ) {
        RequisitionResponse response = service.createRequisition(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_OWN', 'REQUISITION_READ_ALL')")
    public Page<RequisitionResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.clamp(size, 1, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return service.listRequisitions(search, status, departmentId, pageable, authentication);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_OWN', 'REQUISITION_READ_ALL')")
    public ResponseEntity<RequisitionResponse> get(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(service.getRequisition(id, authentication));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_OWN')")
    public ResponseEntity<RequisitionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RequisitionRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(service.updateRequisition(id, request, authentication));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_OWN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Authentication authentication
    ) {
        service.deleteRequisition(id, authentication);
        return ResponseEntity.noContent().build();
    }
}
