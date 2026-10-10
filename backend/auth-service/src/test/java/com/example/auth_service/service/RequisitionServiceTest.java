package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.CreateRequisitionRequest;
import com.example.auth_service.dto.RequisitionDraftRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RequisitionServiceTest {

    @Mock private RecruitmentRequisitionRepository requisitions;
    @Mock private DepartmentRepository departments;
    @Mock private JobTitleRepository jobTitles;
    @Mock private UserRepository users;
    @Mock private RequisitionApprovalWorkflowService approvalWorkflow;

    @InjectMocks private RequisitionService service;

    private User hiringManager;
    private User hrManager;
    private User anotherUser;
    private Department dept;
    private JobTitle job;

    @BeforeEach
    void setUp() {
        hiringManager = new User("hm@example.com", "pass", "HIRING_MANAGER");
        hiringManager.setId(10L);
        hiringManager.setFullName("Nguyen Van HM");
        hiringManager.setRoles(Set.of(new Role(RoleName.HIRING_MANAGER, "Hiring Manager")));

        hrManager = new User("hr@example.com", "pass", "HR_MANAGER");
        hrManager.setId(20L);
        hrManager.setFullName("Tran Thi HR");
        hrManager.setRoles(Set.of(new Role(RoleName.HR_MANAGER, "HR Manager")));

        anotherUser = new User("another@example.com", "pass", "HIRING_MANAGER");
        anotherUser.setId(30L);
        anotherUser.setFullName("Le Van Another");
        anotherUser.setRoles(Set.of(new Role(RoleName.HIRING_MANAGER, "Hiring Manager")));

        dept = new Department(1L, "Phòng Công nghệ", "TECH", "Mô tả", null, hiringManager.getId(), true, Instant.now());
        job = new JobTitle();
        job.setId(2L);
        job.setTitle("Lập trình viên Java");
        job.setCode("JAVA-DEV");
        job.setActive(true);
        job.setMinSalary(15_000_000L);
        job.setMaxSalary(30_000_000L);

        setAuth(hiringManager);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setAuth(User user) {
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(user.getEmail(), null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
        lenient().when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }

    @Test
    void saveDraft_SuccessfulWithMinimalData() {
        RequisitionDraftRequest request = new RequisitionDraftRequest(
                "Nháp vị trí Java",
                null,
                null,
                2,
                "NEW",
                null,
                null,
                null,
                "VND",
                null,
                null,
                null,
                null,
                null,
                null,
                "ONSITE"
        );

        when(requisitions.countByRequisitionCodeStartingWith(any())).thenReturn(0L);
        when(requisitions.existsByRequisitionCode(any())).thenReturn(false);
        when(requisitions.save(any(RecruitmentRequisition.class))).thenAnswer(inv -> {
            RecruitmentRequisition req = inv.getArgument(0);
            req.setId(100L);
            return req;
        });

        RequisitionResponse response = service.saveDraft(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.status()).isEqualTo("DRAFT");
        assertThat(response.title()).isEqualTo("Nháp vị trí Java");
        assertThat(response.createdByUserId()).isEqualTo(hiringManager.getId());
        verify(requisitions).save(any(RecruitmentRequisition.class));
    }

    @Test
    void saveDraft_WithInvalidDepartmentFails() {
        RequisitionDraftRequest request = new RequisitionDraftRequest(
                "Nháp vị trí",
                999L,
                null,
                1,
                "NEW",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        when(departments.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.saveDraft(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Phòng ban không tồn tại");
    }

    @Test
    void updateDraft_SuccessfulByOwner() {
        RecruitmentRequisition existing = new RecruitmentRequisition();
        existing.setId(100L);
        existing.setStatus("DRAFT");
        existing.setRequisitionCode("REQ-202610-0001");
        existing.setTitle("Tên cũ");
        existing.setCreatedByUserId(hiringManager.getId());

        when(requisitions.findById(100L)).thenReturn(Optional.of(existing));
        when(departments.findById(1L)).thenReturn(Optional.of(dept));
        when(jobTitles.findById(2L)).thenReturn(Optional.of(job));
        when(requisitions.save(any(RecruitmentRequisition.class))).thenAnswer(inv -> inv.getArgument(0));

        RequisitionDraftRequest updateReq = new RequisitionDraftRequest(
                "Tên mới",
                1L,
                2L,
                3,
                "REPLACEMENT",
                "Cần người gấp",
                20_000_000L,
                25_000_000L,
                "VND",
                null,
                LocalDate.now().plusDays(10),
                "JD chi tiết",
                "Yêu cầu 2 năm KN",
                "Thưởng tháng 13",
                "Hà Nội",
                "HYBRID"
        );

        RequisitionResponse updated = service.updateDraft(100L, updateReq);

        assertThat(updated.title()).isEqualTo("Tên mới");
        assertThat(updated.quantity()).isEqualTo(3);
        assertThat(updated.recruitmentType()).isEqualTo("REPLACEMENT");
        assertThat(updated.workingModel()).isEqualTo("HYBRID");
    }

    @Test
    void updateDraft_FailsWhenNotDraft() {
        RecruitmentRequisition existing = new RecruitmentRequisition();
        existing.setId(100L);
        existing.setStatus("PENDING_APPROVAL");
        existing.setCreatedByUserId(hiringManager.getId());

        when(requisitions.findById(100L)).thenReturn(Optional.of(existing));

        RequisitionDraftRequest request = new RequisitionDraftRequest("Update", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> service.updateDraft(100L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ được chỉnh sửa yêu cầu ở trạng thái bản nháp");
    }

    @Test
    void updateDraft_FailsWhenNotOwnerAndNotAdmin() {
        RecruitmentRequisition existing = new RecruitmentRequisition();
        existing.setId(100L);
        existing.setStatus("DRAFT");
        existing.setCreatedByUserId(anotherUser.getId());

        when(requisitions.findById(100L)).thenReturn(Optional.of(existing));

        RequisitionDraftRequest request = new RequisitionDraftRequest("Update", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> service.updateDraft(100L, request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không có quyền chỉnh sửa bản nháp này");
    }

    @Test
    void createAndSubmit_Successful() {
        CreateRequisitionRequest request = new CreateRequisitionRequest(
                "Tuyển Lập trình viên Backend",
                1L,
                2L,
                2,
                "NEW",
                "Mở rộng dự án mới",
                18_000_000L,
                28_000_000L,
                "VND",
                null,
                LocalDate.now().plusDays(30),
                "Phát triển Spring Boot API",
                "Tối thiểu 1 năm kinh nghiệm",
                "Bảo hiểm đầy đủ",
                "Hà Nội",
                "ONSITE"
        );

        when(departments.findById(1L)).thenReturn(Optional.of(dept));
        when(jobTitles.findById(2L)).thenReturn(Optional.of(job));
        when(requisitions.countByRequisitionCodeStartingWith(any())).thenReturn(0L);
        when(requisitions.existsByRequisitionCode(any())).thenReturn(false);
        when(requisitions.save(any(RecruitmentRequisition.class))).thenAnswer(inv -> {
            RecruitmentRequisition req = inv.getArgument(0);
            req.setId(200L);
            return req;
        });

        RequisitionResponse response = service.createAndSubmit(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(200L);
        assertThat(response.status()).isEqualTo("PENDING_APPROVAL");
        assertThat(response.submittedAt()).isNotNull();
    }

    @Test
    void createAndSubmit_FailsWhenSalaryOutsideRangeWithoutExplanation() {
        // Job Title range: 15m - 30m, requested: 35m (vượt trần) mà không có giải trình
        CreateRequisitionRequest request = new CreateRequisitionRequest(
                "Tuyển Senior Backend",
                1L,
                2L,
                1,
                "NEW",
                "Cần người giỏi",
                20_000_000L,
                35_000_000L,
                "VND",
                null, // không có giải trình
                LocalDate.now().plusDays(20),
                "JD...",
                "Yêu cầu...",
                null,
                null,
                null
        );

        when(departments.findById(1L)).thenReturn(Optional.of(dept));
        when(jobTitles.findById(2L)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.createAndSubmit(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Dải lương nằm ngoài khung lương tiêu chuẩn");
    }

    @Test
    void createAndSubmit_AllowedWhenSalaryOutsideRangeWithExplanation() {
        CreateRequisitionRequest request = new CreateRequisitionRequest(
                "Tuyển Senior Backend",
                1L,
                2L,
                1,
                "NEW",
                "Cần người giỏi",
                20_000_000L,
                35_000_000L,
                "VND",
                "Chuyên gia kiến trúc công nghệ cao, chấp nhận vượt khung",
                LocalDate.now().plusDays(20),
                "JD...",
                "Yêu cầu...",
                null,
                null,
                null
        );

        when(departments.findById(1L)).thenReturn(Optional.of(dept));
        when(jobTitles.findById(2L)).thenReturn(Optional.of(job));
        when(requisitions.countByRequisitionCodeStartingWith(any())).thenReturn(0L);
        when(requisitions.existsByRequisitionCode(any())).thenReturn(false);
        when(requisitions.save(any(RecruitmentRequisition.class))).thenAnswer(inv -> {
            RecruitmentRequisition req = inv.getArgument(0);
            req.setId(201L);
            return req;
        });

        RequisitionResponse response = service.createAndSubmit(request);
        assertThat(response.status()).isEqualTo("PENDING_APPROVAL");
        assertThat(response.salaryExplanation()).isEqualTo("Chuyên gia kiến trúc công nghệ cao, chấp nhận vượt khung");
    }

    @Test
    void submitDraft_Successful() {
        RecruitmentRequisition draft = new RecruitmentRequisition();
        draft.setId(100L);
        draft.setStatus("DRAFT");
        draft.setTitle("Yêu cầu tuyển dụng đầy đủ");
        draft.setDepartmentId(1L);
        draft.setJobTitleId(2L);
        draft.setQuantity(2);
        draft.setRecruitmentType("NEW");
        draft.setReason("Mở rộng");
        draft.setSalaryMin(18_000_000L);
        draft.setSalaryMax(25_000_000L);
        draft.setNeededDate(LocalDate.now().plusDays(15));
        draft.setJobDescription("Mô tả");
        draft.setCandidateRequirements("Yêu cầu");
        draft.setCreatedByUserId(hiringManager.getId());

        when(requisitions.findById(100L)).thenReturn(Optional.of(draft));
        when(departments.findById(1L)).thenReturn(Optional.of(dept));
        when(jobTitles.findById(2L)).thenReturn(Optional.of(job));
        when(requisitions.save(any(RecruitmentRequisition.class))).thenAnswer(inv -> inv.getArgument(0));

        RequisitionResponse response = service.submitDraft(100L);

        assertThat(response.status()).isEqualTo("PENDING_APPROVAL");
        assertThat(response.submittedAt()).isNotNull();
    }

    @Test
    void submitDraft_FailsWhenMissingRequiredFields() {
        RecruitmentRequisition incompleteDraft = new RecruitmentRequisition();
        incompleteDraft.setId(101L);
        incompleteDraft.setStatus("DRAFT");
        incompleteDraft.setTitle("Bản nháp - REQ-001");
        incompleteDraft.setCreatedByUserId(hiringManager.getId());

        when(requisitions.findById(101L)).thenReturn(Optional.of(incompleteDraft));

        assertThatThrownBy(() -> service.submitDraft(101L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Vui lòng nhập tiêu đề yêu cầu tuyển dụng");
    }

    @Test
    void list_ScopesProperlyForHiringManagerAndHRManager() {
        Page<RecruitmentRequisition> page = new PageImpl<>(List.of());
        when(requisitions.search(eq(hiringManager.getId()), any(), any(), any(), any())).thenReturn(page);

        // HM calling list
        Page<RequisitionResponse> hmResult = service.list(null, null, null, PageRequest.of(0, 10));
        assertThat(hmResult).isNotNull();
        verify(requisitions).search(eq(hiringManager.getId()), any(), any(), any(), any());

        // HR Manager calling list (can view all, filterUserId = null)
        setAuth(hrManager);
        when(requisitions.search(eq(null), any(), any(), any(), any())).thenReturn(page);
        Page<RequisitionResponse> hrResult = service.list(null, null, null, PageRequest.of(0, 10));
        assertThat(hrResult).isNotNull();
        verify(requisitions).search(eq(null), any(), any(), any(), any());
    }

    @Test
    void delete_DraftSuccessful() {
        RecruitmentRequisition draft = new RecruitmentRequisition();
        draft.setId(100L);
        draft.setStatus("DRAFT");
        draft.setCreatedByUserId(hiringManager.getId());

        when(requisitions.findById(100L)).thenReturn(Optional.of(draft));

        service.delete(100L);
        verify(requisitions).delete(draft);
    }

    @Test
    void delete_NonDraftFails() {
        RecruitmentRequisition approved = new RecruitmentRequisition();
        approved.setId(100L);
        approved.setStatus("APPROVED");
        approved.setCreatedByUserId(hiringManager.getId());

        when(requisitions.findById(100L)).thenReturn(Optional.of(approved));

        assertThatThrownBy(() -> service.delete(100L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ có thể xóa yêu cầu ở trạng thái bản nháp");
    }
}
