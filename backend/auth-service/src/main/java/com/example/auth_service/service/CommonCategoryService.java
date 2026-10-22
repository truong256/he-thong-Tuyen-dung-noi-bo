package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CommonCategory;
import com.example.auth_service.dto.CategoryReorderRequest;
import com.example.auth_service.dto.CategoryTypeResponse;
import com.example.auth_service.dto.CommonCategoryRequest;
import com.example.auth_service.dto.CommonCategoryResponse;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.CandidateApplicationRepository;
import com.example.auth_service.repository.CommonCategoryRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final CandidateApplicationRepository candidateApplicationRepository;
    private final RecruitmentRequisitionRepository recruitmentRequisitionRepository;

    public CommonCategoryService(CommonCategoryRepository repository,
                                 CandidateApplicationRepository candidateApplicationRepository,
                                 RecruitmentRequisitionRepository recruitmentRequisitionRepository) {
        this.repository = repository;
        this.candidateApplicationRepository = candidateApplicationRepository;
        this.recruitmentRequisitionRepository = recruitmentRequisitionRepository;
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
                .collect(Collectors.groupingBy(c -> c.getType(), Collectors.counting()));

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
    public List<CommonCategoryResponse> reorder(CategoryReorderRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Danh sách sắp xếp không được để trống");
        }

        List<CommonCategory> updatedCategories = new ArrayList<>();
        for (CategoryReorderRequest.CategoryReorderItem item : request.items()) {
            CommonCategory category = repository.findById(item.id())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + item.id()));
            category.setSortOrder(item.sortOrder());
            updatedCategories.add(repository.save(category));
        }

        return updatedCategories.stream()
                .map(CommonCategoryResponse::fromEntity)
                .toList();
    }

    @PreAuthorize("hasAuthority('CATALOG_MANAGE')")
    public void delete(Long id) {
        CommonCategory category = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));

        // 1. Layer 1: Business logic reference checks
        String type = category.getType() != null ? category.getType().toUpperCase() : "";

        if ("CANDIDATE_SOURCE".equals(type)) {
            if (candidateApplicationRepository.existsByCandidateSourceId(id)) {
                throw new ConflictException("Không thể xóa nguồn ứng viên vì đang được sử dụng bởi hồ sơ ứng viên.");
            }
        } else if ("REJECTION_REASON".equals(type)) {
            if (candidateApplicationRepository.existsByRejectionReasonId(id)
                    || recruitmentRequisitionRepository.existsByRejectionReasonId(id)
                    || (category.getName() != null && recruitmentRequisitionRepository.existsByRejectionReasonIgnoreCase(category.getName()))) {
                throw new ConflictException("Không thể xóa lý do loại hồ sơ vì đang được sử dụng bởi hồ sơ ứng viên hoặc yêu cầu tuyển dụng.");
            }
        } else if ("WORK_LOCATION".equals(type)) {
            if (recruitmentRequisitionRepository.existsByWorkLocationId(id)
                    || (category.getName() != null && recruitmentRequisitionRepository.existsByWorkLocationIgnoreCase(category.getName()))
                    || (category.getCode() != null && recruitmentRequisitionRepository.existsByWorkLocationIgnoreCase(category.getCode()))) {
                throw new ConflictException("Không thể xóa địa điểm làm việc vì đang được sử dụng bởi yêu cầu tuyển dụng.");
            }
        } else if ("EMPLOYMENT_TYPE".equals(type) || "WORK_TYPE".equals(type)) {
            if (recruitmentRequisitionRepository.existsByEmploymentTypeId(id)
                    || (category.getCode() != null && recruitmentRequisitionRepository.existsByRecruitmentTypeIgnoreCase(category.getCode()))
                    || (category.getCode() != null && recruitmentRequisitionRepository.existsByWorkingModelIgnoreCase(category.getCode()))) {
                throw new ConflictException("Không thể xóa hình thức làm việc vì đang được sử dụng bởi yêu cầu tuyển dụng.");
            }
        } else {
            if (candidateApplicationRepository.existsByCandidateSourceId(id)
                    || candidateApplicationRepository.existsByRejectionReasonId(id)
                    || recruitmentRequisitionRepository.existsByWorkLocationId(id)
                    || recruitmentRequisitionRepository.existsByEmploymentTypeId(id)
                    || recruitmentRequisitionRepository.existsByRejectionReasonId(id)) {
                throw new ConflictException("Không thể xóa danh mục vì đang được tham chiếu bởi dữ liệu tuyển dụng.");
            }
        }

        // 2. Layer 2: Database FK constraint delete with exception catch
        try {
            repository.delete(category);
            repository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Không thể xóa danh mục '" + category.getName() + "' vì đang được dữ liệu khác trong hệ thống tham chiếu.");
        }
    }
}
