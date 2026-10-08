package com.example.auth_service.controller;

import com.example.auth_service.dto.JobTitleRequest;
import com.example.auth_service.dto.JobTitleResponse;
import com.example.auth_service.service.JobTitleService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/job-titles")
public class JobTitleController {

    private final JobTitleService service;

    public JobTitleController(JobTitleService service) {
        this.service = service;
    }

    @GetMapping
    public List<JobTitleResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String jobFamily,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortOrder,
            Authentication authentication
    ) {
        return service.list(search, active, departmentId, level, jobFamily, sortBy, sortOrder, canViewSalary(authentication));
    }

    @GetMapping("/{id}")
    public JobTitleResponse get(@PathVariable Long id, Authentication authentication) {
        return service.get(id, canViewSalary(authentication));
    }

    @PostMapping
    public ResponseEntity<JobTitleResponse> create(@Valid @RequestBody JobTitleRequest request) {
        JobTitleResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/job-titles/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public JobTitleResponse update(@PathVariable Long id, @Valid @RequestBody JobTitleRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public JobTitleResponse setStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        boolean active = body.getOrDefault("active", true);
        return service.setActive(id, active);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    private boolean canViewSalary(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_HR_MANAGER".equals(authority.getAuthority()));
    }
}
