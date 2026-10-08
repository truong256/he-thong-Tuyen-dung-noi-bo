package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.dto.JobTitleRequest;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class JobTitleIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private DepartmentRepository departments;
    @Autowired private JobTitleRepository jobTitles;

    private User admin;
    private User adminOnly;
    private User recruiter;
    private User candidate;
    private Department dept;

    @BeforeEach
    void fixtures() {
        admin = createUser("jt-admin@test.com", RoleName.ADMIN, RoleName.HR_MANAGER);
        adminOnly = createUser("jt-admin-only@test.com", RoleName.ADMIN);
        recruiter = createUser("jt-recruiter@test.com", RoleName.RECRUITER);
        candidate = createUser("jt-candidate@test.com", RoleName.CANDIDATE);

        dept = new Department(null, "Phòng Công Nghệ Tích Hợp", "TECH-INT", "Mô tả", null, admin.getId(), true, Instant.now());
        dept = departments.save(dept);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void adminCanCreateReadUpdateAndSetStatus() throws Exception {
        JobTitleRequest req = new JobTitleRequest(
                "Kỹ sư DevOps",
                "DEVOPS-01",
                dept.getId(),
                "SENIOR",
                "TECH",
                30000000L,
                45000000L,
                "Chịu trách nhiệm CI/CD",
                List.of("CI/CD pipeline", "Kubernetes"),
                List.of("3+ năm DevOps"),
                List.of("Docker", "K8s"),
                3,
                2,
                true
        );

        String createRes = mvc.perform(post("/api/job-titles")
                        .header("Authorization", token(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.code").value("DEVOPS-01"))
                .andExpect(jsonPath("$.title").value("Kỹ sư DevOps"))
                .andExpect(jsonPath("$.departmentName").value("Phòng Công Nghệ Tích Hợp"))
                .andReturn().getResponse().getContentAsString();

        long id = mapper.readTree(createRes).get("id").asLong();

        // Get by ID
        mvc.perform(get("/api/job-titles/" + id)
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.title").value("Kỹ sư DevOps"))
                .andExpect(jsonPath("$.minSalary").value((Object) null))
                .andExpect(jsonPath("$.maxSalary").value((Object) null))
                .andExpect(jsonPath("$.salaryRangeDisplay").value((Object) null));

        // HR managers can view salary data.
        mvc.perform(get("/api/job-titles/" + id)
                        .header("Authorization", token(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.minSalary").value(30000000L))
                .andExpect(jsonPath("$.maxSalary").value(45000000L))
                .andExpect(jsonPath("$.salaryRangeDisplay").value("30 - 45 triệu VNĐ"));

        // List
        mvc.perform(get("/api/job-titles?search=DevOps")
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("DEVOPS-01"))
                .andExpect(jsonPath("$[0].minSalary").value((Object) null));

        // Update
        JobTitleRequest updateReq = new JobTitleRequest(
                "Kỹ sư DevOps Cấp cao",
                "DEVOPS-01",
                dept.getId(),
                "LEAD",
                "TECH",
                40000000L,
                60000000L,
                "Chịu trách nhiệm kiến trúc Cloud",
                List.of("Kiến trúc Cloud"),
                List.of("5+ năm kinh nghiệm"),
                List.of("AWS", "Kubernetes"),
                4,
                2,
                true
        );

        mvc.perform(put("/api/job-titles/" + id)
                        .header("Authorization", token(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Kỹ sư DevOps Cấp cao"))
                .andExpect(jsonPath("$.level").value("LEAD"));

        // Status toggle
        mvc.perform(patch("/api/job-titles/" + id + "/status")
                        .header("Authorization", token(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        // Delete fails with 409 Conflict when headcount > 0
        mvc.perform(delete("/api/job-titles/" + id)
                        .header("Authorization", token(admin)))
                .andExpect(status().isConflict());

        // Transfer/reset headcount to 0 before delete
        JobTitle existingJt = jobTitles.findById(id).orElseThrow();
        existingJt.setCurrentHeadcount(0);
        jobTitles.save(existingJt);

        // Delete succeeds when headcount is 0 and no dependencies
        mvc.perform(delete("/api/job-titles/" + id)
                        .header("Authorization", token(admin)))
                .andExpect(status().isNoContent());

        assertThat(jobTitles.findById(id)).isEmpty();
    }

    @Test
    void candidateCannotCreateJobTitle() throws Exception {
        JobTitleRequest req = new JobTitleRequest(
                "Kỹ sư Test",
                "TEST-01",
                null,
                "JUNIOR",
                "TECH",
                null,
                null,
                null,
                null,
                null,
                null,
                1,
                0,
                true
        );

        mvc.perform(post("/api/job-titles")
                        .header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    void recruiterCannotCreateOrChangeSalaryRange() throws Exception {
        JobTitleRequest req = new JobTitleRequest(
                "Kỹ sư Bảo mật",
                "SEC-01",
                dept.getId(),
                "SENIOR",
                "TECH",
                35000000L,
                50000000L,
                null,
                null,
                null,
                null,
                1,
                0,
                true
        );

        mvc.perform(post("/api/job-titles")
                        .header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminWithoutHrManagerRoleCannotManageSalaryRanges() throws Exception {
        JobTitleRequest req = new JobTitleRequest(
                "Kỹ sư Dữ liệu",
                "DATA-01",
                dept.getId(),
                "SENIOR",
                "TECH",
                40000000L,
                60000000L,
                null,
                null,
                null,
                null,
                1,
                0,
                true
        );

        mvc.perform(post("/api/job-titles")
                        .header("Authorization", token(adminOnly))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    void candidateCannotListJobTitles() throws Exception {
        mvc.perform(get("/api/job-titles")
                        .header("Authorization", token(candidate)))
                .andExpect(status().isForbidden());
    }

    @Test
    void recruiterCanSearchByDepartmentNameWithoutSalaryLeak() throws Exception {
        JobTitle jt = new JobTitle();
        jt.setTitle("Kỹ sư Kiểm thử Tích Hợp");
        jt.setCode("QA-INT-01");
        jt.setDepartment(dept);
        jt.setLevel("JUNIOR");
        jt.setJobFamily("TECH");
        jt.setMinSalary(15000000L);
        jt.setMaxSalary(22000000L);
        jt.setStandardHeadcount(2);
        jt.setCurrentHeadcount(0);
        jt.setActive(true);
        jobTitles.save(jt);

        mvc.perform(get("/api/job-titles?search=Tích Hợp")
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("QA-INT-01"))
                .andExpect(jsonPath("$[0].minSalary").value((Object) null))
                .andExpect(jsonPath("$[0].maxSalary").value((Object) null))
                .andExpect(jsonPath("$[0].salaryRangeDisplay").value((Object) null));
    }

    @Test
    void unauthenticatedReturns401() throws Exception {
        mvc.perform(get("/api/job-titles"))
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
