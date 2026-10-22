package com.example.auth_service.service;

import com.example.auth_service.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:demo-seed-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.demo-seed.enabled=true",
        "DEMO_PASSWORD_ADMIN=TestOnly_Admin_Seed_123!",
        "DEMO_PASSWORD_HR_MANAGER=TestOnly_HrManager_123!",
        "DEMO_PASSWORD_HIRING_MANAGER=TestOnly_HiringManager_123!",
        "DEMO_PASSWORD_APPROVER=TestOnly_Approver_Seed_123!",
        "DEMO_PASSWORD_RECRUITER=TestOnly_Recruiter_Seed_123!",
        "DEMO_PASSWORD_INTERVIEWER=TestOnly_Interviewer_Seed_123!",
        "DEMO_PASSWORD_CANDIDATE=TestOnly_Candidate_Seed_123!"
})
@ActiveProfiles({"test", "demo-seed"})
@AutoConfigureMockMvc
@Sql(statements = {
        "CREATE TABLE IF NOT EXISTS department_tree_lock (id INTEGER PRIMARY KEY)",
        "CREATE UNIQUE INDEX IF NOT EXISTS demo_test_category_type_code ON common_categories(type, code)",
        "INSERT INTO department_tree_lock SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM department_tree_lock)",
        "CREATE TABLE IF NOT EXISTS demo_seed_runs (seed_key VARCHAR(100) PRIMARY KEY, completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, record_counts TEXT NOT NULL)"
})
class DemoSeedIntegrationTest {
    @org.junit.jupiter.api.BeforeEach
    void clearInheritedAuthentication() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @org.junit.jupiter.api.AfterEach
    void clearAuthentication() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }
    @Autowired DemoSeedService seed;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired PasswordEncoder encoder;
    @Autowired UserRepository users;
    @Autowired CommonCategoryRepository categories;

    @Test
    void createsLinkedWorkflowAndRepeatingSeedPreservesUserChanges() throws Exception {
        users.saveAndFlush(new com.example.auth_service.entity.User("demo.admin@example.invalid", "existing-user"));
        assertThatThrownBy(seed::seed).isInstanceOf(IllegalStateException.class).hasMessageContaining("collision");
        assertThat(count("users")).isEqualTo(1);
        jdbc.update("DELETE FROM users WHERE email = 'demo.admin@example.invalid'");
        categories.saveAndFlush(new com.example.auth_service.domain.sprint2.CommonCategory(null,
                "WORK_LOCATION", "DEMO-HN", "Existing category", 1, true));
        assertThatThrownBy(seed::seed).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(count("users")).isZero();
        assertThat(count("departments")).isZero();
        assertThat(count("demo_seed_runs")).isZero();
        assertThat(count("common_categories")).isEqualTo(1);
        jdbc.update("DELETE FROM common_categories WHERE type = 'WORK_LOCATION' AND code = 'DEMO-HN'");
        seed.seed();
        assertThat(count("users")).isEqualTo(7);
        assertThat(count("recruitment_requisitions")).isEqualTo(3);
        assertThat(count("requisition_approval_snapshots")).isEqualTo(2);
        assertThat(count("requisition_approval_logs")).isEqualTo(1);
        assertThat(count("job_postings")).isEqualTo(1);
        mvc.perform(get("/api/public/job-postings")).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").doesNotExist())
                .andExpect(jsonPath("$.content[0].title").exists());
        mvc.perform(get("/api/public/departments")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Phòng Kỹ thuật Demo"))
                .andExpect(jsonPath("$[0].managerUserId").doesNotExist())
                .andExpect(jsonPath("$[0].managerEmail").doesNotExist());
        mvc.perform(get("/api/departments")).andExpect(status().isUnauthorized());
        assertThat(encoder.matches("TestOnly_Admin_Seed_123!", jdbc.queryForObject(
                "SELECT password FROM users WHERE email = 'demo.admin@example.invalid'", String.class))).isTrue();
        assertThat(jdbc.queryForObject("SELECT status FROM job_postings", String.class)).isEqualTo("PUBLISHED");
        assertThat(jdbc.queryForList("SELECT status FROM recruitment_requisitions", String.class))
                .containsExactlyInAnyOrder("DRAFT", "PENDING_APPROVAL", "APPROVED");
        jdbc.update("UPDATE users SET full_name = 'Tên người dùng tự sửa' WHERE email = 'demo.admin@example.invalid'");
        seed.seed();
        assertThat(count("users")).isEqualTo(7);
        assertThat(count("job_postings")).isEqualTo(1);
        assertThat(count("demo_seed_runs")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT full_name FROM users WHERE email = 'demo.admin@example.invalid'", String.class))
                .isEqualTo("Tên người dùng tự sửa");
    }

    long count(String table) { return jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class); }
}
