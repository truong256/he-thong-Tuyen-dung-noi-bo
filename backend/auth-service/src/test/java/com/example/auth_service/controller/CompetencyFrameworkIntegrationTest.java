package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.CompetencyCriterion;
import com.example.auth_service.domain.sprint2.CompetencyFramework;
import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.dto.CompetencyCriterionRequest;
import com.example.auth_service.dto.CompetencyFrameworkRequest;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CompetencyFrameworkIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private CompetencyFrameworkRepository frameworks;
    @Autowired private CompetencyCriterionRepository criteria;
    @Autowired private JobTitleRepository jobTitles;
    @Autowired private DepartmentRepository departments;

    private User hrManager;
    private User candidate;
    private Department dept;

    @BeforeEach
    void setUp() {
        hrManager = createUser("cf-hr@test.com", RoleName.HR_MANAGER);
        candidate = createUser("cf-candidate@test.com", RoleName.CANDIDATE);

        dept = new Department(null, "Phòng Công Nghệ Khung", "TECH-CF", "Mô tả", null, hrManager.getId(), true, Instant.now());
        dept = departments.save(dept);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("TC01: HR_MANAGER tạo khung thành công khi tổng trọng số 100% -> HTTP 201")
    void testCreateFramework_Valid100_Returns201() throws Exception {
        CompetencyFrameworkRequest req = new CompetencyFrameworkRequest(
                "Khung Lập trình Backend Chuẩn",
                "Mô tả chuyên môn backend",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "BE_CRIT_01", "Java & Spring", "Spring ecosystem", 40, true),
                        new CompetencyCriterionRequest(null, "BE_CRIT_02", "SQL & Database", "PostgreSQL optimization", 30, true),
                        new CompetencyCriterionRequest(null, "BE_CRIT_03", "System Design", "Distributed systems", 30, true)
                ),
                null
        );

        mvc.perform(post("/api/competency-frameworks")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.competencyName").value("Khung Lập trình Backend Chuẩn"))
                .andExpect(jsonPath("$.weightPercent").value(100))
                .andExpect(jsonPath("$.criteriaCount").value(3))
                .andExpect(jsonPath("$.criteria", hasSize(3)));
    }

    @Test
    @DisplayName("TC02: Tổng trọng số 99% bị từ chối -> HTTP 400")
    void testCreateFramework_Total99_Returns400() throws Exception {
        CompetencyFrameworkRequest req = new CompetencyFrameworkRequest(
                "Khung Thiếu Trọng Số",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "C1", "Tiêu chí 1", "Mô tả", 50, true),
                        new CompetencyCriterionRequest(null, "C2", "Tiêu chí 2", "Mô tả", 49, true)
                ),
                null
        );

        mvc.perform(post("/api/competency-frameworks")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("100%")));
    }

    @Test
    @DisplayName("TC03: Tổng trọng số 101% bị từ chối -> HTTP 400")
    void testCreateFramework_Total101_Returns400() throws Exception {
        CompetencyFrameworkRequest req = new CompetencyFrameworkRequest(
                "Khung Vượt Trọng Số",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "C1", "Tiêu chí 1", "Mô tả", 60, true),
                        new CompetencyCriterionRequest(null, "C2", "Tiêu chí 2", "Mô tả", 41, true)
                ),
                null
        );

        mvc.perform(post("/api/competency-frameworks")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("100%")));
    }

    @Test
    @DisplayName("TC04: Thiếu tên khung năng lực bị từ chối -> HTTP 400")
    void testCreateFramework_MissingName_Returns400() throws Exception {
        CompetencyFrameworkRequest req = new CompetencyFrameworkRequest(
                "   ",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "C1", "Tiêu chí 1", "Mô tả", 100, true)
                ),
                null
        );

        mvc.perform(post("/api/competency-frameworks")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC05: Khung không có tiêu chí bị từ chối -> HTTP 400")
    void testCreateFramework_EmptyCriteria_Returns400() throws Exception {
        CompetencyFrameworkRequest req = new CompetencyFrameworkRequest(
                "Khung Rỗng Tiêu Chí",
                "Mô tả",
                "KỸ THUẬT",
                List.of(),
                null
        );

        mvc.perform(post("/api/competency-frameworks")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC06: Trùng mã tiêu chí trong cùng khung bị từ chối -> HTTP 400")
    void testCreateFramework_DuplicateCriterionCode_Returns400() throws Exception {
        CompetencyFrameworkRequest req = new CompetencyFrameworkRequest(
                "Khung Trùng Mã",
                "Mô tả",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(null, "CODE_A", "Tên 1", "Mô tả", 50, true),
                        new CompetencyCriterionRequest(null, "code_a", "Tên 2", "Mô tả", 50, true)
                ),
                null
        );

        mvc.perform(post("/api/competency-frameworks")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("trùng lặp")));
    }

    @Test
    @DisplayName("TC07: Chỉnh sửa khung năng lực -> HTTP 200 và giữ nguyên ID tiêu chí cũ")
    void testUpdateFramework_Success() throws Exception {
        CompetencyFramework fw = new CompetencyFramework();
        fw.setCompetencyName("Khung Gốc Trước Sửa");
        fw.setDescription("Mô tả gốc");
        fw.setCategory("KỸ THUẬT");
        fw.setWeightPercent(100);

        CompetencyCriterion c1 = new CompetencyCriterion();
        c1.setCriterionCode("OLD_01");
        c1.setCriterionName("Tiêu chí Cũ");
        c1.setDescription("Mô tả cũ");
        c1.setWeightPercent(100);
        c1.setActive(true);
        c1.setCompetencyFramework(fw);
        fw.getCriteria().add(c1);

        CompetencyFramework saved = frameworks.save(fw);
        Long existingCriterionId = saved.getCriteria().get(0).getId();

        CompetencyFrameworkRequest updateReq = new CompetencyFrameworkRequest(
                "Khung Đã Sửa Tên",
                "Mô tả mới",
                "KỸ THUẬT",
                List.of(
                        new CompetencyCriterionRequest(existingCriterionId, "OLD_01_NEW", "Tiêu chí Đã Đổi Tên", "Mô tả mới", 100, true)
                ),
                null
        );

        mvc.perform(put("/api/competency-frameworks/" + saved.getId())
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.competencyName").value("Khung Đã Sửa Tên"))
                .andExpect(jsonPath("$.criteria[0].id").value(existingCriterionId))
                .andExpect(jsonPath("$.criteria[0].criterionName").value("Tiêu chí Đã Đổi Tên"));
    }

    @Test
    @DisplayName("TC08 & TC09: Gắn cùng một khung cho nhiều chức danh công việc -> Thành công")
    void testAssociateFramework_WithMultipleJobTitles() throws Exception {
        CompetencyFramework fw = new CompetencyFramework();
        fw.setCompetencyName("Khung Kỹ Sư Backend Chung");
        fw.setDescription("Dùng chung cho nhiều cấp bậc");
        fw.setCategory("KỸ THUẬT");
        fw.setWeightPercent(100);

        CompetencyCriterion c1 = new CompetencyCriterion();
        c1.setCriterionCode("BE_COMM_01");
        c1.setCriterionName("Kiến trúc Dịch vụ");
        c1.setWeightPercent(100);
        c1.setActive(true);
        c1.setCompetencyFramework(fw);
        fw.getCriteria().add(c1);
        CompetencyFramework savedFw = frameworks.save(fw);

        JobTitle jt1 = new JobTitle();
        jt1.setTitle("Backend Engineer");
        jt1.setCode("BE-ENG-INT-01");
        jt1.setDepartment(dept);
        jt1.setActive(true);
        jt1 = jobTitles.save(jt1);

        JobTitle jt2 = new JobTitle();
        jt2.setTitle("Senior Backend Engineer");
        jt2.setCode("BE-ENG-INT-02");
        jt2.setDepartment(dept);
        jt2.setActive(true);
        jt2 = jobTitles.save(jt2);

        CompetencyFrameworkRequest req = new CompetencyFrameworkRequest(
                "Khung Kỹ Sư Backend Chung",
                "Dùng chung cho nhiều cấp bậc",
                "KỸ THUẬT",
                List.of(new CompetencyCriterionRequest(savedFw.getCriteria().get(0).getId(), "BE_COMM_01", "Kiến trúc Dịch vụ", null, 100, true)),
                List.of(jt1.getId(), jt2.getId())
        );

        mvc.perform(put("/api/competency-frameworks/" + savedFw.getId())
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobTitlesCount").value(2))
                .andExpect(jsonPath("$.jobTitles[*].title", hasItems("Backend Engineer", "Senior Backend Engineer")));

        // Verify both JobTitles are linked to this same framework in database
        JobTitle reloadedJt1 = jobTitles.findById(jt1.getId()).orElseThrow();
        JobTitle reloadedJt2 = jobTitles.findById(jt2.getId()).orElseThrow();
        assertThat(reloadedJt1.getCompetencyFramework()).isNotNull();
        assertThat(reloadedJt1.getCompetencyFramework().getId()).isEqualTo(savedFw.getId());
        assertThat(reloadedJt2.getCompetencyFramework()).isNotNull();
        assertThat(reloadedJt2.getCompetencyFramework().getId()).isEqualTo(savedFw.getId());
    }

    @Test
    @DisplayName("TC10: Xóa khung đang được chức danh sử dụng -> Bị từ chối và bảo vệ dữ liệu")
    void testDeleteFramework_InUseByJobTitle_Returns400() throws Exception {
        CompetencyFramework fw = new CompetencyFramework();
        fw.setCompetencyName("Khung Đang Sử Dụng");
        fw.setWeightPercent(100);

        CompetencyCriterion c = new CompetencyCriterion();
        c.setCriterionCode("USE_01");
        c.setCriterionName("Tiêu chí");
        c.setWeightPercent(100);
        c.setActive(true);
        c.setCompetencyFramework(fw);
        fw.getCriteria().add(c);
        CompetencyFramework savedFw = frameworks.save(fw);

        JobTitle jt = new JobTitle();
        jt.setTitle("Chức Danh Đang Dùng Khung");
        jt.setCode("JT-IN-USE-01");
        jt.setDepartment(dept);
        jt.setCompetencyFramework(savedFw);
        jt.setActive(true);
        jobTitles.save(jt);

        mvc.perform(delete("/api/competency-frameworks/" + savedFw.getId())
                        .header("Authorization", token(hrManager)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("chức danh")));

        // Verify framework is NOT deleted
        assertThat(frameworks.findById(savedFw.getId())).isPresent();
    }

    @Test
    @DisplayName("TC12: Người dùng không có quyền ghi (CANDIDATE) -> HTTP 403 Forbidden")
    void testRbac_CandidateCannotMutate_Returns403() throws Exception {
        CompetencyFrameworkRequest req = new CompetencyFrameworkRequest(
                "Khung Bất Hợp Pháp",
                "Mô tả",
                "KỸ THUẬT",
                List.of(new CompetencyCriterionRequest(null, "C1", "T1", "Mô tả", 100, true)),
                null
        );

        mvc.perform(post("/api/competency-frameworks")
                        .header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthenticated request -> HTTP 401 Unauthorized")
    void testUnauthenticated_Returns401() throws Exception {
        mvc.perform(get("/api/competency-frameworks"))
                .andExpect(status().isUnauthorized());
    }

    private User createUser(String email, RoleName... roleNames) {
        User user = new User(email, "hashed_pw");
        user.setStatus("ACTIVE");
        for (RoleName rn : roleNames) {
            Role role = roles.findByName(rn).orElseGet(() -> roles.save(new Role(rn, rn.name())));
            user.getRoles().add(role);
        }
        return users.save(user);
    }

    private String token(User user) {
        return "Bearer " + jwt.generateAccessToken(user.getEmail());
    }
}
