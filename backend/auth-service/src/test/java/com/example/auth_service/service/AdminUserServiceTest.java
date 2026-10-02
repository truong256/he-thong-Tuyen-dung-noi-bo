package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.RequisitionAssignment;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private MailService mailService;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private RequisitionAssignmentRepository requisitionAssignmentRepository;

    @Mock
    private RecruitmentRequisitionRepository recruitmentRequisitionRepository;

    @InjectMocks
    private AdminUserService adminUserService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    // =========================================================================
    // S1-08: Internal Account Management
    // =========================================================================

    @Test
    @DisplayName("S1-08: Tạo tài khoản tự động sinh mật khẩu tạm thời và gửi email kích hoạt")
    void testCreateUser_GeneratesTempPasswordAndSendsEmail() {
        CreateUserRequest req = new CreateUserRequest();
        req.setEmail("new_user@company.com");
        req.setFullName("Nguyễn Văn Nhân Viên");
        req.setDepartment("Công nghệ thông tin");
        req.setRoles(Set.of("RECRUITER"));
        req.setStatus("ACTIVE");

        when(userRepository.existsByEmailIgnoreCase("new_user@company.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$encodedTempPass");

        Role recruiterRole = new Role(RoleName.RECRUITER, "Vai trò RECRUITER");
        when(roleRepository.findByName(RoleName.RECRUITER)).thenReturn(Optional.of(recruiterRole));

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(10L);
            return u;
        });

        UserSummaryDto result = adminUserService.createUser(req);

        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("new_user@company.com");
        assertThat(result.getFullName()).isEqualTo("Nguyễn Văn Nhân Viên");
        assertThat(result.getDepartment()).isEqualTo("Công nghệ thông tin");
        assertThat(result.getRoles()).contains("RECRUITER");

        // Verify password was encoded and temporary password dispatched
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getPassword()).isEqualTo("$2a$10$encodedTempPass");
        assertThat(savedUser.getDepartment()).isEqualTo("Công nghệ thông tin");

        // Verify activation email dispatched with 12-char temp password
        verify(mailService).sendAccountActivationEmail(
                eq("new_user@company.com"),
                argThat(pwd -> pwd != null && pwd.length() == 12)
        );
    }

    @Test
    @DisplayName("S1-08 Hardening: Client gửi password vẫn bị bỏ qua, luôn sinh temporary password 12 ký tự và gửi qua email")
    void testCreateUser_ClientSuppliedPasswordIsIgnored_AlwaysGenerates12CharTempPassword() {
        CreateUserRequest req = new CreateUserRequest();
        req.setEmail("custom_pass@company.com");
        req.setFullName("User Client Pass Attempt");
        req.setRoles(Set.of("RECRUITER"));
        req.setPassword("ClientHackPass123!@#");

        when(userRepository.existsByEmailIgnoreCase("custom_pass@company.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "hash_" + inv.getArgument(0));

        Role recruiterRole = new Role(RoleName.RECRUITER, "Vai trò RECRUITER");
        when(roleRepository.findByName(RoleName.RECRUITER)).thenReturn(Optional.of(recruiterRole));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        adminUserService.createUser(req);

        ArgumentCaptor<String> passwordCaptor = ArgumentCaptor.forClass(String.class);
        verify(passwordEncoder).encode(passwordCaptor.capture());
        String encodedRaw = passwordCaptor.getValue();

        assertThat(encodedRaw).isNotEqualTo("ClientHackPass123!@#");
        assertThat(encodedRaw).hasSize(12);

        verify(mailService).sendAccountActivationEmail(
                eq("custom_pass@company.com"),
                argThat(pwd -> pwd != null && pwd.length() == 12 && !pwd.equals("ClientHackPass123!@#") && pwd.equals(encodedRaw))
        );
    }

    @Test
    @DisplayName("S1-08: Từ chối tạo tài khoản khi email đã tồn tại (case-insensitive)")
    void testCreateUser_RejectsDuplicateEmailCaseInsensitive() {
        CreateUserRequest req = new CreateUserRequest();
        req.setEmail("Admin@Company.com");
        req.setFullName("Admin Dupe");
        req.setRoles(Set.of("ADMIN"));

        when(userRepository.existsByEmailIgnoreCase("admin@company.com")).thenReturn(true);

        assertThatThrownBy(() -> adminUserService.createUser(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Email này đã tồn tại trong hệ thống");

        verify(userRepository, never()).save(any());
        verify(mailService, never()).sendAccountActivationEmail(any(), any());
    }

    @Test
    @DisplayName("S1-08: Tìm kiếm và lọc danh sách tài khoản theo tên, email, phòng ban, vai trò, trạng thái")
    void testListUsers_SearchAndFilters() {
        Pageable pageable = PageRequest.of(0, 20);
        User u1 = new User("dev1@company.com", "pass");
        u1.setId(1L);
        u1.setFullName("Lê IT");
        u1.setDepartment("Công nghệ");
        u1.setRoles(Set.of(new Role(RoleName.RECRUITER, "RECRUITER")));

        Page<User> mockPage = new PageImpl<>(List.of(u1), pageable, 1);
        when(userRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(mockPage);

        Page<UserSummaryDto> page = adminUserService.listUsers("Công nghệ", "ACTIVE", "RECRUITER", pageable);

        assertThat(page).isNotNull();
        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getDepartment()).isEqualTo("Công nghệ");
    }

    // =========================================================================
    // S1-09: Multi-Role Assign / Revoke & Admin Self-Protection
    // =========================================================================

    @Test
    @DisplayName("S1-09: Admin gán multi-role hợp lệ (RECRUITER + INTERVIEWER)")
    void testUpdateRoles_MultiRoleSuccess() {
        User target = new User("user@company.com", "pass");
        target.setId(5L);
        target.setRoles(Set.of(new Role(RoleName.RECRUITER, "RECRUITER")));

        when(userRepository.findById(5L)).thenReturn(Optional.of(target));
        when(roleRepository.findByName(RoleName.RECRUITER)).thenReturn(Optional.of(new Role(RoleName.RECRUITER, "RECRUITER")));
        when(roleRepository.findByName(RoleName.INTERVIEWER)).thenReturn(Optional.of(new Role(RoleName.INTERVIEWER, "INTERVIEWER")));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateRolesRequest req = new UpdateRolesRequest(Set.of("RECRUITER", "INTERVIEWER"));
        UserSummaryDto res = adminUserService.updateRoles(5L, req);

        assertThat(res.getRoles()).containsExactlyInAnyOrder("RECRUITER", "INTERVIEWER");
    }

    @Test
    @DisplayName("S1-09: Server-side chặn Admin tự thu hồi vai trò ADMIN của chính mình")
    void testUpdateRoles_SelfAdminRevokeBlocked() {
        User adminUser = new User("superadmin@company.com", "pass");
        adminUser.setId(1L);
        adminUser.setRoles(Set.of(new Role(RoleName.ADMIN, "ADMIN")));

        UserPrincipal principal = new UserPrincipal(1L, "superadmin@company.com", "Admin", "pass", "ACTIVE", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of())
        );

        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(roleRepository.findByName(RoleName.RECRUITER)).thenReturn(Optional.of(new Role(RoleName.RECRUITER, "RECRUITER")));

        UpdateRolesRequest req = new UpdateRolesRequest(Set.of("RECRUITER")); // Tự bỏ ADMIN!

        assertThatThrownBy(() -> adminUserService.updateRoles(1L, req))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.FORBIDDEN)
                .hasMessageContaining("Quản trị viên không thể tự thu hồi vai trò ADMIN của chính mình");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("S1-09: Admin được phép sửa vai trò của Admin khác mà không bị over-protect")
    void testUpdateRoles_AdminModifiesOtherAdminAllowed() {
        User otherAdmin = new User("other_admin@company.com", "pass");
        otherAdmin.setId(2L);
        otherAdmin.setRoles(Set.of(new Role(RoleName.ADMIN, "ADMIN")));

        UserPrincipal principal = new UserPrincipal(1L, "caller_admin@company.com", "Caller", "pass", "ACTIVE", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of())
        );

        when(userRepository.findById(2L)).thenReturn(Optional.of(otherAdmin));
        when(roleRepository.findByName(RoleName.HR_MANAGER)).thenReturn(Optional.of(new Role(RoleName.HR_MANAGER, "HR_MANAGER")));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateRolesRequest req = new UpdateRolesRequest(Set.of("HR_MANAGER"));
        UserSummaryDto res = adminUserService.updateRoles(2L, req);

        assertThat(res.getRoles()).containsExactly("HR_MANAGER");
        verify(userRepository).save(any(User.class));
    }

    // =========================================================================
    // S1-10: Lock / Unlock Account & Handover Warning
    // =========================================================================

    @Test
    @DisplayName("S1-10: Khóa tài khoản không có lý do -> Bị từ chối")
    void testUpdateStatus_LockWithoutReason_Rejected() {
        User user = new User("staff@company.com", "pass");
        user.setId(7L);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        UpdateStatusRequest req = new UpdateStatusRequest("LOCKED", "", null);

        assertThatThrownBy(() -> adminUserService.updateStatus(7L, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bắt buộc ghi lý do khóa tài khoản");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("S1-10: Khóa tài khoản chọn lý do 'Khác' nhưng không ghi chú -> Bị từ chối")
    void testUpdateStatus_LockWithReasonOther_WithoutNote_Rejected() {
        User user = new User("staff2@company.com", "pass");
        user.setId(72L);
        when(userRepository.findById(72L)).thenReturn(Optional.of(user));

        // Note is null
        UpdateStatusRequest reqNullNote = new UpdateStatusRequest("LOCKED", "Khác (ghi rõ trong ghi chú)", null);
        assertThatThrownBy(() -> adminUserService.updateStatus(72L, reqNullNote))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Vui lòng ghi rõ lý do chi tiết trong phần ghi chú khi chọn lý do khác");

        // Note is blank/whitespace
        UpdateStatusRequest reqBlankNote = new UpdateStatusRequest("LOCKED", "Khác (ghi rõ trong ghi chú)", "   ");
        assertThatThrownBy(() -> adminUserService.updateStatus(72L, reqBlankNote))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Vui lòng ghi rõ lý do chi tiết trong phần ghi chú khi chọn lý do khác");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("S1-10: Khóa tài khoản chọn lý do 'Khác' và có ghi chú chi tiết -> Thành công")
    void testUpdateStatus_LockWithReasonOther_WithNote_Success() {
        User user = new User("staff3@company.com", "pass");
        user.setId(73L);
        when(userRepository.findById(73L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateStatusRequest req = new UpdateStatusRequest("LOCKED", "Khác (ghi rõ trong ghi chú)", "Nhân sự nghỉ việc đột xuất theo đơn thỏa thuận.");
        UserSummaryDto res = adminUserService.updateStatus(73L, req);

        assertThat(res.getStatus()).isEqualTo("LOCKED");
        assertThat(res.getLockReason()).isEqualTo("Khác (ghi rõ trong ghi chú)");
        assertThat(res.getLockNote()).isEqualTo("Nhân sự nghỉ việc đột xuất theo đơn thỏa thuận.");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("S1-10: Khóa tài khoản hợp lệ -> Lưu reason, note, thu hồi refresh token, gắn cảnh báo bàn giao")
    void testUpdateStatus_LockWithReason_RevokesSessionsAndFlagsHandover() {
        User user = new User("recruiter@company.com", "pass");
        user.setId(8L);
        when(userRepository.findById(8L)).thenReturn(Optional.of(user));

        // Mock assignments
        RequisitionAssignment assignment = new RequisitionAssignment();
        assignment.setId(100L);
        assignment.setRequisitionId(50L);
        assignment.setUserId(8L);
        assignment.setRole(RoleName.RECRUITER);
        when(requisitionAssignmentRepository.findByUserId(8L)).thenReturn(List.of(assignment));

        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(50L);
        req.setRequisitionCode("REQ-2026-001");
        req.setTitle("Senior Java Developer");
        when(recruitmentRequisitionRepository.findById(50L)).thenReturn(Optional.of(req));

        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateStatusRequest statusReq = new UpdateStatusRequest("LOCKED", "Chấm dứt hợp đồng lao động", "Quyết định số 123/QĐ-NS");
        UserSummaryDto res = adminUserService.updateStatus(8L, statusReq);

        assertThat(res.getStatus()).isEqualTo("LOCKED");
        assertThat(res.getLockReason()).isEqualTo("Chấm dứt hợp đồng lao động");
        assertThat(res.getLockNote()).isEqualTo("Quyết định số 123/QĐ-NS");
        assertThat(res.getHandoverWarnings()).contains("REQ-2026-001 - Senior Java Developer");

        // Verify refresh tokens were revoked
        verify(refreshTokenRepository).revokeAllByUser(user);

        // Verify assignment handover was flagged
        assertThat(assignment.isHandoverRequired()).isTrue();
        verify(requisitionAssignmentRepository).save(assignment);
    }

    @Test
    @DisplayName("S1-10: Mở khóa tài khoản -> Status ACTIVE, không xóa cảnh báo bàn giao")
    void testUpdateStatus_UnlockAccount_RestoresActive() {
        User user = new User("locked_staff@company.com", "pass");
        user.setId(9L);
        user.setStatus("LOCKED");
        user.setFailedLoginAttempts(5);
        user.setLockedUntil(Instant.now().plusSeconds(3600));
        when(userRepository.findById(9L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateStatusRequest req = new UpdateStatusRequest("ACTIVE");
        UserSummaryDto res = adminUserService.updateStatus(9L, req);

        assertThat(res.getStatus()).isEqualTo("ACTIVE");
        assertThat(user.getFailedLoginAttempts()).isEqualTo(0);
        assertThat(user.getLockedUntil()).isNull();
    }

    @Test
    @DisplayName("S1-08: Sinh mật khẩu tạm thời đúng 12 ký tự ngẫu nhiên, an toàn và đủ độ phức tạp")
    void testGenerateTemporaryPassword_Generates12CharComplexPassword() {
        for (int i = 0; i < 20; i++) {
            String tempPassword = AdminUserService.generateTemporaryPassword();
            assertThat(tempPassword).isNotNull();
            assertThat(tempPassword).hasSize(12);
            assertThat(tempPassword).matches(".*[A-Z].*");
            assertThat(tempPassword).matches(".*[a-z].*");
            assertThat(tempPassword).matches(".*[0-9].*");
            assertThat(tempPassword).matches(".*[!@#$%^&*].*");
        }
    }
}
