package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.service.DepartmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {
    private final DepartmentService service;
    public DepartmentController(DepartmentService service) { this.service = service; }

    @GetMapping
    public List<DepartmentResponse> list(@RequestParam(required = false) Boolean active) { return service.list(active); }
    @GetMapping("/tree")
    public List<DepartmentTreeNode> tree() { return service.tree(); }
    @GetMapping("/{id}")
    public DepartmentResponse get(@PathVariable Long id) { return service.get(id); }
    @PostMapping
    public ResponseEntity<DepartmentResponse> create(@Valid @RequestBody DepartmentRequest request) {
        DepartmentResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/departments/" + created.id())).body(created);
    }
    @PutMapping("/{id}")
    public DepartmentResponse update(@PathVariable Long id, @Valid @RequestBody DepartmentRequest request) {
        return service.update(id, request);
    }
    @PatchMapping("/{id}/status")
    public DepartmentResponse status(@PathVariable Long id, @Valid @RequestBody DepartmentStatusRequest request) {
        return service.setActive(id, request.active());
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
