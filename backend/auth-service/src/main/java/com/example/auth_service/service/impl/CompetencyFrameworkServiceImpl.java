package com.example.auth_service.service.impl;

import com.example.auth_service.domain.sprint2.CompetencyCriterion;
import com.example.auth_service.domain.sprint2.CompetencyFramework;
import com.example.auth_service.dto.CompetencyCriterionRequest;
import com.example.auth_service.dto.CompetencyCriterionResponse;
import com.example.auth_service.dto.CompetencyFrameworkRequest;
import com.example.auth_service.dto.CompetencyFrameworkResponse;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.CompetencyCriterionRepository;
import com.example.auth_service.repository.CompetencyFrameworkRepository;
import com.example.auth_service.service.CompetencyFrameworkService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompetencyFrameworkServiceImpl implements CompetencyFrameworkService {

    private final CompetencyFrameworkRepository competencyFrameworkRepository;
    private final CompetencyCriterionRepository competencyCriterionRepository;

    @Override
    @Transactional
    public CompetencyFrameworkResponse createFramework(CompetencyFrameworkRequest request) {
        validateWeightTotal(request.criteria());

        CompetencyFramework framework = new CompetencyFramework();
        framework.setCompetencyName(request.competencyName());
        framework.setDescription(request.description());
        framework.setCategory(request.category());
        framework.setWeightPercent(100);

        List<CompetencyCriterion> criteria = request.criteria().stream().map(c -> {
            CompetencyCriterion criterion = new CompetencyCriterion();
            criterion.setCriterionCode(c.criterionCode());
            criterion.setCriterionName(c.criterionName());
            criterion.setDescription(c.description());
            criterion.setWeightPercent(c.weightPercent());
            criterion.setActive(c.active() != null ? c.active() : true);
            criterion.setCompetencyFramework(framework);
            return criterion;
        }).collect(Collectors.toList());

        framework.setCriteria(criteria);
        
        CompetencyFramework saved = competencyFrameworkRepository.save(framework);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public CompetencyFrameworkResponse updateFramework(Long id, CompetencyFrameworkRequest request) {
        validateWeightTotal(request.criteria());

        CompetencyFramework framework = competencyFrameworkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung năng lực với ID: " + id));

        framework.setCompetencyName(request.competencyName());
        framework.setDescription(request.description());
        framework.setCategory(request.category());

        // Xóa tiêu chí cũ không có trong request, cập nhật hoặc thêm mới
        framework.getCriteria().clear();
        
        List<CompetencyCriterion> newCriteria = request.criteria().stream().map(c -> {
            CompetencyCriterion criterion = new CompetencyCriterion();
            if (c.id() != null) {
                 criterion = competencyCriterionRepository.findById(c.id()).orElse(new CompetencyCriterion());
            }
            criterion.setCriterionCode(c.criterionCode());
            criterion.setCriterionName(c.criterionName());
            criterion.setDescription(c.description());
            criterion.setWeightPercent(c.weightPercent());
            criterion.setActive(c.active() != null ? c.active() : true);
            criterion.setCompetencyFramework(framework);
            return criterion;
        }).collect(Collectors.toList());

        framework.getCriteria().addAll(newCriteria);

        CompetencyFramework saved = competencyFrameworkRepository.save(framework);
        return mapToResponse(saved);
    }

    @Override
    public CompetencyFrameworkResponse getFrameworkById(Long id) {
        CompetencyFramework framework = competencyFrameworkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung năng lực với ID: " + id));
        return mapToResponse(framework);
    }

    @Override
    public List<CompetencyFrameworkResponse> getAllFrameworks() {
        return competencyFrameworkRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteFramework(Long id) {
        CompetencyFramework framework = competencyFrameworkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung năng lực với ID: " + id));
        competencyFrameworkRepository.delete(framework);
    }

    private void validateWeightTotal(List<CompetencyCriterionRequest> criteria) {
        if (criteria == null || criteria.isEmpty()) {
            throw new BadRequestException("Khung năng lực phải có ít nhất một tiêu chí");
        }
        int totalWeight = criteria.stream()
                .mapToInt(c -> c.weightPercent() != null ? c.weightPercent() : 0)
                .sum();
        if (totalWeight != 100) {
            throw new BadRequestException("Tổng trọng số của một khung năng lực phải bằng 100%, hiện tại là: " + totalWeight + "%");
        }
    }

    private CompetencyFrameworkResponse mapToResponse(CompetencyFramework framework) {
        List<CompetencyCriterionResponse> criteriaResponses = framework.getCriteria().stream()
                .map(c -> {
                    CompetencyCriterionResponse resp = new CompetencyCriterionResponse();
                    resp.setId(c.getId());
                    resp.setCriterionCode(c.getCriterionCode());
                    resp.setCriterionName(c.getCriterionName());
                    resp.setDescription(c.getDescription());
                    resp.setWeightPercent(c.getWeightPercent());
                    resp.setActive(c.getActive());
                    resp.setCompetencyFrameworkId(framework.getId());
                    resp.setCompetencyName(framework.getCompetencyName());
                    return resp;
                }).collect(Collectors.toList());

        return new CompetencyFrameworkResponse(
                framework.getId(),
                framework.getCompetencyName(),
                framework.getDescription(),
                framework.getCategory(),
                framework.getWeightPercent(),
                criteriaResponses
        );
    }
}
