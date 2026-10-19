package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint3.JobPosting;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobPostingRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real JWT filter, security chain, service and repository; all test data rolls back. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PublicJobPostingIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JobPostingRepository postings;
    @Autowired DepartmentRepository departments;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired JwtUtils jwt;

    private String candidateToken;
    private Department publicDepartment;
    private JobPosting published;

    @BeforeEach
    void setUp() {
        User candidate = new User("public-access-candidate@test.local", "unused-password");
        candidate.setRoles(Set.of(roles.findByName(RoleName.CANDIDATE).orElseThrow()));
        candidate = users.saveAndFlush(candidate);
        candidateToken = "Bearer " + jwt.generateAccessToken(candidate.getEmail(),
                Set.of(candidate.getRole()), candidate.getTokenVersion());
        publicDepartment = new Department();
        publicDepartment.setName("Kỹ thuật công khai S3-10");
        publicDepartment.setCode("PUBLIC-S3-10");
        publicDepartment.setDescription("Thông tin tổ chức nội bộ không được công khai");
        publicDepartment = departments.saveAndFlush(publicDepartment);
        published = posting("PUBLISHED", LocalDate.now().plusDays(7), publicDepartment.getId());
    }

    @Test
    void anonymousCanReadListAndDetailWithoutInternalFieldsOrHiddenSalary() throws Exception {
        mvc.perform(get("/api/public/job-postings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(published.getId()))
                .andExpect(jsonPath("$.content[0].salaryMin").value(nullValue()))
                .andExpect(jsonPath("$.content[0].approvalNotes").doesNotExist())
                .andExpect(jsonPath("$.content[0].createdByUserId").doesNotExist());
        mvc.perform(get("/api/public/job-postings/" + published.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobCode").value(published.getJobCode()))
                .andExpect(jsonPath("$.salaryDisplay").value("Thỏa thuận"))
                .andExpect(jsonPath("$.salaryMax").value(nullValue()))
                .andExpect(jsonPath("$.requisitionId").doesNotExist())
                .andExpect(jsonPath("$.auditLogs").doesNotExist())
                .andExpect(jsonPath("$.publishedByUserId").doesNotExist())
                .andExpect(jsonPath("$.approvalNotes").doesNotExist());
    }

    @Test
    void candidateCanReadSameListAndDetailUsingRealJwt() throws Exception {
        mvc.perform(get("/api/public/job-postings").header("Authorization", candidateToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/public/job-postings/" + published.getId()).header("Authorization", candidateToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(published.getId()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "UNPUBLISHED", "CLOSED"})
    void nonPublicStatusesAreExcludedFromListAndDetail(String status) throws Exception {
        JobPosting hidden = posting(status, LocalDate.now().plusDays(7), publicDepartment.getId());
        mvc.perform(get("/api/public/job-postings"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(published.getId()));
        mvc.perform(get("/api/public/job-postings/" + hidden.getId()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/public/job-postings/" + hidden.getId()).header("Authorization", candidateToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void expiredPostingsAreHiddenButTodayAndNoDeadlineAreOpen() throws Exception {
        JobPosting expired = posting("PUBLISHED", LocalDate.now().minusDays(1), publicDepartment.getId());
        posting("PUBLISHED", LocalDate.now(), publicDepartment.getId());
        posting("PUBLISHED", null, publicDepartment.getId());
        mvc.perform(get("/api/public/job-postings").param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(3));
        mvc.perform(get("/api/public/job-postings/" + expired.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicDepartmentOptionsOnlyExposeIdAndNameForVisiblePostings() throws Exception {
        Department internal = new Department();
        internal.setName("Phòng nội bộ S3-10"); internal.setCode("PRIVATE-S3-10");
        internal = departments.saveAndFlush(internal);
        posting("DRAFT", null, internal.getId());
        posting("PUBLISHED", LocalDate.now().minusDays(1), internal.getId());
        posting("PUBLISHED", null, publicDepartment.getId());
        mvc.perform(get("/api/public/job-postings/departments"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(publicDepartment.getId()))
                .andExpect(jsonPath("$[0].name").value(publicDepartment.getName()))
                .andExpect(jsonPath("$[0].description").doesNotExist())
                .andExpect(jsonPath("$[0].managerUserId").doesNotExist())
                .andExpect(jsonPath("$[0].code").doesNotExist());
        mvc.perform(get("/api/departments").header("Authorization", candidateToken))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {"approve", "publish", "approve-and-publish", "reject", "unpublish", "submit-approval"})
    void candidateCannotMutatePostings(String action) throws Exception {
        mvc.perform(post("/api/job-postings/" + published.getId() + "/" + action)
                        .header("Authorization", candidateToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"test\",\"reason\":\"test\"}"))
                .andExpect(status().isForbidden());
        org.junit.jupiter.api.Assertions.assertEquals("PUBLISHED", postings.findById(published.getId()).orElseThrow().getStatus());
    }

    @Test
    void candidateCannotReadOrWriteManagementApi() throws Exception {
        mvc.perform(get("/api/job-postings").header("Authorization", candidateToken)).andExpect(status().isForbidden());
        mvc.perform(get("/api/job-postings/" + published.getId()).header("Authorization", candidateToken)).andExpect(status().isForbidden());
        mvc.perform(get("/api/job-postings/" + published.getId() + "/audit-logs").header("Authorization", candidateToken)).andExpect(status().isForbidden());
        mvc.perform(post("/api/job-postings").header("Authorization", candidateToken).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/job-postings/" + published.getId()).header("Authorization", candidateToken).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/public/job-postings").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void existingPublicFiltersStillWork() throws Exception {
        mvc.perform(get("/api/public/job-postings").param("departmentId", publicDepartment.getId().toString())
                        .param("workingModel", "REMOTE").param("keyword", "Java"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/public/job-postings").param("workingModel", "ONSITE"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    @DisplayName("SCRUM-163: GET /api/public/job-postings/locations trả danh sách địa điểm của các tin đang hiệu lực, không yêu cầu đăng nhập")
    void publicLocationsEndpointReturnsDistinctWorkLocationsOfOpenPostings() throws Exception {
        JobPosting hanoi = posting("PUBLISHED", LocalDate.now().plusDays(5), publicDepartment.getId());
        hanoi.setWorkLocation("Hà Nội - Trụ sở chính");
        postings.saveAndFlush(hanoi);

        JobPosting hcm = posting("PUBLISHED", LocalDate.now().plusDays(10), publicDepartment.getId());
        hcm.setWorkLocation("TP. Hồ Chí Minh - Chi nhánh");
        postings.saveAndFlush(hcm);

        // Tin DRAFT không được xuất hiện trong danh sách địa điểm công khai
        JobPosting draftDanang = posting("DRAFT", null, publicDepartment.getId());
        draftDanang.setWorkLocation("Đà Nẵng - R&D");
        postings.saveAndFlush(draftDanang);

        // Tin hết hạn không được xuất hiện
        JobPosting expiredHue = posting("PUBLISHED", LocalDate.now().minusDays(2), publicDepartment.getId());
        expiredHue.setWorkLocation("Huế - Chi nhánh");
        postings.saveAndFlush(expiredHue);

        mvc.perform(get("/api/public/job-postings/locations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasItem("Hà Nội - Trụ sở chính")))
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasItem("TP. Hồ Chí Minh - Chi nhánh")))
                .andExpect(jsonPath("$", org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("Đà Nẵng - R&D"))))
                .andExpect(jsonPath("$", org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("Huế - Chi nhánh"))));
    }

    @Test
    @DisplayName("SCRUM-163: Bộ lọc kết hợp phòng ban, địa điểm, hình thức làm việc và từ khóa hoạt động chính xác")
    void publicListFiltersByWorkLocationAndCombinesWithOtherFilters() throws Exception {
        JobPosting p1 = posting("PUBLISHED", LocalDate.now().plusDays(5), publicDepartment.getId());
        p1.setTitle("Lập trình viên Frontend React");
        p1.setWorkLocation("Hà Nội - Trụ sở chính");
        p1.setWorkingModel("HYBRID");
        p1.setJobDescription("Xây dựng giao diện ứng dụng web hiện đại");
        postings.saveAndFlush(p1);

        // 1. Lọc theo địa điểm
        mvc.perform(get("/api/public/job-postings").param("workLocation", "Hà Nội"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].workLocation").value("Hà Nội - Trụ sở chính"));

        // 2. Lọc theo địa điểm không khớp
        mvc.perform(get("/api/public/job-postings").param("workLocation", "Cần Thơ"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        // 3. Kết hợp cả 4 tiêu chí: phòng ban + địa điểm + hình thức làm việc + từ khóa trong mô tả
        mvc.perform(get("/api/public/job-postings")
                        .param("departmentId", publicDepartment.getId().toString())
                        .param("workLocation", "Hà Nội")
                        .param("workingModel", "HYBRID")
                        .param("keyword", "giao diện"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Lập trình viên Frontend React"));
    }

    private JobPosting posting(String status, LocalDate deadline, Long departmentId) {
        JobPosting posting = new JobPosting();
        posting.setTitle("Kỹ sư Java S3-10");
        posting.setJobCode("JP-S3-10-" + status + "-" + postings.count());
        posting.setDepartmentId(departmentId); posting.setWorkingModel("REMOTE");
        posting.setStatus(status); posting.setApplicationDeadline(deadline);
        posting.setPublishedAt(Instant.now()); posting.setSalaryVisible(false);
        posting.setSalaryMin(20_000_000L); posting.setSalaryMax(30_000_000L);
        posting.setApprovalNotes("Ghi chú phê duyệt nội bộ");
        return postings.saveAndFlush(posting);
    }
}
