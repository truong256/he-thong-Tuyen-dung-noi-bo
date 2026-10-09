package com.example.auth_service.service;

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
import com.example.auth_service.service.impl.CompetencyFrameworkServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompetencyFrameworkServiceTest {

    @Mock
    private CompetencyFrameworkRepository competencyFrameworkRepository;

    @Mock
    private CompetencyCriterionRepository competencyCriterionRepository;

    @Mock
    private JobTitleRepository jobTitleRepository;

    @Mock
    private InterviewQuestionRepository interviewQuestionRepository;

    @InjectMocks
    private CompetencyFrameworkServiceImpl service;

    private CompetencyFramework framework;
    private CompetencyCriterion criterion1;
    private CompetencyCriterion criterion2;

    @BeforeEach
    void setUp() {
        framework = new CompetencyFramework();
        framework.setId(1L);
        framework.setCompetencyName("Năng lực Backend Developer");
        framework.setDescription("Mô tả backend");
        framework.setCategory("KỸ THUẬT");
        framework.setWeightPercent(100);

        criterion1 = new CompetencyCriterion();
        criterion1.setId(10L);
        criterion1.setCriterionCode("BE_01");
        criterion1.setCriterionName("Java Core & Spring Boot");
        criterion1.setDescription("Thành thạo Java & Spring");
        criterion1.setWeightPercent(60);
        criterion1.setActive(true);
        criterion1.setCompetencyFramework(framework);

        criterion2 = new CompetencyCriterion();
        criterion2.setId(20L);
        criterion2.setCriterionCode("BE_02");
        criterion2.setCriterionName("Database Design & SQL");
        criterion2.setDescription("Thiết kế DB chuẩn");
        criterion2.setWeightPercent(40);
        criterion2.setActive(true);
        criterion2.setCompetencyFramework(framework);

        framework.setCriteria(new ArrayList<>(List.of(criterion1, criterion2)));
    }

    @Test
    @DisplayName("TC01: Tạo khung thành công khi tổng trọng số chính xác 100%")
    void testCreateFramework_Total100_Success() {
        CompetencyFrameworkRequest request = new CompetencyFrameworkRequest(
                "Khung năng lực mới",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "C1", "Tiêu chí 1", "Mô tả 1", 40, true),
                        new CompetencyCriterionRequest(null, "C2", "Tiêu chí 2", "Mô tả 2", 35, true),
                        new CompetencyCriterionRequest(null, "C3", "Tiêu chí 3", "Mô tả 3", 25, true)
                ),
                null
        );

        when(competencyFrameworkRepository.existsByCompetencyNameIgnoreCase(anyString())).thenReturn(false);
        when(competencyFrameworkRepository.save(any(CompetencyFramework.class))).thenAnswer(inv -> {
            CompetencyFramework saved = inv.getArgument(0);
            saved.setId(100L);
            return saved;
        });

        CompetencyFrameworkResponse response = service.createFramework(request);

        assertThat(response).isNotNull();
        assertThat(response.competencyName()).isEqualTo("Khung năng lực mới");
        assertThat(response.weightPercent()).isEqualTo(100);
        assertThat(response.criteriaCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("TC02: Từ chối tạo khung khi tổng trọng số = 99%")
    void testCreateFramework_Total99_Rejected() {
        CompetencyFrameworkRequest request = new CompetencyFrameworkRequest(
                "Khung thiếu trọng số",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "C1", "Tiêu chí 1", "Mô tả 1", 50, true),
                        new CompetencyCriterionRequest(null, "C2", "Tiêu chí 2", "Mô tả 2", 49, true)
                ),
                null
        );

        assertThatThrownBy(() -> service.createFramework(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("100%")
                .hasMessageContaining("99%");
    }

    @Test
    @DisplayName("TC03: Từ chối tạo khung khi tổng trọng số = 101%")
    void testCreateFramework_Total101_Rejected() {
        CompetencyFrameworkRequest request = new CompetencyFrameworkRequest(
                "Khung vượt trọng số",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "C1", "Tiêu chí 1", "Mô tả 1", 60, true),
                        new CompetencyCriterionRequest(null, "C2", "Tiêu chí 2", "Mô tả 2", 41, true)
                ),
                null
        );

        assertThatThrownBy(() -> service.createFramework(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("100%")
                .hasMessageContaining("101%");
    }

    @Test
    @DisplayName("TC04: Từ chối tạo khung khi tên khung rỗng")
    void testCreateFramework_MissingName_Rejected() {
        CompetencyFrameworkRequest request = new CompetencyFrameworkRequest(
                "   ",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "C1", "Tiêu chí 1", "Mô tả 1", 100, true)
                ),
                null
        );

        assertThatThrownBy(() -> service.createFramework(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tên khung năng lực không được để trống");
    }

    @Test
    @DisplayName("TC05: Từ chối tạo khung khi không có tiêu chí nào")
    void testCreateFramework_NoCriteria_Rejected() {
        CompetencyFrameworkRequest request = new CompetencyFrameworkRequest(
                "Khung không có tiêu chí",
                "Mô tả",
                "KỸ THUẬT",
                List.of(),
                null
        );

        assertThatThrownBy(() -> service.createFramework(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Khung năng lực phải có ít nhất một tiêu chí");
    }

    @Test
    @DisplayName("TC06: Từ chối tạo khung khi trùng mã tiêu chí trong cùng một khung")
    void testCreateFramework_DuplicateCriterionCode_Rejected() {
        CompetencyFrameworkRequest request = new CompetencyFrameworkRequest(
                "Khung trùng mã",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "BE_01", "Tiêu chí A", "Mô tả A", 50, true),
                        new CompetencyCriterionRequest(null, "be_01", "Tiêu chí B", "Mô tả B", 50, true)
                ),
                null
        );

        assertThatThrownBy(() -> service.createFramework(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("trùng lặp");
    }

    @Test
    @DisplayName("TC07: Chỉnh sửa khung năng lực thành công và bảo toàn ID tiêu chí cũ")
    void testUpdateFramework_Success_PreservesCriterionId() {
        when(competencyFrameworkRepository.findById(1L)).thenReturn(Optional.of(framework));
        when(competencyFrameworkRepository.existsByCompetencyNameIgnoreCaseAndIdNot(anyString(), anyLong())).thenReturn(false);
        when(competencyFrameworkRepository.save(any(CompetencyFramework.class))).thenAnswer(inv -> inv.getArgument(0));

        CompetencyFrameworkRequest updateRequest = new CompetencyFrameworkRequest(
                "Năng lực Backend Developer (Updated)",
                "Mô tả cập nhật",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(10L, "BE_01", "Java Core & Spring Boot 3", "Mô tả mới", 70, true),
                        new CompetencyCriterionRequest(20L, "BE_02", "PostgreSQL & JPA", "Mô tả DB mới", 30, true)
                ),
                null
        );

        CompetencyFrameworkResponse response = service.updateFramework(1L, updateRequest);

        assertThat(response.competencyName()).isEqualTo("Năng lực Backend Developer (Updated)");
        assertThat(response.criteria()).hasSize(2);
        // Ensure criterion IDs were preserved in-place
        assertThat(response.criteria().stream().map(CompetencyCriterionResponse::getId).toList())
                .containsExactlyInAnyOrder(10L, 20L);
    }

    @Test
    @DisplayName("TC08 & TC09: Gắn khung năng lực cho nhiều chức danh công việc")
    void testAssociateFramework_WithMultipleJobTitles() {
        when(competencyFrameworkRepository.findById(1L)).thenReturn(Optional.of(framework));
        when(competencyFrameworkRepository.save(any(CompetencyFramework.class))).thenAnswer(inv -> inv.getArgument(0));

        JobTitle titleA = new JobTitle();
        titleA.setId(101L);
        titleA.setTitle("Backend Developer");
        titleA.setCode("BE-DEV");

        JobTitle titleB = new JobTitle();
        titleB.setId(102L);
        titleB.setTitle("Senior Backend Engineer");
        titleB.setCode("BE-SR");

        when(jobTitleRepository.findById(101L)).thenReturn(Optional.of(titleA));
        when(jobTitleRepository.findById(102L)).thenReturn(Optional.of(titleB));
        when(jobTitleRepository.findByCompetencyFrameworkId(1L)).thenReturn(List.of(titleA, titleB));

        CompetencyFrameworkRequest updateRequest = new CompetencyFrameworkRequest(
                "Năng lực Backend Developer",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(10L, "BE_01", "Java Core", "Mô tả", 60, true),
                        new CompetencyCriterionRequest(20L, "BE_02", "SQL", "Mô tả", 40, true)
                ),
                List.of(101L, 102L)
        );

        CompetencyFrameworkResponse response = service.updateFramework(1L, updateRequest);

        assertThat(response.jobTitlesCount()).isEqualTo(2);
        assertThat(response.jobTitles()).extracting(JobTitleSummaryResponse::title)
                .containsExactlyInAnyOrder("Backend Developer", "Senior Backend Engineer");
        verify(jobTitleRepository, times(2)).save(any(JobTitle.class));
    }

    @Test
    @DisplayName("TC10: Xóa khung đang được chức danh sử dụng -> Từ chối và bảo vệ dữ liệu")
    void testDeleteFramework_InUseByJobTitle_ThrowsException() {
        when(competencyFrameworkRepository.findById(1L)).thenReturn(Optional.of(framework));
        when(jobTitleRepository.existsByCompetencyFrameworkId(1L)).thenReturn(true);

        assertThatThrownBy(() -> service.deleteFramework(1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể xóa khung năng lực đang được sử dụng bởi chức danh");

        verify(competencyFrameworkRepository, never()).delete(any());
    }

    @Test
    @DisplayName("TC11: Không thể xóa tiêu chí đang được câu hỏi phỏng vấn tham chiếu")
    void testUpdateFramework_DeleteCriterionWithQuestions_ThrowsException() {
        when(competencyFrameworkRepository.findById(1L)).thenReturn(Optional.of(framework));
        // Criterion 20L has questions
        when(interviewQuestionRepository.existsByCompetencyCriterionId(20L)).thenReturn(true);

        // Request only keeps 10L (drops 20L)
        CompetencyFrameworkRequest updateRequest = new CompetencyFrameworkRequest(
                "Năng lực Backend",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(10L, "BE_01", "Java Core", "Mô tả", 100, true)
                ),
                null
        );

        assertThatThrownBy(() -> service.updateFramework(1L, updateRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đang được sử dụng bởi câu hỏi phỏng vấn");

        verify(competencyFrameworkRepository, never()).save(any());
    }

    @Test
    @DisplayName("Từ chối khi trọng số tiêu chí âm hoặc bằng 0")
    void testCreateFramework_NonPositiveWeight_Rejected() {
        CompetencyFrameworkRequest request = new CompetencyFrameworkRequest(
                "Khung lỗi trọng số",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "C1", "T1", "Mô tả", -10, true),
                        new CompetencyCriterionRequest(null, "C2", "T2", "Mô tả", 110, true)
                ),
                null
        );

        assertThatThrownBy(() -> service.createFramework(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("lớn hơn 0");
    }

    @Test
    @DisplayName("Từ chối khi tên khung năng lực bị trùng lặp")
    void testCreateFramework_DuplicateFrameworkName_Conflict() {
        CompetencyFrameworkRequest request = new CompetencyFrameworkRequest(
                "Năng lực Backend Developer",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "C1", "T1", "Mô tả", 100, true)
                ),
                null
        );

        when(competencyFrameworkRepository.existsByCompetencyNameIgnoreCase(anyString())).thenReturn(true);

        assertThatThrownBy(() -> service.createFramework(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("đã tồn tại");
    }

    @Test
    @DisplayName("Lấy chi tiết khung năng lực theo ID thành công")
    void testGetFrameworkById_Success() {
        when(competencyFrameworkRepository.findById(1L)).thenReturn(Optional.of(framework));

        CompetencyFrameworkResponse response = service.getFrameworkById(1L);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.competencyName()).isEqualTo("Năng lực Backend Developer");
    }

    @Test
    @DisplayName("Lấy chi tiết khung năng lực theo ID không tìm thấy -> Ném ResourceNotFoundException")
    void testGetFrameworkById_NotFound() {
        when(competencyFrameworkRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getFrameworkById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("Lấy danh sách tất cả khung năng lực không kèm tìm kiếm")
    void testGetAllFrameworks_NoSearch() {
        CompetencyFramework fw2 = new CompetencyFramework();
        fw2.setId(2L);
        fw2.setCompetencyName("Năng lực Frontend Developer");
        fw2.setDescription("Mô tả frontend");
        fw2.setCategory("KỸ THUẬT");
        fw2.setWeightPercent(100);

        when(competencyFrameworkRepository.findAll()).thenReturn(List.of(framework, fw2));

        List<CompetencyFrameworkResponse> list = service.getAllFrameworks(null);

        assertThat(list).hasSize(2);
    }

    @Test
    @DisplayName("Tìm kiếm khung năng lực theo tên, danh mục và mô tả")
    void testGetAllFrameworks_WithSearch() {
        CompetencyFramework fw2 = new CompetencyFramework();
        fw2.setId(2L);
        fw2.setCompetencyName("Năng lực HR");
        fw2.setDescription("Mô tả nhân sự");
        fw2.setCategory("NHÂN SỰ");
        fw2.setWeightPercent(100);

        when(competencyFrameworkRepository.findAll()).thenReturn(List.of(framework, fw2));

        // Search by name
        List<CompetencyFrameworkResponse> searchByName = service.getAllFrameworks("Backend");
        assertThat(searchByName).hasSize(1);
        assertThat(searchByName.get(0).competencyName()).contains("Backend");

        // Search by category
        List<CompetencyFrameworkResponse> searchByCat = service.getAllFrameworks("NHÂN SỰ");
        assertThat(searchByCat).hasSize(1);
        assertThat(searchByCat.get(0).category()).isEqualTo("NHÂN SỰ");

        // Search not matching
        List<CompetencyFrameworkResponse> searchNotFound = service.getAllFrameworks("NON_EXISTENT");
        assertThat(searchNotFound).isEmpty();
    }

    @Test
    @DisplayName("Xóa khung năng lực thành công khi không có ràng buộc")
    void testDeleteFramework_Success() {
        when(competencyFrameworkRepository.findById(1L)).thenReturn(Optional.of(framework));
        when(jobTitleRepository.existsByCompetencyFrameworkId(1L)).thenReturn(false);
        when(interviewQuestionRepository.existsByCompetencyCriterionId(anyLong())).thenReturn(false);

        service.deleteFramework(1L);

        verify(competencyFrameworkRepository, times(1)).delete(framework);
    }

    @Test
    @DisplayName("Xóa khung năng lực không tìm thấy ID -> Ném ResourceNotFoundException")
    void testDeleteFramework_NotFound() {
        when(competencyFrameworkRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteFramework(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Xóa khung năng lực thất bại khi có tiêu chí đang được dùng bởi câu hỏi phỏng vấn")
    void testDeleteFramework_CriterionUsedByQuestions() {
        when(competencyFrameworkRepository.findById(1L)).thenReturn(Optional.of(framework));
        when(jobTitleRepository.existsByCompetencyFrameworkId(1L)).thenReturn(false);
        when(interviewQuestionRepository.existsByCompetencyCriterionId(10L)).thenReturn(true);

        assertThatThrownBy(() -> service.deleteFramework(1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("câu hỏi phỏng vấn");

        verify(competencyFrameworkRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Cập nhật khung năng lực không tìm thấy ID -> Ném ResourceNotFoundException")
    void testUpdateFramework_NotFound() {
        CompetencyFrameworkRequest req = new CompetencyFrameworkRequest(
                "Khung", "Mô tả", "KỸ THUẬT",
                List.of(new CompetencyCriterionRequest(null, "C1", "T1", "M", 100, true)),
                null
        );
        when(competencyFrameworkRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateFramework(999L, req))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Cập nhật khung năng lực khi tên trùng với khung khác -> Ném ConflictException")
    void testUpdateFramework_DuplicateName_Conflict() {
        CompetencyFrameworkRequest req = new CompetencyFrameworkRequest(
                "Tên Khung Trùng", "Mô tả", "KỸ THUẬT",
                List.of(new CompetencyCriterionRequest(null, "C1", "T1", "M", 100, true)),
                null
        );
        when(competencyFrameworkRepository.findById(1L)).thenReturn(Optional.of(framework));
        when(competencyFrameworkRepository.existsByCompetencyNameIgnoreCaseAndIdNot(eq("Tên Khung Trùng"), eq(1L))).thenReturn(true);

        assertThatThrownBy(() -> service.updateFramework(1L, req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("đã tồn tại");
    }

    @Test
    @DisplayName("Cập nhật khung năng lực và thêm tiêu chí mới cùng xóa tiêu chí cũ không dùng")
    void testUpdateFramework_AddNewCriterion_Success() {
        when(competencyFrameworkRepository.findById(1L)).thenReturn(Optional.of(framework));
        when(competencyFrameworkRepository.existsByCompetencyNameIgnoreCaseAndIdNot(anyString(), anyLong())).thenReturn(false);
        when(interviewQuestionRepository.existsByCompetencyCriterionId(anyLong())).thenReturn(false);
        when(competencyFrameworkRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Drop criterion2 (20L), update criterion1 (10L), add new criterion (null id)
        CompetencyFrameworkRequest updateRequest = new CompetencyFrameworkRequest(
                "Năng lực Backend Developer",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(10L, "BE_01", "Java Core", "Mô tả", 50, true),
                        new CompetencyCriterionRequest(null, "BE_03", "Microservices & Docker", "Mô tả", 50, true)
                ),
                null
        );

        CompetencyFrameworkResponse response = service.updateFramework(1L, updateRequest);

        assertThat(response.criteria()).hasSize(2);
        assertThat(response.criteria()).extracting(CompetencyCriterionResponse::getCriterionCode)
                .containsExactlyInAnyOrder("BE_01", "BE_03");
    }

    @Test
    @DisplayName("Tạo khung năng lực kèm liên kết chức danh")
    void testCreateFramework_WithJobTitles_Success() {
        JobTitle jt = new JobTitle();
        jt.setId(201L);
        jt.setTitle("Junior Developer");

        CompetencyFrameworkRequest request = new CompetencyFrameworkRequest(
                "Khung Kèm Chức Danh",
                "Mô tả",
                "KỸ THUẬT",
                List.of(new CompetencyCriterionRequest(null, "C1", "T1", "M", 100, true)),
                List.of(201L)
        );

        when(competencyFrameworkRepository.existsByCompetencyNameIgnoreCase(anyString())).thenReturn(false);
        when(jobTitleRepository.findById(201L)).thenReturn(Optional.of(jt));
        when(jobTitleRepository.findByCompetencyFrameworkId(any())).thenReturn(List.of(jt));
        when(competencyFrameworkRepository.save(any(CompetencyFramework.class))).thenAnswer(inv -> {
            CompetencyFramework f = inv.getArgument(0);
            f.setId(500L);
            return f;
        });

        CompetencyFrameworkResponse response = service.createFramework(request);

        assertThat(response.jobTitlesCount()).isEqualTo(1);
        verify(jobTitleRepository, times(1)).save(jt);
    }
}
