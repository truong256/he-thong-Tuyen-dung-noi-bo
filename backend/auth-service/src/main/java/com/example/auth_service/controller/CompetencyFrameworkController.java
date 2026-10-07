package com.example.auth_service.controller;

import com.example.auth_service.dto.CompetencyFrameworkRequest;
import com.example.auth_service.dto.CompetencyFrameworkResponse;
import com.example.auth_service.service.CompetencyFrameworkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/competency-frameworks")
@RequiredArgsConstructor
public class CompetencyFrameworkController {

    private final CompetencyFrameworkService service;

    @PostMapping
    public ResponseEntity<CompetencyFrameworkResponse> create(@Valid @RequestBody CompetencyFrameworkRequest request) {
        CompetencyFrameworkResponse created = service.createFramework(request);
        return ResponseEntity.created(URI.create("/api/competency-frameworks/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public CompetencyFrameworkResponse update(@PathVariable Long id, @Valid @RequestBody CompetencyFrameworkRequest request) {
        return service.updateFramework(id, request);
    }

    @GetMapping("/{id}")
    public CompetencyFrameworkResponse get(@PathVariable Long id) {
        return service.getFrameworkById(id);
    }

    @GetMapping
    public List<CompetencyFrameworkResponse> list() {
        return service.getAllFrameworks();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteFramework(id);
        return ResponseEntity.noContent().build();
    }
}
