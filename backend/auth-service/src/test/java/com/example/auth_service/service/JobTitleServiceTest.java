package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.dto.JobTitleRequest;
import com.example.auth_service.dto.JobTitleResponse;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.CompetencyFrameworkRepository;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobTitleServiceTest {

    @Mock
    private JobTitleRepository repository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private RecruitmentRequisitionRepository requisitionRepository;

    @Mock
    private CompetencyFrameworkRepository competencyFrameworkRepository;

    @InjectMocks
    private JobTitleService service;

    private Department department;
    private JobTitle jobTitle;

    @BeforeEach
    void setUp() {
        department = new Department(10L, "Phòng Công Nghệ", "TECH", "Mô tả", null, 1L, true, Instant.now());

        jobTitle = new JobTitle();
        jobTitle.setId(1L);
        jobTitle.setTitle("Senior Java Developer");
        jobTitle.setCode("JAVA-SR");
        jobTitle.setDepartment(department);
        jobTitle.setLevel("SENIOR");
        jobTitle.setJobFamily("TECH");
        jobTitle.setMinSalary(30000000L);
        jobTitle.setMaxSalary(50000000L);
        jobTitle.setJobDescription("Mô tả công việc Java");
        jobTitle.setKeyResponsibilities("Thiết kế API; Tối ưu DB");
        jobTitle.setRequirements("4+ năm kinh nghiệm Java");
        jobTitle.setCompetencies("Java; Spring Boot; SQL");
        jobTitle.setStandardHeadcount(10);
        jobTitle.setCurrentHeadcount(8);
        jobTitle.setActive(true);
        jobTitle.setCreatedAt(Instant.now());
    }

    @Test
    @DisplayName("list() returns matching job titles")
    void list_Success() {
        when(repository.searchJobTitles(any(), any(), any(), any(), any())).thenReturn(List.of(jobTitle));

        List<JobTitleResponse> responses = service.list("Java", true, 10L, true);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).title()).isEqualTo("Senior Java Developer");
        assertThat(responses.get(0).code()).isEqualTo("JAVA-SR");
        assertThat(responses.get(0).departmentId()).isEqualTo(10L);
        assertThat(responses.get(0).departmentName()).isEqualTo("Phòng Công Nghệ");
        assertThat(responses.get(0).salaryRangeDisplay()).isEqualTo("30 - 50 triệu VNĐ");
        assertThat(responses.get(0).keyResponsibilities()).containsExactly("Thiết kế API", "Tối ưu DB");
    }

    @Test
    @DisplayName("get() returns single job title by id")
    void get_Success() {
        when(repository.findById(1L)).thenReturn(Optional.of(jobTitle));

        JobTitleResponse response = service.get(1L, true);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.title()).isEqualTo("Senior Java Developer");
    }

    @Test
    @DisplayName("get() throws ResourceNotFoundException when id not found")
    void get_NotFound() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(999L, true))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy");
    }

    @Test
    @DisplayName("list() redacts salary for users outside the HR manager role")
    void list_RedactsSalaryWhenNotAuthorized() {
        when(repository.searchJobTitles(any(), any(), any(), any(), any())).thenReturn(List.of(jobTitle));

        JobTitleResponse response = service.list(null, true, null, false).getFirst();

        assertThat(response.minSalary()).isNull();
        assertThat(response.maxSalary()).isNull();
        assertThat(response.salaryRangeDisplay()).isNull();
    }

    @Test
    @DisplayName("create() succeeds with valid request and department")
    void create_Success() {
        JobTitleRequest req = new JobTitleRequest(
                "Frontend Lead",
                "FE-LEAD",
                10L,
                "LEAD",
                "TECH",
                40000000L,
                60000000L,
                "Mô tả FE Lead",
                List.of("Phát triển React", "Quản lý nhóm"),
                List.of("5+ năm kinh nghiệm"),
                List.of("React", "TypeScript"),
                5,
                3,
                true
        );

        when(repository.existsByCodeIgnoreCase("FE-LEAD")).thenReturn(false);
        when(repository.existsByTitleIgnoreCase("Frontend Lead")).thenReturn(false);
        when(departmentRepository.findById(10L)).thenReturn(Optional.of(department));
        when(repository.save(any(JobTitle.class))).thenAnswer(inv -> {
            JobTitle jt = inv.getArgument(0);
            jt.setId(2L);
            return jt;
        });

        JobTitleResponse response = service.create(req);

        assertThat(response.id()).isEqualTo(2L);
        assertThat(response.title()).isEqualTo("Frontend Lead");
        assertThat(response.code()).isEqualTo("FE-LEAD");
        assertThat(response.departmentId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("create() throws ConflictException on duplicate code")
    void create_DuplicateCode() {
        JobTitleRequest req = new JobTitleRequest(
                "Another Title",
                "JAVA-SR",
                null,
                "SENIOR",
                "TECH",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true
        );

        when(repository.existsByCodeIgnoreCase("JAVA-SR")).thenReturn(true);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Mã chức danh đã tồn tại");
    }

    @Test
    @DisplayName("create() throws ConflictException on duplicate title")
    void create_DuplicateTitle() {
        JobTitleRequest req = new JobTitleRequest(
                "Senior Java Developer",
                "JAVA-NEW",
                null,
                "SENIOR",
                "TECH",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true
        );

        when(repository.existsByCodeIgnoreCase("JAVA-NEW")).thenReturn(false);
        when(repository.existsByTitleIgnoreCase("Senior Java Developer")).thenReturn(true);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Tên chức danh đã tồn tại");
    }

    @Test
    @DisplayName("create() rejects a salary range whose minimum exceeds its maximum")
    void create_InvalidSalaryRange() {
        JobTitleRequest req = new JobTitleRequest(
                "Backend Engineer",
                "BE-01",
                null,
                "MIDDLE",
                "TECH",
                50000000L,
                30000000L,
                null,
                null,
                null,
                null,
                1,
                0,
                true
        );

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Lương tối thiểu");

        verifyNoInteractions(repository, departmentRepository);
    }

    @Test
    @DisplayName("update() succeeds and modifies job title")
    void update_Success() {
        JobTitleRequest req = new JobTitleRequest(
                "Senior Java Engineer",
                "JAVA-SR",
                10L,
                "SENIOR",
                "TECH",
                35000000L,
                55000000L,
                "Mô tả mới",
                List.of("API", "DB"),
                List.of("Kinh nghiệm"),
                List.of("Kỹ năng"),
                12,
                9,
                true
        );

        when(repository.findById(1L)).thenReturn(Optional.of(jobTitle));
        when(repository.existsByCodeIgnoreCaseAndIdNot("JAVA-SR", 1L)).thenReturn(false);
        when(repository.existsByTitleIgnoreCaseAndIdNot("Senior Java Engineer", 1L)).thenReturn(false);
        when(departmentRepository.findById(10L)).thenReturn(Optional.of(department));
        when(repository.save(any(JobTitle.class))).thenAnswer(inv -> inv.getArgument(0));

        JobTitleResponse response = service.update(1L, req);

        assertThat(response.title()).isEqualTo("Senior Java Engineer");
        assertThat(response.standardHeadcount()).isEqualTo(12);
    }

    @Test
    @DisplayName("setActive() toggles job title active state")
    void setActive_Success() {
        when(repository.findById(1L)).thenReturn(Optional.of(jobTitle));
        when(repository.save(any(JobTitle.class))).thenAnswer(inv -> inv.getArgument(0));

        JobTitleResponse response = service.setActive(1L, false);

        assertThat(response.active()).isFalse();
    }

    @Test
    @DisplayName("delete() deletes job title when no dependencies exist")
    void delete_Success() {
        jobTitle.setCurrentHeadcount(0);
        when(repository.findById(1L)).thenReturn(Optional.of(jobTitle));
        when(requisitionRepository.existsByJobTitleId(1L)).thenReturn(false);
        when(competencyFrameworkRepository.existsByJobTitleId(1L)).thenReturn(false);
        doNothing().when(repository).delete(jobTitle);

        service.delete(1L);

        verify(repository, times(1)).delete(jobTitle);
    }

    @Test
    @DisplayName("delete() rejects when current headcount > 0")
    void delete_FailsWhenCurrentHeadcountPositive() {
        jobTitle.setCurrentHeadcount(5);
        when(repository.findById(1L)).thenReturn(Optional.of(jobTitle));

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("nhân sự đảm nhiệm");

        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("delete() rejects when recruitment requisitions reference job title")
    void delete_FailsWhenRequisitionsExist() {
        jobTitle.setCurrentHeadcount(0);
        when(repository.findById(1L)).thenReturn(Optional.of(jobTitle));
        when(requisitionRepository.existsByJobTitleId(1L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("yêu cầu tuyển dụng liên kết");

        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("delete() rejects when competency frameworks reference job title")
    void delete_FailsWhenCompetencyFrameworksExist() {
        jobTitle.setCurrentHeadcount(0);
        when(repository.findById(1L)).thenReturn(Optional.of(jobTitle));
        when(requisitionRepository.existsByJobTitleId(1L)).thenReturn(false);
        when(competencyFrameworkRepository.existsByJobTitleId(1L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("khung năng lực liên kết");

        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("create() rejects inactive department")
    void create_InactiveDepartment() {
        Department inactiveDept = new Department(10L, "Phòng Đã Đóng", "OLD", "Mô tả", null, 1L, false, Instant.now());
        JobTitleRequest req = new JobTitleRequest(
                "Frontend Lead",
                "FE-LEAD",
                10L,
                "LEAD",
                "TECH",
                40000000L,
                60000000L,
                "Mô tả",
                null,
                null,
                null,
                5,
                0,
                true
        );

        when(repository.existsByCodeIgnoreCase("FE-LEAD")).thenReturn(false);
        when(repository.existsByTitleIgnoreCase("Frontend Lead")).thenReturn(false);
        when(departmentRepository.findById(10L)).thenReturn(Optional.of(inactiveDept));

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Phòng ban đã ngừng áp dụng");
    }
}
