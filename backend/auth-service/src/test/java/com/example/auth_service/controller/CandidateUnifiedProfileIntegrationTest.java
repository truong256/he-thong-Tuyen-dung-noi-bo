package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.CreateCandidateNoteRequest;
import com.example.auth_service.dto.CreateCandidateTagRequest;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.JwtUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CandidateUnifiedProfileIntegrationTest {

    @Autowired private MockMvc mvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private RecruitmentRequisitionRepository requisitions;
    @Autowired private RequisitionAssignmentRepository assignments;
    @Autowired private CandidateApplicationRepository applications;
    @Autowired private CandidateNoteRepository notes;
    @Autowired private CandidateTagRepository tags;

    private User candidateUser;
    private User recruiter1; // Phụ trách Pos 1
    private User recruiter2; // Phụ trách Pos 2
    private User hiringManager1; // Quản lý Pos 1
    private User adminUser;

    private String tokenRecruiter1;
    private String tokenRecruiter2;
    private String tokenHm1;
    private String tokenAdmin;
    private String tokenCandidate;

    private RecruitmentRequisition pos1;
    private RecruitmentRequisition pos2;

    private CandidateApplication appPos1; // Cùng 1 ứng viên nộp vào Pos 1
    private CandidateApplication appPos2; // Cùng 1 ứng viên nộp vào Pos 2

    @BeforeEach
    void setUp() {
        Role rCand = roles.findByName(RoleName.CANDIDATE)
                .orElseGet(() -> roles.save(new Role(null, RoleName.CANDIDATE, "Candidate")));
        Role rRec = roles.findByName(RoleName.RECRUITER)
                .orElseGet(() -> roles.save(new Role(null, RoleName.RECRUITER, "Recruiter")));
        Role rHm = roles.findByName(RoleName.HIRING_MANAGER)
                .orElseGet(() -> roles.save(new Role(null, RoleName.HIRING_MANAGER, "Hiring Manager")));
        Role rAdmin = roles.findByName(RoleName.ADMIN)
                .orElseGet(() -> roles.save(new Role(null, RoleName.ADMIN, "Admin")));

        candidateUser = createUser("cand-" + UUID.randomUUID() + "@test.com", "Nguyen Ung Vien", rCand);
        recruiter1 = createUser("rec1-" + UUID.randomUUID() + "@company.com", "Recruiter Mot", rRec);
        recruiter2 = createUser("rec2-" + UUID.randomUUID() + "@company.com", "Recruiter Hai", rRec);
        hiringManager1 = createUser("hm1-" + UUID.randomUUID() + "@company.com", "Hiring Mgr Mot", rHm);
        adminUser = createUser("admin-" + UUID.randomUUID() + "@company.com", "Admin System", rAdmin);

        tokenRecruiter1 = "Bearer " + jwt.generateAccessToken(recruiter1.getEmail(), Set.of("RECRUITER"), recruiter1.getTokenVersion(), false);
        tokenRecruiter2 = "Bearer " + jwt.generateAccessToken(recruiter2.getEmail(), Set.of("RECRUITER"), recruiter2.getTokenVersion(), false);
        tokenHm1 = "Bearer " + jwt.generateAccessToken(hiringManager1.getEmail(), Set.of("HIRING_MANAGER"), hiringManager1.getTokenVersion(), false);
        tokenAdmin = "Bearer " + jwt.generateAccessToken(adminUser.getEmail(), Set.of("ADMIN"), adminUser.getTokenVersion(), false);
        tokenCandidate = "Bearer " + jwt.generateAccessToken(candidateUser.getEmail(), Set.of("CANDIDATE"), candidateUser.getTokenVersion(), false);

        // Vị trí 1
        pos1 = new RecruitmentRequisition();
        pos1.setRequisitionCode("REQ-POS1-" + UUID.randomUUID().toString().substring(0, 6));
        pos1.setTitle("Backend Java Lead");
        pos1.setQuantity(2);
        pos1 = requisitions.saveAndFlush(pos1);

        // Vị trí 2
        pos2 = new RecruitmentRequisition();
        pos2.setRequisitionCode("REQ-POS2-" + UUID.randomUUID().toString().substring(0, 6));
        pos2.setTitle("Frontend React Senior");
        pos2.setQuantity(1);
        pos2 = requisitions.saveAndFlush(pos2);

        // Phân công: Recruiter 1 phụ trách Pos 1, Recruiter 2 phụ trách Pos 2
        assign(pos1.getId(), recruiter1.getId(), RoleName.RECRUITER);
        assign(pos1.getId(), hiringManager1.getId(), RoleName.HIRING_MANAGER);
        assign(pos2.getId(), recruiter2.getId(), RoleName.RECRUITER);

        // Cùng một ứng viên nộp hồ sơ vào cả Pos 1 và Pos 2
        appPos1 = new CandidateApplication();
        appPos1.setRequisitionId(pos1.getId());
        appPos1.setCandidateUserId(candidateUser.getId());
        appPos1.setFullName(candidateUser.getFullName());
        appPos1.setEmail(candidateUser.getEmail());
        appPos1.setPhone("0901234567");
        appPos1.setStage("SCREENING");
        appPos1.setCvFileUrl("/api/candidates/cv/sample1.pdf");
        appPos1.setCvFileName("CV_Backend.pdf");
        appPos1.setAppliedAt(Instant.now().minus(2, java.time.temporal.ChronoUnit.DAYS));
        appPos1 = applications.saveAndFlush(appPos1);

        appPos2 = new CandidateApplication();
        appPos2.setRequisitionId(pos2.getId());
        appPos2.setCandidateUserId(candidateUser.getId());
        appPos2.setFullName(candidateUser.getFullName());
        appPos2.setEmail(candidateUser.getEmail());
        appPos2.setPhone("0901234567");
        appPos2.setStage("APPLIED");
        appPos2.setCvFileUrl("/api/candidates/cv/sample2.pdf");
        appPos2.setCvFileName("CV_Frontend.pdf");
        appPos2.setAppliedAt(Instant.now());
        appPos2 = applications.saveAndFlush(appPos2);
    }

    private User createUser(String email, String fullName, Role role) {
        User u = new User();
        u.setEmail(email);
        u.setPassword("hashedPass");
        u.setFullName(fullName);
        u.setStatus("ACTIVE");
        u.setRoles(Set.of(role));
        return users.saveAndFlush(u);
    }

    private void assign(Long reqId, Long userId, RoleName role) {
        RequisitionAssignment a = new RequisitionAssignment();
        a.setRequisitionId(reqId);
        a.setUserId(userId);
        a.setRole(role);
        a.setPrimary(true);
        a.setAssignedAt(Instant.now());
        assignments.saveAndFlush(a);
    }

    // =========================================================================
    // 12 TEST SCENARIOS
    // =========================================================================

    @Test
    @DisplayName("Kịch bản 1: Recruiter phụ trách vị trí được phép xem hồ sơ hợp nhất")
    void scenario1_recruiterAssigned_canView() throws Exception {
        mvc.perform(get("/api/candidates/" + appPos1.getId() + "/profile")
                .header("Authorization", tokenRecruiter1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(appPos1.getId().intValue())))
                .andExpect(jsonPath("$.fullName", is("Nguyen Ung Vien")))
                .andExpect(jsonPath("$.currentPositionTitle", is("Backend Java Lead")));
    }

    @Test
    @DisplayName("Kịch bản 2: Recruiter không phụ trách vị trí bị chặn (403 Forbidden)")
    void scenario2_recruiterNotAssigned_blocked() throws Exception {
        // Recruiter 1 không phụ trách Pos 2
        mvc.perform(get("/api/candidates/" + appPos2.getId() + "/profile")
                .header("Authorization", tokenRecruiter1))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Kịch bản 3: Hiring Manager đúng vị trí quản lý được phép xem hồ sơ")
    void scenario3_hiringManagerAssigned_canView() throws Exception {
        mvc.perform(get("/api/candidates/" + appPos1.getId() + "/profile")
                .header("Authorization", tokenHm1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(appPos1.getId().intValue())))
                .andExpect(jsonPath("$.currentPositionTitle", is("Backend Java Lead")));
    }

    @Test
    @DisplayName("Kịch bản 4: Hiring Manager không quản lý vị trí bị chặn (403 Forbidden)")
    void scenario4_hiringManagerNotAssigned_blocked() throws Exception {
        // HM 1 không quản lý Pos 2
        mvc.perform(get("/api/candidates/" + appPos2.getId() + "/profile")
                .header("Authorization", tokenHm1))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Kịch bản 5: Người chưa đăng nhập bị từ chối (401 Unauthorized)")
    void scenario5_unauthenticated_rejected() throws Exception {
        mvc.perform(get("/api/candidates/" + appPos1.getId() + "/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Kịch bản 6: Người chỉ có quyền xem (Hiring Manager) không thể ghi nhãn hoặc ghi chú (403 Forbidden)")
    void scenario6_readOnlyRole_cannotWriteNotesOrTags() throws Exception {
        // HM 1 xem được Pos 1, nhưng KHÔNG có PIPELINE_MANAGE -> không thể POST note
        CreateCandidateNoteRequest noteReq = new CreateCandidateNoteRequest("Hiring manager cố tình thêm note");
        mvc.perform(post("/api/candidates/" + appPos1.getId() + "/notes")
                .header("Authorization", tokenHm1)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(noteReq)))
                .andExpect(status().isForbidden());

        // HM 1 cũng không thể thêm nhãn
        CreateCandidateTagRequest tagReq = new CreateCandidateTagRequest("ReactJS");
        mvc.perform(post("/api/candidates/" + appPos1.getId() + "/tags")
                .header("Authorization", tokenHm1)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(tagReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Kịch bản 7: Thay đổi ID request không thể vượt quyền")
    void scenario7_tamperingId_blocked() throws Exception {
        // Recruiter 1 cố tình đổi ID sang appPos2
        mvc.perform(get("/api/candidates/" + appPos2.getId() + "/profile")
                .header("Authorization", tokenRecruiter1))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/candidates/" + appPos2.getId() + "/cv")
                .header("Authorization", tokenRecruiter1))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Kịch bản 8: Lịch sử ứng tuyển KHÔNG chứa dữ liệu của vị trí ngoài phạm vi")
    void scenario8_historyDoesNotLeakOutOfScopePositions() throws Exception {
        // Recruiter 1 gọi xem hồ sơ Pos 1
        mvc.perform(get("/api/candidates/" + appPos1.getId() + "/profile")
                .header("Authorization", tokenRecruiter1))
                .andExpect(status().isOk())
                // Chỉ có 1 vị trí trong lịch sử (Pos 1) vì Recruiter 1 không được phân công Pos 2
                .andExpect(jsonPath("$.applicationHistory", hasSize(1)))
                .andExpect(jsonPath("$.applicationHistory[0].applicationId", is(appPos1.getId().intValue())))
                .andExpect(jsonPath("$.applicationHistory[0].positionTitle", is("Backend Java Lead")));

        // Tuy nhiên Admin có CANDIDATE_READ_ALL nên sẽ thấy ĐẦY ĐỦ cả 2 vị trí trong lịch sử
        mvc.perform(get("/api/candidates/" + appPos1.getId() + "/profile")
                .header("Authorization", tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationHistory", hasSize(2)));
    }

    @Test
    @DisplayName("Kịch bản 9: API CV chặn truy cập trái phép")
    void scenario9_cvApi_blocksUnauthorized() throws Exception {
        // Recruiter 2 không phụ trách Pos 1 -> bị chặn khi truy cập CV của Pos 1
        mvc.perform(get("/api/candidates/" + appPos1.getId() + "/cv")
                .header("Authorization", tokenRecruiter2))
                .andExpect(status().isForbidden());

        // Recruiter 1 phụ trách Pos 1 -> truy cập CV thành công
        mvc.perform(get("/api/candidates/" + appPos1.getId() + "/cv")
                .header("Authorization", tokenRecruiter1))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("application/pdf")));
    }

    @Test
    @DisplayName("Kịch bản 10: URL CV không vượt qua được cơ chế xác thực")
    void scenario10_cvApi_requiresAuth() throws Exception {
        mvc.perform(get("/api/candidates/" + appPos1.getId() + "/cv"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Kịch bản 11: API công khai và người giới thiệu không làm lộ dữ liệu nội bộ")
    void scenario11_publicApi_doesNotExposeInternalNotesOrTags() throws Exception {
        // Thêm note và tag nội bộ vào appPos1
        notes.save(CandidateNote.builder()
                .applicationId(appPos1.getId())
                .authorId(recruiter1.getId())
                .authorName("Recruiter")
                .content("Đánh giá nội bộ cực kỳ mật")
                .build());

        tags.save(CandidateTag.builder()
                .applicationId(appPos1.getId())
                .tagName("Internal VIP")
                .build());

        // Đọc qua candidate portal
        mvc.perform(get("/api/candidate/applications")
                .header("Authorization", tokenCandidate))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("Đánh giá nội bộ cực kỳ mật"))))
                .andExpect(content().string(not(containsString("Internal VIP"))));
    }

    @Test
    @DisplayName("Kịch bản 12: Quyền Admin phù hợp ma trận User Roles (truy cập toàn quyền)")
    void scenario12_adminFullAccess() throws Exception {
        // Admin xem được cả Pos 1 và Pos 2
        mvc.perform(get("/api/candidates/" + appPos1.getId() + "/profile")
                .header("Authorization", tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(appPos1.getId().intValue())));

        mvc.perform(get("/api/candidates/" + appPos2.getId() + "/profile")
                .header("Authorization", tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(appPos2.getId().intValue())));

        // Admin có thể thêm ghi chú và nhãn
        CreateCandidateNoteRequest noteReq = new CreateCandidateNoteRequest("Ghi chú của Admin");
        mvc.perform(post("/api/candidates/" + appPos1.getId() + "/notes")
                .header("Authorization", tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(noteReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content", is("Ghi chú của Admin")));

        CreateCandidateTagRequest tagReq = new CreateCandidateTagRequest("Admin Tagged");
        mvc.perform(post("/api/candidates/" + appPos1.getId() + "/tags")
                .header("Authorization", tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(tagReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tagName", is("Admin Tagged")));
    }
}
