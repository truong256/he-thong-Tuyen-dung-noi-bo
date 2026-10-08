package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CompetencyCriterion;
import com.example.auth_service.domain.sprint2.CompetencyFramework;
import com.example.auth_service.domain.sprint2.InterviewQuestion;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.dto.CompetencyCriterionResponse;
import com.example.auth_service.dto.CreateInterviewQuestionRequest;
import com.example.auth_service.dto.InterviewQuestionResponse;
import com.example.auth_service.dto.UpdateInterviewQuestionRequest;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.InterviewQuestionRepository;
import com.example.auth_service.repository.CompetencyCriterionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class InterviewQuestionService {

    private final InterviewQuestionRepository interviewQuestionRepository;
    private final CompetencyCriterionRepository competencyCriterionRepository;

    public InterviewQuestionService(
            InterviewQuestionRepository interviewQuestionRepository,
            CompetencyCriterionRepository competencyCriterionRepository
    ) {
        this.interviewQuestionRepository = interviewQuestionRepository;
        this.competencyCriterionRepository = competencyCriterionRepository;
    }

    @Transactional(readOnly = true)
    public Page<InterviewQuestionResponse> search(
            String search,
            String difficultyLevel,
            Long jobTitleId,
            Long criterionId,
            Boolean active,
            Pageable pageable
    ) {
        String normalizedSearch = normalize(search);
        String normalizedDifficulty = normalize(difficultyLevel);

        return interviewQuestionRepository
                .search(normalizedSearch, normalizedDifficulty, jobTitleId, criterionId, active, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public InterviewQuestionResponse getById(Long id) {
        return toResponse(findQuestion(id));
    }

    @Transactional(readOnly = true)
    public List<CompetencyCriterionResponse> getCriteria() {
        return getCriteria(null);
    }

    @Transactional(readOnly = true)
    public List<CompetencyCriterionResponse> getCriteria(Long jobTitleId) {
        return competencyCriterionRepository.findAllActiveWithDetails().stream()
                .filter(c -> jobTitleId == null ||
                        (c.getCompetencyFramework() != null &&
                         c.getCompetencyFramework().getJobTitle() != null &&
                         jobTitleId.equals(c.getCompetencyFramework().getJobTitle().getId())))
                .map(c -> new CompetencyCriterionResponse(
                        c.getId(),
                        c.getCriterionCode(),
                        c.getCriterionName(),
                        c.getDescription(),
                        c.getWeightPercent(),
                        c.getActive(),
                        c.getCompetencyFramework() != null ? c.getCompetencyFramework().getId() : null,
                        c.getCompetencyFramework() != null ? c.getCompetencyFramework().getCompetencyName() : null,
                        (c.getCompetencyFramework() != null && c.getCompetencyFramework().getJobTitle() != null)
                                ? c.getCompetencyFramework().getJobTitle().getId() : null,
                        (c.getCompetencyFramework() != null && c.getCompetencyFramework().getJobTitle() != null)
                                ? c.getCompetencyFramework().getJobTitle().getTitle() : null
                ))
                .toList();
    }

    public InterviewQuestionResponse create(CreateInterviewQuestionRequest request) {
        CompetencyCriterion criterion = findCriterion(request.getCompetencyCriterionId());

        InterviewQuestion question = new InterviewQuestion();
        question.setQuestionText(request.getQuestionText().trim());
        question.setCategory(normalize(request.getCategory()));
        question.setDifficultyLevel(normalize(request.getDifficultyLevel()));
        question.setSuggestedAnswer(normalize(request.getSuggestedAnswer()));
        question.setCompetencyCriterion(criterion);
        question.setActive(true);

        return toResponse(interviewQuestionRepository.save(question));
    }

    public InterviewQuestionResponse update(Long id, UpdateInterviewQuestionRequest request) {
        InterviewQuestion question = findQuestion(id);
        CompetencyCriterion criterion = findCriterion(request.getCompetencyCriterionId());

        question.setQuestionText(request.getQuestionText().trim());
        question.setCategory(normalize(request.getCategory()));
        question.setDifficultyLevel(normalize(request.getDifficultyLevel()));
        question.setSuggestedAnswer(normalize(request.getSuggestedAnswer()));
        question.setCompetencyCriterion(criterion);
        question.setActive(request.getActive());

        return toResponse(interviewQuestionRepository.save(question));
    }

    public void delete(Long id) {
        InterviewQuestion question = findQuestion(id);

        if (!Boolean.TRUE.equals(question.getActive())) {
            throw new BadRequestException("Câu hỏi đã được vô hiệu hóa");
        }

        question.setActive(false);
        interviewQuestionRepository.save(question);
    }

    private InterviewQuestion findQuestion(Long id) {
        return interviewQuestionRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy câu hỏi phỏng vấn với id: " + id));
    }

    private CompetencyCriterion findCriterion(Long id) {
        if (id == null) {
            throw new BadRequestException("Tiêu chí năng lực không được để trống");
        }

        return competencyCriterionRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy tiêu chí năng lực với id: " + id));
    }

    private InterviewQuestionResponse toResponse(InterviewQuestion question) {
        CompetencyCriterion criterion = question.getCompetencyCriterion();

        if (criterion == null) {
            throw new BadRequestException("Câu hỏi chưa được liên kết với tiêu chí năng lực");
        }

        CompetencyFramework framework = criterion.getCompetencyFramework();

        if (framework == null) {
            throw new BadRequestException("Tiêu chí năng lực chưa được liên kết với khung năng lực");
        }

        JobTitle jobTitle = framework.getJobTitle();

        return new InterviewQuestionResponse(
                question.getId(),
                question.getQuestionText(),
                question.getCategory(),
                question.getDifficultyLevel(),
                question.getSuggestedAnswer(),
                question.getActive(),
                criterion.getId(),
                criterion.getCriterionCode(),
                criterion.getCriterionName(),
                framework.getId(),
                framework.getCompetencyName(),
                jobTitle != null ? jobTitle.getId() : null,
                jobTitle != null ? jobTitle.getTitle() : null,
                question.getCreatedAt(),
                question.getUpdatedAt()
        );
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
