package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CommonCategory;
import com.example.auth_service.dto.CategoryTypeResponse;
import com.example.auth_service.dto.CommonCategoryRequest;
import com.example.auth_service.dto.CommonCategoryResponse;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.CommonCategoryRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class CommonCategoryService {

    private final CommonCategoryRepository repository;

    public CommonCategoryService(CommonCategoryRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public List<CommonCategoryResponse> list(String search, String type, Boolean active) {
        String cleanSearch = search != null ? search.trim() : null;
        String cleanType = type != null && !type.isBlank() ? type.trim().toUpperCase() : null;
        return repository.searchCategories(cleanSearch, cleanType, active)
                .stream()
                .map(CommonCategoryResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public List<CategoryTypeResponse> getTypes() {
        List<CommonCategory> all = repository.findAll();
        Map<String, Long> countByType = all.stream()
                .collect(Collectors.groupingBy(CommonCategory::getType, Collectors.counting()));

        List<CategoryTypeResponse> results = new ArrayList<>();
        countByType.forEach((type, count) -> {
            results.add(new CategoryTypeResponse(type, CategoryTypeResponse.resolveLabel(type), count));
        });
        results.sort((a, b) -> a.label().compareToIgnoreCase(b.label()));
        return results;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public CommonCategoryResponse get(Long id) {
        CommonCategory category = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
        return CommonCategoryResponse.fromEntity(category);
    }

    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public CommonCategoryResponse create(CommonCategoryRequest request) {
        String cleanType = request.type().trim().toUpperCase();
        String cleanCode = request.code().trim().toUpperCase();
        String cleanName = request.name().trim();

        if (repository.existsByTypeAndCodeIgnoreCase(cleanType, cleanCode)) {
            throw new ConflictException("Mã danh mục '" + cleanCode + "' đã tồn tại trong nhóm " + cleanType);
        }

        CommonCategory category = new CommonCategory();
        category.setType(cleanType);
        category.setCode(cleanCode);
        category.setName(cleanName);
        category.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);
        category.setActive(request.active() != null ? request.active() : true);

        CommonCategory saved = repository.save(category);
        return CommonCategoryResponse.fromEntity(saved);
    }

    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public CommonCategoryResponse update(Long id, CommonCategoryRequest request) {
        CommonCategory category = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));

        String cleanType = request.type().trim().toUpperCase();
        String cleanCode = request.code().trim().toUpperCase();
        String cleanName = request.name().trim();

        if (repository.existsByTypeAndCodeIgnoreCaseAndIdNot(cleanType, cleanCode, id)) {
            throw new ConflictException("Mã danh mục '" + cleanCode + "' đã tồn tại trong nhóm " + cleanType);
        }

        category.setType(cleanType);
        category.setCode(cleanCode);
        category.setName(cleanName);
        if (request.sortOrder() != null) {
            category.setSortOrder(request.sortOrder());
        }
        if (request.active() != null) {
            category.setActive(request.active());
        }

        CommonCategory saved = repository.save(category);
        return CommonCategoryResponse.fromEntity(saved);
    }

    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public CommonCategoryResponse setActive(Long id, boolean active) {
        CommonCategory category = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
        category.setActive(active);
        CommonCategory saved = repository.save(category);
        return CommonCategoryResponse.fromEntity(saved);
    }

    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id);
        }
        repository.deleteById(id);
    }
}
