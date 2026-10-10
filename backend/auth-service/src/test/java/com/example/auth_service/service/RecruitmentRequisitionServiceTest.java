package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.RequisitionRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecruitmentRequisitionServiceTest {

    @Mock
    private RecruitmentRequisitionRepository requisitionRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private JobTitleRepository jobTitleRepository;

    @Mock
    private UserRepository userRepository;

        @Mock
        private RequisitionApprovalWorkflowService approvalWorkflow;

    @InjectMocks
    private RecruitmentRequisitionService service;

    private User hiringManager;
    private User otherManager;
    private User hrManager;
    private Department itDept;
    private JobTitle devJob;

    @BeforeEach
    void setUp() {
        hiringManager = new User("hm@example.com", "pass");
        hiringManager.setId(10L);
        hiringManager.setFullName("Nguyen Van Truong");
        hiringManager.setRoles(Set.of(new Role(RoleName.HIRING_MANAGER, "HIRING_MANAGER")));

        otherManager = new User("other@example.com", "pass");
        otherManager.setId(20L);
        otherManager.setRoles(Set.of(new Role(RoleName.HIRING_MANAGER, "HIRING_MANAGER")));

        hrManager = new User("hr@example.com", "pass");
        hrManager.setId(30L);
        hrManager.setRoles(Set.of(new Role(RoleName.HR_MANAGER, "HR_MANAGER")));

        itDept = new Department();
        itDept.setId(100L);
        itDept.setName("Phòng Công nghệ thông tin");
        itDept.setCode("IT");
        itDept.setManagerUserId(hiringManager.getId());
        itDept.setActive(true);

        devJob = new JobTitle();
        devJob.setId(200L);
        devJob.setTitle("Lập trình viên Java");
        devJob.setCode("DEV-JAVA");
        devJob.setMinSalary(10_000_000L);
        devJob.setMaxSalary(30_000_000L);
        devJob.setDepartment(itDept);
        devJob.setActive(true);
    }

    @Test
    @DisplayName("SCRUM-93: Trưởng bộ phận tạo bản nháp (DRAFT) thành công với thông tin cơ bản")
    void createDraft_success() {
        RequisitionRequest request = new RequisitionRequest(
                null,
                "Nháp tuyển Java",
                devJob.getId(),
                null,
                itDept.getId(),
                null,
                2,
                "NEW",
                "Mở rộng dự án",
                12_000_000L,
                25_000_000L,
                null,
                LocalDate.now().plusMonths(1),
                null,
                "Lập trình Spring Boot",
                "Kinh nghiệm 1 năm",
                "DRAFT",
                true
        );

        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(jobTitleRepository.findById(devJob.getId())).thenReturn(Optional.of(devJob));
        when(requisitionRepository.existsByRequisitionCode(any())).thenReturn(false);
        when(requisitionRepository.save(any(RecruitmentRequisition.class))).thenAnswer(inv -> {
            RecruitmentRequisition r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });

        RequisitionResponse response = service.create(request, hiringManager);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.status()).isEqualTo("DRAFT");
        assertThat(response.departmentId()).isEqualTo(itDept.getId());
        assertThat(response.jobTitleId()).isEqualTo(devJob.getId());
        assertThat(response.quantity()).isEqualTo(2);
        assertThat(response.outsideSalaryRange()).isFalse();
        verify(requisitionRepository).save(any(RecruitmentRequisition.class));
    }

    @Test
    @DisplayName("SCRUM-93: Trưởng bộ phận chỉ được tạo yêu cầu trong phạm vi phòng ban mình phụ trách")
    void create_unauthorizedDepartment_throwsAccessDenied() {
        Department salesDept = new Department();
        salesDept.setId(101L);
        salesDept.setName("Phòng Kinh doanh");
        salesDept.setCode("SALES");
        salesDept.setManagerUserId(otherManager.getId());
        salesDept.setActive(true);

        JobTitle salesJob = new JobTitle();
        salesJob.setId(201L);
        salesJob.setTitle("Chuyên viên Kinh doanh");
        salesJob.setCode("SALES-SPECIALIST");
        salesJob.setDepartment(salesDept);
        salesJob.setActive(true);

        RequisitionRequest request = new RequisitionRequest(
            null, null, salesJob.getId(), null, salesDept.getId(), null,
                1, "NEW", "Cần người", null, null, null,
                LocalDate.now().plusWeeks(2), null, null, null, "DRAFT", true
        );

        when(departmentRepository.findById(salesDept.getId())).thenReturn(Optional.of(salesDept));

        assertThatThrownBy(() -> service.create(request, hiringManager))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Trưởng bộ phận chỉ được tạo yêu cầu trong phạm vi phòng ban mình phụ trách");

        verify(requisitionRepository, never()).save(any());
    }

    @Test
    @DisplayName("SCRUM-93: HR_MANAGER có thể tạo yêu cầu tuyển dụng cho bất kỳ phòng ban nào")
    void create_hrManagerCanCreateForAnyDepartment() {
        Department salesDept = new Department();
        salesDept.setId(101L);
        salesDept.setName("Phòng Kinh doanh");
        salesDept.setCode("SALES");
        salesDept.setManagerUserId(otherManager.getId());
        salesDept.setActive(true);

        JobTitle salesJob = new JobTitle();
        salesJob.setId(201L);
        salesJob.setTitle("Chuyên viên Kinh doanh");
        salesJob.setCode("SALES-SPECIALIST");
        salesJob.setDepartment(salesDept);
        salesJob.setActive(true);

        RequisitionRequest request = new RequisitionRequest(
            null, null, salesJob.getId(), null, salesDept.getId(), null,
                1, "NEW", "Tuyển mới", null, null, null,
                LocalDate.now().plusWeeks(2), null, null, null, "DRAFT", true
        );

        when(departmentRepository.findById(salesDept.getId())).thenReturn(Optional.of(salesDept));
        when(jobTitleRepository.findById(salesJob.getId())).thenReturn(Optional.of(salesJob));
        when(requisitionRepository.save(any(RecruitmentRequisition.class))).thenAnswer(inv -> {
            RecruitmentRequisition r = inv.getArgument(0);
            r.setId(5L);
            return r;
        });

        RequisitionResponse response = service.create(request, hrManager);
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(5L);
    }

    @Test
    @DisplayName("SCRUM-94: Chặn ngày cần người trong quá khứ")
    void create_targetDateInPast_throwsBadRequest() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Cần gấp", null, null, null,
                yesterday, null, null, null, "DRAFT", true
        );

        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(jobTitleRepository.findById(devJob.getId())).thenReturn(Optional.of(devJob));

        assertThatThrownBy(() -> service.create(request, hiringManager))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Ngày cần người không được nằm trong quá khứ.");
    }

    @Test
    @DisplayName("SCRUM-94: Yêu cầu giải trình khi dải lương đề xuất ngoài dải chuẩn của chức danh (lương cao hơn)")
    void create_salaryAboveMaxWithoutExplanation_throwsBadRequest() {
        // Dev standard range is 10M - 30M. Proposed is 15M - 35M (> 30M).
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Tuyển Senior Tech Lead", 15_000_000L, 35_000_000L, null,
                LocalDate.now().plusMonths(1), null, null, null, "DRAFT", true
        );

        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(jobTitleRepository.findById(devJob.getId())).thenReturn(Optional.of(devJob));

        assertThatThrownBy(() -> service.create(request, hiringManager))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Dải lương đề xuất ngoài dải chuẩn của chức danh thì bắt buộc nhập giải trình.");
    }

    @Test
    @DisplayName("SCRUM-94: Yêu cầu giải trình khi dải lương đề xuất ngoài dải chuẩn của chức danh (lương thấp hơn)")
    void create_salaryBelowMinWithoutExplanation_throwsBadRequest() {
        // Dev standard range is 10M - 30M. Proposed is 8M - 20M (< 10M).
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Tuyển Intern", 8_000_000L, 20_000_000L, "",
                LocalDate.now().plusMonths(1), null, null, null, "DRAFT", true
        );

        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(jobTitleRepository.findById(devJob.getId())).thenReturn(Optional.of(devJob));

        assertThatThrownBy(() -> service.create(request, hiringManager))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Dải lương đề xuất ngoài dải chuẩn của chức danh thì bắt buộc nhập giải trình.");
    }

    @Test
    @DisplayName("SCRUM-94: Lương ngoài dải chuẩn kèm giải trình hợp lệ được chấp nhận thành công")
    void create_salaryOutsideWithExplanation_success() {
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Vị trí chuyên gia", 15_000_000L, 38_000_000L,
                "Ứng viên có chứng chỉ AWS Solution Architect và 5 năm kinh nghiệm",
                LocalDate.now().plusMonths(1), null, null, null, "DRAFT", true
        );

        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(jobTitleRepository.findById(devJob.getId())).thenReturn(Optional.of(devJob));
        when(requisitionRepository.save(any(RecruitmentRequisition.class))).thenAnswer(inv -> {
            RecruitmentRequisition r = inv.getArgument(0);
            r.setId(2L);
            return r;
        });

        RequisitionResponse response = service.create(request, hiringManager);
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(2L);
        assertThat(response.outsideSalaryRange()).isTrue();
        assertThat(response.salaryExplanation()).contains("AWS Solution Architect");
    }

    @Test
    @DisplayName("SCRUM-94: Kiểm tra tính hợp lệ khoảng lương (min <= max)")
    void create_salaryMinGreaterThanMax_throwsBadRequest() {
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Lỗi lương", 25_000_000L, 15_000_000L, "Giải trình",
                LocalDate.now().plusMonths(1), null, null, null, "DRAFT", true
        );

        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(jobTitleRepository.findById(devJob.getId())).thenReturn(Optional.of(devJob));

        assertThatThrownBy(() -> service.create(request, hiringManager))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.");
    }

    @Test
    @DisplayName("SCRUM-92: Tạo yêu cầu với phòng ban đã ngừng áp dụng bị từ chối")
    void create_inactiveDepartment_throwsBadRequest() {
        itDept.setActive(false);
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Lý do", null, null, null,
                LocalDate.now().plusDays(10), null, null, null, "DRAFT", true
        );

        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));

        assertThatThrownBy(() -> service.create(request, hiringManager))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Phòng ban đã ngừng áp dụng, không thể tạo yêu cầu tuyển dụng.");
    }

    @Test
    @DisplayName("SCRUM-92: Tạo yêu cầu với mã trùng lặp bị từ chối")
    void create_duplicateCode_throwsConflict() {
        RequisitionRequest request = new RequisitionRequest(
                "REQ-DUPLICATE", null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Lý do", null, null, null,
                LocalDate.now().plusDays(10), null, null, null, "DRAFT", true
        );

        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(jobTitleRepository.findById(devJob.getId())).thenReturn(Optional.of(devJob));
        when(requisitionRepository.existsByRequisitionCode("REQ-DUPLICATE")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request, hiringManager))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Mã yêu cầu tuyển dụng đã tồn tại: REQ-DUPLICATE");
    }

    @Test
    @DisplayName("SCRUM-93: Cập nhật yêu cầu tuyển dụng (lưu nháp bổ sung thông tin)")
    void update_draft_success() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(10L);
        req.setRequisitionCode("REQ-10");
        req.setTitle("Tiêu đề cũ");
        req.setDepartmentId(itDept.getId());
        req.setCreatedByUserId(hiringManager.getId());
        req.setStatus("DRAFT");

        when(requisitionRepository.findById(10L)).thenReturn(Optional.of(req));
        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(requisitionRepository.save(any(RecruitmentRequisition.class))).thenAnswer(inv -> inv.getArgument(0));

        RequisitionRequest updateReq = new RequisitionRequest(
                null, "Tiêu đề mới", devJob.getId(), null, itDept.getId(), null,
                3, "REPLACEMENT", "Thay thế nhân sự nghỉ việc",
                null, null, null, LocalDate.now().plusMonths(2), null,
                "JD mới", "Yêu cầu mới", "DRAFT", true
        );
        when(jobTitleRepository.findById(devJob.getId())).thenReturn(Optional.of(devJob));

        RequisitionResponse response = service.update(10L, updateReq, hiringManager);
        assertThat(response.title()).isEqualTo("Tiêu đề mới");
        assertThat(response.quantity()).isEqualTo(3);
        assertThat(response.recruitmentType()).isEqualTo("REPLACEMENT");
    }

    @Test
    @DisplayName("SCRUM-93: Gửi yêu cầu tuyển dụng (submit) chuyển từ DRAFT sang SUBMITTED")
    void submit_success() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(11L);
        req.setRequisitionCode("REQ-11");
        req.setTitle("Tuyển Dev");
        req.setDepartmentId(itDept.getId());
        req.setJobTitleId(devJob.getId());
        req.setQuantity(2);
        req.setRecruitmentType("NEW");
        req.setReason("Cần thêm headcount");
        req.setSalaryMin(15_000_000L);
        req.setSalaryMax(25_000_000L);
        req.setTargetDate(LocalDate.now().plusDays(20));
        req.setJobDescription("Phát triển backend Java");
        req.setCandidateRequirements("Nắm vững Spring Boot");
        req.setStatus("DRAFT");
        req.setCreatedByUserId(hiringManager.getId());

        when(requisitionRepository.findById(11L)).thenReturn(Optional.of(req));
        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(jobTitleRepository.findById(devJob.getId())).thenReturn(Optional.of(devJob));
        when(requisitionRepository.save(any(RecruitmentRequisition.class))).thenAnswer(inv -> inv.getArgument(0));

        RequisitionResponse response = service.submit(11L, hiringManager);
        assertThat(response.status()).isEqualTo("SUBMITTED");
    }

    @Test
    @DisplayName("SCRUM-93: Xóa bản nháp (DRAFT) thành công; không cho phép xóa yêu cầu đã gửi hoặc đã duyệt")
    void delete_draft_success_and_nonDraft_fails() {
        RecruitmentRequisition draft = new RecruitmentRequisition();
        draft.setId(12L);
        draft.setStatus("DRAFT");
        draft.setDepartmentId(itDept.getId());
        draft.setCreatedByUserId(hiringManager.getId());

        when(requisitionRepository.findById(12L)).thenReturn(Optional.of(draft));
        when(departmentRepository.findById(itDept.getId())).thenReturn(Optional.of(itDept));

        service.delete(12L, hiringManager);
        verify(requisitionRepository).delete(draft);

        RecruitmentRequisition submitted = new RecruitmentRequisition();
        submitted.setId(13L);
        submitted.setStatus("SUBMITTED");
        submitted.setDepartmentId(itDept.getId());
        submitted.setCreatedByUserId(hiringManager.getId());

        when(requisitionRepository.findById(13L)).thenReturn(Optional.of(submitted));

        assertThatThrownBy(() -> service.delete(13L, hiringManager))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Chỉ được xóa yêu cầu tuyển dụng ở trạng thái bản nháp (DRAFT).");
    }
}
