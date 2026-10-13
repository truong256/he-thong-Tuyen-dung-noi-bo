package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.JobPosting;
import com.example.auth_service.dto.JobPostingRequest;
import com.example.auth_service.dto.JobPostingResponse;
import com.example.auth_service.dto.JobPostingTemplateResponse;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobPostingRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobPostingServiceTest {

    @Mock
    private JobPostingRepository jobPostingRepository;

    @Mock
    private RecruitmentRequisitionRepository requisitionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private JobTitleRepository jobTitleRepository;

    @InjectMocks
    private JobPostingService jobPostingService;

    private User recruiter;
    private RecruitmentRequisition approvedRequisition;
    private RecruitmentRequisition draftRequisition;
    private RecruitmentRequisition pendingRequisition;
    private Department itDept;
    private JobTitle devJob;

    @BeforeEach
    void setUp() {
        recruiter = new User("recruiter@example.com", "Password123@");
        recruiter.setId(10L);
        recruiter.setFullName("Lê Thị Tuyển Dụng");
        recruiter.setRoles(Set.of(new Role(RoleName.RECRUITER, "RECRUITER")));

        itDept = new Department();
        itDept.setId(1L);
        itDept.setName("Phòng Kỹ thuật");
        itDept.setCode("IT");
        itDept.setActive(true);

        devJob = new JobTitle();
        devJob.setId(2L);
        devJob.setTitle("Kỹ sư phần mềm");
        devJob.setCode("DEV01");
        devJob.setActive(true);

        approvedRequisition = new RecruitmentRequisition();
        approvedRequisition.setId(100L);
        approvedRequisition.setRequisitionCode("REQ-20261013-0001");
        approvedRequisition.setTitle("Tuyển dụng Senior Backend Java");
        approvedRequisition.setDepartmentId(1L);
        approvedRequisition.setJobTitleId(2L);
        approvedRequisition.setQuantity(2);
        approvedRequisition.setRecruitmentType("NEW");
        approvedRequisition.setSalaryMin(20000000L);
        approvedRequisition.setSalaryMax(35000000L);
        approvedRequisition.setCurrency("VND");
        approvedRequisition.setJobDescription("Thiết kế và phát triển hệ thống microservices");
        approvedRequisition.setCandidateRequirements("Có ít nhất 3 năm kinh nghiệm với Spring Boot và PostgreSQL");
        approvedRequisition.setBenefits("Thưởng tháng 13, BHXH đầy đủ, đào tạo định kỳ");
        approvedRequisition.setWorkLocation("Tầng 5, Tòa nhà Công nghệ, Hà Nội");
        approvedRequisition.setWorkingModel("HYBRID");
        approvedRequisition.setStatus("APPROVED");
        approvedRequisition.setNeededDate(LocalDate.now().plusMonths(1));

        draftRequisition = new RecruitmentRequisition();
        draftRequisition.setId(101L);
        draftRequisition.setRequisitionCode("REQ-20261013-0002");
        draftRequisition.setTitle("Tuyển dụng Frontend React");
        draftRequisition.setStatus("DRAFT");

        pendingRequisition = new RecruitmentRequisition();
        pendingRequisition.setId(102L);
        pendingRequisition.setRequisitionCode("REQ-20261013-0003");
        pendingRequisition.setTitle("Tuyển dụng Product Owner");
        pendingRequisition.setStatus("PENDING_APPROVAL");

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        recruiter.getEmail(),
                        "Password123@",
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_RECRUITER"))
                )
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ==========================================
    // 1. [BE] Kế thừa dữ liệu từ yêu cầu đã duyệt
    // ==========================================

    @Test
    @DisplayName("[AC-1] Kế thừa đầy đủ mô tả công việc, yêu cầu, dải lương, địa điểm từ yêu cầu APPROVED")
    void testGetTemplate_ApprovedRequisition_Success() {
        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));
        when(jobTitleRepository.findById(2L)).thenReturn(Optional.of(devJob));

        JobPostingTemplateResponse template = jobPostingService.getTemplate(100L);

        assertThat(template).isNotNull();
        assertThat(template.requisitionId()).isEqualTo(100L);
        assertThat(template.requisitionCode()).isEqualTo("REQ-20261013-0001");
        assertThat(template.title()).isEqualTo("Tuyển dụng Senior Backend Java");
        assertThat(template.jobDescription()).isEqualTo("Thiết kế và phát triển hệ thống microservices");
        assertThat(template.candidateRequirements()).isEqualTo("Có ít nhất 3 năm kinh nghiệm với Spring Boot và PostgreSQL");
        assertThat(template.benefits()).isEqualTo("Thưởng tháng 13, BHXH đầy đủ, đào tạo định kỳ");
        assertThat(template.workLocation()).isEqualTo("Tầng 5, Tòa nhà Công nghệ, Hà Nội");
        assertThat(template.workingModel()).isEqualTo("HYBRID");
        assertThat(template.salaryMin()).isEqualTo(20000000L);
        assertThat(template.salaryMax()).isEqualTo(35000000L);
        assertThat(template.currency()).isEqualTo("VND");
        assertThat(template.departmentName()).isEqualTo("Phòng Kỹ thuật");
        assertThat(template.jobTitleName()).isEqualTo("Kỹ sư phần mềm");
        assertThat(template.showSalary()).isTrue();
        assertThat(template.requisitionStatus()).isEqualTo("APPROVED");
    }

    // ==========================================
    // 2. [BE] Chặn tạo tin từ yêu cầu chưa được duyệt
    // ==========================================

    @Test
    @DisplayName("[AC-3] Chặn lấy template từ yêu cầu chưa duyệt DRAFT")
    void testGetTemplate_DraftRequisition_ThrowsBadRequest() {
        when(requisitionRepository.findById(101L)).thenReturn(Optional.of(draftRequisition));

        assertThatThrownBy(() -> jobPostingService.getTemplate(101L))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Chỉ có thể tạo tin tuyển dụng từ yêu cầu đã được phê duyệt.");
    }

    @Test
    @DisplayName("[AC-3] Chặn lấy template từ yêu cầu chưa duyệt PENDING_APPROVAL")
    void testGetTemplate_PendingRequisition_ThrowsBadRequest() {
        when(requisitionRepository.findById(102L)).thenReturn(Optional.of(pendingRequisition));

        assertThatThrownBy(() -> jobPostingService.getTemplate(102L))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Chỉ có thể tạo tin tuyển dụng từ yêu cầu đã được phê duyệt.");
    }

    @Test
    @DisplayName("[AC-3] Chặn tạo tin từ yêu cầu DRAFT và KHÔNG lưu bản ghi")
    void testCreate_DraftRequisition_ThrowsBadRequest_NoRecordCreated() {
        when(requisitionRepository.findById(101L)).thenReturn(Optional.of(draftRequisition));

        JobPostingRequest request = new JobPostingRequest(
                101L,
                "Tiêu đề tin",
                "Mô tả",
                "Yêu cầu",
                "Quyền lợi",
                "Hà Nội",
                null,
                "ONSITE",
                LocalDate.now().plusDays(10),
                true,
                "RANGE",
                10000000L,
                20000000L,
                "VND",
                "DRAFT"
        );

        assertThatThrownBy(() -> jobPostingService.create(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Chỉ có thể tạo tin tuyển dụng từ yêu cầu đã được phê duyệt.");

        verify(jobPostingRepository, never()).save(any());
    }

    @Test
    @DisplayName("[AC-3] Chặn tạo tin từ yêu cầu PENDING_APPROVAL và KHÔNG lưu bản ghi")
    void testCreate_PendingRequisition_ThrowsBadRequest_NoRecordCreated() {
        when(requisitionRepository.findById(102L)).thenReturn(Optional.of(pendingRequisition));

        JobPostingRequest request = new JobPostingRequest(
                102L,
                "Tiêu đề tin",
                "Mô tả",
                "Yêu cầu",
                "Quyền lợi",
                "Hà Nội",
                null,
                "ONSITE",
                LocalDate.now().plusDays(10),
                true,
                "RANGE",
                10000000L,
                20000000L,
                "VND",
                "DRAFT"
        );

        assertThatThrownBy(() -> jobPostingService.create(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Chỉ có thể tạo tin tuyển dụng từ yêu cầu đã được phê duyệt.");

        verify(jobPostingRepository, never()).save(any());
    }

    // ==========================================
    // 3. [BE] Validation tin tuyển dụng
    // ==========================================

    @Test
    @DisplayName("[AC-Validation] Hạn nhận hồ sơ trong quá khứ ném lỗi nghiệp vụ rõ ràng")
    void testCreate_DeadlineInPast_ThrowsBadRequest() {
        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));

        JobPostingRequest request = new JobPostingRequest(
                100L,
                "Tiêu đề tin",
                "Mô tả",
                "Yêu cầu",
                "Quyền lợi",
                "Hà Nội",
                null,
                "ONSITE",
                LocalDate.now().minusDays(1), // Quá khứ
                true,
                "RANGE",
                10000000L,
                20000000L,
                "VND",
                "DRAFT"
        );

        assertThatThrownBy(() -> jobPostingService.create(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Hạn nhận hồ sơ không thể trong quá khứ.");

        verify(jobPostingRepository, never()).save(any());
    }

    @Test
    @DisplayName("[AC-Validation] Mức lương tối thiểu lớn hơn tối đa ném lỗi nghiệp vụ rõ ràng")
    void testCreate_SalaryMinGreaterThanMax_ThrowsBadRequest() {
        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));

        JobPostingRequest request = new JobPostingRequest(
                100L,
                "Tiêu đề tin",
                "Mô tả",
                "Yêu cầu",
                "Quyền lợi",
                "Hà Nội",
                null,
                "ONSITE",
                LocalDate.now().plusDays(15),
                true,
                "RANGE",
                30000000L, // Min > Max
                20000000L,
                "VND",
                "DRAFT"
        );

        assertThatThrownBy(() -> jobPostingService.create(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Mức lương tối thiểu không được lớn hơn mức lương tối đa.");

        verify(jobPostingRepository, never()).save(any());
    }

    // ==========================================
    // 4. [BE] Lưu nháp và nộp duyệt không mất dữ liệu
    // ==========================================

    @Test
    @DisplayName("[AC-2] Tạo và lưu nháp tin tuyển dụng (status = DRAFT) thành công")
    void testCreate_SaveDraft_Success() {
        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));
        when(userRepository.findByEmail("recruiter@example.com")).thenReturn(Optional.of(recruiter));
        when(jobPostingRepository.countByPostingCodeStartingWith(anyString())).thenReturn(0L);
        when(jobPostingRepository.existsByPostingCode(anyString())).thenReturn(false);

        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(invocation -> {
            JobPosting p = invocation.getArgument(0);
            p.setId(500L);
            return p;
        });

        JobPostingRequest request = new JobPostingRequest(
                100L,
                "Tuyển dụng Senior Backend Java (Đã chỉnh sửa)",
                "Mô tả công việc chi tiết",
                "Yêu cầu ứng viên chi tiết",
                "Quyền lợi hấp dẫn",
                "Tòa nhà Landmark, TP.HCM",
                null,
                "REMOTE",
                LocalDate.now().plusMonths(1),
                true,
                "RANGE",
                25000000L,
                40000000L,
                "VND",
                "DRAFT"
        );

        JobPostingResponse response = jobPostingService.create(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(500L);
        assertThat(response.status()).isEqualTo("DRAFT");
        assertThat(response.title()).isEqualTo("Tuyển dụng Senior Backend Java (Đã chỉnh sửa)");
        assertThat(response.workingModel()).isEqualTo("REMOTE");
        assertThat(response.salaryMin()).isEqualTo(25000000L);
        assertThat(response.salaryMax()).isEqualTo(40000000L);
        assertThat(response.postingCode()).startsWith("JP-");
        assertThat(response.createdByUserId()).isEqualTo(10L);

        verify(jobPostingRepository).save(any(JobPosting.class));
    }

    @Test
    @DisplayName("[AC-2] Tạo và gửi duyệt tin tuyển dụng (status = PENDING_APPROVAL) thành công")
    void testCreate_PendingApproval_Success() {
        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));
        when(userRepository.findByEmail("recruiter@example.com")).thenReturn(Optional.of(recruiter));
        when(jobPostingRepository.countByPostingCodeStartingWith(anyString())).thenReturn(0L);
        when(jobPostingRepository.existsByPostingCode(anyString())).thenReturn(false);

        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(invocation -> {
            JobPosting p = invocation.getArgument(0);
            p.setId(501L);
            return p;
        });

        JobPostingRequest request = new JobPostingRequest(
                100L,
                "Tuyển dụng Senior Backend Java",
                "Mô tả",
                "Yêu cầu",
                "Quyền lợi",
                "Hà Nội",
                null,
                "ONSITE",
                LocalDate.now().plusMonths(1),
                false, // Ẩn lương
                "NEGOTIABLE",
                null,
                null,
                "VND",
                "PENDING_APPROVAL"
        );

        JobPostingResponse response = jobPostingService.create(request);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("PENDING_APPROVAL");
        assertThat(response.showSalary()).isFalse();
        assertThat(response.salaryType()).isEqualTo("NEGOTIABLE");
    }

    @Test
    @DisplayName("[AC-2] Chỉnh sửa tin tuyển dụng và chuyển từ DRAFT sang PENDING_APPROVAL không mất dữ liệu")
    void testUpdate_FromDraftToPendingApproval_Success() {
        JobPosting existing = JobPosting.builder()
                .id(500L)
                .postingCode("JP-20261013-0001")
                .requisitionId(100L)
                .title("Bản nháp ban đầu")
                .jobDescription("Mô tả cũ")
                .candidateRequirements("Yêu cầu cũ")
                .benefits("Quyền lợi cũ")
                .workLocation("Hà Nội")
                .workingModel("ONSITE")
                .applicationDeadline(LocalDate.now().plusDays(20))
                .showSalary(true)
                .salaryType("RANGE")
                .salaryMin(15000000L)
                .salaryMax(25000000L)
                .currency("VND")
                .status("DRAFT")
                .createdByUserId(10L)
                .build();

        when(jobPostingRepository.findById(500L)).thenReturn(Optional.of(existing));
        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));
        when(userRepository.findByEmail("recruiter@example.com")).thenReturn(Optional.of(recruiter));
        when(userRepository.findById(10L)).thenReturn(Optional.of(recruiter));
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(invocation -> invocation.getArgument(0));

        JobPostingRequest updateRequest = new JobPostingRequest(
                100L,
                "Tiêu đề mới đã hoàn thiện",
                "Mô tả công việc đầy đủ mới",
                "Yêu cầu kỹ năng mới",
                "Chế độ đãi ngộ vượt trội",
                "Đà Nẵng",
                null,
                "HYBRID",
                LocalDate.now().plusDays(30),
                true,
                "RANGE",
                18000000L,
                28000000L,
                "VND",
                "PENDING_APPROVAL"
        );

        JobPostingResponse response = jobPostingService.update(500L, updateRequest);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(500L);
        assertThat(response.status()).isEqualTo("PENDING_APPROVAL");
        assertThat(response.title()).isEqualTo("Tiêu đề mới đã hoàn thiện");
        assertThat(response.workLocation()).isEqualTo("Đà Nẵng");
        assertThat(response.workingModel()).isEqualTo("HYBRID");
        assertThat(response.salaryMin()).isEqualTo(18000000L);
        assertThat(response.salaryMax()).isEqualTo(28000000L);
    }

    // ==========================================
    // 5. [BE] Tải lại dữ liệu (getById & getByRequisitionId)
    // ==========================================

    @Test
    @DisplayName("[AC-2] Tải lại chi tiết tin tuyển dụng không mất dữ liệu")
    void testGetById_Success() {
        JobPosting posting = JobPosting.builder()
                .id(500L)
                .postingCode("JP-20261013-0001")
                .requisitionId(100L)
                .title("Tin tuyển dụng chuẩn")
                .jobDescription("Mô tả")
                .candidateRequirements("Yêu cầu")
                .benefits("Quyền lợi")
                .workLocation("Hà Nội")
                .workingModel("ONSITE")
                .applicationDeadline(LocalDate.now().plusDays(15))
                .showSalary(true)
                .salaryType("RANGE")
                .salaryMin(10000000L)
                .salaryMax(20000000L)
                .currency("VND")
                .status("DRAFT")
                .createdByUserId(10L)
                .build();

        when(jobPostingRepository.findById(500L)).thenReturn(Optional.of(posting));
        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));
        when(userRepository.findById(10L)).thenReturn(Optional.of(recruiter));

        JobPostingResponse response = jobPostingService.getById(500L);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(500L);
        assertThat(response.requisitionCode()).isEqualTo("REQ-20261013-0001");
        assertThat(response.createdByName()).isEqualTo("Lê Thị Tuyển Dụng");
    }

    @Test
    @DisplayName("[AC-2] Tìm tin tuyển dụng theo requisitionId để tải lại bản nháp đã lưu")
    void testGetByRequisitionId_Success() {
        JobPosting posting = JobPosting.builder()
                .id(500L)
                .postingCode("JP-20261013-0001")
                .requisitionId(100L)
                .title("Tin tuyển dụng gắn yêu cầu")
                .jobDescription("Mô tả")
                .candidateRequirements("Yêu cầu")
                .workLocation("Hà Nội")
                .workingModel("ONSITE")
                .applicationDeadline(LocalDate.now().plusDays(15))
                .status("DRAFT")
                .createdByUserId(10L)
                .build();

        when(jobPostingRepository.findTopByRequisitionIdOrderByCreatedAtDesc(100L)).thenReturn(Optional.of(posting));
        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));
        when(userRepository.findById(10L)).thenReturn(Optional.of(recruiter));

        Optional<JobPostingResponse> response = jobPostingService.getByRequisitionId(100L);

        assertThat(response).isPresent();
        assertThat(response.get().id()).isEqualTo(500L);
    }

    @Test
    @DisplayName("[AC-1 Coverage] getTemplate kế thừa fallback khi các trường null hoặc ngày quá khứ")
    void testGetTemplate_Fallbacks() {
        approvedRequisition.setCandidateRequirements(null);
        approvedRequisition.setRequirements("Kỹ năng chung");
        approvedRequisition.setNeededDate(null);
        approvedRequisition.setTargetDate(LocalDate.now().minusDays(5)); // Quá khứ
        approvedRequisition.setSalaryMin(null);
        approvedRequisition.setProposedMinSalary(12000000L);
        approvedRequisition.setSalaryMax(null);
        approvedRequisition.setProposedMaxSalary(22000000L);
        approvedRequisition.setDepartmentId(null);
        approvedRequisition.setJobTitleId(null);
        approvedRequisition.setCurrency(null);
        approvedRequisition.setWorkingModel(null);

        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));

        JobPostingTemplateResponse template = jobPostingService.getTemplate(100L);

        assertThat(template.candidateRequirements()).isEqualTo("Kỹ năng chung");
        assertThat(template.applicationDeadline()).isAfterOrEqualTo(LocalDate.now());
        assertThat(template.salaryMin()).isEqualTo(12000000L);
        assertThat(template.salaryMax()).isEqualTo(22000000L);
        assertThat(template.departmentName()).isNull();
        assertThat(template.jobTitleName()).isNull();
        assertThat(template.currency()).isEqualTo("VND");
        assertThat(template.workingModel()).isEqualTo("ONSITE");
    }

    @Test
    @DisplayName("[Coverage] create với requisitionId null ném BadRequestException")
    void testCreate_NullRequisitionId_ThrowsBadRequest() {
        JobPostingRequest req = new JobPostingRequest(
                null, "Title", "Desc", "Req", "Ben", "HN", null, "ONSITE",
                LocalDate.now().plusDays(10), true, "RANGE", 10000000L, 20000000L, "VND", "DRAFT"
        );
        assertThatThrownBy(() -> jobPostingService.create(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Mã yêu cầu tuyển dụng nguồn không được để trống.");
    }

    @Test
    @DisplayName("[Coverage] create với status không hợp lệ ném BadRequestException")
    void testCreate_InvalidStatus_ThrowsBadRequest() {
        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));

        JobPostingRequest req = new JobPostingRequest(
                100L, "Title", "Desc", "Req", "Ben", "HN", null, "ONSITE",
                LocalDate.now().plusDays(10), true, "RANGE", 10000000L, 20000000L, "VND", "PUBLISHED"
        );
        assertThatThrownBy(() -> jobPostingService.create(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Trạng thái tin tuyển dụng chỉ có thể là DRAFT (Nháp) hoặc PENDING_APPROVAL (Chờ duyệt).");
    }

    @Test
    @DisplayName("[Coverage] update với status không hợp lệ ném BadRequestException")
    void testUpdate_InvalidStatus_ThrowsBadRequest() {
        JobPosting posting = JobPosting.builder()
                .id(500L)
                .postingCode("JP-1")
                .requisitionId(100L)
                .title("Title")
                .jobDescription("Desc")
                .candidateRequirements("Req")
                .workLocation("HN")
                .applicationDeadline(LocalDate.now().plusDays(10))
                .status("DRAFT")
                .createdByUserId(10L)
                .build();
        when(jobPostingRepository.findById(500L)).thenReturn(Optional.of(posting));

        JobPostingRequest req = new JobPostingRequest(
                100L, "Title", "Desc", "Req", "Ben", "HN", null, "ONSITE",
                LocalDate.now().plusDays(10), true, "RANGE", 10000000L, 20000000L, "VND", "CLOSED"
        );
        assertThatThrownBy(() -> jobPostingService.update(500L, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Trạng thái tin tuyển dụng chỉ có thể là DRAFT (Nháp) hoặc PENDING_APPROVAL (Chờ duyệt).");
    }

    @Test
    @DisplayName("[Coverage] update với hạn nhận hồ sơ trong quá khứ ném BadRequestException")
    void testUpdate_PastDeadline_ThrowsBadRequest() {
        JobPosting posting = JobPosting.builder()
                .id(500L)
                .postingCode("JP-1")
                .requisitionId(100L)
                .title("Title")
                .jobDescription("Desc")
                .candidateRequirements("Req")
                .workLocation("HN")
                .applicationDeadline(LocalDate.now().plusDays(10))
                .status("DRAFT")
                .createdByUserId(10L)
                .build();
        when(jobPostingRepository.findById(500L)).thenReturn(Optional.of(posting));

        JobPostingRequest req = new JobPostingRequest(
                100L, "Title", "Desc", "Req", "Ben", "HN", null, "ONSITE",
                LocalDate.now().minusDays(5), true, "RANGE", 10000000L, 20000000L, "VND", "DRAFT"
        );
        assertThatThrownBy(() -> jobPostingService.update(500L, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Hạn nhận hồ sơ không thể trong quá khứ.");
    }

    @Test
    @DisplayName("Tìm kiếm và phân trang tin tuyển dụng")
    void testSearch_Success() {
        JobPosting posting = JobPosting.builder()
                .id(500L)
                .postingCode("JP-20261013-0001")
                .requisitionId(100L)
                .title("Tin tuyển dụng")
                .jobDescription("Mô tả")
                .candidateRequirements("Yêu cầu")
                .workLocation("Hà Nội")
                .workingModel("ONSITE")
                .applicationDeadline(LocalDate.now().plusDays(15))
                .status("DRAFT")
                .createdByUserId(10L)
                .build();

        Page<JobPosting> page = new PageImpl<>(List.of(posting));
        Pageable pageable = PageRequest.of(0, 10);

        when(jobPostingRepository.search(eq("DRAFT"), eq("Java"), isNull(), any(Pageable.class)))
                .thenReturn(page);
        when(requisitionRepository.findById(100L)).thenReturn(Optional.of(approvedRequisition));
        when(userRepository.findById(10L)).thenReturn(Optional.of(recruiter));

        Page<JobPostingResponse> result = jobPostingService.search("DRAFT", "Java", null, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).title()).isEqualTo("Tin tuyển dụng");
    }
}
