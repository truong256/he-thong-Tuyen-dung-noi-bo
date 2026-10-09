package com.example.auth_service.service.impl;

import com.example.auth_service.domain.sprint2.CompetencyCriterion;
import com.example.auth_service.domain.sprint2.CompetencyFramework;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.dto.*;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.CompetencyCriterionRepository;
import com.example.auth_service.repository.CompetencyFrameworkRepository;
import com.example.auth_service.repository.InterviewQuestionRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.service.CompetencyFrameworkService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompetencyFrameworkServiceImpl implements CompetencyFrameworkService {

    private final CompetencyFrameworkRepository competencyFrameworkRepository;
    private final CompetencyCriterionRepository competencyCriterionRepository;
    private final JobTitleRepository jobTitleRepository;
    private final InterviewQuestionRepository interviewQuestionRepository;

    @Override
    @Transactional
    public CompetencyFrameworkResponse createFramework(CompetencyFrameworkRequest request) {
        validateFramework(request);

        String trimmedName = request.competencyName().trim();
        if (competencyFrameworkRepository.existsByCompetencyNameIgnoreCase(trimmedName)) {
            throw new ConflictException("Tên khung năng lực đã tồn tại: " + trimmedName);
        }

        CompetencyFramework framework = new CompetencyFramework();
        framework.setCompetencyName(trimmedName);
        framework.setDescription(normalize(request.description()));
        framework.setCategory(normalize(request.category()));
        framework.setWeightPercent(100);

        List<CompetencyCriterion> criteria = new ArrayList<>();
        for (CompetencyCriterionRequest c : request.criteria()) {
            CompetencyCriterion criterion = new CompetencyCriterion();
            criterion.setCriterionCode(c.criterionCode().trim().toUpperCase());
            criterion.setCriterionName(c.criterionName().trim());
            criterion.setDescription(normalize(c.description()));
            criterion.setWeightPercent(c.weightPercent());
            criterion.setActive(c.active() != null ? c.active() : true);
            criterion.setCompetencyFramework(framework);
            criteria.add(criterion);
        }
        framework.setCriteria(criteria);

        CompetencyFramework saved = competencyFrameworkRepository.save(framework);

        // Associate with job titles if requested
        if (request.jobTitleIds() != null && !request.jobTitleIds().isEmpty()) {
            associateJobTitles(saved, request.jobTitleIds());
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public CompetencyFrameworkResponse updateFramework(Long id, CompetencyFrameworkRequest request) {
        validateFramework(request);

        CompetencyFramework framework = competencyFrameworkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung năng lực với ID: " + id));

        String trimmedName = request.competencyName().trim();
        if (competencyFrameworkRepository.existsByCompetencyNameIgnoreCaseAndIdNot(trimmedName, id)) {
            throw new ConflictException("Tên khung năng lực đã tồn tại: " + trimmedName);
        }

        framework.setCompetencyName(trimmedName);
        framework.setDescription(normalize(request.description()));
        framework.setCategory(normalize(request.category()));

        // In-place update for criteria to preserve existing criterion IDs (required for S2-07 interview questions)
        Map<Long, CompetencyCriterion> existingMap = framework.getCriteria().stream()
                .filter(c -> c.getId() != null)
                .collect(Collectors.toMap(CompetencyCriterion::getId, Function.identity()));

        Set<Long> requestedIds = request.criteria().stream()
                .map(CompetencyCriterionRequest::id)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // Check if any deleted criterion is currently referenced by interview questions
        for (CompetencyCriterion existing : framework.getCriteria()) {
            if (!requestedIds.contains(existing.getId())) {
                if (interviewQuestionRepository.existsByCompetencyCriterionId(existing.getId())) {
                    throw new BadRequestException("Không thể xóa tiêu chí '" + existing.getCriterionName() +
                            "' vì đang được sử dụng bởi câu hỏi phỏng vấn.");
                }
            }
        }

        // Safely remove criteria that are not in requestedIds and not used
        framework.getCriteria().removeIf(c -> c.getId() != null && !requestedIds.contains(c.getId()));

        // Update existing criteria in-place or add new criteria
        for (CompetencyCriterionRequest cReq : request.criteria()) {
            if (cReq.id() != null && existingMap.containsKey(cReq.id())) {
                CompetencyCriterion existing = existingMap.get(cReq.id());
                existing.setCriterionCode(cReq.criterionCode().trim().toUpperCase());
                existing.setCriterionName(cReq.criterionName().trim());
                existing.setDescription(normalize(cReq.description()));
                existing.setWeightPercent(cReq.weightPercent());
                existing.setActive(cReq.active() != null ? cReq.active() : true);
            } else {
                CompetencyCriterion newCriterion = new CompetencyCriterion();
                newCriterion.setCriterionCode(cReq.criterionCode().trim().toUpperCase());
                newCriterion.setCriterionName(cReq.criterionName().trim());
                newCriterion.setDescription(normalize(cReq.description()));
                newCriterion.setWeightPercent(cReq.weightPercent());
                newCriterion.setActive(cReq.active() != null ? cReq.active() : true);
                newCriterion.setCompetencyFramework(framework);
                framework.getCriteria().add(newCriterion);
            }
        }

        // Update job title associations
        if (request.jobTitleIds() != null) {
            associateJobTitles(framework, request.jobTitleIds());
        }

        CompetencyFramework saved = competencyFrameworkRepository.save(framework);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CompetencyFrameworkResponse getFrameworkById(Long id) {
        CompetencyFramework framework = competencyFrameworkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung năng lực với ID: " + id));
        return mapToResponse(framework);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompetencyFrameworkResponse> getAllFrameworks(String search) {
        List<CompetencyFramework> all = competencyFrameworkRepository.findAll();
        String searchTrimmed = (search != null && !search.trim().isEmpty()) ? search.trim().toLowerCase() : null;

        return all.stream()
                .filter(f -> {
                    if (searchTrimmed == null) return true;
                    boolean matchesName = f.getCompetencyName() != null && f.getCompetencyName().toLowerCase().contains(searchTrimmed);
                    boolean matchesCategory = f.getCategory() != null && f.getCategory().toLowerCase().contains(searchTrimmed);
                    boolean matchesDesc = f.getDescription() != null && f.getDescription().toLowerCase().contains(searchTrimmed);
                    return matchesName || matchesCategory || matchesDesc;
                })
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteFramework(Long id) {
        CompetencyFramework framework = competencyFrameworkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung năng lực với ID: " + id));

        // TC10: Check if framework is currently used by any job titles
        boolean inUse = jobTitleRepository.existsByCompetencyFrameworkId(id);
        if (inUse) {
            throw new BadRequestException("Không thể xóa khung năng lực đang được sử dụng bởi chức danh công việc.");
        }

        // Check if any criteria are referenced by interview questions
        for (CompetencyCriterion c : framework.getCriteria()) {
            if (c.getId() != null && interviewQuestionRepository.existsByCompetencyCriterionId(c.getId())) {
                throw new BadRequestException("Không thể xóa khung năng lực vì có tiêu chí đang được sử dụng bởi câu hỏi phỏng vấn.");
            }
        }

        competencyFrameworkRepository.delete(framework);
    }

    private void validateFramework(CompetencyFrameworkRequest request) {
        if (request.competencyName() == null || request.competencyName().trim().isEmpty()) {
            throw new BadRequestException("Tên khung năng lực không được để trống");
        }

        List<CompetencyCriterionRequest> criteria = request.criteria();
        if (criteria == null || criteria.isEmpty()) {
            throw new BadRequestException("Khung năng lực phải có ít nhất một tiêu chí");
        }

        // Validate criterion codes uniqueness and individual weights
        Set<String> seenCodes = new HashSet<>();
        int totalWeight = 0;

        for (CompetencyCriterionRequest c : criteria) {
            if (c.criterionCode() == null || c.criterionCode().trim().isEmpty()) {
                throw new BadRequestException("Mã tiêu chí không được để trống");
            }
            String code = c.criterionCode().trim().toUpperCase();
            if (!seenCodes.add(code)) {
                throw new BadRequestException("Mã tiêu chí '" + c.criterionCode().trim() + "' bị trùng lặp trong cùng khung năng lực");
            }

            if (c.criterionName() == null || c.criterionName().trim().isEmpty()) {
                throw new BadRequestException("Tên tiêu chí không được để trống");
            }

            if (c.weightPercent() == null || c.weightPercent() <= 0) {
                throw new BadRequestException("Trọng số của tiêu chí phải lớn hơn 0");
            }
            if (c.weightPercent() > 100) {
                throw new BadRequestException("Trọng số của tiêu chí không được vượt quá 100%");
            }

            totalWeight += c.weightPercent();
        }

        // SCRUM-77 & TC01/TC02/TC03: Exact 100% check
        if (totalWeight != 100) {
            throw new BadRequestException("Tổng trọng số của các tiêu chí phải bằng chính xác 100% (hiện tại: " + totalWeight + "%)");
        }
    }

    private void associateJobTitles(CompetencyFramework framework, List<Long> jobTitleIds) {
        // Clear association for job titles currently assigned to this framework but not in new list
        List<JobTitle> currentTitles = jobTitleRepository.findByCompetencyFrameworkId(framework.getId());
        for (JobTitle jt : currentTitles) {
            if (!jobTitleIds.contains(jt.getId())) {
                jt.setCompetencyFramework(null);
                jobTitleRepository.save(jt);
            }
        }

        // Assign framework to selected job titles
        for (Long titleId : jobTitleIds) {
            JobTitle jt = jobTitleRepository.findById(titleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với ID: " + titleId));
            jt.setCompetencyFramework(framework);
            jobTitleRepository.save(jt);
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

        List<JobTitle> titles = jobTitleRepository.findByCompetencyFrameworkId(framework.getId());
        List<JobTitleSummaryResponse> jobTitleSummaries = titles.stream()
                .map(jt -> new JobTitleSummaryResponse(jt.getId(), jt.getTitle(), jt.getCode()))
                .collect(Collectors.toList());

        return new CompetencyFrameworkResponse(
                framework.getId(),
                framework.getCompetencyName(),
                framework.getDescription(),
                framework.getCategory(),
                framework.getWeightPercent(),
                criteriaResponses,
                jobTitleSummaries,
                criteriaResponses.size(),
                jobTitleSummaries.size()
        );
    }

    private String normalize(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
