package com.example.auth_service.controller;

import com.example.auth_service.dto.CategoryReorderRequest;
import com.example.auth_service.dto.CategoryTypeResponse;
import com.example.auth_service.dto.CommonCategoryRequest;
import com.example.auth_service.dto.CommonCategoryResponse;
import com.example.auth_service.service.CommonCategoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
public class CommonCategoryController {

    private final CommonCategoryService service;

    public CommonCategoryController(CommonCategoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<CommonCategoryResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean active
    ) {
        return service.list(search, type, active);
    }

    @GetMapping("/types")
    public List<CategoryTypeResponse> getTypes() {
        return service.getTypes();
    }

    @GetMapping("/{id}")
    public CommonCategoryResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<CommonCategoryResponse> create(@Valid @RequestBody CommonCategoryRequest request) {
        CommonCategoryResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/categories/" + created.id())).body(created);
    }

    @PutMapping("/reorder")
    public List<CommonCategoryResponse> reorder(@Valid @RequestBody CategoryReorderRequest request) {
        return service.reorder(request);
    }

    @PutMapping("/{id}")
    public CommonCategoryResponse update(@PathVariable Long id, @Valid @RequestBody CommonCategoryRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public CommonCategoryResponse setStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        boolean active = body.getOrDefault("active", true);
        return service.setActive(id, active);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
