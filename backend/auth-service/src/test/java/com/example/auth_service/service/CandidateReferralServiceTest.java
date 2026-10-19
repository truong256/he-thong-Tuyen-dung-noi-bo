package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CommonCategory;
import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.JobPosting;
import com.example.auth_service.domain.sprint4.CandidateReferral;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit Test: CandidateReferralServiceTest (Sprint 4 / S4-07 / SCRUM-186)
 * Kiểm thử nghiệp vụ giới thiệu ứng viên nội bộ:
 * - Gắn nhãn nguồn INTERNAL_REFERRAL và tên người giới thiệu từ phiên đăng nhập
 * - Giới hạn tra cứu (chỉ xem hồ sơ của chính mình hoặc quyền quản trị)
 * - Cập nhật và theo dõi trạng thái tổng quát
 * - Độ phủ nhánh (Branch coverage) > 80%
 */
@ExtendWith(MockitoExtension.class)
class CandidateReferralServiceTest {

    @Mock private CandidateReferralRepository referralRepository;
    @Mock private CandidateApplicationRepository candidateApplicationRepository;
    @Mock private JobPostingRepository jobPostingRepository;
    @Mock private RecruitmentRequisitionRepository requisitionRepository;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private CommonCategoryRepository commonCategoryRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private CandidateReferralService service;

    private UserPrincipal internalUserPrincipal;
    private UserPrincipal candidateUserPrincipal;
    private UserPrincipal hrManagerPrincipal;
    private UserPrincipal anotherEmployeePrincipal;

    private JobPosting testJobPosting;
    private RecruitmentRequisition testRequisition;
    private Department testDept;
    private CommonCategory referralSourceCategory;

    @BeforeEach
    void setUp() {
        internalUserPrincipal = new UserPrincipal(
                100L,
                "interviewer@company.com",
                "Nguyễn Kỹ Thuật",
                "hashed",
                "ACTIVE",
                1,
                false,
                List.of(new SimpleGrantedAuthority("ROLE_INTERVIEWER"), new SimpleGrantedAuthority("CATALOG_READ"))
        );

        candidateUserPrincipal = new UserPrincipal(
                200L,
                "candidate@outside.com",
                "Ứng Viên Ngoài",
                "hashed",
                "ACTIVE",
                1,
                false,
                List.of(new SimpleGrantedAuthority("ROLE_CANDIDATE"))
        );

        hrManagerPrincipal = new UserPrincipal(
                10L,
                "hr_manager@company.com",
                "Trưởng Phòng HR",
                "hashed",
                "ACTIVE",
                1,
                false,
                List.of(new SimpleGrantedAuthority("ROLE_HR_MANAGER"), new SimpleGrantedAuthority("CANDIDATE_READ_ALL"))
        );

        anotherEmployeePrincipal = new UserPrincipal(
                101L,
                "other@company.com",
                "Lê Đồng Nghiệp",
                "hashed",
                "ACTIVE",
                1,
                false,
                List.of(new SimpleGrantedAuthority("ROLE_HIRING_MANAGER"))
        );

        testDept = new Department();
        testDept.setId(5L);
        testDept.setName("Phòng Phát triển Phần mềm");

        testRequisition = new RecruitmentRequisition();
        testRequisition.setId(20L);
        testRequisition.setRequisitionCode("REQ-2026-001");
        testRequisition.setTitle("Kỹ sư Backend Senior");
        testRequisition.setDepartmentId(5L);
        testRequisition.setStatus("APPROVED");

        testJobPosting = new JobPosting();
        testJobPosting.setId(50L);
        testJobPosting.setJobCode("JOB-BE-001");
        testJobPosting.setTitle("Kỹ sư Backend Java/Spring");
        testJobPosting.setRequisitionId(20L);
        testJobPosting.setDepartmentId(5L);
        testJobPosting.setStatus("PUBLISHED");
        testJobPosting.setApplicationDeadline(LocalDate.now().plusDays(30));

        referralSourceCategory = new CommonCategory(8L, "CANDIDATE_SOURCE", "REFERRAL", "Giới thiệu nội bộ", 1, true);
    }

    // =========================================================================
    // 1. SUBMIT REFERRAL TESTS (SCRUM-184 / SCRUM-186)
    // =========================================================================

    @Test
    @DisplayName("Nộp hồ sơ giới thiệu thành công - Gắn nguồn INTERNAL_REFERRAL và tên người giới thiệu từ JWT")
    void submitReferral_Success_WithJobPosting() {
        ReferralCreateRequest req = ReferralCreateRequest.builder()
                .jobPostingId(50L)
                .candidateName("Trần Văn Ứng Viên")
                .candidateEmail("ungvien@gmail.com")
                .candidatePhone("0901234567")
                .cvUrl("https://drive.google.com/cv/ungvien.pdf")
                .relationship("Đồng nghiệp cũ tại công ty X")
                .referralNotes("Lập trình viên rất giỏi về Spring Boot và Microservices, tính cách hòa đồng nhiệt huyết.")
                .build();

        when(jobPostingRepository.findById(50L)).thenReturn(Optional.of(testJobPosting));
        when(requisitionRepository.findById(20L)).thenReturn(Optional.of(testRequisition));
        when(referralRepository.existsByCandidateEmailAndJobPostingId("ungvien@gmail.com", 50L)).thenReturn(false);

        // Candidate User
        when(userRepository.findByEmail("ungvien@gmail.com")).thenReturn(Optional.empty());
        Role candRole = new Role(RoleName.CANDIDATE, "CANDIDATE");
        when(roleRepository.findByName(RoleName.CANDIDATE)).thenReturn(Optional.of(candRole));
        when(passwordEncoder.encode(anyString())).thenReturn("random_hash");
        User savedCandUser = new User();
        savedCandUser.setId(301L);
        savedCandUser.setEmail("ungvien@gmail.com");
        when(userRepository.save(any(User.class))).thenReturn(savedCandUser);

        when(commonCategoryRepository.findAll()).thenReturn(List.of(referralSourceCategory));

        // Save CandidateApplication
        CandidateApplication savedApp = new CandidateApplication();
        savedApp.setId(77L);
        when(candidateApplicationRepository.save(any(CandidateApplication.class))).thenReturn(savedApp);

        // Save Referral
        when(referralRepository.save(any(CandidateReferral.class))).thenAnswer(invocation -> {
            CandidateReferral r = invocation.getArgument(0);
            r.setId(999L);
            return r;
        });

        when(departmentRepository.findById(5L)).thenReturn(Optional.of(testDept));

        // EXECUTE
        ReferralResponse response = service.submitReferral(req, internalUserPrincipal);

        // VERIFY AC 1 & AC 2:
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(999L);
        assertThat(response.getCandidateName()).isEqualTo("Trần Văn Ứng Viên");
        assertThat(response.getCandidateEmail()).isEqualTo("ungvien@gmail.com");
        assertThat(response.getSource()).isEqualTo("INTERNAL_REFERRAL");
        assertThat(response.getReferrerUserId()).isEqualTo(100L); // Từ authenticated principal!
        assertThat(response.getReferrerName()).isEqualTo("Nguyễn Kỹ Thuật"); // Từ authenticated principal!
        assertThat(response.getGeneralStatus()).isEqualTo("SUBMITTED");
        assertThat(response.getGeneralStatusLabel()).isEqualTo("Đã tiếp nhận hồ sơ");
        assertThat(response.getJobTitle()).isEqualTo(testJobPosting.getTitle());
        assertThat(response.getJobPostingCode()).isEqualTo("JOB-BE-001");

        // Verify CandidateApplication was persisted with internal referral source
        ArgumentCaptor<CandidateApplication> appCaptor = ArgumentCaptor.forClass(CandidateApplication.class);
        verify(candidateApplicationRepository).save(appCaptor.capture());
        CandidateApplication app = appCaptor.getValue();
        assertThat(app.getCandidateSourceCode()).isEqualTo("INTERNAL_REFERRAL");
        assertThat(app.getCandidateSourceId()).isEqualTo(8L);
        assertThat(app.getReferrerUserId()).isEqualTo(100L);
        assertThat(app.getReferrerName()).isEqualTo("Nguyễn Kỹ Thuật");
        assertThat(app.getReferralNotes()).contains("Spring Boot");
    }

    @Test
    @DisplayName("Nộp hồ sơ thành công khi chỉ truyền requisitionId")
    void submitReferral_Success_WithRequisitionOnly() {
        ReferralCreateRequest req = ReferralCreateRequest.builder()
                .requisitionId(20L)
                .candidateName("Phạm Thị B")
                .candidateEmail("phamb@gmail.com")
                .referralNotes("Ứng viên phù hợp với tiêu chí tuyển dụng.")
                .build();

        when(requisitionRepository.findById(20L)).thenReturn(Optional.of(testRequisition));
        when(referralRepository.existsByCandidateEmailAndRequisitionId("phamb@gmail.com", 20L)).thenReturn(false);

        User existingUser = new User();
        existingUser.setId(302L);
        existingUser.setEmail("phamb@gmail.com");
        when(userRepository.findByEmail("phamb@gmail.com")).thenReturn(Optional.of(existingUser));

        CandidateApplication savedApp = new CandidateApplication();
        savedApp.setId(88L);
        when(candidateApplicationRepository.save(any())).thenReturn(savedApp);

        when(referralRepository.save(any())).thenAnswer(inv -> {
            CandidateReferral r = inv.getArgument(0);
            r.setId(1000L);
            return r;
        });

        when(departmentRepository.findById(5L)).thenReturn(Optional.of(testDept));

        ReferralResponse response = service.submitReferral(req, internalUserPrincipal);

        assertThat(response.getId()).isEqualTo(1000L);
        assertThat(response.getRequisitionCode()).isEqualTo("REQ-2026-001");
        assertThat(response.getReferrerUserId()).isEqualTo(100L);
        assertThat(response.getSource()).isEqualTo("INTERNAL_REFERRAL");
    }

    @Test
    @DisplayName("Từ chối nếu tài khoản thực hiện không phải nhân sự nội bộ (Role CANDIDATE)")
    void submitReferral_Fails_WhenUserIsCandidateOnly() {
        ReferralCreateRequest req = ReferralCreateRequest.builder()
                .jobPostingId(50L)
                .candidateName("Bạn Của Candidate")
                .candidateEmail("friend@gmail.com")
                .referralNotes("Giới thiệu bạn")
                .build();

        assertThatThrownBy(() -> service.submitReferral(req, candidateUserPrincipal))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Chỉ nhân sự nội bộ hợp lệ");
    }

    @Test
    @DisplayName("Từ chối nếu chưa đăng nhập (Principal null)")
    void submitReferral_Fails_WhenUnauthenticated() {
        ReferralCreateRequest req = ReferralCreateRequest.builder()
                .jobPostingId(50L)
                .candidateName("Test")
                .candidateEmail("test@gmail.com")
                .referralNotes("Test")
                .build();

        assertThatThrownBy(() -> service.submitReferral(req, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Yêu cầu đăng nhập");
    }

    @Test
    @DisplayName("Từ chối nếu không chọn vị trí đang tuyển nào")
    void submitReferral_Fails_WhenMissingJobPosition() {
        ReferralCreateRequest req = ReferralCreateRequest.builder()
                .candidateName("Lê Văn C")
                .candidateEmail("levanc@gmail.com")
                .referralNotes("Không chọn vị trí")
                .build();

        assertThatThrownBy(() -> service.submitReferral(req, internalUserPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Vui lòng chọn vị trí việc làm hoặc yêu cầu tuyển dụng");
    }

    @Test
    @DisplayName("Từ chối nếu email ứng viên bị trùng cho cùng vị trí")
    void submitReferral_Fails_WhenDuplicateEmailForPosition() {
        ReferralCreateRequest req = ReferralCreateRequest.builder()
                .jobPostingId(50L)
                .candidateName("Trùng Lặp")
                .candidateEmail("duplicate@gmail.com")
                .referralNotes("Ghi chú")
                .build();

        when(jobPostingRepository.findById(50L)).thenReturn(Optional.of(testJobPosting));
        when(requisitionRepository.findById(20L)).thenReturn(Optional.of(testRequisition));
        when(referralRepository.existsByCandidateEmailAndJobPostingId("duplicate@gmail.com", 50L)).thenReturn(true);

        assertThatThrownBy(() -> service.submitReferral(req, internalUserPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã được giới thiệu cho vị trí này");
    }

    @Test
    @DisplayName("Từ chối nếu ghi chú giới thiệu bị trống")
    void submitReferral_Fails_WhenMissingNotes() {
        ReferralCreateRequest req = ReferralCreateRequest.builder()
                .jobPostingId(50L)
                .candidateName("Trần D")
                .candidateEmail("trand@gmail.com")
                .referralNotes("   ")
                .build();

        assertThatThrownBy(() -> service.submitReferral(req, internalUserPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Ghi chú giới thiệu không được để trống");
    }

    // =========================================================================
    // 2. QUERY REFERRALS & SCOPE TESTS (SCRUM-184 / SCRUM-186)
    // =========================================================================

    @Test
    @DisplayName("Tra cứu hồ sơ của tôi (getMyReferrals) chỉ truy vấn theo ID người đăng nhập")
    void getMyReferrals_ReturnsOnlyOwnedReferrals() {
        CandidateReferral ref1 = CandidateReferral.builder()
                .id(1L)
                .referrerUserId(100L)
                .candidateName("Ứng viên 1")
                .candidateEmail("uv1@gmail.com")
                .generalStatus("SUBMITTED")
                .referralNotes("Note 1")
                .source("INTERNAL_REFERRAL")
                .createdAt(Instant.now())
                .build();

        Page<CandidateReferral> mockPage = new PageImpl<>(List.of(ref1), PageRequest.of(0, 10), 1);
        when(referralRepository.findWithFilters(eq(100L), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(mockPage);

        Page<ReferralResponse> result = service.getMyReferrals(null, null, PageRequest.of(0, 10), internalUserPrincipal);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getReferrerUserId()).isEqualTo(100L);
        assertThat(result.getContent().get(0).getCandidateName()).isEqualTo("Ứng viên 1");
        verify(referralRepository).findWithFilters(eq(100L), isNull(), isNull(), any(Pageable.class));
    }

    @Test
    @DisplayName("Xem chi tiết hồ sơ - Thành công khi là người sở hữu hồ sơ giới thiệu")
    void getReferralDetail_Success_WhenOwner() {
        CandidateReferral ref = CandidateReferral.builder()
                .id(15L)
                .referrerUserId(100L)
                .candidateName("Ứng viên 15")
                .candidateEmail("uv15@gmail.com")
                .generalStatus("SCREENING")
                .referralNotes("Note 15")
                .source("INTERNAL_REFERRAL")
                .createdAt(Instant.now())
                .build();

        when(referralRepository.findById(15L)).thenReturn(Optional.of(ref));

        ReferralResponse detail = service.getReferralDetail(15L, internalUserPrincipal);

        assertThat(detail).isNotNull();
        assertThat(detail.getId()).isEqualTo(15L);
        assertThat(detail.getGeneralStatus()).isEqualTo("SCREENING");
        assertThat(detail.getGeneralStatusLabel()).isEqualTo("Đang sàng lọc hồ sơ");
    }

    @Test
    @DisplayName("Xem chi tiết hồ sơ - Thành công khi người xem là HR Manager có quyền CANDIDATE_READ_ALL")
    void getReferralDetail_Success_WhenPrivilegedHR() {
        CandidateReferral refOfAnother = CandidateReferral.builder()
                .id(25L)
                .referrerUserId(100L) // Của nhân viên 100
                .candidateName("Ứng viên 25")
                .candidateEmail("uv25@gmail.com")
                .generalStatus("INTERVIEW")
                .referralNotes("Note 25")
                .source("INTERNAL_REFERRAL")
                .createdAt(Instant.now())
                .build();

        when(referralRepository.findById(25L)).thenReturn(Optional.of(refOfAnother));

        // HR Manager (ID 10) xem hồ sơ của nhân viên 100
        ReferralResponse detail = service.getReferralDetail(25L, hrManagerPrincipal);

        assertThat(detail).isNotNull();
        assertThat(detail.getId()).isEqualTo(25L);
    }

    @Test
    @DisplayName("Xem chi tiết hồ sơ - Bị chặn (403) khi nhân viên khác cố tình xem hồ sơ không phải do mình giới thiệu")
    void getReferralDetail_Fails_WhenAnotherNormalEmployeeAttemptsAccess() {
        CandidateReferral refOfEmployee100 = CandidateReferral.builder()
                .id(30L)
                .referrerUserId(100L)
                .candidateName("Ứng viên bảo mật")
                .candidateEmail("secret@gmail.com")
                .generalStatus("OFFER")
                .referralNotes("Bí mật")
                .source("INTERNAL_REFERRAL")
                .createdAt(Instant.now())
                .build();

        when(referralRepository.findById(30L)).thenReturn(Optional.of(refOfEmployee100));

        // Nhân viên 101 cố tình tra cứu hồ sơ của nhân viên 100
        assertThatThrownBy(() -> service.getReferralDetail(30L, anotherEmployeePrincipal))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không có quyền truy cập hồ sơ giới thiệu của người khác");
    }

    // =========================================================================
    // 3. STATUS UPDATE TESTS (AC 3: Theo dõi trạng thái ở mức tổng quát)
    // =========================================================================

    @Test
    @DisplayName("Cập nhật trạng thái tổng quát thành công và đồng bộ stage ứng viên")
    void updateGeneralStatus_Success_AndSyncsApplicationStage() {
        CandidateReferral ref = CandidateReferral.builder()
                .id(55L)
                .candidateApplicationId(777L)
                .referrerUserId(100L)
                .candidateName("Ứng viên tiến triển")
                .candidateEmail("progress@gmail.com")
                .generalStatus("SUBMITTED")
                .referralNotes("Note")
                .source("INTERNAL_REFERRAL")
                .createdAt(Instant.now())
                .build();

        when(referralRepository.findById(55L)).thenReturn(Optional.of(ref));
        when(referralRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CandidateApplication app = new CandidateApplication();
        app.setId(777L);
        app.setStage("APPLIED");
        when(candidateApplicationRepository.findById(777L)).thenReturn(Optional.of(app));

        ReferralStatusUpdateRequest updateReq = new ReferralStatusUpdateRequest("INTERVIEW", "Ứng viên đã qua vòng test.");

        ReferralResponse updated = service.updateGeneralStatus(55L, updateReq, hrManagerPrincipal);

        assertThat(updated.getGeneralStatus()).isEqualTo("INTERVIEW");
        assertThat(updated.getGeneralStatusLabel()).isEqualTo("Đang phỏng vấn");

        // Verify CandidateApplication stage was synchronized
        verify(candidateApplicationRepository).save(app);
        assertThat(app.getStage()).isEqualTo("INTERVIEW");
    }

    @Test
    @DisplayName("Từ chối cập nhật trạng thái nếu giá trị không hợp lệ")
    void updateGeneralStatus_Fails_WhenInvalidStatus() {
        ReferralStatusUpdateRequest invalidReq = new ReferralStatusUpdateRequest("UNKNOWN_STATUS", "Invalid");

        assertThatThrownBy(() -> service.updateGeneralStatus(55L, invalidReq, hrManagerPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Trạng thái không hợp lệ");
    }

    @Test
    @DisplayName("Lấy danh sách vị trí đang tuyển trả về các JobPosting PUBLISHED")
    void getActivePositions_ReturnsPublishedJobPostings() {
        when(jobPostingRepository.findAll()).thenReturn(List.of(testJobPosting));
        when(departmentRepository.findAll()).thenReturn(List.of(testDept));

        List<ReferralActivePositionResponse> positions = service.getActivePositions();

        assertThat(positions).isNotEmpty();
        assertThat(positions.get(0).getJobPostingId()).isEqualTo(50L);
        assertThat(positions.get(0).getTitle()).isEqualTo("Kỹ sư Backend Java/Spring");
        assertThat(positions.get(0).getDepartmentName()).isEqualTo("Phòng Phát triển Phần mềm");
    }
}
