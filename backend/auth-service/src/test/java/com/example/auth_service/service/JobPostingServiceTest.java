package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.JobPosting;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
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
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobPostingServiceTest {

    @Mock
    private JobPostingRepository jobPostingRepository;

    @Mock
    private JobPostingAuditLogRepository auditLogRepository;

    @Mock
    private RecruitmentRequisitionRepository requisitionRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private JobTitleRepository jobTitleRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private JobPostingService service;

    private User hrManagerUser;
    private User recruiterUser;
    private JobPosting testPosting;
    private Department testDept;
    private JobTitle testJobTitle;

    @BeforeEach
    void setUp() {
        Role hrRole = new Role();
        hrRole.setName(RoleName.HR_MANAGER);

        Role recruiterRole = new Role();
        recruiterRole.setName(RoleName.RECRUITER);

        hrManagerUser = new User();
        hrManagerUser.setId(10L);
        hrManagerUser.setEmail("hr_manager@company.com");
        hrManagerUser.setFullName("Nguyen HR Manager");
        hrManagerUser.setRoles(Set.of(hrRole));

        recruiterUser = new User();
        recruiterUser.setId(20L);
        recruiterUser.setEmail("recruiter@company.com");
        recruiterUser.setFullName("Le Recruiter");
        recruiterUser.setRoles(Set.of(recruiterRole));

        testDept = new Department();
        testDept.setId(1L);
        testDept.setName("Phòng Kỹ Thuật");

        testJobTitle = new JobTitle();
        testJobTitle.setId(2L);
        testJobTitle.setTitle("Senior Java Developer");

        testPosting = new JobPosting();
        testPosting.setId(100L);
        testPosting.setJobCode("JP-2026-0001");
        testPosting.setTitle("Tuyển Dụng Senior Java Developer");
        testPosting.setDepartmentId(1L);
        testPosting.setJobTitleId(2L);
        testPosting.setWorkLocation("Hà Nội");
        testPosting.setWorkingModel("HYBRID");
        testPosting.setQuantity(2);
        testPosting.setJobDescription("Mô tả công việc chi tiết");
        testPosting.setRequirements("3 năm kinh nghiệm Java");
        testPosting.setBenefits("Lương tháng 13, BHXH");
        testPosting.setSalaryMin(20000000L);
        testPosting.setSalaryMax(35000000L);
        testPosting.setCurrency("VND");
        testPosting.setSalaryVisible(true);
        testPosting.setApplicationDeadline(LocalDate.now().plusDays(30));
        testPosting.setStatus("DRAFT");
        testPosting.setCreatedByUserId(recruiterUser.getId());
        testPosting.setCreatedAt(Instant.now());
        testPosting.setUpdatedAt(Instant.now());
    }

    // =========================================================================
    // 1. TẠO & CẬP NHẬT TIN TUYỂN DỤNG
    // =========================================================================

    @Test
    @DisplayName("Tạo tin tuyển dụng mới thành công và ghi nhật ký CREATE")
    void testCreateJobPosting_Success() {
        JobPostingRequest req = JobPostingRequest.builder()
                .title("Tuyển Dụng Frontend React")
                .departmentId(1L)
                .jobTitleId(2L)
                .salaryMin(15000000L)
                .salaryMax(25000000L)
                .salaryVisible(true)
                .applicationDeadline(LocalDate.now().plusDays(20))
                .build();

        when(jobPostingRepository.countByJobCodeStartingWith(anyString())).thenReturn(0L);
        when(jobPostingRepository.existsByJobCode(anyString())).thenReturn(false);
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(i -> {
            JobPosting p = i.getArgument(0);
            p.setId(101L);
            return p;
        });

        JobPostingResponse res = service.createJobPosting(req, recruiterUser.getId());

        assertThat(res).isNotNull();
        assertThat(res.getTitle()).isEqualTo("Tuyển Dụng Frontend React");
        assertThat(res.getStatus()).isEqualTo("DRAFT");
        assertThat(res.getJobCode()).startsWith("JP-");

        verify(auditLogRepository, times(1)).save(argThat(log ->
                log.getJobPostingId().equals(101L) && "CREATE".equals(log.getAction()) && "DRAFT".equals(log.getToStatus())
        ));
    }

    @Test
    @DisplayName("Tạo tin tuyển dụng từ Requisition đã APPROVED thành công")
    void testCreateFromRequisition_Success() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(50L);
        req.setRequisitionCode("REQ-2026-001");
        req.setTitle("Kỹ sư Cầu nối");
        req.setStatus("APPROVED");
        req.setDepartmentId(1L);
        req.setJobTitleId(2L);
        req.setWorkLocation("Hồ Chí Minh");
        req.setQuantity(1);
        req.setJobDescription("Mô tả công việc từ yêu cầu");
        req.setRequirements("Tiếng Nhật N2");
        req.setBenefits("Trợ cấp tiếng Nhật");
        req.setProposedMinSalary(25000000L);
        req.setProposedMaxSalary(40000000L);
        req.setTargetDate(LocalDate.now().plusDays(25));

        when(requisitionRepository.findById(50L)).thenReturn(Optional.of(req));
        when(jobPostingRepository.countByJobCodeStartingWith(anyString())).thenReturn(1L);
        when(jobPostingRepository.existsByJobCode(anyString())).thenReturn(false);
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(i -> {
            JobPosting p = i.getArgument(0);
            p.setId(102L);
            return p;
        });

        JobPostingResponse res = service.createFromRequisition(50L, recruiterUser.getId());

        assertThat(res).isNotNull();
        assertThat(res.getRequisitionId()).isEqualTo(50L);
        assertThat(res.getStatus()).isEqualTo("DRAFT");
        assertThat(res.getSalaryMin()).isEqualTo(25000000L);
    }

    @Test
    @DisplayName("Tạo tin từ Requisition chưa APPROVED bị từ chối")
    void testCreateFromRequisition_NotApproved_ThrowsException() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(51L);
        req.setStatus("PENDING_APPROVAL");

        when(requisitionRepository.findById(51L)).thenReturn(Optional.of(req));

        assertThatThrownBy(() -> service.createFromRequisition(51L, recruiterUser.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Đã duyệt");
    }

    @Test
    @DisplayName("Nộp duyệt tin tuyển dụng chuyển trạng thái DRAFT -> PENDING_APPROVAL")
    void testSubmitForApproval_Success() {
        when(jobPostingRepository.findById(100L)).thenReturn(Optional.of(testPosting));
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(i -> i.getArgument(0));

        JobPostingResponse res = service.submitForApproval(100L, recruiterUser.getId());

        assertThat(res.getStatus()).isEqualTo("PENDING_APPROVAL");
        verify(auditLogRepository).save(argThat(l -> "SUBMIT_APPROVAL".equals(l.getAction()) && "PENDING_APPROVAL".equals(l.getToStatus())));
    }

    // =========================================================================
    // 2. SCRUM-149: DUYỆT VÀ XUẤT BẢN TIN TUYỂN DỤNG
    // =========================================================================

    @Test
    @DisplayName("SCRUM-149 AC1: Chỉ HR Manager được duyệt tin (Người không có role HR_MANAGER bị từ chối)")
    void testApproveJobPosting_NonHrManager_ThrowsAccessDenied() {
        when(userRepository.findById(recruiterUser.getId())).thenReturn(Optional.of(recruiterUser));

        assertThatThrownBy(() -> service.approveJobPosting(100L, "Duyệt tin", recruiterUser.getId()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Chỉ Trưởng phòng Nhân sự (HR Manager) mới có quyền duyệt");
    }

    @Test
    @DisplayName("SCRUM-149 AC1: HR Manager duyệt tin thành công, ghi approvedByUserId, approvedAt và audit log APPROVE")
    void testApproveJobPosting_HrManager_Success() {
        testPosting.setStatus("PENDING_APPROVAL");

        when(userRepository.findById(hrManagerUser.getId())).thenReturn(Optional.of(hrManagerUser));
        when(jobPostingRepository.findById(100L)).thenReturn(Optional.of(testPosting));
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(i -> i.getArgument(0));

        JobPostingResponse res = service.approveJobPosting(100L, "Nội dung chuẩn thương hiệu", hrManagerUser.getId());

        assertThat(res.getStatus()).isEqualTo("APPROVED");
        assertThat(testPosting.getApprovedByUserId()).isEqualTo(hrManagerUser.getId());
        assertThat(testPosting.getApprovedAt()).isNotNull();
        assertThat(testPosting.getApprovalNotes()).isEqualTo("Nội dung chuẩn thương hiệu");

        verify(auditLogRepository).save(argThat(l ->
                l.getJobPostingId().equals(100L) && "APPROVE".equals(l.getAction()) && "APPROVED".equals(l.getToStatus())
        ));
    }

    @Test
    @DisplayName("SCRUM-149 AC2: Tin phải qua trạng thái duyệt trước khi công khai (Tin DRAFT không được xuất bản)")
    void testPublishJobPosting_NotApproved_ThrowsBadRequest() {
        testPosting.setStatus("DRAFT"); // Chưa duyệt

        when(userRepository.findById(hrManagerUser.getId())).thenReturn(Optional.of(hrManagerUser));
        when(jobPostingRepository.findById(100L)).thenReturn(Optional.of(testPosting));

        assertThatThrownBy(() -> service.publishJobPosting(100L, "Xuất bản ngay", hrManagerUser.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("phải qua trạng thái phê duyệt trước khi công khai");
    }

    @Test
    @DisplayName("SCRUM-149 AC2 & AC3: Xuất bản tin đã duyệt thành công, ghi người xuất bản và thời điểm")
    void testPublishJobPosting_ApprovedStatus_Success() {
        testPosting.setStatus("APPROVED");
        testPosting.setApprovedByUserId(hrManagerUser.getId());
        testPosting.setApprovedAt(Instant.now().minusSeconds(3600));

        when(userRepository.findById(hrManagerUser.getId())).thenReturn(Optional.of(hrManagerUser));
        when(jobPostingRepository.findById(100L)).thenReturn(Optional.of(testPosting));
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(i -> i.getArgument(0));

        JobPostingResponse res = service.publishJobPosting(100L, "Xuất bản lên website", hrManagerUser.getId());

        assertThat(res.getStatus()).isEqualTo("PUBLISHED");
        assertThat(testPosting.getPublishedByUserId()).isEqualTo(hrManagerUser.getId());
        assertThat(testPosting.getPublishedAt()).isNotNull();

        verify(auditLogRepository).save(argThat(l ->
                l.getJobPostingId().equals(100L) && "PUBLISH".equals(l.getAction()) && "PUBLISHED".equals(l.getToStatus())
        ));
    }

    @Test
    @DisplayName("SCRUM-149: Duyệt và xuất bản ngay trong 1 bước (Approve & Publish)")
    void testApproveAndPublish_Success() {
        testPosting.setStatus("PENDING_APPROVAL");

        when(userRepository.findById(hrManagerUser.getId())).thenReturn(Optional.of(hrManagerUser));
        when(jobPostingRepository.findById(100L)).thenReturn(Optional.of(testPosting));
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(i -> i.getArgument(0));

        JobPostingResponse res = service.approveAndPublishJobPosting(100L, "Duyệt và mở tuyển dụng ngay", hrManagerUser.getId());

        assertThat(res.getStatus()).isEqualTo("PUBLISHED");
        assertThat(testPosting.getApprovedByUserId()).isEqualTo(hrManagerUser.getId());
        assertThat(testPosting.getPublishedByUserId()).isEqualTo(hrManagerUser.getId());
        assertThat(testPosting.getApprovedAt()).isNotNull();
        assertThat(testPosting.getPublishedAt()).isNotNull();

        verify(auditLogRepository).save(argThat(l -> "APPROVE_AND_PUBLISH".equals(l.getAction()) && "PUBLISHED".equals(l.getToStatus())));
    }

    @Test
    @DisplayName("SCRUM-149: Từ chối duyệt tin tuyển dụng kèm lý do")
    void testRejectJobPosting_Success() {
        testPosting.setStatus("PENDING_APPROVAL");

        when(userRepository.findById(hrManagerUser.getId())).thenReturn(Optional.of(hrManagerUser));
        when(jobPostingRepository.findById(100L)).thenReturn(Optional.of(testPosting));
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(i -> i.getArgument(0));

        JobPostingResponse res = service.rejectJobPosting(100L, "Yêu cầu kinh nghiệm chưa phù hợp với khung năng lực", hrManagerUser.getId());

        assertThat(res.getStatus()).isEqualTo("REJECTED");
        verify(auditLogRepository).save(argThat(l -> "REJECT".equals(l.getAction()) && "REJECTED".equals(l.getToStatus())));
    }

    // =========================================================================
    // 3. SCRUM-150: GỠ TIN VÀ API CÔNG KHAI
    // =========================================================================

    @Test
    @DisplayName("SCRUM-150 AC3: Gỡ tin tuyển dụng (Unpublish) ghi nhận người gỡ, thời điểm, lý do và audit log")
    void testUnpublishJobPosting_Success() {
        testPosting.setStatus("PUBLISHED");
        testPosting.setPublishedByUserId(hrManagerUser.getId());
        testPosting.setPublishedAt(Instant.now().minusSeconds(86400));

        when(jobPostingRepository.findLockedById(100L)).thenReturn(Optional.of(testPosting));
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(i -> i.getArgument(0));

        JobPostingResponse res = service.unpublishJobPosting(100L, "Đã tuyển đủ chỉ tiêu headcount", hrManagerUser.getId());

        assertThat(res.getStatus()).isEqualTo("UNPUBLISHED");
        assertThat(testPosting.getUnpublishedByUserId()).isEqualTo(hrManagerUser.getId());
        assertThat(testPosting.getUnpublishedAt()).isNotNull();
        assertThat(testPosting.getUnpublishReason()).isEqualTo("Đã tuyển đủ chỉ tiêu headcount");

        verify(auditLogRepository).save(argThat(l ->
                "UNPUBLISH".equals(l.getAction()) && "UNPUBLISHED".equals(l.getToStatus()) && l.getNote().contains("Đã tuyển đủ")
        ));
    }

    @Test
    @DisplayName("SCRUM-150 AC1 & AC2: API công khai chỉ trả tin PUBLISHED và chưa hết hạn")
    void testGetPublicJobPostings_Success() {
        JobPosting publicPosting = new JobPosting();
        publicPosting.setId(200L);
        publicPosting.setJobCode("JP-2026-0099");
        publicPosting.setTitle("NodeJS Engineer");
        publicPosting.setStatus("PUBLISHED");
        publicPosting.setSalaryVisible(true);
        publicPosting.setSalaryMin(18000000L);
        publicPosting.setSalaryMax(30000000L);
        publicPosting.setApplicationDeadline(LocalDate.now().plusDays(10));
        publicPosting.setPublishedAt(Instant.now());

        Page<JobPosting> page = new PageImpl<>(List.of(publicPosting));
        when(jobPostingRepository.findPublicPostings(any(LocalDate.class), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(page);

        Page<JobPostingPublicResponse> res = service.getPublicJobPostings(null, null, null, null, PageRequest.of(0, 10));

        assertThat(res.getTotalElements()).isEqualTo(1);
        JobPostingPublicResponse item = res.getContent().get(0);
        assertThat(item.getTitle()).isEqualTo("NodeJS Engineer");
        assertThat(item.getSalaryDisplay()).contains("18,000,000 - 30,000,000 VND");
    }

    @Test
    @DisplayName("SCRUM-150 AC1: Khi salaryVisible = false, API công khai hiển thị 'Thỏa thuận' và ẩn min/max")
    void testGetPublicJobPostings_SalaryMasked_WhenNotVisible() {
        JobPosting confidentialPosting = new JobPosting();
        confidentialPosting.setId(201L);
        confidentialPosting.setTitle("Chief Technology Officer");
        confidentialPosting.setStatus("PUBLISHED");
        confidentialPosting.setSalaryVisible(false);
        confidentialPosting.setSalaryMin(100000000L);
        confidentialPosting.setSalaryMax(150000000L);

        Page<JobPosting> page = new PageImpl<>(List.of(confidentialPosting));
        when(jobPostingRepository.findPublicPostings(any(LocalDate.class), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(page);

        Page<JobPostingPublicResponse> res = service.getPublicJobPostings(null, null, null, null, PageRequest.of(0, 10));

        JobPostingPublicResponse item = res.getContent().get(0);
        assertThat(item.getSalaryDisplay()).isEqualTo("Thỏa thuận");
        assertThat(item.getSalaryMin()).isNull();
        assertThat(item.getSalaryMax()).isNull();
    }

    @Test
    @DisplayName("SCRUM-150 AC2: Chi tiết công khai của tin bị gỡ hoặc hết hạn ném ResourceNotFoundException")
    void testGetPublicJobPostingDetail_UnpublishedOrExpired_ThrowsNotFound() {
        when(jobPostingRepository.findById(eq(100L)))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getPublicJobPostingDetail(100L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("không tồn tại, đã hết hạn hoặc đã được gỡ xuống");
    }

    @Test
    @DisplayName("SCRUM-163: getPublicLocations trả danh sách các địa điểm công khai từ repository")
    void testGetPublicLocations() {
        when(jobPostingRepository.findPublicLocations(any(LocalDate.class)))
                .thenReturn(List.of("Hà Nội - Trụ sở chính", "TP. Hồ Chí Minh"));

        List<String> locations = service.getPublicLocations();

        assertThat(locations).containsExactly("Hà Nội - Trụ sở chính", "TP. Hồ Chí Minh");
    }

    @Test
    @DisplayName("SCRUM-163: getPublicJobPostings xử lý chính xác các nhánh lọc 'ALL', khoảng trắng và giá trị cụ thể")
    void testGetPublicJobPostings_FilterBranches() {
        when(jobPostingRepository.findPublicPostings(any(LocalDate.class), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(Page.empty());

        // Nhánh 1: "ALL" cho workingModel và workLocation -> truyền null vào repository
        service.getPublicJobPostings(10L, "ALL", "ALL", "  Java Developer  ", PageRequest.of(0, 10));
        org.mockito.Mockito.verify(jobPostingRepository).findPublicPostings(
                any(LocalDate.class), eq(10L), isNull(), isNull(), eq("Java Developer"), any(Pageable.class)
        );

        // Nhánh 2: Giá trị cụ thể
        service.getPublicJobPostings(20L, "REMOTE", "Hà Nội", "React", PageRequest.of(0, 10));
        org.mockito.Mockito.verify(jobPostingRepository).findPublicPostings(
                any(LocalDate.class), eq(20L), eq("REMOTE"), eq("Hà Nội"), eq("React"), any(Pageable.class)
        );

        // Nhánh 3: Chuỗi rỗng hoặc khoảng trắng -> truyền null
        service.getPublicJobPostings(null, "   ", "   ", "   ", PageRequest.of(0, 10));
        org.mockito.Mockito.verify(jobPostingRepository).findPublicPostings(
                any(LocalDate.class), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)
        );
    }

    @Test
    @DisplayName("S4-08 / SCRUM-187: Gỡ tin tuyển dụng với lý do rỗng ném BadRequestException")
    void testUnpublishJobPosting_BlankReason_ThrowsBadRequest() {
        assertThatThrownBy(() -> service.unpublishJobPosting(100L, "   ", hrManagerUser.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Vui lòng cung cấp lý do");
    }

    @Test
    @DisplayName("S4-08 / SCRUM-187: Gỡ tin tuyển dụng khi không ở trạng thái PUBLISHED ném BadRequestException")
    void testUnpublishJobPosting_NotPublished_ThrowsBadRequest() {
        testPosting.setStatus("DRAFT");
        when(jobPostingRepository.findLockedById(100L)).thenReturn(Optional.of(testPosting));

        assertThatThrownBy(() -> service.unpublishJobPosting(100L, "Đã tuyển đủ nhân sự", hrManagerUser.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ tin đang xuất bản hoặc đã hết hạn mới có thể gỡ");
    }

    @Test
    @DisplayName("S4-08 / SCRUM-187 / SCRUM-189: Tự động hết hạn tin tuyển dụng quá hạn nhận hồ sơ")
    void testExpireDueJobPostings_Success() {
        LocalDate today = LocalDate.now();
        JobPosting overdue1 = new JobPosting();
        overdue1.setId(501L);
        overdue1.setJobCode("JP-2026-0501");
        overdue1.setTitle("Frontend VueJS");
        overdue1.setStatus("PUBLISHED");
        overdue1.setApplicationDeadline(today.minusDays(1));
        overdue1.setPublishedByUserId(hrManagerUser.getId());

        JobPosting overdue2 = new JobPosting();
        overdue2.setId(502L);
        overdue2.setJobCode("JP-2026-0502");
        overdue2.setTitle("DevOps Engineer");
        overdue2.setStatus("PUBLISHED");
        overdue2.setApplicationDeadline(today.minusDays(5));
        overdue2.setPublishedByUserId(hrManagerUser.getId());

        when(jobPostingRepository.findExpiredPublishedPostings(today))
                .thenReturn(List.of(overdue1, overdue2));
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(i -> i.getArgument(0));

        AutoExpireResult result = service.expireDueJobPostings(today);

        assertThat(result.getExpiredCount()).isEqualTo(2);
        assertThat(result.getExpiredPostingIds()).containsExactly(501L, 502L);
        assertThat(result.getExpiredJobCodes()).containsExactly("JP-2026-0501", "JP-2026-0502");
        assertThat(overdue1.getStatus()).isEqualTo("EXPIRED");
        assertThat(overdue2.getStatus()).isEqualTo("EXPIRED");

        verify(auditLogRepository, org.mockito.Mockito.times(2)).save(argThat(log ->
                "AUTO_EXPIRE".equals(log.getAction()) && "EXPIRED".equals(log.getToStatus())
        ));
    }

    @Test
    @DisplayName("S4-08 / SCRUM-187 / SCRUM-189: Tự động hết hạn khi không có tin nào quá hạn")
    void testExpireDueJobPostings_NoOverdue() {
        LocalDate today = LocalDate.now();
        when(jobPostingRepository.findExpiredPublishedPostings(today))
                .thenReturn(List.of());

        AutoExpireResult result = service.expireDueJobPostings(today);

        assertThat(result.getExpiredCount()).isEqualTo(0);
        assertThat(result.getExpiredPostingIds()).isEmpty();
        verify(auditLogRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    @DisplayName("S4-08 / SCRUM-187 / SCRUM-189: Scheduled Task JobPostingExpirationTask gọi expireDueJobPostings thành công")
    void testJobPostingExpirationTask_RunsSuccessfully() {
        JobPostingExpirationTask task = new JobPostingExpirationTask(service);
        when(jobPostingRepository.findExpiredPublishedPostings(any(LocalDate.class)))
                .thenReturn(List.of());

        task.runDailyExpirationTask();

        verify(jobPostingRepository).findExpiredPublishedPostings(any(LocalDate.class));
    }
}
