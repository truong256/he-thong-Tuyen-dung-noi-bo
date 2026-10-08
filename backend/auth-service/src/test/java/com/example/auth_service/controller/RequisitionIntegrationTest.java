package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.CreateRequisitionRequest;
import com.example.auth_service.dto.RequisitionDraftRequest;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RequisitionIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private DepartmentRepository departments;
    @Autowired private JobTitleRepository jobTitles;
    @Autowired private RecruitmentRequisitionRepository requisitions;

    private User hiringManager;
    private User hrManager;
    private User candidate;
    private Department dept;
    private JobTitle job;

    @BeforeEach
    void setUp() {
        hiringManager = createUser("hm-req-test@example.com", RoleName.HIRING_MANAGER);
        hrManager = createUser("hr-req-test@example.com", RoleName.HR_MANAGER);
        candidate = createUser("candidate-req-test@example.com", RoleName.CANDIDATE);

        dept = new Department(null, "Phòng Kỹ thuật Phần mềm", "SE-DEPT", "Mô tả", null, hiringManager.getId(), true, Instant.now());
        dept = departments.save(dept);

        job = new JobTitle();
        job.setTitle("Kỹ sư Backend Spring Boot");
        job.setCode("BE-SPRING");
        job.setDepartment(dept);
        job.setActive(true);
        job.setMinSalary(15_000_000L);
        job.setMaxSalary(30_000_000L);
        job = jobTitles.save(job);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private User createUser(String email, RoleName... roleNames) {
        User u = new User(email, "hashed_pw", roleNames[0].name());
        u.setFullName("User " + email);
        u.setStatus("ACTIVE");
        u.setRoles(rolesFrom(roleNames));
        return users.save(u);
    }

    private Set<Role> rolesFrom(RoleName... roleNames) {
        Set<Role> result = new java.util.HashSet<>();
        for (RoleName rn : roleNames) {
            result.add(roles.findByName(rn).orElseGet(() -> roles.save(new Role(rn, rn.name()))));
        }
        return result;
    }

    private String token(User u) {
        return "Bearer " + jwt.generateAccessToken(
                u.getEmail(),
                u.getRoles().stream().map(r -> r.getName().name()).collect(java.util.stream.Collectors.toSet()),
                u.getTokenVersion(),
                false
        );
    }

    @Test
    void hiringManagerCanSaveDraftAndRetrieveIt() throws Exception {
        RequisitionDraftRequest draft = new RequisitionDraftRequest(
                "Nháp tuyển lập trình viên Spring",
                dept.getId(),
                job.getId(),
                2,
                "NEW",
                "Mở rộng team",
                16_000_000L,
                25_000_000L,
                "VND",
                null,
                LocalDate.now().plusDays(20),
                "JD nháp",
                "Yêu cầu nháp",
                null,
                "Hà Nội",
                "ONSITE"
        );

        String responseJson = mvc.perform(post("/api/requisitions/draft")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(draft)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.requisitionCode").exists())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.title").value("Nháp tuyển lập trình viên Spring"))
                .andReturn().getResponse().getContentAsString();

        Long id = mapper.readTree(responseJson).get("id").asLong();

        // Get by ID
        mvc.perform(get("/api/requisitions/" + id)
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    void hiringManagerCanUpdateDraftAndSubmitForApproval() throws Exception {
        // 1. Tạo nháp thiếu thông tin
        RequisitionDraftRequest initialDraft = new RequisitionDraftRequest(
                "Bản nháp ban đầu",
                dept.getId(),
                null,
                1,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        String createdJson = mvc.perform(post("/api/requisitions/draft")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(initialDraft)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long id = mapper.readTree(createdJson).get("id").asLong();

        // Thử submit ngay khi còn thiếu -> phải báo lỗi 400
        mvc.perform(post("/api/requisitions/" + id + "/submit")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());

        // 2. Cập nhật đầy đủ thông tin
        RequisitionDraftRequest updatedDraft = new RequisitionDraftRequest(
                "Yêu cầu tuyển dụng hoàn chỉnh",
                dept.getId(),
                job.getId(),
                2,
                "NEW",
                "Thay thế nhân sự chuyển dự án",
                18_000_000L,
                25_000_000L,
                "VND",
                null,
                LocalDate.now().plusDays(15),
                "Mô tả công việc hoàn chỉnh...",
                "Yêu cầu ứng viên hoàn chỉnh...",
                "Đãi ngộ tốt",
                "Hà Nội",
                "HYBRID"
        );

        mvc.perform(put("/api/requisitions/" + id + "/draft")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(updatedDraft)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Yêu cầu tuyển dụng hoàn chỉnh"))
                .andExpect(jsonPath("$.workingModel").value("HYBRID"));

        // 3. Gửi phê duyệt thành công
        mvc.perform(post("/api/requisitions/" + id + "/submit")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.submittedAt").exists());
    }

    @Test
    void directCreateAndSubmit_EnforcesSalaryExplanationWhenOutsideRange() throws Exception {
        // Khung lương jobTitle: 15m - 30m. Đề xuất: 35m (vượt khung) nhưng không có giải trình -> 400
        CreateRequisitionRequest outsideNoExplanation = new CreateRequisitionRequest(
                "Tuyển Chuyên gia Tech Lead",
                dept.getId(),
                job.getId(),
                1,
                "NEW",
                "Dự án trọng điểm",
                20_000_000L,
                35_000_000L,
                "VND",
                null, // thiếu giải trình
                LocalDate.now().plusDays(30),
                "Mô tả...",
                "Yêu cầu...",
                null,
                null,
                "ONSITE"
        );

        mvc.perform(post("/api/requisitions")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(outsideNoExplanation)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Dải lương nằm ngoài khung lương tiêu chuẩn")));

        // Có giải trình hợp lệ -> 201 Created
        CreateRequisitionRequest outsideWithExplanation = new CreateRequisitionRequest(
                "Tuyển Chuyên gia Tech Lead",
                dept.getId(),
                job.getId(),
                1,
                "NEW",
                "Dự án trọng điểm",
                20_000_000L,
                35_000_000L,
                "VND",
                "Ứng viên chuyên gia cấp cao, đáp ứng kiến trúc microservice phức tạp",
                LocalDate.now().plusDays(30),
                "Mô tả...",
                "Yêu cầu...",
                null,
                null,
                "ONSITE"
        );

        mvc.perform(post("/api/requisitions")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(outsideWithExplanation)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.salaryExplanation").value("Ứng viên chuyên gia cấp cao, đáp ứng kiến trúc microservice phức tạp"));
    }

    @Test
    void candidateRoleIsForbiddenFromCreatingOrAccessingDrafts() throws Exception {
        RequisitionDraftRequest draft = new RequisitionDraftRequest("Draft", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        mvc.perform(post("/api/requisitions/draft")
                        .header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(draft)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRequestIsUnauthorized() throws Exception {
        mvc.perform(get("/api/requisitions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void hiringManagerCanDeleteOnlyDraftRequisition() throws Exception {
        // Tạo draft
        RequisitionDraftRequest draft = new RequisitionDraftRequest("Draft to delete", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
        String res = mvc.perform(post("/api/requisitions/draft")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(draft)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long id = mapper.readTree(res).get("id").asLong();

        // Xóa draft -> 204 No Content
        mvc.perform(delete("/api/requisitions/" + id)
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isNoContent());

        // Kiểm tra trong DB đã bị xóa
        assertThat(requisitions.findById(id)).isEmpty();
    }
}
