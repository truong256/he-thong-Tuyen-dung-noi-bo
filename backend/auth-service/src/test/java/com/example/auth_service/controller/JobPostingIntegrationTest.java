package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.JobPosting;
import com.example.auth_service.dto.JobPostingRequest;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobPostingRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
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

import java.time.LocalDate;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class JobPostingIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private DepartmentRepository departments;
    @Autowired private JobTitleRepository jobTitles;
    @Autowired private RecruitmentRequisitionRepository requisitions;
    @Autowired private JobPostingRepository jobPostings;

    private User recruiter;
    private User candidate;
    private Department itDept;
    private JobTitle devJob;
    private RecruitmentRequisition approvedReq;
    private RecruitmentRequisition draftReq;

    @BeforeEach
    void setUp() {
        recruiter = createUser("recruiter-s309", RoleName.RECRUITER);
        candidate = createUser("candidate-s309", RoleName.CANDIDATE);

        itDept = new Department();
        itDept.setName("Phòng Kỹ thuật S3-09");
        itDept.setCode("TECH-S309");
        itDept.setActive(true);
        itDept = departments.saveAndFlush(itDept);

        devJob = new JobTitle();
        devJob.setTitle("Backend Engineer S3-09");
        devJob.setCode("BE-S309");
        devJob.setMinSalary(15_000_000L);
        devJob.setMaxSalary(30_000_000L);
        devJob.setDepartment(itDept);
        devJob.setActive(true);
        devJob = jobTitles.saveAndFlush(devJob);

        approvedReq = new RecruitmentRequisition();
        approvedReq.setRequisitionCode("REQ-S309-APP");
        approvedReq.setTitle("Tuyển Backend Developer Java");
        approvedReq.setDepartmentId(itDept.getId());
        approvedReq.setJobTitleId(devJob.getId());
        approvedReq.setQuantity(2);
        approvedReq.setRecruitmentType("NEW");
        approvedReq.setSalaryMin(18_000_000L);
        approvedReq.setSalaryMax(32_000_000L);
        approvedReq.setCurrency("VND");
        approvedReq.setJobDescription("Phát triển các API backend và cơ sở dữ liệu");
        approvedReq.setCandidateRequirements("Kinh nghiệm Java Spring Boot 2 năm trở lên");
        approvedReq.setBenefits("Lương tháng 13, BHXH đầy đủ, teambuilding hàng năm");
        approvedReq.setWorkLocation("Hà Nội");
        approvedReq.setWorkingModel("HYBRID");
        approvedReq.setStatus("APPROVED");
        approvedReq.setNeededDate(LocalDate.now().plusMonths(1));
        approvedReq.setCreatedByUserId(recruiter.getId());
        approvedReq = requisitions.saveAndFlush(approvedReq);

        draftReq = new RecruitmentRequisition();
        draftReq.setRequisitionCode("REQ-S309-DRF");
        draftReq.setTitle("Tuyển QA Tester");
        draftReq.setDepartmentId(itDept.getId());
        draftReq.setJobTitleId(devJob.getId());
        draftReq.setStatus("DRAFT");
        draftReq.setCreatedByUserId(recruiter.getId());
        draftReq = requisitions.saveAndFlush(draftReq);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("API tin tuyển dụng trả 401 khi chưa đăng nhập")
    void unauthenticated_returns401() throws Exception {
        mvc.perform(get("/api/job-postings/template?requisitionId=" + approvedReq.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CANDIDATE không có quyền quản lý tin tuyển dụng (trả 403)")
    void candidate_forbidden_returns403() throws Exception {
        mvc.perform(get("/api/job-postings/template?requisitionId=" + approvedReq.getId())
                        .header("Authorization", token(candidate)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[AC-1] RECRUITER lấy template kế thừa từ yêu cầu APPROVED thành công (200)")
    void getTemplate_approvedRequisition_success200() throws Exception {
        mvc.perform(get("/api/job-postings/template?requisitionId=" + approvedReq.getId())
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requisitionId").value(approvedReq.getId()))
                .andExpect(jsonPath("$.requisitionCode").value("REQ-S309-APP"))
                .andExpect(jsonPath("$.title").value("Tuyển Backend Developer Java"))
                .andExpect(jsonPath("$.jobDescription").value("Phát triển các API backend và cơ sở dữ liệu"))
                .andExpect(jsonPath("$.candidateRequirements").value("Kinh nghiệm Java Spring Boot 2 năm trở lên"))
                .andExpect(jsonPath("$.benefits").value("Lương tháng 13, BHXH đầy đủ, teambuilding hàng năm"))
                .andExpect(jsonPath("$.workLocation").value("Hà Nội"))
                .andExpect(jsonPath("$.workingModel").value("HYBRID"))
                .andExpect(jsonPath("$.salaryMin").value(18_000_000))
                .andExpect(jsonPath("$.salaryMax").value(32_000_000))
                .andExpect(jsonPath("$.currency").value("VND"))
                .andExpect(jsonPath("$.requisitionStatus").value("APPROVED"));
    }

    @Test
    @DisplayName("[AC-3] Chặn lấy template từ yêu cầu DRAFT (trả 400 Bad Request)")
    void getTemplate_draftRequisition_returns400() throws Exception {
        mvc.perform(get("/api/job-postings/template?requisitionId=" + draftReq.getId())
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Chỉ có thể tạo tin tuyển dụng từ yêu cầu đã được phê duyệt.")));
    }

    @Test
    @DisplayName("[AC-2] Tạo tin tuyển dụng nháp (DRAFT) từ yêu cầu đã duyệt thành công (201)")
    void create_approvedRequisition_draft_success201() throws Exception {
        JobPostingRequest request = new JobPostingRequest(
                approvedReq.getId(),
                "Tuyển Backend Developer Java (Tin nháp)",
                "Mô tả công việc chi tiết cho ứng viên",
                "Yêu cầu chuyên môn và kỹ năng mềm",
                "Chế độ đãi ngộ cạnh tranh",
                "Hà Nội",
                null,
                "HYBRID",
                LocalDate.now().plusDays(20),
                true,
                "RANGE",
                18_000_000L,
                32_000_000L,
                "VND",
                "DRAFT"
        );

        mvc.perform(post("/api/job-postings")
                        .header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.postingCode").value(startsWith("JP-")))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.title").value("Tuyển Backend Developer Java (Tin nháp)"))
                .andExpect(jsonPath("$.requisitionCode").value("REQ-S309-APP"))
                .andExpect(jsonPath("$.showSalary").value(true));
    }

    @Test
    @DisplayName("[AC-3] Chặn tạo tin tuyển dụng từ yêu cầu DRAFT (trả 400 Bad Request, không tạo bản ghi)")
    void create_draftRequisition_returns400() throws Exception {
        JobPostingRequest request = new JobPostingRequest(
                draftReq.getId(),
                "Tin tuyển dụng không hợp lệ",
                "Mô tả",
                "Yêu cầu",
                "Quyền lợi",
                "Hà Nội",
                null,
                "ONSITE",
                LocalDate.now().plusDays(15),
                true,
                "RANGE",
                10_000_000L,
                20_000_000L,
                "VND",
                "DRAFT"
        );

        long countBefore = jobPostings.count();

        mvc.perform(post("/api/job-postings")
                        .header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Chỉ có thể tạo tin tuyển dụng từ yêu cầu đã được phê duyệt.")));

        long countAfter = jobPostings.count();
        org.junit.jupiter.api.Assertions.assertEquals(countBefore, countAfter);
    }

    @Test
    @DisplayName("[AC-Validation] Hạn nhận hồ sơ trong quá khứ trả 400 Bad Request")
    void create_pastDeadline_returns400() throws Exception {
        JobPostingRequest request = new JobPostingRequest(
                approvedReq.getId(),
                "Tin tuyển dụng quá hạn",
                "Mô tả",
                "Yêu cầu",
                "Quyền lợi",
                "Hà Nội",
                null,
                "ONSITE",
                LocalDate.now().minusDays(2), // Quá khứ
                true,
                "RANGE",
                10_000_000L,
                20_000_000L,
                "VND",
                "DRAFT"
        );

        mvc.perform(post("/api/job-postings")
                        .header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Hạn nhận hồ sơ không thể trong quá khứ.")));
    }

    @Test
    @DisplayName("[AC-2] Chỉnh sửa tin tuyển dụng và nộp duyệt PENDING_APPROVAL thành công (200)")
    void update_and_submit_for_approval_success200() throws Exception {
        // 1. Tạo tin nháp trước
        JobPosting draft = JobPosting.builder()
                .postingCode("JP-S309-001")
                .requisitionId(approvedReq.getId())
                .title("Tin nháp ban đầu")
                .jobDescription("Mô tả cũ")
                .candidateRequirements("Yêu cầu cũ")
                .benefits("Quyền lợi cũ")
                .workLocation("Hà Nội")
                .workingModel("ONSITE")
                .applicationDeadline(LocalDate.now().plusDays(10))
                .showSalary(true)
                .salaryType("RANGE")
                .salaryMin(15_000_000L)
                .salaryMax(25_000_000L)
                .currency("VND")
                .status("DRAFT")
                .createdByUserId(recruiter.getId())
                .build();
        draft = jobPostings.saveAndFlush(draft);

        // 2. Cập nhật và gửi duyệt
        JobPostingRequest updateRequest = new JobPostingRequest(
                approvedReq.getId(),
                "Tin tuyển dụng hoàn chỉnh đã chỉnh sửa",
                "Mô tả công việc chi tiết mới",
                "Yêu cầu ứng viên cập nhật",
                "Gói đãi ngộ đầy đủ mới",
                "Đà Nẵng",
                null,
                "REMOTE",
                LocalDate.now().plusDays(25),
                false, // Ẩn lương
                "NEGOTIABLE",
                null,
                null,
                "VND",
                "PENDING_APPROVAL"
        );

        mvc.perform(put("/api/job-postings/" + draft.getId())
                        .header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(draft.getId()))
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.title").value("Tin tuyển dụng hoàn chỉnh đã chỉnh sửa"))
                .andExpect(jsonPath("$.workLocation").value("Đà Nẵng"))
                .andExpect(jsonPath("$.workingModel").value("REMOTE"))
                .andExpect(jsonPath("$.showSalary").value(false))
                .andExpect(jsonPath("$.salaryType").value("NEGOTIABLE"));

        // 3. Lấy lại chi tiết kiểm tra không mất dữ liệu
        mvc.perform(get("/api/job-postings/" + draft.getId())
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.title").value("Tin tuyển dụng hoàn chỉnh đã chỉnh sửa"));
    }

    @Test
    @DisplayName("[AC-2] Lấy tin theo requisitionId để tải lại bản nháp")
    void getByRequisitionId_success200() throws Exception {
        JobPosting draft = JobPosting.builder()
                .postingCode("JP-S309-002")
                .requisitionId(approvedReq.getId())
                .title("Tin nháp gắn requisition")
                .jobDescription("Mô tả")
                .candidateRequirements("Yêu cầu")
                .workLocation("Hà Nội")
                .workingModel("ONSITE")
                .applicationDeadline(LocalDate.now().plusDays(10))
                .status("DRAFT")
                .createdByUserId(recruiter.getId())
                .build();
        draft = jobPostings.saveAndFlush(draft);

        mvc.perform(get("/api/job-postings/by-requisition/" + approvedReq.getId())
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(draft.getId()))
                .andExpect(jsonPath("$.title").value("Tin nháp gắn requisition"));
    }

    private User createUser(String emailPrefix, RoleName roleName) {
        User user = new User(emailPrefix + "@test.local", "Password123@");
        user.setFullName("User " + emailPrefix);
        user.setRoles(Set.of(roles.findByName(roleName).orElseThrow()));
        return users.saveAndFlush(user);
    }

    private String token(User user) {
        return "Bearer " + jwt.generateAccessToken(user.getEmail(), Set.of(user.getRole()), user.getTokenVersion());
    }
}
