package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.entity.RequisitionAssignment;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.RequisitionAssignmentRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RequisitionListFiltersIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JwtUtils jwt;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired RecruitmentRequisitionRepository requisitions;
    @Autowired RequisitionAssignmentRepository assignments;
    User hr, owner, otherOwner, recruiter, support, candidate;
    RecruitmentRequisition before, first, last, after;

    @BeforeEach
    void setup() {
        hr = user("list140-hr@example.com", RoleName.HR_MANAGER);
        owner = user("list140-owner@example.com", RoleName.HIRING_MANAGER);
        otherOwner = user("list140-other@example.com", RoleName.HIRING_MANAGER);
        recruiter = user("list140-rec@example.com", RoleName.RECRUITER);
        support = user("list140-support@example.com", RoleName.RECRUITER);
        candidate = user("list140-candidate@example.com", RoleName.CANDIDATE);
        // 15 Oct in Vietnam is [14 Oct 17:00Z, 15 Oct 17:00Z).
        before = row("140-BEFORE", "Cũ", "2026-10-14T16:59:59Z", owner);
        first = row("140-FIRST", "Java 100%_ cần tuyển", "2026-10-14T17:00:00Z", owner);
        last = row("140-LAST", "Java Backend", "2026-10-15T16:59:59Z", otherOwner);
        after = row("140-AFTER", "Mới", "2026-10-15T17:00:00Z", owner);
        assign(first, recruiter, true, RoleName.RECRUITER);
        assign(first, support, false, RoleName.RECRUITER);
        assign(last, recruiter, true, RoleName.RECRUITER);
        assign(after, recruiter, false, RoleName.HIRING_MANAGER);
    }

    User user(String email, RoleName roleName) {
        Role role = roles.findByName(roleName).orElseGet(() -> roles.save(new Role(roleName, roleName.name())));
        User user = new User(email, "hashed", roleName.name());
        user.setFullName(email);
        user.setStatus("ACTIVE");
        user.setRoles(Set.of(role));
        return users.save(user);
    }

    RecruitmentRequisition row(String code, String title, String time, User creator) {
        RecruitmentRequisition row = new RecruitmentRequisition();
        row.setRequisitionCode(code);
        row.setTitle(title);
        row.setStatus("APPROVED");
        row.setCreatedByUserId(creator.getId());
        row.setCreatedAt(Instant.parse(time));
        return requisitions.save(row);
    }

    void assign(RecruitmentRequisition row, User person, boolean primary, RoleName role) {
        RequisitionAssignment assignment = new RequisitionAssignment();
        assignment.setRequisitionId(row.getId());
        assignment.setUserId(person.getId());
        assignment.setRole(role);
        assignment.setPrimary(primary);
        assignments.save(assignment);
    }

    String token(User user) {
        String token = jwt.generateAccessToken(user.getEmail(),
                user.getRoles().stream().map(r -> r.getName().name()).collect(java.util.stream.Collectors.toSet()),
                user.getTokenVersion(), false);
        return "Bearer " + token;
    }

    MockHttpServletRequestBuilder request(User user) {
        return get("/api/requisitions").header("Authorization", token(user)).param("keyword", "140-");
    }

    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    @Test void vietnamDatesIncludeBothCalendarBoundaries() throws Exception {
        mvc.perform(request(hr).param("createdFrom", "2026-10-15").param("createdTo", "2026-10-15"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].requisitionCode").value("140-LAST"))
                .andExpect(jsonPath("$.content[1].requisitionCode").value("140-FIRST"));
    }

    @Test void recruiterFilterUsesOnlyRecruiterAssignmentsAndDoesNotDuplicateRows() throws Exception {
        mvc.perform(request(hr).param("recruiterId", recruiter.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(request(hr).param("recruiterId", support.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].requisitionCode").value("140-FIRST"));
    }

    @Test void combinedFiltersApplyBeforePaginationAndCount() throws Exception {
        mvc.perform(request(hr).param("recruiterId", recruiter.getId().toString())
                        .param("createdFrom", "2026-10-15").param("createdTo", "2026-10-15")
                        .param("status", "approved").param("size", "1").param("page", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2)).andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.content[0].requisitionCode").value("140-FIRST"));
    }

    @Test void filtersCannotExposeAnotherHiringManagersRowsOrCounts() throws Exception {
        mvc.perform(request(owner).param("recruiterId", recruiter.getId().toString())
                        .param("createdFrom", "2026-10-15").param("createdTo", "2026-10-15"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].requisitionCode").value("140-FIRST"));
    }

    @Test void searchAndLegacyKeywordBothWorkAndLikeWildcardsAreLiteral() throws Exception {
        mvc.perform(get("/api/requisitions").header("Authorization", token(hr))
                        .param("keyword", "140-LAST"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(request(hr).param("search", "100%_"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test void invalidDatesAndIdsReturnBadRequest() throws Exception {
        mvc.perform(request(hr).param("createdFrom", "2026-10-16").param("createdTo", "2026-10-15"))
                .andExpect(status().isBadRequest());
        mvc.perform(request(hr).param("createdFrom", "not-a-date")).andExpect(status().isBadRequest());
        mvc.perform(request(hr).param("recruiterId", "-1")).andExpect(status().isBadRequest());
    }

    @Test void unknownRecruiterAndDepartmentReturnEmptyResults() throws Exception {
        mvc.perform(request(hr).param("recruiterId", "9223372036854775807"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(request(hr).param("departmentId", "9223372036854775807"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").isEmpty());
    }

    @Test void openEndedDateFiltersWork() throws Exception {
        mvc.perform(request(hr).param("createdFrom", "2026-10-16"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(request(hr).param("createdTo", "2026-10-14"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test void equalCreationTimesUseIdAsStableTieBreaker() throws Exception {
        first.setCreatedAt(last.getCreatedAt());
        requisitions.saveAndFlush(first);
        mvc.perform(request(hr).param("recruiterId", recruiter.getId().toString()).param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(last.getId()));
        mvc.perform(request(hr).param("recruiterId", recruiter.getId().toString()).param("size", "1").param("page", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(first.getId()));
    }

    @Test void authenticationAndExistingPermissionsAreStillRequired() throws Exception {
        mvc.perform(get("/api/requisitions")).andExpect(status().isUnauthorized());
        mvc.perform(request(candidate)).andExpect(status().isForbidden());
    }
}
