package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CompetencyCriterion;
import com.example.auth_service.domain.sprint2.CompetencyFramework;
import com.example.auth_service.domain.sprint2.InterviewQuestion;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.dto.CreateInterviewQuestionRequest;
import com.example.auth_service.dto.InterviewQuestionResponse;
import com.example.auth_service.dto.UpdateInterviewQuestionRequest;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.CompetencyCriterionRepository;
import com.example.auth_service.repository.InterviewQuestionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewQuestionServiceTest {

    @Mock
    private InterviewQuestionRepository interviewQuestionRepository;

    @Mock
    private CompetencyCriterionRepository competencyCriterionRepository;

    @InjectMocks
    private InterviewQuestionService interviewQuestionService;

    @Test
    @DisplayName("S2-07: Tạo câu hỏi thành công và liên kết đúng tiêu chí năng lực")
    void create_Success() {
        CompetencyCriterion criterion = createCriterion();

        CreateInterviewQuestionRequest request = new CreateInterviewQuestionRequest(
                "  Hãy mô tả cách bạn xử lý một lỗi trong Java?  ",
                "  Java  ",
                "  HARD  ",
                "  Xác định nguyên nhân, kiểm tra log và xử lý ngoại lệ.  ",
                10L
        );

        when(competencyCriterionRepository.findById(10L))
                .thenReturn(Optional.of(criterion));

        when(interviewQuestionRepository.save(any(InterviewQuestion.class)))
                .thenAnswer(invocation -> {
                    InterviewQuestion question = invocation.getArgument(0);
                    question.setId(100L);
                    return question;
                });

        InterviewQuestionResponse response = interviewQuestionService.create(request);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getQuestionText())
                .isEqualTo("Hãy mô tả cách bạn xử lý một lỗi trong Java?");
        assertThat(response.getCategory()).isEqualTo("Java");
        assertThat(response.getDifficultyLevel()).isEqualTo("HARD");
        assertThat(response.getSuggestedAnswer())
                .isEqualTo("Xác định nguyên nhân, kiểm tra log và xử lý ngoại lệ.");
        assertThat(response.getCompetencyCriterionId()).isEqualTo(10L);
        assertThat(response.getCriterionCode()).isEqualTo("JAVA-01");
        assertThat(response.getCriterionName()).isEqualTo("Năng lực Java");
        assertThat(response.getCompetencyFrameworkId()).isEqualTo(20L);
        assertThat(response.getCompetencyName()).isEqualTo("Kỹ năng phát triển phần mềm");
        assertThat(response.getJobTitleId()).isEqualTo(30L);
        assertThat(response.getJobTitle()).isEqualTo("Java Developer");

        verify(competencyCriterionRepository).findById(10L);
        verify(interviewQuestionRepository).save(any(InterviewQuestion.class));
    }

    @Test
    @DisplayName("S2-07: Tạo câu hỏi thất bại khi không tìm thấy tiêu chí")
    void create_CriterionNotFound() {
        CreateInterviewQuestionRequest request = new CreateInterviewQuestionRequest(
                "Câu hỏi",
                "Java",
                "MEDIUM",
                "Câu trả lời",
                999L
        );

        when(competencyCriterionRepository.findById(999L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> interviewQuestionService.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy tiêu chí năng lực với id: 999");

        verify(interviewQuestionRepository, never()).save(any());
    }

    @Test
    @DisplayName("S2-07: Tạo câu hỏi thất bại khi id tiêu chí bị null")
    void create_NullCriterionId() {
        CreateInterviewQuestionRequest request = new CreateInterviewQuestionRequest(
                "Câu hỏi",
                "Java",
                "MEDIUM",
                "Câu trả lời",
                null
        );

        assertThatThrownBy(() -> interviewQuestionService.create(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tiêu chí năng lực không được để trống");

        verify(competencyCriterionRepository, never()).findById(any());
        verify(interviewQuestionRepository, never()).save(any());
    }

    @Test
    @DisplayName("S2-07: Lấy câu hỏi thành công")
    void getById_Success() {
        CompetencyCriterion criterion = createCriterion();
        InterviewQuestion question = createQuestion(100L, criterion);

        when(interviewQuestionRepository.findById(100L))
                .thenReturn(Optional.of(question));

        InterviewQuestionResponse response = interviewQuestionService.getById(100L);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getQuestionText()).isEqualTo("Câu hỏi Java");
        assertThat(response.getCriterionCode()).isEqualTo("JAVA-01");
        assertThat(response.getJobTitle()).isEqualTo("Java Developer");
    }

    @Test
    @DisplayName("S2-07: Lấy câu hỏi thất bại khi không tồn tại")
    void getById_NotFound() {
        when(interviewQuestionRepository.findById(999L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> interviewQuestionService.getById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy câu hỏi phỏng vấn với id: 999");
    }

    @Test
    @DisplayName("S2-07: Cập nhật câu hỏi thành công")
    void update_Success() {
        CompetencyCriterion oldCriterion = createCriterion();
        CompetencyCriterion newCriterion = createCriterion();
        newCriterion.setId(11L);
        newCriterion.setCriterionCode("JAVA-02");
        newCriterion.setCriterionName("Spring Boot");

        InterviewQuestion question = createQuestion(100L, oldCriterion);

        UpdateInterviewQuestionRequest request = new UpdateInterviewQuestionRequest(
                "  Câu hỏi đã cập nhật  ",
                "  Spring  ",
                "  EASY  ",
                "  Câu trả lời mới  ",
                11L,
                false
        );

        when(interviewQuestionRepository.findById(100L))
                .thenReturn(Optional.of(question));
        when(competencyCriterionRepository.findById(11L))
                .thenReturn(Optional.of(newCriterion));
        when(interviewQuestionRepository.save(any(InterviewQuestion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        InterviewQuestionResponse response =
                interviewQuestionService.update(100L, request);

        assertThat(response.getQuestionText()).isEqualTo("Câu hỏi đã cập nhật");
        assertThat(response.getCategory()).isEqualTo("Spring");
        assertThat(response.getDifficultyLevel()).isEqualTo("EASY");
        assertThat(response.getSuggestedAnswer()).isEqualTo("Câu trả lời mới");
        assertThat(response.getActive()).isFalse();
        assertThat(response.getCompetencyCriterionId()).isEqualTo(11L);

        verify(interviewQuestionRepository).save(question);
    }

    @Test
    @DisplayName("S2-07: Cập nhật thất bại khi không tìm thấy câu hỏi")
    void update_QuestionNotFound() {
        UpdateInterviewQuestionRequest request = new UpdateInterviewQuestionRequest(
                "Câu hỏi",
                "Java",
                "MEDIUM",
                "Câu trả lời",
                10L,
                true
        );

        when(interviewQuestionRepository.findById(999L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> interviewQuestionService.update(999L, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy câu hỏi phỏng vấn với id: 999");

        verify(competencyCriterionRepository, never()).findById(any());
    }

    @Test
    @DisplayName("S2-07: Cập nhật thất bại khi không tìm thấy tiêu chí")
    void update_CriterionNotFound() {
        CompetencyCriterion criterion = createCriterion();
        InterviewQuestion question = createQuestion(100L, criterion);

        UpdateInterviewQuestionRequest request = new UpdateInterviewQuestionRequest(
                "Câu hỏi",
                "Java",
                "MEDIUM",
                "Câu trả lời",
                999L,
                true
        );

        when(interviewQuestionRepository.findById(100L))
                .thenReturn(Optional.of(question));
        when(competencyCriterionRepository.findById(999L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> interviewQuestionService.update(100L, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy tiêu chí năng lực với id: 999");

        verify(interviewQuestionRepository, never()).save(any());
    }

    @Test
    @DisplayName("S2-07: Vô hiệu hóa câu hỏi thành công")
    void delete_Success() {
        CompetencyCriterion criterion = createCriterion();
        InterviewQuestion question = createQuestion(100L, criterion);
        question.setActive(true);

        when(interviewQuestionRepository.findById(100L))
                .thenReturn(Optional.of(question));
        when(interviewQuestionRepository.save(any(InterviewQuestion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        interviewQuestionService.delete(100L);

        assertThat(question.getActive()).isFalse();
        verify(interviewQuestionRepository).save(question);
    }

    @Test
    @DisplayName("S2-07: Không cho vô hiệu hóa lại câu hỏi đã vô hiệu hóa")
    void delete_AlreadyInactive() {
        CompetencyCriterion criterion = createCriterion();
        InterviewQuestion question = createQuestion(100L, criterion);
        question.setActive(false);

        when(interviewQuestionRepository.findById(100L))
                .thenReturn(Optional.of(question));

        assertThatThrownBy(() -> interviewQuestionService.delete(100L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Câu hỏi đã được vô hiệu hóa");

        verify(interviewQuestionRepository, never()).save(any());
    }

    @Test
    @DisplayName("S2-07: Xóa câu hỏi thất bại khi không tồn tại")
    void delete_NotFound() {
        when(interviewQuestionRepository.findById(999L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> interviewQuestionService.delete(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy câu hỏi phỏng vấn với id: 999");
    }

    @Test
    @DisplayName("S2-07: Tìm kiếm câu hỏi và trả về thông tin liên kết")
    void search_Success() {
        CompetencyCriterion criterion = createCriterion();
        InterviewQuestion question = createQuestion(100L, criterion);

        Pageable pageable = PageRequest.of(0, 20);
        Page<InterviewQuestion> page =
                new PageImpl<>(List.of(question), pageable, 1);

        when(interviewQuestionRepository.search(
                eq("java"),
                eq("HARD"),
                eq(30L),
                eq(10L),
                eq(true),
                eq(pageable)
        )).thenReturn(page);

        Page<InterviewQuestionResponse> result =
                interviewQuestionService.search(
                        "  java  ",
                        "  HARD  ",
                        30L,
                        10L,
                        true,
                        pageable
                );

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getQuestionText())
                .isEqualTo("Câu hỏi Java");
        assertThat(result.getContent().get(0).getJobTitle())
                .isEqualTo("Java Developer");
    }

    @Test
    @DisplayName("S2-07: Chuẩn hóa giá trị tìm kiếm rỗng thành null")
    void search_BlankValuesNormalizedToNull() {
        Pageable pageable = PageRequest.of(0, 20);

        when(interviewQuestionRepository.search(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                eq(pageable)
        )).thenReturn(Page.empty(pageable));

        Page<InterviewQuestionResponse> result =
                interviewQuestionService.search(
                        "   ",
                        "   ",
                        null,
                        null,
                        null,
                        pageable
                );

        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    @DisplayName("S2-07: Từ chối câu hỏi chưa liên kết tiêu chí")
    void getById_QuestionWithoutCriterion() {
        InterviewQuestion question = new InterviewQuestion();
        question.setId(100L);
        question.setQuestionText("Câu hỏi chưa liên kết");
        question.setActive(true);

        when(interviewQuestionRepository.findById(100L))
                .thenReturn(Optional.of(question));

        assertThatThrownBy(() -> interviewQuestionService.getById(100L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Câu hỏi chưa được liên kết với tiêu chí năng lực");
    }

    @Test
    @DisplayName("S2-07: Từ chối câu hỏi khi tiêu chí chưa liên kết khung năng lực")
    void getById_CriterionWithoutFramework() {
        CompetencyCriterion criterion = new CompetencyCriterion();
        criterion.setId(10L);
        criterion.setCriterionCode("JAVA-01");
        criterion.setCriterionName("Năng lực Java");
        criterion.setActive(true);

        InterviewQuestion question = new InterviewQuestion();
        question.setId(100L);
        question.setQuestionText("Câu hỏi Java");
        question.setCompetencyCriterion(criterion);
        question.setActive(true);

        when(interviewQuestionRepository.findById(100L))
                .thenReturn(Optional.of(question));

        assertThatThrownBy(() -> interviewQuestionService.getById(100L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tiêu chí năng lực chưa được liên kết với khung năng lực");
    }

    @Test
    @DisplayName("S2-07: Cho phép khung năng lực không có vị trí công việc")
    void getById_FrameworkWithoutJobTitle() {
        CompetencyFramework framework = new CompetencyFramework();
        framework.setId(20L);
        framework.setCompetencyName("Kỹ năng phát triển phần mềm");
        framework.setJobTitle(null);

        CompetencyCriterion criterion = new CompetencyCriterion();
        criterion.setId(10L);
        criterion.setCriterionCode("JAVA-01");
        criterion.setCriterionName("Năng lực Java");
        criterion.setCompetencyFramework(framework);

        InterviewQuestion question = createQuestion(100L, criterion);

        when(interviewQuestionRepository.findById(100L))
                .thenReturn(Optional.of(question));

        InterviewQuestionResponse response =
                interviewQuestionService.getById(100L);

        assertThat(response.getJobTitleId()).isNull();
        assertThat(response.getJobTitle()).isNull();
    }

    private CompetencyCriterion createCriterion() {
        JobTitle jobTitle = new JobTitle();
        jobTitle.setId(30L);
        jobTitle.setTitle("Java Developer");

        CompetencyFramework framework = new CompetencyFramework();
        framework.setId(20L);
        framework.setCompetencyName("Kỹ năng phát triển phần mềm");
        framework.setJobTitle(jobTitle);

        CompetencyCriterion criterion = new CompetencyCriterion();
        criterion.setId(10L);
        criterion.setCriterionCode("JAVA-01");
        criterion.setCriterionName("Năng lực Java");
        criterion.setCompetencyFramework(framework);
        criterion.setActive(true);

        return criterion;
    }

    private InterviewQuestion createQuestion(
            Long id,
            CompetencyCriterion criterion
    ) {
        InterviewQuestion question = new InterviewQuestion();
        question.setId(id);
        question.setQuestionText("Câu hỏi Java");
        question.setCategory("Java");
        question.setDifficultyLevel("HARD");
        question.setSuggestedAnswer("Câu trả lời");
        question.setCompetencyCriterion(criterion);
        question.setActive(true);
        return question;
    }
}