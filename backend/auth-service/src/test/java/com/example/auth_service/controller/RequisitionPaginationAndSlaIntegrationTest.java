package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.entity.RequisitionAssignment;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RequisitionPaginationAndSlaIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private DepartmentRepository departments;
    @Autowired private JobTitleRepository jobTitles;
    @Autowired private RecruitmentRequisitionRepository requisitions;
    @Autowired private RequisitionAssignmentRepository assignments;
    @Autowired private CandidateApplicationRepository candidateApplications;

    private User hrManager;
    private User recruiter;
    private User otherRecruiter;
    private Department deptIT;
    private Department deptBOD;
    private JobTitle jobDev;

    private String hrToken;
    private String recruiterToken;

    @BeforeEach
    void setUp() {
        requisitions.deleteAll();

        hrManager = createUser("hrm-s308@test.com", RoleName.HR_MANAGER);
        recruiter = createUser("rec-s308@test.com", RoleName.RECRUITER);
        otherRecruiter = createUser("other-rec-s308@test.com", RoleName.RECRUITER);

        hrToken = token(hrManager);
        recruiterToken = token(recruiter);

        deptIT = departments.save(new Department(null, "Công nghệ thông tin", "IT-DEPT", "Mô tả", null, hrManager.getId(), true, Instant.now()));
        deptBOD = departments.save(new Department(null, "Ban Giám đốc", "BOD-DEPT", "Mô tả", null, hrManager.getId(), true, Instant.now()));

        jobDev = new JobTitle();
        jobDev.setTitle("Lập trình viên");
        jobDev.setCode("DEV");
        jobDev.setDepartment(deptIT);
        jobDev.setActive(true);
        jobDev = jobTitles.save(jobDev);
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

    private RecruitmentRequisition createReq(String code, String status, Department d, LocalDate neededDate, Instant createdAt) {
        RecruitmentRequisition r = new RecruitmentRequisition();
        r.setRequisitionCode(code);
        r.setTitle("Tuyển dụng " + code);
        r.setStatus(status);
        r.setDepartmentId(d.getId());
        r.setJobTitleId(jobDev.getId());
        r.setQuantity(2);
        r.setNeededDate(neededDate);
        r.setTargetDate(neededDate);
        r.setCreatedByUserId(hrManager.getId());
        r.setCreatedAt(createdAt != null ? createdAt : Instant.now());
        r.setUpdatedAt(Instant.now());
        if ("APPROVED".equalsIgnoreCase(status)) {
            r.setApprovedAt(Instant.now());
        }
        return requisitions.save(r);
    }

    private void assignRecruiter(Long reqId, Long userId, boolean isPrimary) {
        RequisitionAssignment a = new RequisitionAssignment();
        a.setRequisitionId(reqId);
        a.setUserId(userId);
        a.setRole(RoleName.RECRUITER);
        a.setPrimary(isPrimary);
        a.setAssignedAt(Instant.now());
        assignments.save(a);
    }

    @Test
    @DisplayName("TC06: Danh sách 56 yêu cầu, size 10 -> Có đúng 6 trang và 56 tổng bản ghi")
    void tc06_Pagination_56Items_PageSize10_Has6Pages() throws Exception {
        Instant baseTime = Instant.now().minusSeconds(3600 * 100);
        for (int i = 1; i <= 56; i++) {
            createReq("REQ-PAGE-" + String.format("%03d", i), "APPROVED", deptIT, LocalDate.now().plusDays(15), baseTime.plusSeconds(i * 60));
        }

        String res = mvc.perform(get("/api/requisitions")
                        .header("Authorization", hrToken)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(56))
                .andExpect(jsonPath("$.totalPages").value(6))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.content.length()").value(10))
                .andReturn().getResponse().getContentAsString();

        JsonNode json = mapper.readTree(res);
        assertThat(json.get("totalPages").asInt()).isEqualTo(6);
        assertThat(json.get("totalElements").asInt()).isEqualTo(56);
    }

    @Test
    @DisplayName("TC07: Chuyển trang 1 (page=0) sang 2 (page=1) dữ liệu đúng thứ tự, không trùng lặp")
    void tc07_Pagination_PageTransition_NoDuplicates() throws Exception {
        Instant baseTime = Instant.now().minusSeconds(3600 * 10);
        for (int i = 1; i <= 25; i++) {
            createReq("REQ-ORDER-" + String.format("%02d", i), "OPEN", deptIT, LocalDate.now().plusDays(10), baseTime.plusSeconds(i * 100));
        }

        // Lấy trang 1 (page 0)
        String resPage0 = mvc.perform(get("/api/requisitions")
                        .header("Authorization", hrToken)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        // Lấy trang 2 (page 1)
        String resPage1 = mvc.perform(get("/api/requisitions")
                        .header("Authorization", hrToken)
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode page0 = mapper.readTree(resPage0).get("content");
        JsonNode page1 = mapper.readTree(resPage1).get("content");

        List<String> page0Codes = new ArrayList<>();
        page0.forEach(node -> page0Codes.add(node.get("requisitionCode").asText()));

        List<String> page1Codes = new ArrayList<>();
        page1.forEach(node -> page1Codes.add(node.get("requisitionCode").asText()));

        assertThat(page0Codes).hasSize(10);
        assertThat(page1Codes).hasSize(10);
        // Không trùng lặp bất kỳ mã nào giữa 2 trang
        assertThat(page0Codes).doesNotContainAnyElementsOf(page1Codes);
    }

    @Test
    @DisplayName("TC08 & TC09: Lọc kết hợp nhiều điều kiện (Status, Department, Recruiter, Date Range, SLA)")
    void tc08_tc09_MultiConditionFiltering() throws Exception {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

        // Yêu cầu 1: Thỏa mãn TẤT CẢ điều kiện lọc: Status APPROVED, Dept IT, ngày tạo hôm nay, hạn quá hạn (yesterday)
        RecruitmentRequisition req1 = createReq("REQ-MATCH-01", "APPROVED", deptIT, today.minusDays(3), Instant.now());
        assignRecruiter(req1.getId(), recruiter.getId(), true);

        // Yêu cầu 2: Sai status (DRAFT)
        createReq("REQ-WRONG-STATUS", "DRAFT", deptIT, today.minusDays(3), Instant.now());

        // Yêu cầu 3: Sai phòng ban (BOD)
        RecruitmentRequisition req3 = createReq("REQ-WRONG-DEPT", "APPROVED", deptBOD, today.minusDays(3), Instant.now());
        assignRecruiter(req3.getId(), recruiter.getId(), true);

        // Yêu cầu 4: Sai recruiter (otherRecruiter)
        RecruitmentRequisition req4 = createReq("REQ-WRONG-REC", "APPROVED", deptIT, today.minusDays(3), Instant.now());
        assignRecruiter(req4.getId(), otherRecruiter.getId(), true);

        // Yêu cầu 5: Sai SLA (safe, 15 ngày nữa)
        RecruitmentRequisition req5 = createReq("REQ-WRONG-SLA", "APPROVED", deptIT, today.plusDays(15), Instant.now());
        assignRecruiter(req5.getId(), recruiter.getId(), true);

        // Thực hiện lọc đa điều kiện đồng thời:
        // status = APPROVED, departmentId = deptIT.getId(), recruiterId = recruiter.getId(), sla = OVERDUE
        mvc.perform(get("/api/requisitions")
                        .header("Authorization", hrToken)
                        .param("status", "APPROVED")
                        .param("departmentId", String.valueOf(deptIT.getId()))
                        .param("recruiterId", String.valueOf(recruiter.getId()))
                        .param("sla", "OVERDUE")
                        .param("fromDate", today.minusDays(1).toString())
                        .param("toDate", today.plusDays(1).toString())
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].requisitionCode").value("REQ-MATCH-01"));
    }

    @Test
    @DisplayName("Bộ lọc khoảng thời gian: fromDate > toDate báo lỗi 400 Bad Request")
    void dateRange_FromDateAfterToDate_ThrowsBadRequest() throws Exception {
        mvc.perform(get("/api/requisitions")
                        .header("Authorization", hrToken)
                        .param("fromDate", "2026-10-25")
                        .param("toDate", "2026-10-20"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Ngày bắt đầu không được lớn hơn ngày kết thúc."));
    }

    @Test
    @DisplayName("TC12: Recruiter truy cập API không xem được yêu cầu ngoài quyền/chưa được phân công")
    void tc12_RecruiterScopedAccess_CannotViewUnassignedRequisitions() throws Exception {
        // Yêu cầu 1: Phân công cho recruiter
        RecruitmentRequisition reqAssigned = createReq("REQ-ASSIGNED", "APPROVED", deptIT, LocalDate.now().plusDays(5), Instant.now());
        assignRecruiter(reqAssigned.getId(), recruiter.getId(), true);

        // Yêu cầu 2: Không phân công cho recruiter (thuộc otherRecruiter)
        RecruitmentRequisition reqOther = createReq("REQ-UNASSIGNED", "APPROVED", deptIT, LocalDate.now().plusDays(5), Instant.now());
        assignRecruiter(reqOther.getId(), otherRecruiter.getId(), true);

        // Recruiter gọi API: chỉ thấy REQ-ASSIGNED, không thấy REQ-UNASSIGNED
        mvc.perform(get("/api/requisitions")
                        .header("Authorization", recruiterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].requisitionCode").value("REQ-ASSIGNED"));
    }

    @Test
    @DisplayName("TC13: API pipeline-summary (SCRUM-135 / S3-07) đếm đúng số lượng ứng viên đang trong pipeline và trạng thái kết thúc")
    void tc13_PipelineSummary_ActiveAndTerminalCandidates() throws Exception {
        RecruitmentRequisition req = createReq("REQ-PIPE-001", "APPROVED", deptIT, LocalDate.now().plusDays(10), Instant.now());

        // Tạo ứng viên 1: APPLIED (Active)
        com.example.auth_service.entity.CandidateApplication app1 = new com.example.auth_service.entity.CandidateApplication();
        app1.setRequisitionId(req.getId());
        app1.setCandidateUserId(101L);
        app1.setFullName("Nguyen Van A");
        app1.setEmail("a@test.com");
        app1.setStage("APPLIED");
        candidateApplications.save(app1);

        // Tạo ứng viên 2: INTERVIEW (Active)
        com.example.auth_service.entity.CandidateApplication app2 = new com.example.auth_service.entity.CandidateApplication();
        app2.setRequisitionId(req.getId());
        app2.setCandidateUserId(102L);
        app2.setFullName("Tran Thi B");
        app2.setEmail("b@test.com");
        app2.setStage("INTERVIEW");
        candidateApplications.save(app2);

        // Tạo ứng viên 3: REJECTED (Terminal - đã kết thúc)
        com.example.auth_service.entity.CandidateApplication app3 = new com.example.auth_service.entity.CandidateApplication();
        app3.setRequisitionId(req.getId());
        app3.setCandidateUserId(103L);
        app3.setFullName("Le Van C");
        app3.setEmail("c@test.com");
        app3.setStage("REJECTED");
        candidateApplications.save(app3);

        // Gọi API pipeline-summary: total = 3, activeCount = 2
        mvc.perform(get("/api/requisitions/" + req.getId() + "/pipeline-summary")
                        .header("Authorization", hrToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requisitionId").value(req.getId()))
                .andExpect(jsonPath("$.totalCount").value(3))
                .andExpect(jsonPath("$.activeCount").value(2))
                .andExpect(jsonPath("$.countByStage.APPLIED").value(1))
                .andExpect(jsonPath("$.countByStage.INTERVIEW").value(1))
                .andExpect(jsonPath("$.countByStage.REJECTED").value(1));
    }
}

