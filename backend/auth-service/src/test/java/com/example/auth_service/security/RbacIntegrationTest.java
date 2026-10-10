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
    @Autowired DepartmentRepository departments;
    @Autowired JobTitleRepository jobTitles;
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
        // S1-08: ADMIN (USER_MANAGE) and HR_MANAGER (USER_READ) can list users; others cannot
        boolean canListUsers = Set.of(RoleName.ADMIN, RoleName.HR_MANAGER).contains(role);
        mvc.perform(get("/api/admin/users").header("Authorization", token(actor)))
                .andExpect(status().is(canListUsers ? 200 : 403));
        // S2-05 / GAP 02: Only HR_MANAGER has SALARY_READ for standard salary ranges
        boolean salaryAllowed = role == RoleName.HR_MANAGER;
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
    @DisplayName("GAP 01: Recruiter has CANDIDATE_READ_ASSIGNED – sees only assigned candidates and pipeline scoped")
    void recruiterHasScopedCandidateAndPipelineAccess() throws Exception {
        // Recruiter sees only candidates of assigned requisition (visible is owned, hidden is other)
        mvc.perform(get("/api/candidates?size=10").header("Authorization", token(recruiter)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(visible.getId()));

        // Recruiter access to assigned candidate detail -> PASS (200)
        mvc.perform(get("/api/candidates/" + visible.getId()).header("Authorization", token(recruiter)))
                .andExpect(status().isOk());

        // Recruiter access to candidate outside assigned requisition -> DENY (403)
        mvc.perform(get("/api/candidates/" + hidden.getId()).header("Authorization", token(recruiter)))
                .andExpect(status().isForbidden());
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

    // -----------------------------------------------------------------------
    // S1-08: HR_MANAGER read-only access to user management
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("S1-08: HR_MANAGER can list users (USER_READ) but cannot create, update, or lock")
    void hrManagerHasReadOnlyAccessToUserManagement() throws Exception {
        User hrManager = user("rbac-hr-usermgmt", RoleName.HR_MANAGER);
        String hrToken = token(hrManager);

        // R: can list users
        mvc.perform(get("/api/admin/users").header("Authorization", hrToken))
                .andExpect(status().isOk());

        // R: can get a specific user detail
        mvc.perform(get("/api/admin/users/" + recruiter.getId()).header("Authorization", hrToken))
                .andExpect(status().isOk());

        // R: can read role definitions
        mvc.perform(get("/api/admin/roles").header("Authorization", hrToken))
                .andExpect(status().isOk());

        // F is DENIED: cannot create user (USER_MANAGE required)
        mvc.perform(post("/api/admin/users")
                .header("Authorization", hrToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"test@example.com\",\"fullName\":\"Test\",\"roles\":[\"RECRUITER\"]}")
        ).andExpect(status().isForbidden());

        // F is DENIED: cannot lock/unlock account (USER_MANAGE required)
        mvc.perform(patch("/api/admin/users/" + recruiter.getId() + "/status")
                .header("Authorization", hrToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"LOCKED\",\"reason\":\"Test\"}"))
                .andExpect(status().isForbidden());

        // F is DENIED: cannot assign roles (ROLE_MANAGE required)
        mvc.perform(put("/api/admin/users/" + recruiter.getId() + "/roles")
                .header("Authorization", hrToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roles\":[\"RECRUITER\",\"HR_MANAGER\"]}")
        ).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-08: HR_MANAGER has USER_READ and ROLE_READ permissions in /api/auth/permissions")
    void hrManagerHasCorrectPermissionsInPermissionsList() throws Exception {
        User hrManager = user("rbac-hr-perms", RoleName.HR_MANAGER);
        mvc.perform(get("/api/auth/permissions").header("Authorization", token(hrManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@ == 'USER_READ')]").exists())
                .andExpect(jsonPath("$[?(@ == 'ROLE_READ')]").exists())
                .andExpect(jsonPath("$[?(@ == 'AUDIT_READ')]").exists())
                .andExpect(jsonPath("$[?(@ == 'USER_MANAGE')]").isEmpty())
                .andExpect(jsonPath("$[?(@ == 'ROLE_MANAGE')]").isEmpty());
    }

    @Test
    @DisplayName("S1-09: ADMIN only can assign/revoke roles (ROLE_MANAGE); HR_MANAGER cannot")
    void onlyAdminCanAssignRoles() throws Exception {
        User admin = user("rbac-role-admin", RoleName.ADMIN);
        User hrManager = user("rbac-role-hr", RoleName.HR_MANAGER);

        // ADMIN can update roles
        mvc.perform(put("/api/admin/users/" + recruiter.getId() + "/roles")
                .header("Authorization", token(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roles\":[\"RECRUITER\",\"INTERVIEWER\"]}")
        ).andExpect(status().isOk());

        // HR_MANAGER cannot update roles
        mvc.perform(put("/api/admin/users/" + recruiter.getId() + "/roles")
                .header("Authorization", token(hrManager))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roles\":[\"RECRUITER\"]}")
        ).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("APPROVER can read all candidate summaries (CANDIDATE_READ_ALL)")
    void approverCanReadAllCandidates() throws Exception {
        User approver = user("rbac-approver", RoleName.APPROVER);
        mvc.perform(get("/api/candidates").header("Authorization", token(approver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    @DisplayName("CANDIDATE does not have CATALOG_READ – cannot access job titles or categories")
    void candidateDoesNotHaveCatalogRead() throws Exception {
        mvc.perform(get("/api/auth/permissions").header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@ == 'CATALOG_READ')]").isEmpty())
                .andExpect(jsonPath("$[?(@ == 'SALARY_READ')]").isEmpty())
                .andExpect(jsonPath("$[?(@ == 'USER_READ')]").isEmpty());
    }

    @Test
    @DisplayName("S2-05 / GAP 02: Only HR_MANAGER has SALARY_READ – all other 6 roles are denied")
    void salaryAccessRespectsSalaryReadPermission() throws Exception {
        // Roles WITHOUT SALARY_READ: CANDIDATE, INTERVIEWER, RECRUITER, HIRING_MANAGER, APPROVER, ADMIN
        for (RoleName role : List.of(RoleName.CANDIDATE, RoleName.INTERVIEWER, RoleName.RECRUITER,
                RoleName.HIRING_MANAGER, RoleName.APPROVER, RoleName.ADMIN)) {
            User actor = user("rbac-nosalary-" + role.name().toLowerCase(), role);
            mvc.perform(get("/api/salary-ranges").header("Authorization", token(actor)))
                    .andExpect(status().isForbidden());
        }
        // Sole role WITH SALARY_READ: HR_MANAGER
        User hr = user("rbac-salary-hr", RoleName.HR_MANAGER);
        mvc.perform(get("/api/salary-ranges").header("Authorization", token(hr)))
                .andExpect(status().isOk());
    }

    @Test
    void recruiterCannotSelfAssignAndAdminCanGrantAndRevokeAssignment() throws Exception {
        String path = "/api/requisitions/" + other.getId() + "/assignments/" + recruiter.getId();
        // Recruiter lacks RECRUITER_ASSIGN -> cannot self-assign
        mvc.perform(put(path).header("Authorization", token(recruiter)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"RECRUITER\"}")).andExpect(status().isForbidden());
        String adminToken = token(user("rbac-admin", RoleName.ADMIN));
        // Admin has RECRUITER_ASSIGN -> can assign and revoke
        mvc.perform(put(path).header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"RECRUITER\"}")).andExpect(status().isNoContent());
        mvc.perform(delete(path).header("Authorization", adminToken)).andExpect(status().isNoContent());
    }

    @Test
    void hiringManagerCannotSelfAssignAndAdminCanGrantAndRevokeScope() throws Exception {
        User hm = user("rbac-hm-scope", RoleName.HIRING_MANAGER);
        String path = "/api/requisitions/" + other.getId() + "/assignments/" + hm.getId();
        // Hiring Manager cannot self-assign
        mvc.perform(put(path).header("Authorization", token(hm)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"HIRING_MANAGER\"}")).andExpect(status().isForbidden());
        // Hidden candidate is not visible to unassigned hiring manager (CANDIDATE_READ_ASSIGNED)
        mvc.perform(get("/api/candidates/" + hidden.getId()).header("Authorization", token(hm)))
                .andExpect(status().isForbidden());
        // Admin grants assignment
        String adminToken = token(user("rbac-admin-hm", RoleName.ADMIN));
        mvc.perform(put(path).header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"HIRING_MANAGER\"}")).andExpect(status().isNoContent());
        // Candidate now accessible through assignment
        mvc.perform(get("/api/candidates/" + hidden.getId()).header("Authorization", token(hm)))
                .andExpect(status().isOk());
        // Admin revokes assignment
        mvc.perform(delete(path).header("Authorization", adminToken)).andExpect(status().isNoContent());
        // Revocation immediately revokes candidate access
        mvc.perform(get("/api/candidates/" + hidden.getId()).header("Authorization", token(hm)))
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

    @Test
    @DisplayName("S2-10: Hiring Manager creates requisition for owned department -> 201; other department -> 403")
    void hiringManagerCreateRequisitionScoping() throws Exception {
        User hm = user("rbac-hm-s210", RoleName.HIRING_MANAGER);
        User otherHm = user("rbac-other-hm-s210", RoleName.HIRING_MANAGER);

        Department dept = new Department();
        dept.setCode("ENG-S210");
        dept.setName("Engineering S210");
        dept.setActive(true);
        dept.setManagerUserId(hm.getId());
        dept = departments.saveAndFlush(dept);

        Department otherDept = new Department();
        otherDept.setCode("MKT-S210");
        otherDept.setName("Marketing S210");
        otherDept.setActive(true);
        otherDept.setManagerUserId(otherHm.getId());
        otherDept = departments.saveAndFlush(otherDept);

        JobTitle jt = new JobTitle();
        jt.setCode("DEV-S210");
        jt.setTitle("Software Engineer");
        jt.setDepartment(dept);
        jt.setActive(true);
        jt.setMinSalary(20000000L);
        jt.setMaxSalary(40000000L);
        jt = jobTitles.saveAndFlush(jt);

        // HM creates for own department -> 201 Created
        String payloadSuccess = """
            {
                "title": "Tuyển dụng Senior Developer",
                "departmentId": %d,
                "jobTitleId": %d,
                "quantity": 2,
                "reason": "EXPANSION",
                "proposedMinSalary": 25000000.0,
                "proposedMaxSalary": 35000000.0,
                "targetDate": "%s",
                "jobDescription": "Lập trình backend",
                "requirements": "Java, Spring Boot",
                "isDraft": false
            }
            """.formatted(dept.getId(), jt.getId(), java.time.LocalDate.now().plusMonths(1));

        mvc.perform(post("/api/requisitions")
                .header("Authorization", token(hm))
                .contentType(MediaType.APPLICATION_JSON)
                .content(payloadSuccess))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requisitionCode").exists())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

        // HM creates for another department -> 403 Forbidden
        String payloadForbidden = """
            {
                "title": "Tuyển dụng Marketer",
                "departmentId": %d,
                "jobTitleId": %d,
                "quantity": 1,
                "reason": "EXPANSION",
                "proposedMinSalary": 25000000.0,
                "proposedMaxSalary": 35000000.0,
                "targetDate": "%s",
                "isDraft": false
            }
            """.formatted(otherDept.getId(), jt.getId(), java.time.LocalDate.now().plusMonths(1));

        mvc.perform(post("/api/requisitions")
                .header("Authorization", token(hm))
                .contentType(MediaType.APPLICATION_JSON)
                .content(payloadForbidden))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-10: Requisition validations - past target date and proposed salary outside standard range")
    void requisitionValidationPastDateAndSalaryStandard() throws Exception {
        User hm = user("rbac-hm-val", RoleName.HIRING_MANAGER);

        Department dept = new Department();
        dept.setCode("DEP-VAL");
        dept.setName("Department Val");
        dept.setActive(true);
        dept.setManagerUserId(hm.getId());
        dept = departments.saveAndFlush(dept);

        JobTitle jt = new JobTitle();
        jt.setCode("JT-VAL");
        jt.setTitle("Job Title Val");
        jt.setDepartment(dept);
        jt.setActive(true);
        jt.setMinSalary(20000000L);
        jt.setMaxSalary(30000000L);
        jt = jobTitles.saveAndFlush(jt);

        // 1. Target date in past -> 400
        String pastDatePayload = """
            {
                "title": "Yêu cầu tuyển dụng quá khứ",
                "departmentId": %d,
                "jobTitleId": %d,
                "quantity": 1,
                "reason": "NEW_HEADCOUNT",
                "proposedMinSalary": 22000000.0,
                "proposedMaxSalary": 28000000.0,
                "targetDate": "%s",
                "isDraft": true
            }
            """.formatted(dept.getId(), jt.getId(), java.time.LocalDate.now().minusDays(1));

        mvc.perform(post("/api/requisitions")
                .header("Authorization", token(hm))
                .contentType(MediaType.APPLICATION_JSON)
                .content(pastDatePayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Ngày cần người không được ở quá khứ."));

        // 2. Out of salary range (min 15M < std min 20M or max 45M > std max 30M) without explanation -> 400
        String outSalaryNoExpPayload = """
            {
                "title": "Lương ngoài chuẩn không giải trình",
                "departmentId": %d,
                "jobTitleId": %d,
                "quantity": 1,
                "reason": "NEW_HEADCOUNT",
                "proposedMinSalary": 15000000.0,
                "proposedMaxSalary": 45000000.0,
                "targetDate": "%s",
                "isDraft": true
            }
            """.formatted(dept.getId(), jt.getId(), java.time.LocalDate.now().plusMonths(1));

        mvc.perform(post("/api/requisitions")
                .header("Authorization", token(hm))
                .contentType(MediaType.APPLICATION_JSON)
                .content(outSalaryNoExpPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Dải lương đề xuất nằm ngoài khung chuẩn của chức danh, bắt buộc nhập giải trình.")));

        // 3. Out of salary range WITH explanation -> 201 Created
        String outSalaryWithExpPayload = """
            {
                "title": "Lương ngoài chuẩn có giải trình",
                "departmentId": %d,
                "jobTitleId": %d,
                "quantity": 1,
                "reason": "NEW_HEADCOUNT",
                "proposedMinSalary": 15000000.0,
                "proposedMaxSalary": 45000000.0,
                "salaryExplanation": "Ứng viên chuyên gia thâm niên cao đáp ứng công nghệ mới",
                "targetDate": "%s",
                "isDraft": true
            }
            """.formatted(dept.getId(), jt.getId(), java.time.LocalDate.now().plusMonths(1));

        mvc.perform(post("/api/requisitions")
                .header("Authorization", token(hm))
                .contentType(MediaType.APPLICATION_JSON)
                .content(outSalaryWithExpPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    @DisplayName("S2-10: Save draft, update requisition, delete draft only, and scoped list reading")
    void requisitionDraftAndReadScoping() throws Exception {
        User hm = user("rbac-hm-draft", RoleName.HIRING_MANAGER);
        User otherHm = user("rbac-hm-other-draft", RoleName.HIRING_MANAGER);
        User hr = user("rbac-hr-draft", RoleName.HR_MANAGER);

        Department dept = new Department();
        dept.setCode("DEP-DRF");
        dept.setName("Department Draft");
        dept.setActive(true);
        dept.setManagerUserId(hm.getId());
        dept = departments.saveAndFlush(dept);

        JobTitle jt = new JobTitle();
        jt.setCode("JT-DRF");
        jt.setTitle("Job Title Draft");
        jt.setDepartment(dept);
        jt.setActive(true);
        jt.setMinSalary(10000000L);
        jt.setMaxSalary(20000000L);
        jt = jobTitles.saveAndFlush(jt);

        // HM creates draft
        String draftPayload = """
            {
                "title": "Bản nháp tuyển dụng",
                "departmentId": %d,
                "jobTitleId": %d,
                "quantity": 1,
                "reason": "NEW_HEADCOUNT",
                "targetDate": "%s",
                "isDraft": true
            }
            """.formatted(dept.getId(), jt.getId(), java.time.LocalDate.now().plusDays(10));

        String resStr = mvc.perform(post("/api/requisitions")
                .header("Authorization", token(hm))
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn().getResponse().getContentAsString();

        tools.jackson.databind.JsonNode rootNode = new tools.jackson.databind.ObjectMapper().readTree(resStr);
        long reqId = rootNode.get("id").asLong();

        // Other HM cannot see this requisition in detail -> 403
        mvc.perform(get("/api/requisitions/" + reqId).header("Authorization", token(otherHm)))
                .andExpect(status().isForbidden());

        // HR Manager can see this requisition -> 200
        mvc.perform(get("/api/requisitions/" + reqId).header("Authorization", token(hr)))
                .andExpect(status().isOk());

        // HM deletes draft -> 204
        mvc.perform(delete("/api/requisitions/" + reqId).header("Authorization", token(hm)))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("GAP 04: Protection against revoking, locking, or deleting the last active admin")
    void lastActiveAdminProtection() throws Exception {
        // Lock any pre-existing active admins so soleAdmin is the only active admin
        users.findAll().stream()
                .filter(u -> u.getRoles() != null && u.getRoles().stream().anyMatch(r -> r.getName() == RoleName.ADMIN))
                .forEach(u -> {
                    u.setStatus("LOCKED");
                    users.save(u);
                });
        users.flush();

        User soleAdmin = user("rbac-sole-admin", RoleName.ADMIN);
        String adminToken = token(soleAdmin);

        // Lock the only active admin -> 400 Bad Request
        mvc.perform(patch("/api/admin/users/" + soleAdmin.getId() + "/status")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"LOCKED\",\"reason\":\"Test lock\"}"))
                .andExpect(status().isBadRequest());

        // Delete the only active admin -> 400 Bad Request
        mvc.perform(delete("/api/admin/users/" + soleAdmin.getId())
                .header("Authorization", adminToken))
                .andExpect(status().isBadRequest());
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
