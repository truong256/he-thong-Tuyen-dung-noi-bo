package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.AssignRecruiterPayload;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.JwtUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RequisitionAssignmentIntegrationTest {

    @Autowired private MockMvc mvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    @Autowired private JwtUtils jwt;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
    private com.example.auth_service.service.MailService mailService;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private RecruitmentRequisitionRepository requisitions;
    @Autowired private RequisitionAssignmentRepository assignments;
    @Autowired private RequisitionAssignmentHistoryRepository assignmentHistories;
    @Autowired private CandidateApplicationRepository candidateApplications;

    private User hrManager;
    private User primaryRecruiter;
    private User supportRecruiter;
    private User otherRecruiter;
    private RecruitmentRequisition req1;
    private RecruitmentRequisition req2;
    private CandidateApplication candidate1;
    private CandidateApplication candidate2;

    @BeforeEach
    void setupFixtures() {
        hrManager = createUser("hr_manager_s306", RoleName.HR_MANAGER);
        primaryRecruiter = createUser("primary_rec_s306", RoleName.RECRUITER);
        supportRecruiter = createUser("support_rec_s306", RoleName.RECRUITER);
        otherRecruiter = createUser("other_rec_s306", RoleName.RECRUITER);

        req1 = new RecruitmentRequisition();
        req1.setRequisitionCode("REQ-S306-001");
        req1.setTitle("Lead Java Architect");
        req1.setStatus("APPROVED");
        req1 = requisitions.saveAndFlush(req1);

        req2 = new RecruitmentRequisition();
        req2.setRequisitionCode("REQ-S306-002");
        req2.setTitle("Senior React Engineer");
        req2.setStatus("APPROVED");
        req2 = requisitions.saveAndFlush(req2);

        User candUser1 = createUser("candidate_uv1", RoleName.CANDIDATE);
        User candUser2 = createUser("candidate_uv2", RoleName.CANDIDATE);

        candidate1 = new CandidateApplication();
        candidate1.setRequisitionId(req1.getId());
        candidate1.setCandidateUserId(candUser1.getId());
        candidate1.setFullName("Ung Vien 1");
        candidate1.setEmail("uv1@example.com");
        candidate1 = candidateApplications.saveAndFlush(candidate1);

        candidate2 = new CandidateApplication();
        candidate2.setRequisitionId(req2.getId());
        candidate2.setCandidateUserId(candUser2.getId());
        candidate2.setFullName("Ung Vien 2");
        candidate2.setEmail("uv2@example.com");
        candidate2 = candidateApplications.saveAndFlush(candidate2);
    }

    private User createUser(String username, RoleName roleName) {
        Role role = roles.findByName(roleName).orElseThrow();
        User u = new User(username + "@test.com", "Password123!");
        u.setFullName(username.toUpperCase());
        u.setStatus("ACTIVE");
        u.setRoles(Set.of(role));
        return users.saveAndFlush(u);
    }

    private String token(User user) {
        return "Bearer " + jwt.generateAccessToken(user.getEmail(), Set.of(user.getRole()));
    }

    @Test
    @DisplayName("SCRUM-131: HR_MANAGER phân công 1 recruiter chính và 1 hỗ trợ thành công qua API PUT")
    void testAssignRecruiters_HrManagerSuccess() throws Exception {
        AssignRecruiterPayload payload = new AssignRecruiterPayload(
                primaryRecruiter.getId(),
                List.of(supportRecruiter.getId()),
                "Phân công dự án trọng điểm",
                "Chịu trách nhiệm tuyển 5 nhân sự"
        );

        mvc.perform(put("/api/requisitions/" + req1.getId() + "/assignments")
                .header("Authorization", token(hrManager))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryRecruiter.userId").value(primaryRecruiter.getId()))
                .andExpect(jsonPath("$.primaryRecruiter.isPrimary").value(true))
                .andExpect(jsonPath("$.supportRecruiters[0].userId").value(supportRecruiter.getId()))
                .andExpect(jsonPath("$.supportRecruiters[0].isPrimary").value(false));

        // Kiểm tra database
        assertThat(assignments.findByRequisitionId(req1.getId())).hasSize(2);
    }

    @Test
    @DisplayName("SCRUM-131: Recruiter không có quyền tự phân công (Forbidden 403)")
    void testAssignRecruiters_RecruiterForbidden() throws Exception {
        AssignRecruiterPayload payload = new AssignRecruiterPayload(
                primaryRecruiter.getId(),
                List.of(),
                null,
                null
        );

        mvc.perform(put("/api/requisitions/" + req1.getId() + "/assignments")
                .header("Authorization", token(primaryRecruiter))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("SCRUM-132: Recruiter chỉ thấy ứng viên của vị trí được giao, vị trí khác bị 403 hoặc ẩn khỏi danh sách")
    void testCandidateScope_RecruiterRestrictedToAssignedRequisition() throws Exception {
        // Phân công primaryRecruiter và supportRecruiter vào req1
        AssignRecruiterPayload payload = new AssignRecruiterPayload(
                primaryRecruiter.getId(),
                List.of(supportRecruiter.getId()),
                "Phân công req1",
                null
        );

        mvc.perform(put("/api/requisitions/" + req1.getId() + "/assignments")
                .header("Authorization", token(hrManager))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // 1. primaryRecruiter đọc ứng viên req1 -> Thành công (200 OK)
        mvc.perform(get("/api/candidates/" + candidate1.getId())
                .header("Authorization", token(primaryRecruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(candidate1.getId()));

        // 2. supportRecruiter đọc ứng viên req1 -> Thành công (200 OK)
        mvc.perform(get("/api/candidates/" + candidate1.getId())
                .header("Authorization", token(supportRecruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(candidate1.getId()));

        // 3. otherRecruiter (chưa được phân công req1) đọc ứng viên req1 -> Bị từ chối (403 Forbidden)
        mvc.perform(get("/api/candidates/" + candidate1.getId())
                .header("Authorization", token(otherRecruiter)))
                .andExpect(status().isForbidden());

        // 4. primaryRecruiter đọc ứng viên req2 (không được phân công) -> Bị từ chối (403 Forbidden)
        mvc.perform(get("/api/candidates/" + candidate2.getId())
                .header("Authorization", token(primaryRecruiter)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("SCRUM-132: Đổi người phụ trách chính phải lưu lịch sử chuyển giao và kiểm tra API lịch sử")
    void testHandover_RecordsHistoryAndHistoryApi() throws Exception {
        // Lần 1: Phân công primaryRecruiter làm chính
        AssignRecruiterPayload p1 = new AssignRecruiterPayload(
                primaryRecruiter.getId(),
                List.of(),
                "Phân công ban đầu",
                null
        );
        mvc.perform(put("/api/requisitions/" + req1.getId() + "/assignments")
                .header("Authorization", token(hrManager))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(p1)))
                .andExpect(status().isOk());

        // Lần 2: Chuyển giao sang otherRecruiter làm chính, primaryRecruiter thành hỗ trợ
        AssignRecruiterPayload p2 = new AssignRecruiterPayload(
                otherRecruiter.getId(),
                List.of(primaryRecruiter.getId()),
                "Bàn giao do nhân sự nhận dự án mới",
                "Đã bàn giao tài liệu tuyển dụng"
        );
        mvc.perform(put("/api/requisitions/" + req1.getId() + "/assignments")
                .header("Authorization", token(hrManager))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(p2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryRecruiter.userId").value(otherRecruiter.getId()))
                .andExpect(jsonPath("$.supportRecruiters[0].userId").value(primaryRecruiter.getId()));

        // Gọi API xem lịch sử chuyển giao
        mvc.perform(get("/api/requisitions/" + req1.getId() + "/assignments/history")
                .header("Authorization", token(hrManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("HANDOVER"))
                .andExpect(jsonPath("$[0].previousUserId").value(primaryRecruiter.getId()))
                .andExpect(jsonPath("$[0].userId").value(otherRecruiter.getId()))
                .andExpect(jsonPath("$[0].reason").value("Bàn giao do nhân sự nhận dự án mới"));

        // Xác thực trực tiếp dữ liệu lưu trong database
        assertThat(assignmentHistories.findByRequisitionIdOrderByCreatedAtDesc(req1.getId())).isNotEmpty();
    }

    @Test
    @DisplayName("SCRUM-131: API lấy danh sách recruiter khả dụng trả về các tài khoản RECRUITER")
    void testGetAssignableRecruiters_ReturnsRecruiterList() throws Exception {
        mvc.perform(get("/api/requisitions/assignable-recruiters")
                .header("Authorization", token(hrManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
