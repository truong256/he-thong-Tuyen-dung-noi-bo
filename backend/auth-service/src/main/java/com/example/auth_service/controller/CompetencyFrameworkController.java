package com.example.auth_service.controller;

import com.example.auth_service.dto.CompetencyFrameworkRequest;
import com.example.auth_service.dto.CompetencyFrameworkResponse;
import com.example.auth_service.service.CompetencyFrameworkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/competency-frameworks")
@RequiredArgsConstructor
public class CompetencyFrameworkController {

    private final CompetencyFrameworkService service;

    @PostMapping
    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public ResponseEntity<CompetencyFrameworkResponse> create(@Valid @RequestBody CompetencyFrameworkRequest request) {
        CompetencyFrameworkResponse created = service.createFramework(request);
        return ResponseEntity.created(URI.create("/api/competency-frameworks/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public ResponseEntity<CompetencyFrameworkResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CompetencyFrameworkRequest request
    ) {
        return ResponseEntity.ok(service.updateFramework(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public ResponseEntity<CompetencyFrameworkResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.getFrameworkById(id));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public ResponseEntity<List<CompetencyFrameworkResponse>> list(
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(service.getAllFrameworks(search));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteFramework(id);
        return ResponseEntity.noContent().build();
    }
}
