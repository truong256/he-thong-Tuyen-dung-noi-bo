package com.example.auth_service.security;

import com.example.auth_service.domain.sprint2.*;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.service.DevMailService;
import com.example.auth_service.service.MailService;
import com.example.auth_service.service.RecruitmentReadService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RbacIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JwtUtils jwt;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired CandidateApplicationRepository applications;
    @Autowired RecruitmentRequisitionRepository requisitions;
    @Autowired RequisitionAssignmentRepository assignments;
    @Autowired SalaryRangeRepository salaries;
    @Autowired RecruitmentReadService readService;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @MockitoSpyBean MailService mailService;

    User recruiter, otherRecruiter, candidate, otherCandidate, interviewer;
    RecruitmentRequisition owned, other;
    CandidateApplication visible, hidden;

    @BeforeEach
    void fixtures() {
        recruiter = user("rbac-recruiter", RoleName.RECRUITER);
        otherRecruiter = user("rbac-other-recruiter", RoleName.RECRUITER);
        candidate = user("rbac-candidate", RoleName.CANDIDATE);
        otherCandidate = user("rbac-other-candidate", RoleName.CANDIDATE);
        interviewer = user("rbac-interviewer", RoleName.INTERVIEWER);
        owned = requisition("RBAC-OWN");
        other = requisition("RBAC-OTHER");
        assign(owned, recruiter, RoleName.RECRUITER);
        assign(other, otherRecruiter, RoleName.RECRUITER);
        visible = application(owned, candidate, interviewer);
        hidden = application(other, otherCandidate, null);
        SalaryRange salary = new SalaryRange();
        salary.setName("RBAC salary");
        salary.setMinSalary(new BigDecimal("10000000"));
        salary.setMaxSalary(new BigDecimal("20000000"));
        salaries.saveAndFlush(salary);
    }

    @AfterEach
    void clearSecurityContext() { SecurityContextHolder.clearContext(); }

    @ParameterizedTest
    @EnumSource(RoleName.class)
    void sevenRolesHaveExplicitEndpointPermissions(RoleName role) throws Exception {
        User actor = user("rbac-matrix", role);
        mvc.perform(get("/api/auth/permissions").header("Authorization", token(actor)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@ == 'PROFILE_READ')]").exists());
        mvc.perform(get("/api/admin/users").header("Authorization", token(actor)))
                .andExpect(status().is(role == RoleName.ADMIN ? 200 : 403));
        boolean salaryAllowed = Set.of(RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.RECRUITER,
                RoleName.HIRING_MANAGER, RoleName.APPROVER).contains(role);
        mvc.perform(get("/api/salary-ranges").header("Authorization", token(actor)))
                .andExpect(status().is(salaryAllowed ? 200 : 403));
    }

    @Test
    void adminCanInspectAllSevenRoleDefinitions() throws Exception {
        mvc.perform(get("/api/admin/roles").header("Authorization", token(user("rbac-admin", RoleName.ADMIN))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(7))
                .andExpect(jsonPath("$.INTERVIEWER[?(@ == 'SALARY_READ')]").isEmpty());
    }

    @Test
    void interviewerCannotReadSalaryListOrDetailAndReceivesVietnameseError() throws Exception {
        for (String path : new String[]{"/api/salary-ranges", "/api/salary-ranges/1"}) {
            mvc.perform(get(path).header("Authorization", token(interviewer)))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"))
                    .andExpect(jsonPath("$.message").value("Bạn không có quyền truy cập chức năng này."));
        }
    }

    @Test
    void recruiterListAndCountAreScopedBeforePagination() throws Exception {
        mvc.perform(get("/api/candidates?size=1").header("Authorization", token(recruiter)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(visible.getId()))
                .andExpect(jsonPath("$.content[0].minSalary").doesNotExist());
        mvc.perform(get("/api/candidates?requisitionId=" + other.getId()).header("Authorization", token(recruiter)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void recruiterCannotGuessAnotherApplicationId() throws Exception {
        mvc.perform(get("/api/candidates/" + visible.getId()).header("Authorization", token(recruiter)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/candidates/" + hidden.getId()).header("Authorization", token(recruiter)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void candidateOnlySeesOwnApplication() throws Exception {
        mvc.perform(get("/api/candidates").header("Authorization", token(candidate)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(visible.getId()));
        mvc.perform(get("/api/candidates/" + hidden.getId()).header("Authorization", token(candidate)))
                .andExpect(status().isForbidden());
    }

    @Test
    void interviewerOnlySeesAssignedInterviewApplication() throws Exception {
        mvc.perform(get("/api/candidates").header("Authorization", token(interviewer)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/candidates/" + hidden.getId()).header("Authorization", token(interviewer)))
                .andExpect(status().isForbidden());
    }

    @Test
    void hiringManagerNeedsPositionAssignment() throws Exception {
        User manager = user("rbac-manager", RoleName.HIRING_MANAGER);
        mvc.perform(get("/api/candidates").header("Authorization", token(manager)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        assign(owned, manager, RoleName.HIRING_MANAGER);
        mvc.perform(get("/api/candidates").header("Authorization", token(manager)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void hrManagerCanReadAcrossPositions() throws Exception {
        mvc.perform(get("/api/candidates").header("Authorization", token(user("rbac-hr", RoleName.HR_MANAGER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void missingOrInvalidTokenGetsVietnamese401() throws Exception {
        mvc.perform(get("/api/candidates")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Vui lòng đăng nhập để truy cập chức năng này."));
        mvc.perform(get("/api/candidates").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void unknownRoutesAndMethodsDefaultToDenyEvenForAdmin() throws Exception {
        String bearer = token(user("rbac-admin", RoleName.ADMIN));
        for (String path : new String[]{"/api/future-feature", "/api/auth/future-feature", "/api/admin/future-feature", "/error"}) {
            mvc.perform(get(path).header("Authorization", bearer)).andExpect(status().isForbidden());
        }
        mvc.perform(post("/api/salary-ranges").header("Authorization", bearer))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/login").header("Authorization", bearer))
                .andExpect(status().isForbidden());
    }

    @Test
    void publicRegisterRejectsPrivilegeEscalation() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"attacker@example.com","password":"Password123@","role":"ADMIN"}
                        """))
                .andExpect(status().isBadRequest());
        assertThat(users.findByEmail("attacker@example.com")).isEmpty();
    }

    @Test
    void publicRegisterStillCreatesCandidate() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"new-candidate@example.com","password":"Password123@","fullName":"Ứng viên"}
                        """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.roles[0]").value("CANDIDATE"));
    }

    @Test
    void tokenRoleClaimCannotOverrideDatabaseRoles() throws Exception {
        String forgedRoleClaim = "Bearer " + jwt.generateAccessToken(recruiter.getEmail(), Set.of("ADMIN"));
        mvc.perform(get("/api/admin/users").header("Authorization", forgedRoleClaim))
                .andExpect(status().isForbidden());
    }

    @Test
    void removedRolesAreNotRestoredFromLegacyFieldOrOldToken() throws Exception {
        String bearer = token(recruiter);
        recruiter.setRoles(Set.of());
        users.saveAndFlush(recruiter);
        mvc.perform(get("/api/candidates").header("Authorization", bearer)).andExpect(status().isForbidden());
    }

    @Test
    void disabledUserCannotReuseOldToken() throws Exception {
        String bearer = token(recruiter);
        for (String accountStatus : new String[]{"INACTIVE", "LOCKED"}) {
            recruiter.setStatus(accountStatus);
            users.saveAndFlush(recruiter);
            mvc.perform(get("/api/candidates").header("Authorization", bearer)).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void temporarilyLockedUserCannotReuseOldToken() throws Exception {
        String bearer = token(recruiter);
        recruiter.setLockedUntil(java.time.Instant.now().plusSeconds(900));
        users.saveAndFlush(recruiter);
        mvc.perform(get("/api/candidates").header("Authorization", bearer)).andExpect(status().isUnauthorized());
    }

    @Test
    void explicitMultipleRolesCombinePermissions() throws Exception {
        interviewer.setRoles(Set.of(roles.findByName(RoleName.INTERVIEWER).orElseThrow(),
                roles.findByName(RoleName.HR_MANAGER).orElseThrow()));
        users.saveAndFlush(interviewer);
        mvc.perform(get("/api/salary-ranges").header("Authorization", token(interviewer)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/candidates").header("Authorization", token(interviewer)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void recruiterCannotSelfAssignAndAdminCanGrantAndRevokeScope() throws Exception {
        String path = "/api/requisitions/" + other.getId() + "/assignments/" + recruiter.getId();
        mvc.perform(put(path).header("Authorization", token(recruiter)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"RECRUITER\"}")).andExpect(status().isForbidden());
        String adminToken = token(user("rbac-admin", RoleName.ADMIN));
        mvc.perform(put(path).header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"RECRUITER\"}")).andExpect(status().isNoContent());
        mvc.perform(get("/api/candidates/" + hidden.getId()).header("Authorization", token(recruiter)))
                .andExpect(status().isOk());
        mvc.perform(delete(path).header("Authorization", adminToken)).andExpect(status().isNoContent());
        mvc.perform(get("/api/candidates/" + hidden.getId()).header("Authorization", token(recruiter)))
                .andExpect(status().isForbidden());
    }

    @Test
    void serviceLayerAlsoRejectsUnauthorizedSalaryAccess() {
        UserPrincipal principal = UserPrincipal.create(interviewer);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        assertThatThrownBy(() -> readService.salary(1L)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void adminUserListDefaultPageSizeIs20() throws Exception {
        User admin = user("rbac-page-admin", RoleName.ADMIN);
        mvc.perform(get("/api/admin/users").header("Authorization", token(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(20));
    }

    @Test
    void adminCannotSelfRevokeAdminRole() throws Exception {
        User admin = user("rbac-self-admin", RoleName.ADMIN);
        String adminToken = token(admin);
        mvc.perform(put("/api/admin/users/" + admin.getId() + "/roles")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roles\":[\"RECRUITER\"]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminLockRequiresReasonAndFlagsHandoverAndRevokesAccess() throws Exception {
        User admin = user("rbac-lock-admin", RoleName.ADMIN);
        String adminToken = token(admin);

        // Lock without reason -> 400 Bad Request
        mvc.perform(patch("/api/admin/users/" + recruiter.getId() + "/status")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"LOCKED\"}"))
                .andExpect(status().isBadRequest());

        // Lock with reason -> 200 OK
        mvc.perform(patch("/api/admin/users/" + recruiter.getId() + "/status")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"LOCKED\",\"reason\":\"Vi phạm kỷ luật\",\"note\":\"Quyết định số 45\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"))
                .andExpect(jsonPath("$.lockReason").value("Vi phạm kỷ luật"))
                .andExpect(jsonPath("$.handoverWarnings[0]").exists());

        // Verify assignment was flagged for handover
        List<RequisitionAssignment> userAssignments = assignments.findByUserId(recruiter.getId());
        assertThat(userAssignments).isNotEmpty();
        assertThat(userAssignments.get(0).isHandoverRequired()).isTrue();

        // Existing token is now rejected on protected APIs
        mvc.perform(get("/api/candidates/" + visible.getId()).header("Authorization", token(recruiter)))
                .andExpect(status().isUnauthorized());

        // Unlock account -> 200 OK
        mvc.perform(patch("/api/admin/users/" + recruiter.getId() + "/status")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("S1-08: Admin tạo tài khoản qua REST API gửi activation email thật và gọi sendAccountActivationEmail")
    void adminCreateUserDispatchesActivationEmail() throws Exception {
        User admin = user("rbac-admin-mail-test", RoleName.ADMIN);
        String adminToken = token(admin);

        String payload = """
            {
                "email": "integration-activation-target@example.com",
                "fullName": "Nguyen Van Test",
                "department": "IT DevOps",
                "roles": ["RECRUITER"]
            }
            """;

        mvc.perform(post("/api/admin/users")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("integration-activation-target@example.com"))
                .andExpect(jsonPath("$.fullName").value("Nguyen Van Test"))
                .andExpect(jsonPath("$.department").value("IT DevOps"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.password").doesNotExist());

        // Xác nhận mailService.sendAccountActivationEmail được gọi với email đích và password tạm 12 ký tự
        verify(mailService, atLeastOnce()).sendAccountActivationEmail(
                eq("integration-activation-target@example.com"),
                argThat(pwd -> pwd != null && pwd.length() == 12)
        );

        // Xác nhận qua danh sách nhận email của DevMailService
        if (mailService instanceof DevMailService devMail) {
            assertThat(devMail.getSentActivationRecipients())
                    .contains("integration-activation-target@example.com");
        }
    }

    @Test
    @DisplayName("S1-08 Hardening: POST /api/admin/users có password do client gửi vẫn không được dùng; luôn sinh 12 ký tự ngẫu nhiên")
    void adminCreateUserWithClientPasswordPayload_NeverUsesClientPassword_UsesGenerated12CharPassword() throws Exception {
        User admin = user("rbac-admin-override-test", RoleName.ADMIN);
        String adminToken = token(admin);

        String payload = """
            {
                "email": "client-override-attempt@example.com",
                "password": "ClientHackPassword123!",
                "fullName": "Override Attempt User",
                "department": "Security",
                "roles": ["RECRUITER"]
            }
            """;

        mvc.perform(post("/api/admin/users")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("client-override-attempt@example.com"))
                .andExpect(jsonPath("$.password").doesNotExist());

        // Xác minh trong DB: mật khẩu được mã hóa KHÔNG PHẢI là client-supplied password
        User createdUser = users.findByEmail("client-override-attempt@example.com").orElseThrow();
        assertThat(passwordEncoder.matches("ClientHackPassword123!", createdUser.getPassword())).isFalse();

        // Xác minh email activation nhận mật khẩu tạm thời 12 ký tự, không phải mật khẩu do client gửi
        verify(mailService, atLeastOnce()).sendAccountActivationEmail(
                eq("client-override-attempt@example.com"),
                argThat(pwd -> pwd != null && pwd.length() == 12 && !pwd.equals("ClientHackPassword123!"))
        );
    }

    @Test
    void corsPreflightStillWorks() throws Exception {
        mvc.perform(options("/api/candidates").header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "GET").header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    private User user(String name, RoleName role) {
        User user = new User(name + "@example.com", "unused-test-password");
        user.setRoles(Set.of(roles.findByName(role).orElseThrow()));
        return users.saveAndFlush(user);
    }
    private String token(User user) { return "Bearer " + jwt.generateAccessToken(user.getEmail(), Set.of(user.getRole())); }
    private RecruitmentRequisition requisition(String code) {
        RecruitmentRequisition requisition = new RecruitmentRequisition();
        requisition.setRequisitionCode(code);
        requisition.setTitle(code);
        return requisitions.saveAndFlush(requisition);
    }
    private void assign(RecruitmentRequisition requisition, User user, RoleName role) {
        RequisitionAssignment assignment = new RequisitionAssignment();
        assignment.setRequisitionId(requisition.getId());
        assignment.setUserId(user.getId());
        assignment.setRole(role);
        assignments.saveAndFlush(assignment);
    }
    private CandidateApplication application(RecruitmentRequisition requisition, User user, User interviewer) {
        CandidateApplication application = new CandidateApplication();
        application.setRequisitionId(requisition.getId());
        application.setCandidateUserId(user.getId());
        application.setFullName(user.getFullName());
        application.setEmail(user.getEmail());
        application.setInterviewerUserId(interviewer == null ? null : interviewer.getId());
        return applications.saveAndFlush(application);
    }
}
