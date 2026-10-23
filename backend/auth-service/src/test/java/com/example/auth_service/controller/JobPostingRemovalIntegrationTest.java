package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint3.JobPosting;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.JwtUtils;
import com.example.auth_service.service.JobPostingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.Set;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.scheduling.enabled=false")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class JobPostingRemovalIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JobPostingRepository postings;
    @Autowired JobPostingAuditLogRepository logs;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired JwtUtils jwt;
    @Autowired JobPostingService service;
    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    private User actor(RoleName role) {
        User u = new User("removal-" + role + "@test.local", "unused");
        u.setRoles(Set.of(roles.findByName(role).orElseThrow()));
        return users.saveAndFlush(u);
    }
    private String token(User u) {
        return "Bearer " + jwt.generateAccessToken(u.getEmail(), Set.of(u.getRole()), u.getTokenVersion());
    }
    private JobPosting posting(String status, LocalDate deadline, User owner) {
        JobPosting p = new JobPosting();
        p.setJobCode("JP-REMOVAL-" + postings.count());
        p.setTitle("Kỹ sư kiểm tra gỡ tin"); p.setStatus(status); p.setApplicationDeadline(deadline);
        p.setCreatedByUserId(owner.getId()); p.setPublishedByUserId(owner.getId());
        p.setCreatedAt(Instant.now()); p.setUpdatedAt(Instant.now()); p.setPublishedAt(Instant.now());
        return postings.saveAndFlush(p);
    }
    @Test void recruiterCanRemoveAndPublicAccessStopsImmediately() throws Exception {
        User recruiter = actor(RoleName.RECRUITER);
        JobPosting p = posting("PUBLISHED", today.plusDays(1), recruiter);
        mvc.perform(post("/api/job-postings/" + p.getId() + "/unpublish").header("Authorization", token(recruiter))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Đã tuyển đủ\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UNPUBLISHED"));
        mvc.perform(get("/api/public/job-postings").param("keyword", "Kỹ sư kiểm tra gỡ tin"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/public/job-postings/" + p.getId())).andExpect(status().isNotFound());
        mvc.perform(post("/api/public/job-postings/" + p.getId() + "/apply").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Ứng viên\",\"email\":\"candidate@test.local\"}"))
                .andExpect(status().isNotFound());
        assertThat(logs.findByJobPostingIdOrderByCreatedAtDesc(p.getId())).anyMatch(l -> "UNPUBLISH".equals(l.getAction()));
    }
    @Test void expiryIncludesOnlyPastDeadlineAndIsIdempotent() {
        User recruiter = actor(RoleName.RECRUITER);
        JobPosting old = posting("PUBLISHED", today.minusDays(1), recruiter);
        JobPosting dueToday = posting("PUBLISHED", today, recruiter);
        JobPosting noDeadline = posting("PUBLISHED", null, recruiter);
        JobPosting draft = posting("DRAFT", today.minusDays(2), recruiter);
        assertThat(service.expireDueJobPostings(today).getExpiredPostingIds()).contains(old.getId())
                .doesNotContain(dueToday.getId(), noDeadline.getId(), draft.getId());
        assertThat(service.expireDueJobPostings(today).getExpiredCount()).isZero();
        assertThat(logs.findByJobPostingIdOrderByCreatedAtDesc(old.getId())).hasSize(1);
    }
    @Test void candidateCannotRemoveAndRecruiterCannotRunGlobalExpiry() throws Exception {
        User candidate = actor(RoleName.CANDIDATE), recruiter = actor(RoleName.RECRUITER);
        JobPosting p = posting("PUBLISHED", today, recruiter);
        mvc.perform(post("/api/job-postings/" + p.getId() + "/unpublish").header("Authorization", token(candidate))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Không được phép\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/job-postings/auto-expire").header("Authorization", token(recruiter)))
                .andExpect(status().isForbidden());
    }
    @Test void adminCannotUseFutureDateToExpireActiveJobs() throws Exception {
        User admin = actor(RoleName.ADMIN);
        JobPosting p = posting("PUBLISHED", today.plusDays(2), admin);
        mvc.perform(post("/api/job-postings/auto-expire").header("Authorization", token(admin))
                .param("date", today.plusDays(3).toString())).andExpect(status().isBadRequest());
        assertThat(postings.findById(p.getId()).orElseThrow().getStatus()).isEqualTo("PUBLISHED");
    }
    @Test void expiredPostingCanAlsoBeRemovedFromPublicDetail() throws Exception {
        User recruiter = actor(RoleName.RECRUITER);
        JobPosting p = posting("EXPIRED", today.minusDays(1), recruiter);
        mvc.perform(post("/api/job-postings/" + p.getId() + "/unpublish").header("Authorization", token(recruiter))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Dừng chiến dịch\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/public/job-postings/" + p.getId())).andExpect(status().isNotFound());
    }
}
