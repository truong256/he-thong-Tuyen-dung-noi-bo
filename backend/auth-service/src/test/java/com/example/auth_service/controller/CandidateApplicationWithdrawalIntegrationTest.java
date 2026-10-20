package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.WithdrawApplicationRequest;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.JwtUtils;
import com.example.auth_service.service.CandidateApplicationWithdrawalService;
import com.example.auth_service.service.MailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CandidateApplicationWithdrawalIntegrationTest {

    @Autowired private MockMvc mvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Autowired private JwtUtils jwt;
    @MockitoSpyBean private MailService mailService;

    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private RecruitmentRequisitionRepository requisitions;
    @Autowired private RequisitionAssignmentRepository assignments;
    @Autowired private CandidateApplicationRepository applications;
    @Autowired private NotificationRepository notifications;
    @Autowired private CandidateApplicationWithdrawalService withdrawalService;

    private User candidateUser;
    private User recruiterUser;
    private RecruitmentRequisition testRequisition;
    private CandidateApplication testApp;
    private String recruiterJwt;
    private String candidateJwt;

    @BeforeEach
    void setUp() {
        Role candidateRole = roles.findByName(RoleName.CANDIDATE)
                .orElseGet(() -> roles.save(new Role(null, RoleName.CANDIDATE, "Candidate")));
        Role recruiterRole = roles.findByName(RoleName.RECRUITER)
                .orElseGet(() -> roles.save(new Role(null, RoleName.RECRUITER, "Recruiter")));

        candidateUser = new User();
        candidateUser.setEmail("candidate-" + UUID.randomUUID() + "@test.com");
        candidateUser.setPassword("hashedPass");
        candidateUser.setFullName("Ung Vien Test");
        candidateUser.setStatus("ACTIVE");
        candidateUser.setRoles(Set.of(candidateRole));
        candidateUser = users.saveAndFlush(candidateUser);

        recruiterUser = new User();
        recruiterUser.setEmail("recruiter-" + UUID.randomUUID() + "@company.com");
        recruiterUser.setPassword("hashedPass");
        recruiterUser.setFullName("Recruiter Chuyen Trach");
        recruiterUser.setStatus("ACTIVE");
        recruiterUser.setRoles(Set.of(recruiterRole));
        recruiterUser = users.saveAndFlush(recruiterUser);

        recruiterJwt = jwt.generateAccessToken(recruiterUser.getEmail(), Set.of("RECRUITER"), recruiterUser.getTokenVersion(), false);
        candidateJwt = jwt.generateAccessToken(candidateUser.getEmail(), Set.of("CANDIDATE"), candidateUser.getTokenVersion(), false);

        testRequisition = new RecruitmentRequisition();
        testRequisition.setRequisitionCode("REQ-" + UUID.randomUUID().toString().substring(0, 8));
        testRequisition.setTitle("Senior Fullstack Engineer");
        testRequisition.setQuantity(2);
        testRequisition = requisitions.saveAndFlush(testRequisition);

        RequisitionAssignment assignment = new RequisitionAssignment();
        assignment.setRequisitionId(testRequisition.getId());
        assignment.setUserId(recruiterUser.getId());
        assignment.setRole(RoleName.RECRUITER);
        assignment.setPrimary(true);
        assignments.saveAndFlush(assignment);

        testApp = new CandidateApplication();
        testApp.setRequisitionId(testRequisition.getId());
        testApp.setCandidateUserId(candidateUser.getId());
        testApp.setFullName(candidateUser.getFullName());
        testApp.setEmail(candidateUser.getEmail());
        testApp.setStage("APPLIED");
        testApp = applications.saveAndFlush(testApp);
    }

    @Test
    @DisplayName("End-to-End: GET validate -> POST confirm withdraw -> Recruiter notified -> Pipeline excludes withdrawn")
    void testCompleteWithdrawalWorkflow() throws Exception {
        // 1. Candidate receives an email with withdrawal token
        CandidateApplicationWithdrawToken token = withdrawalService.createWithdrawalToken(testApp.getId());
        assertThat(token.getToken()).isNotBlank();

        // 2. Candidate opens the link in browser: GET /api/public/applications/withdraw?token=...
        mvc.perform(get("/api/public/applications/withdraw")
                        .param("token", token.getToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.positionTitle").value("Senior Fullstack Engineer"))
                .andExpect(jsonPath("$.alreadyWithdrawn").value(false));

        // GET must NOT change database state (AC1)
        CandidateApplication appBefore = applications.findById(testApp.getId()).orElseThrow();
        assertThat(appBefore.getStage()).isEqualTo("APPLIED");

        // 3. Candidate confirms withdrawal: POST /api/public/applications/withdraw
        WithdrawApplicationRequest req = new WithdrawApplicationRequest(token.getToken(), "Đã nhận được offer tốt hơn");
        mvc.perform(post("/api/public/applications/withdraw")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.stage").value("WITHDRAWN"));

        // 4. Verify DB updated
        CandidateApplication appAfter = applications.findById(testApp.getId()).orElseThrow();
        assertThat(appAfter.getStage()).isEqualTo("WITHDRAWN");
        assertThat(appAfter.getWithdrawnAt()).isNotNull();
        assertThat(appAfter.getWithdrawalReason()).isEqualTo("Đã nhận được offer tốt hơn");

        // 5. Verify recruiter received in-app Notification
        List<Notification> recruiterNotifs = notifications.findTop10ByUserIdOrderByCreatedAtDesc(recruiterUser.getId());
        assertThat(recruiterNotifs).isNotEmpty();
        Notification latestNotif = recruiterNotifs.get(0);
        assertThat(latestNotif.getType()).isEqualTo("CANDIDATE_WITHDRAWAL");
        assertThat(latestNotif.getContent()).contains("Ung Vien Test");
        assertThat(latestNotif.getContent()).contains("Senior Fullstack Engineer");

        // 6. Verify recruiter received email notification
        verify(mailService).sendCandidateWithdrawnNotification(
                eq(recruiterUser.getEmail()),
                eq("Ung Vien Test"),
                eq("Senior Fullstack Engineer"),
                eq(testApp.getId())
        );

        // 7. AC2: Active pipeline query MUST exclude withdrawn candidate!
        mvc.perform(get("/api/candidates")
                        .header("Authorization", "Bearer " + recruiterJwt)
                        .param("requisitionId", testRequisition.getId().toString())
                        .param("activePipelineOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.totalElements").value(0));

        // Full candidate history (audit trail) still contains the record:
        mvc.perform(get("/api/candidates")
                        .header("Authorization", "Bearer " + recruiterJwt)
                        .param("requisitionId", testRequisition.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].stage").value("WITHDRAWN"));

        // 8. Re-attempting withdrawal with used token fails cleanly with 400
        mvc.perform(post("/api/public/applications/withdraw")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("đã được sử dụng")));

        // 9. Recruiter accesses Notification Center API: GET /api/notifications
        mvc.perform(get("/api/notifications")
                        .header("Authorization", "Bearer " + recruiterJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.content[0].read").value(false));

        // Recruiter marks notification as read: PATCH /api/notifications/{id}/read
        mvc.perform(patch("/api/notifications/" + latestNotif.getId() + "/read")
                        .header("Authorization", "Bearer " + recruiterJwt))
                .andExpect(status().isNoContent());

        Notification readNotif = notifications.findById(latestNotif.getId()).orElseThrow();
        assertThat(readNotif.isRead()).isTrue();
    }

    @Test
    @DisplayName("Direct Candidate Portal: Authenticated candidate withdraws own application")
    void testAuthenticatedCandidateWithdrawal() throws Exception {
        mvc.perform(post("/api/candidate/applications/" + testApp.getId() + "/withdraw")
                        .header("Authorization", "Bearer " + candidateJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\": \"Chuyển nhà sang tỉnh khác\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.stage").value("WITHDRAWN"));

        CandidateApplication app = applications.findById(testApp.getId()).orElseThrow();
        assertThat(app.getStage()).isEqualTo("WITHDRAWN");
        assertThat(app.getWithdrawalReason()).isEqualTo("Chuyển nhà sang tỉnh khác");
    }

    @Test
    @DisplayName("Security: Candidate cannot withdraw someone else's application")
    void testCandidateCannotWithdrawOtherApplication() throws Exception {
        User otherCandidate = new User();
        otherCandidate.setEmail("other-" + UUID.randomUUID() + "@test.com");
        otherCandidate.setPassword("pass");
        otherCandidate.setStatus("ACTIVE");
        otherCandidate.setRoles(Set.of(roles.findByName(RoleName.CANDIDATE).orElseThrow()));
        otherCandidate = users.saveAndFlush(otherCandidate);

        String otherJwt = jwt.generateAccessToken(otherCandidate.getEmail(), Set.of("CANDIDATE"), otherCandidate.getTokenVersion(), false);

        mvc.perform(post("/api/candidate/applications/" + testApp.getId() + "/withdraw")
                        .header("Authorization", "Bearer " + otherJwt))
                .andExpect(status().isForbidden());
    }
}
