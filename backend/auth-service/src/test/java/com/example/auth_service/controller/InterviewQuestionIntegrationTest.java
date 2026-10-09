package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.CompetencyCriterion;
import com.example.auth_service.domain.sprint2.CompetencyFramework;
import com.example.auth_service.domain.sprint2.InterviewQuestion;
import com.example.auth_service.domain.sprint2.JobTitle;
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

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class InterviewQuestionIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private JobTitleRepository jobTitles;
    @Autowired private CompetencyFrameworkRepository frameworks;
    @Autowired private CompetencyCriterionRepository criteria;
    @Autowired private InterviewQuestionRepository questions;

    private User recruiter;
    private JobTitle beJobTitle;
    private JobTitle feJobTitle;
    private CompetencyCriterion critBe;
    private CompetencyCriterion critFe;
    private InterviewQuestion qActiveBe;
    private InterviewQuestion qInactiveBe;
    private InterviewQuestion qActiveFe;

    @BeforeEach
    void setup() {
        recruiter = createUser("iq-recruiter@test.com", RoleName.RECRUITER);

        beJobTitle = new JobTitle();
        beJobTitle.setTitle("Senior Backend Engineer");
        beJobTitle.setCode("BE-SR-INT-01");
        beJobTitle.setLevel("SENIOR");
        beJobTitle.setJobFamily("TECH");
        beJobTitle.setActive(true);
        beJobTitle = jobTitles.save(beJobTitle);

        feJobTitle = new JobTitle();
        feJobTitle.setTitle("Middle Frontend Developer");
        feJobTitle.setCode("FE-MID-INT-02");
        feJobTitle.setLevel("MIDDLE");
        feJobTitle.setJobFamily("TECH");
        feJobTitle.setActive(true);
        feJobTitle = jobTitles.save(feJobTitle);

        CompetencyFramework fwBe = new CompetencyFramework();
        fwBe.setCompetencyName("Năng lực Backend");
        fwBe.setJobTitle(beJobTitle);
        fwBe.setWeightPercent(100);
        fwBe = frameworks.save(fwBe);

        CompetencyFramework fwFe = new CompetencyFramework();
        fwFe.setCompetencyName("Năng lực Frontend");
        fwFe.setJobTitle(feJobTitle);
        fwFe.setWeightPercent(100);
        fwFe = frameworks.save(fwFe);

        critBe = new CompetencyCriterion();
        critBe.setCriterionCode("CRIT-BE-INT-01");
        critBe.setCriterionName("Kiến thức CSDL & API");
        critBe.setCompetencyFramework(fwBe);
        critBe.setWeightPercent(100);
        critBe.setActive(true);
        critBe = criteria.save(critBe);

        critFe = new CompetencyCriterion();
        critFe.setCriterionCode("CRIT-FE-INT-01");
        critFe.setCriterionName("Lập trình React Components");
        critFe.setCompetencyFramework(fwFe);
        critFe.setWeightPercent(100);
        critFe.setActive(true);
        critFe = criteria.save(critFe);

        qActiveBe = new InterviewQuestion();
        qActiveBe.setQuestionText("Làm thế nào để thiết kế một REST API chuẩn bảo mật và tối ưu query?");
        qActiveBe.setCategory("API Design");
        qActiveBe.setDifficultyLevel("MEDIUM");
        qActiveBe.setSuggestedAnswer("Dùng HTTPS, JWT, rate limit, pagination.");
        qActiveBe.setCompetencyCriterion(critBe);
        qActiveBe.setActive(true);
        qActiveBe = questions.save(qActiveBe);

        qInactiveBe = new InterviewQuestion();
        qInactiveBe.setQuestionText("Câu hỏi cũ đã ngừng áp dụng về Spring XML configuration");
        qInactiveBe.setCategory("Legacy");
        qInactiveBe.setDifficultyLevel("HARD");
        qInactiveBe.setSuggestedAnswer("Dùng @Configuration thay thế");
        qInactiveBe.setCompetencyCriterion(critBe);
        qInactiveBe.setActive(false);
        qInactiveBe = questions.save(qInactiveBe);

        qActiveFe = new InterviewQuestion();
        qActiveFe.setQuestionText("Giải thích useMemo và useCallback trong React?");
        qActiveFe.setCategory("React");
        qActiveFe.setDifficultyLevel("EASY");
        qActiveFe.setSuggestedAnswer("useMemo memoize value, useCallback memoize fn");
        qActiveFe.setCompetencyCriterion(critFe);
        qActiveFe.setActive(true);
        qActiveFe = questions.save(qActiveFe);
    }

    @AfterEach
    void clean() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("TC01 & TC02: Lọc theo tiêu chí năng lực và khôi phục khi chọn tất cả")
    void filter_ByCriterion() throws Exception {
        mvc.perform(get("/api/questions")
                        .header("Authorization", token(recruiter))
                        .param("criterionId", critBe.getId().toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].id").value(org.hamcrest.Matchers.containsInAnyOrder(
                        qActiveBe.getId().intValue(), qInactiveBe.getId().intValue()
                )));

        mvc.perform(get("/api/questions")
                        .header("Authorization", token(recruiter))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    @DisplayName("TC03, TC04, TC05: Lọc theo trạng thái hoạt động (Active, Inactive, All)")
    void filter_ByStatus() throws Exception {
        // TC03: active=true
        mvc.perform(get("/api/questions")
                        .header("Authorization", token(recruiter))
                        .param("active", "true")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].active").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is(true))));

        // TC04: active=false
        mvc.perform(get("/api/questions")
                        .header("Authorization", token(recruiter))
                        .param("active", "false")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(qInactiveBe.getId().intValue()));

        // TC05: all (active param not specified)
        mvc.perform(get("/api/questions")
                        .header("Authorization", token(recruiter))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    @DisplayName("TC06 & TC07: Lọc theo chức danh và kết hợp chức danh + tiêu chí")
    void filter_ByJobTitleAndCriterion() throws Exception {
        // TC06: jobTitleId = beJobTitle
        mvc.perform(get("/api/questions")
                        .header("Authorization", token(recruiter))
                        .param("jobTitleId", beJobTitle.getId().toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));

        // TC07: jobTitleId = beJobTitle + criterionId = critBe
        mvc.perform(get("/api/questions")
                        .header("Authorization", token(recruiter))
                        .param("jobTitleId", beJobTitle.getId().toString())
                        .param("criterionId", critBe.getId().toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));

        // Non-matching jobTitleId and criterionId
        mvc.perform(get("/api/questions")
                        .header("Authorization", token(recruiter))
                        .param("jobTitleId", beJobTitle.getId().toString())
                        .param("criterionId", critFe.getId().toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    @DisplayName("TC08 & TC09: Kết hợp tất cả bộ lọc (AND condition) & trường hợp không có kết quả")
    void filter_CombinedAll() throws Exception {
        // TC08: keyword=API, difficulty=MEDIUM, jobTitle=beJobTitle, criterion=critBe, active=true
        mvc.perform(get("/api/questions")
                        .header("Authorization", token(recruiter))
                        .param("search", "API")
                        .param("difficultyLevel", "MEDIUM")
                        .param("jobTitleId", beJobTitle.getId().toString())
                        .param("criterionId", critBe.getId().toString())
                        .param("active", "true")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(qActiveBe.getId().intValue()));

        // TC09: Không có kết quả thỏa mãn
        mvc.perform(get("/api/questions")
                        .header("Authorization", token(recruiter))
                        .param("search", "NonExistingWord12345")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    @DisplayName("Criteria endpoint: lấy theo jobTitleId hoặc tất cả")
    void criteria_Endpoint() throws Exception {
        // All criteria
        mvc.perform(get("/api/questions/criteria")
                        .header("Authorization", token(recruiter))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(org.hamcrest.Matchers.greaterThanOrEqualTo(2))));

        // Filter by jobTitleId
        mvc.perform(get("/api/questions/criteria")
                        .header("Authorization", token(recruiter))
                        .param("jobTitleId", beJobTitle.getId().toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].criterionCode").value(org.hamcrest.Matchers.hasItem("CRIT-BE-INT-01")));
    }

    private String token(User user) {
        return "Bearer " + jwt.generateAccessToken(user.getEmail());
    }

    private User createUser(String email, RoleName... roleNames) {
        User u = users.findByEmail(email).orElseGet(() -> {
            User nu = new User(email, "hashed_pw");
            nu.setFullName("User " + email);
            nu.setStatus("ACTIVE");
            return nu;
        });
        u.getRoles().clear();
        for (RoleName rn : roleNames) {
            Role r = roles.findByName(rn).orElseGet(() -> roles.save(new Role(rn, rn.name())));
            u.getRoles().add(r);
        }
        return users.save(u);
    }
}
