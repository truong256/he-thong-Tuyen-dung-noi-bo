package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.BudgetAuditLog;
import com.example.auth_service.domain.sprint3.HeadcountBudget;
import com.example.auth_service.dto.ApprovalActionRequest;
import com.example.auth_service.dto.budget.BudgetDashboardStats;
import com.example.auth_service.dto.budget.BudgetSummaryResponse;
import com.example.auth_service.dto.budget.OverrideApprovalRequest;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.JwtUtils;
import com.example.auth_service.service.HeadcountBudgetService;
import com.example.auth_service.service.RequisitionApprovalService;
import com.example.auth_service.service.RequisitionApprovalWorkflowService;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Bộ kiểm thử toàn diện nghiệp vụ Vượt Hạn Mức Ngân sách Headcount (S3-04 / SCRUM-101)
 * Bao gồm 15 Test Cases bắt buộc:
 * - Nhóm A: Vượt chỉ tiêu Headcount (TC01 - TC04)
 * - Nhóm B: Vượt ngân sách tiền lương (TC05 - TC08)
 * - Nhóm C: Tích hợp luồng phê duyệt & Race condition (TC09 - TC12)
 * - Nhóm D: Bảo mật và đồng bộ dữ liệu (TC13 - TC15)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HeadcountBudgetOverrunIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private DepartmentRepository departments;
    @Autowired private JobTitleRepository jobTitles;
    @Autowired private RecruitmentRequisitionRepository requisitions;
    @Autowired private HeadcountBudgetRepository budgetRepository;
    @Autowired private BudgetAuditLogRepository auditLogRepository;
    @Autowired private RequisitionApprovalConfigurationRepository configurations;
    @Autowired private RequisitionApprovalConfigurationStepRepository configurationSteps;
    @Autowired private RequisitionApprovalSnapshotRepository snapshots;
    @Autowired private RequisitionAssignmentRepository assignments;
    @Autowired private RequisitionApprovalHistoryRepository histories;
    @Autowired private HeadcountBudgetService budgetService;
    @Autowired private RequisitionApprovalWorkflowService workflowService;
    @Autowired private RequisitionApprovalService approvalService;
    @Autowired private PlatformTransactionManager transactionManager;

    private User hrManager;
    private User hiringManager;
    private User approverUser;
    private User adminUser;
    private Department testDept;
    private JobTitle testJob;
    private final int testYear = 2026;

    private final List<User> createdUsers = new ArrayList<>();

    @BeforeEach
    void setUp() {
        hrManager = createUser("hr_overrun_" + System.nanoTime() + "@test.com", RoleName.HR_MANAGER);
        hiringManager = createUser("hm_overrun_" + System.nanoTime() + "@test.com", RoleName.HIRING_MANAGER);
        approverUser = createUser("appr_overrun_" + System.nanoTime() + "@test.com", RoleName.APPROVER);
        adminUser = createUser("admin_overrun_" + System.nanoTime() + "@test.com", RoleName.ADMIN);

        String suffix = UUID.randomUUID().toString().substring(0, 6);
        testDept = new Department(null, "Phòng Test " + suffix, "D-" + suffix,
                "Phòng ban độc lập phục vụ kiểm thử ngân sách", null, hiringManager.getId(), true, Instant.now());
        testDept = departments.save(testDept);

        testJob = new JobTitle();
        testJob.setTitle("Vị Trí Test " + suffix);
        testJob.setCode("J-" + suffix);
        testJob.setDepartment(testDept);
        testJob.setActive(true);
        testJob.setMinSalary(5_000_000L);
        testJob.setMaxSalary(100_000_000L);
        testJob = jobTitles.save(testJob);

        // Tạo cấu hình phê duyệt mặc định cho phòng ban test
        RequisitionApprovalConfiguration config = new RequisitionApprovalConfiguration();
        config.setDepartmentId(testDept.getId());
        config.setVersion(1);
        config.setActive(true);
        config.setCreatedByUserId(hrManager.getId());
        config.setCreatedAt(Instant.now());
        config = configurations.save(config);

        RequisitionApprovalConfigurationStep step1 = new RequisitionApprovalConfigurationStep();
        step1.setConfigurationId(config.getId());
        step1.setStepOrder(1);
        step1.setMinimumSalary(0L);
        step1.setApproverUserId(hiringManager.getId());
        configurationSteps.save(step1);

        RequisitionApprovalConfigurationStep step2 = new RequisitionApprovalConfigurationStep();
        step2.setConfigurationId(config.getId());
        step2.setStepOrder(2);
        step2.setMinimumSalary(20_000_000L);
        step2.setApproverUserId(approverUser.getId());
        configurationSteps.save(step2);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TransactionTemplate tt = new TransactionTemplate(transactionManager);
        tt.executeWithoutResult(status -> {
            auditLogRepository.deleteAll();
            budgetRepository.deleteAll();
            histories.deleteAll();
            snapshots.deleteAll();
            assignments.deleteAll();
            requisitions.deleteAll();
            configurationSteps.deleteAll();
            configurations.deleteAll();
            jobTitles.deleteAll();
            departments.deleteAll();
            if (!createdUsers.isEmpty()) {
                users.deleteAll(createdUsers);
                createdUsers.clear();
            }
        });
    }

    private String token(User u) {
        return "Bearer " + jwt.generateAccessToken(
                u.getEmail(),
                u.getRoles().stream().map(r -> r.getName().name()).collect(java.util.stream.Collectors.toSet()),
                u.getTokenVersion(),
                false
        );
    }

    private User createUser(String email, RoleName... roleNames) {
        User u = new User(email, "hashed_pw", roleNames[0].name());
        u.setFullName("User " + email);
        u.setStatus("ACTIVE");
        u.setRoles(rolesFrom(roleNames));
        User saved = users.save(u);
        createdUsers.add(saved);
        return saved;
    }

    private Set<Role> rolesFrom(RoleName... roleNames) {
        Set<Role> result = new HashSet<>();
        for (RoleName rn : roleNames) {
            result.add(roles.findByName(rn).orElseGet(() -> roles.save(new Role(rn, rn.name()))));
        }
        return result;
    }

    private HeadcountBudget createBudget(int quota, long salaryBudgetVnd) {
        HeadcountBudget b = new HeadcountBudget(
                testDept.getId(),
                testYear,
                quota,
                salaryBudgetVnd,
                "Ngân sách kiểm thử",
                hrManager.getId(),
                hrManager.getId()
        );
        return budgetRepository.save(b);
    }

    private RecruitmentRequisition createRequisition(int quantity, long monthlySalary) {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setRequisitionCode("R-" + UUID.randomUUID().toString().substring(0, 8));
        req.setTitle("Yêu cầu tuyển dụng test " + quantity + " người");
        req.setDepartmentId(testDept.getId());
        req.setJobTitleId(testJob.getId());
        req.setQuantity(quantity);
        req.setRecruitmentType("NEW");
        req.setReason("Mở rộng dự án");
        req.setSalaryMin(monthlySalary);
        req.setSalaryMax(monthlySalary);
        req.setProposedMinSalary(monthlySalary);
        req.setProposedMaxSalary(monthlySalary);
        req.setCurrency("VND");
        req.setNeededDate(LocalDate.of(testYear, 6, 30));
        req.setTargetDate(LocalDate.of(testYear, 6, 30));
        req.setJobDescription("JD test");
        req.setCandidateRequirements("Yêu cầu test");
        req.setStatus("PENDING_APPROVAL");
        req.setCreatedByUserId(hiringManager.getId());
        req.setCreatedAt(Instant.now());
        req.setSubmittedAt(Instant.now());
        req = requisitions.save(req);

        // Sinh snapshot phê duyệt phù hợp
        workflowService.snapshotForSubmission(req);

        return req;
    }

    // =========================================================================
    // NHÓM A — VƯỢT CHỈ TIÊU HEADCOUNT
    // =========================================================================

    @Test
    @DisplayName("TC01: Yêu cầu trong hạn mức (Ngân sách 10, yêu cầu 5) -> Phê duyệt thành công theo quy trình")
    void tc01_requisitionWithinHeadcountLimit_approvesSuccessfully() throws Exception {
        HeadcountBudget budget = createBudget(10, 500_000_000L);
        RecruitmentRequisition req = createRequisition(5, 5_000_000L); // 5 người, lương tháng 5M

        // Duyệt cấp 1 (hiringManager, do lương 5M < 20M nên chỉ có 1 cấp duyệt)
        Map<String, Object> body = Map.of("action", "APPROVE", "comment", "Phê duyệt hợp lệ TC01");
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(body)))
                .andExpect(status().isOk());

        RecruitmentRequisition updated = requisitions.findById(req.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("APPROVED");

        BudgetSummaryResponse summary = budgetService.getById(budget.getId());
        assertThat(summary.headcountQuota()).isEqualTo(10);
        assertThat(summary.headcountUsed()).isEqualTo(5);
        assertThat(summary.headcountRemaining()).isEqualTo(5);
    }

    @Test
    @DisplayName("TC02: Yêu cầu bằng hạn mức (Ngân sách 10, yêu cầu đúng 10) -> Điều kiện biên hợp lệ")
    void tc02_requisitionEqualHeadcountLimit_boundaryApprovesSuccessfully() throws Exception {
        HeadcountBudget budget = createBudget(10, 500_000_000L);
        RecruitmentRequisition req = createRequisition(10, 2_000_000L);

        Map<String, Object> body = Map.of("action", "APPROVE", "comment", "Duyệt đúng 10 headcount");
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(body)))
                .andExpect(status().isOk());

        RecruitmentRequisition updated = requisitions.findById(req.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("APPROVED");

        BudgetSummaryResponse summary = budgetService.getById(budget.getId());
        assertThat(summary.headcountUsed()).isEqualTo(10);
        assertThat(summary.headcountRemaining()).isEqualTo(0);
    }

    @Test
    @DisplayName("TC03: Yêu cầu vượt hạn mức (Ngân sách 10, yêu cầu 11) -> Chặn phê duyệt với 409 Conflict")
    void tc03_requisitionExceedingHeadcountLimit_blocksApprovalWithConflict() throws Exception {
        HeadcountBudget budget = createBudget(10, 500_000_000L);
        RecruitmentRequisition req = createRequisition(11, 2_000_000L);

        // Duyệt thường không có overrideReason -> 409 Conflict
        Map<String, Object> body = Map.of("action", "APPROVE", "comment", "Cố gắng duyệt vượt hạn mức");
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(body)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("HEADCOUNT_BUDGET_EXCEEDED"))
                .andExpect(jsonPath("$.message", containsString("Vượt chỉ tiêu 1 headcount")));

        // Kiểm tra yêu cầu KHÔNG bị âm thầm duyệt
        RecruitmentRequisition afterReq = requisitions.findById(req.getId()).orElseThrow();
        assertThat(afterReq.getStatus()).isEqualTo("PENDING_APPROVAL");
        assertThat(afterReq.isBudgetOverridden()).isFalse();

        // Kiểm tra ngân sách đã dùng vẫn là 0
        BudgetSummaryResponse summary = budgetService.getById(budget.getId());
        assertThat(summary.headcountUsed()).isEqualTo(0);
        assertThat(summary.headcountRemaining()).isEqualTo(10);
    }

    @Test
    @DisplayName("TC04: Vượt hạn mức do nhiều yêu cầu cộng dồn (Req A: 6, Req B: 5) -> Chặn Req B khi tổng vượt 10")
    void tc04_multipleRequisitionsAccumulatedHeadcountOverrun_blocksSecondRequisition() throws Exception {
        createBudget(10, 500_000_000L);
        RecruitmentRequisition reqA = createRequisition(6, 2_000_000L);
        RecruitmentRequisition reqB = createRequisition(5, 2_000_000L);

        // Duyệt Req A (6 người) -> Thành công
        Map<String, Object> bodyA = Map.of("action", "APPROVE", "comment", "Duyệt yêu cầu A");
        mvc.perform(put("/api/requisitions/" + reqA.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(bodyA)))
                .andExpect(status().isOk());

        assertThat(requisitions.findById(reqA.getId()).orElseThrow().getStatus()).isEqualTo("APPROVED");

        // Duyệt Req B (5 người, nhưng còn lại chỉ là 4) -> 409 Conflict
        Map<String, Object> bodyB = Map.of("action", "APPROVE", "comment", "Duyệt yêu cầu B");
        mvc.perform(put("/api/requisitions/" + reqB.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(bodyB)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("HEADCOUNT_BUDGET_EXCEEDED"))
                .andExpect(jsonPath("$.message", containsString("Vượt chỉ tiêu 1 headcount")));

        assertThat(requisitions.findById(reqB.getId()).orElseThrow().getStatus()).isEqualTo("PENDING_APPROVAL");
    }

    // =========================================================================
    // NHÓM B — VƯỢT NGÂN SÁCH TIỀN LƯƠNG
    // Ngân sách thử nghiệm: 240.000.000 VNĐ / năm
    // =========================================================================

    @Test
    @DisplayName("TC05: Chi phí thấp hơn ngân sách (Chi phí 180M < 240M) -> Phê duyệt thành công")
    void tc05_requisitionAnnualCostBelowSalaryBudget_approvesSuccessfully() throws Exception {
        HeadcountBudget budget = createBudget(10, 240_000_000L);
        // 1 người * 15M/tháng * 12 tháng = 180.000.000 VND
        RecruitmentRequisition req = createRequisition(1, 15_000_000L);

        Map<String, Object> body = Map.of("action", "APPROVE", "comment", "Duyệt chi phí 180M");
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(body)))
                .andExpect(status().isOk());

        RecruitmentRequisition updated = requisitions.findById(req.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("APPROVED");

        BudgetSummaryResponse summary = budgetService.getById(budget.getId());
        assertThat(summary.salaryBudgetUsedVnd()).isEqualTo(180_000_000L);
        assertThat(summary.salaryBudgetRemainingVnd()).isEqualTo(60_000_000L);
    }

    @Test
    @DisplayName("TC06: Chi phí đúng bằng ngân sách (Chi phí đúng 240M = 240M) -> Điều kiện biên hợp lệ")
    void tc06_requisitionAnnualCostEqualSalaryBudget_boundaryApprovesSuccessfully() throws Exception {
        HeadcountBudget budget = createBudget(10, 240_000_000L);
        // 1 người * 20M/tháng * 12 tháng = 240.000.000 VND
        // Lưu ý: lương 20M kích hoạt luồng 2 cấp: hiringManager duyệt cấp 1, approverUser duyệt cấp 2
        RecruitmentRequisition req = createRequisition(1, 20_000_000L);

        // Cấp 1 duyệt
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isOk());

        // Cấp 2 duyệt
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(approverUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isOk());

        RecruitmentRequisition updated = requisitions.findById(req.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("APPROVED");

        BudgetSummaryResponse summary = budgetService.getById(budget.getId());
        assertThat(summary.salaryBudgetUsedVnd()).isEqualTo(240_000_000L);
        assertThat(summary.salaryBudgetRemainingVnd()).isEqualTo(0L);
    }

    @Test
    @DisplayName("TC07: Chi phí vượt ngân sách (Chi phí 240.000.012 VND > 240.000.000) -> Chặn với 409 Conflict")
    void tc07_requisitionAnnualCostExceedingSalaryBudget_blocksApprovalWithConflict() throws Exception {
        createBudget(10, 240_000_000L);
        // 1 người * 20.000.001 VND/tháng * 12 tháng = 240.000.012 VND > 240.000.000 VND
        RecruitmentRequisition req = createRequisition(1, 20_000_001L);

        // Duyệt cấp 1 bị chặn do vượt ngân sách cả năm
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("HEADCOUNT_BUDGET_EXCEEDED"))
                .andExpect(jsonPath("$.message", containsString("ngân sách lương cả năm")));

        RecruitmentRequisition updated = requisitions.findById(req.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("PENDING_APPROVAL");
    }

    @Test
    @DisplayName("TC08: Vượt ngân sách cộng dồn (Req A: 150M, Req B: 100M > 240M) -> Không để số âm trái quy định")
    void tc08_multipleRequisitionsAccumulatedSalaryOverrun_blocksSecondRequisition() throws Exception {
        HeadcountBudget budget = createBudget(10, 240_000_000L);
        // Req A: 1 người * 12.5M * 12 = 150M
        RecruitmentRequisition reqA = createRequisition(1, 12_500_000L);
        // Req B: 1 người * 8.333.334 * 12 = 100.000.008 VND
        RecruitmentRequisition reqB = createRequisition(1, 8_333_334L);

        // Duyệt Req A -> Thành công
        mvc.perform(put("/api/requisitions/" + reqA.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isOk());

        // Kiểm tra ngân sách còn lại là 90.000.000 VNĐ
        BudgetSummaryResponse summaryA = budgetService.getById(budget.getId());
        assertThat(summaryA.salaryBudgetRemainingVnd()).isEqualTo(90_000_000L);

        // Duyệt Req B (100M > 90M còn lại) -> 409 Conflict
        mvc.perform(put("/api/requisitions/" + reqB.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("HEADCOUNT_BUDGET_EXCEEDED"));

        // Ngân sách còn lại vẫn giữ nguyên 90M, không bị âm
        BudgetSummaryResponse summaryB = budgetService.getById(budget.getId());
        assertThat(summaryB.salaryBudgetRemainingVnd()).isEqualTo(90_000_000L);
    }

    // =========================================================================
    // NHÓM C — TÍCH HỢP LUỒNG PHÊ DUYỆT
    // =========================================================================

    @Test
    @DisplayName("TC09: Yêu cầu vượt hạn mức cấp duyệt lương -> Bổ sung cấp duyệt cao hơn theo S3-01, chặn vượt cấp")
    void tc09_requisitionExceedingApprovalStepThreshold_enforcesMultiStepApproval() throws Exception {
        createBudget(10, 500_000_000L);
        // Lương 25.000.000 VND >= 20.000.000 VND ngưỡng cấp 2 -> Snapshot tự động gồm 2 cấp
        RecruitmentRequisition req = createRequisition(1, 25_000_000L);

        // Thử cấp 2 (approverUser) duyệt trước khi cấp 1 (hiringManager) duyệt -> 403 Forbidden
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(approverUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("người phê duyệt")));

        // Cấp 1 duyệt đúng quyền
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isOk());

        // Lúc này cấp 2 duyệt mới thành công
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(approverUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isOk());

        assertThat(requisitions.findById(req.getId()).orElseThrow().getStatus()).isEqualTo("APPROVED");
    }

    @Test
    @DisplayName("TC10: Không có cấu hình duyệt phù hợp -> Báo lỗi rõ ràng 400 Bad Request, không tự ý duyệt")
    void tc10_noMatchingApprovalConfiguration_blocksSubmissionWithClearError() throws Exception {
        String uSuffix = UUID.randomUUID().toString().substring(0, 6);
        Department unconfiguredDept = departments.save(new Department(null, "Phòng Chưa Cấu Hình " + uSuffix, "U-" + uSuffix,
                "Desc", null, hiringManager.getId(), true, Instant.now()));

        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setRequisitionCode("R-U-" + uSuffix);
        req.setTitle("Yêu cầu phòng chưa cấu hình");
        req.setDepartmentId(unconfiguredDept.getId());
        req.setJobTitleId(testJob.getId());
        req.setQuantity(1);
        req.setSalaryMin(10_000_000L);
        req.setSalaryMax(10_000_000L);
        req.setStatus("DRAFT");
        req = requisitions.save(req);

        final RecruitmentRequisition finalReq = req;
        // Gọi snapshotForSubmission -> ném ngoại lệ rõ ràng
        org.junit.jupiter.api.Assertions.assertThrows(
            com.example.auth_service.exception.BadRequestException.class,
            () -> workflowService.snapshotForSubmission(finalReq)
        );
    }

    @Test
    @DisplayName("TC11: Yêu cầu bị từ chối hoặc hủy -> Ngân sách và Headcount được giải phóng chính xác")
    void tc11_rejectedOrCancelledRequisition_releasesHeadcountAndBudget() throws Exception {
        HeadcountBudget budget = createBudget(10, 240_000_000L);
        RecruitmentRequisition reqA = createRequisition(5, 2_000_000L); // Chi phí = 120M
        RecruitmentRequisition reqB = createRequisition(6, 2_000_000L); // Chi phí = 144M

        // Duyệt Req A -> Dùng 5 headcount, 120M lương
        mvc.perform(put("/api/requisitions/" + reqA.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isOk());

        BudgetSummaryResponse summary1 = budgetService.getById(budget.getId());
        assertThat(summary1.headcountRemaining()).isEqualTo(5);

        // Từ chối Req B
        mvc.perform(put("/api/requisitions/" + reqB.getId() + "/reject")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("rejectionReason", "Từ chối do thay đổi kế hoạch"))))
                .andExpect(status().isOk());

        assertThat(requisitions.findById(reqB.getId()).orElseThrow().getStatus()).isEqualTo("REJECTED");

        // Ngân sách vẫn còn nguyên 5 headcount khả dụng để duyệt yêu cầu khác
        BudgetSummaryResponse summary2 = budgetService.getById(budget.getId());
        assertThat(summary2.headcountRemaining()).isEqualTo(5);
        assertThat(summary2.headcountUsed()).isEqualTo(5);

        // Tạo yêu cầu Req C (đúng 5 headcount) -> Có thể duyệt thành công
        RecruitmentRequisition reqC = createRequisition(5, 1_000_000L);
        mvc.perform(put("/api/requisitions/" + reqC.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isOk());

        assertThat(requisitions.findById(reqC.getId()).orElseThrow().getStatus()).isEqualTo("APPROVED");

        BudgetSummaryResponse summary3 = budgetService.getById(budget.getId());
        assertThat(summary3.headcountUsed()).isEqualTo(10);
        assertThat(summary3.headcountRemaining()).isEqualTo(0);
    }

    @Test
    @DisplayName("TC12: Phê duyệt đồng thời (Race condition) -> Khóa bi quan ngăn trừ ngân sách hai lần")
    void tc12_concurrentApprovalsExceedingBudget_preventRaceCondition() throws Exception {
        // Ngân sách 10 người, tạo 2 yêu cầu mỗi yêu cầu 6 người (tổng 12 > 10)
        HeadcountBudget budget = createBudget(10, 500_000_000L);
        RecruitmentRequisition req1 = createRequisition(6, 1_000_000L);
        RecruitmentRequisition req2 = createRequisition(6, 1_000_000L);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);

        Callable<Void> task1 = () -> {
            barrier.await();
            try {
                txTemplate.execute(status -> {
                    workflowService.processApprovalAction(req1.getId(), hiringManager.getId(), "APPROVE", "Cố gắng duyệt đồng thời 1", null);
                    return null;
                });
                successCount.incrementAndGet();
            } catch (Exception e) {
                Throwable t = e;
                while (t != null) {
                    if (t instanceof com.example.auth_service.exception.BudgetExceededException
                            || t instanceof org.springframework.dao.PessimisticLockingFailureException
                            || t instanceof org.springframework.dao.CannotAcquireLockException) {
                        conflictCount.incrementAndGet();
                        break;
                    }
                    t = t.getCause();
                }
            }
            return null;
        };

        Callable<Void> task2 = () -> {
            barrier.await();
            try {
                txTemplate.execute(status -> {
                    workflowService.processApprovalAction(req2.getId(), hiringManager.getId(), "APPROVE", "Cố gắng duyệt đồng thời 2", null);
                    return null;
                });
                successCount.incrementAndGet();
            } catch (Exception e) {
                Throwable t = e;
                while (t != null) {
                    if (t instanceof com.example.auth_service.exception.BudgetExceededException
                            || t instanceof org.springframework.dao.PessimisticLockingFailureException
                            || t instanceof org.springframework.dao.CannotAcquireLockException) {
                        conflictCount.incrementAndGet();
                        break;
                    }
                    t = t.getCause();
                }
            }
            return null;
        };

        Future<Void> f1 = executor.submit(task1);
        Future<Void> f2 = executor.submit(task2);

        f1.get(10, TimeUnit.SECONDS);
        f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Đúng 1 yêu cầu được duyệt, yêu cầu còn lại bị chặn do vượt ngân sách
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(1);

        // Ngân sách đã dùng đúng bằng 6 (không phải 12)
        BudgetSummaryResponse summary = budgetService.getById(budget.getId());
        assertThat(summary.headcountUsed()).isEqualTo(6);
        assertThat(summary.headcountRemaining()).isEqualTo(4);
    }

    // =========================================================================
    // NHÓM D — BẢO MẬT VÀ ĐỒNG BỘ DỮ LIỆU
    // =========================================================================

    @Test
    @DisplayName("TC13: Bỏ qua kiểm tra frontend, gọi trực tiếp API vượt hạn mức -> Backend thực thi chặt chẽ trả về 409")
    void tc13_bypassingFrontendAndCallingDirectApi_stillEnforcesBackendConstraint() throws Exception {
        createBudget(10, 100_000_000L);
        // Yêu cầu chi phí 240M vượt ngân sách 100M
        RecruitmentRequisition req = createRequisition(2, 10_000_000L); // 2 * 10M * 12 = 240M

        // Gọi trực tiếp PUT API
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"APPROVE\",\"comments\":\"Duyệt trực tiếp qua API\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("HEADCOUNT_BUDGET_EXCEEDED"))
                .andExpect(jsonPath("$.details.requiresOverride").value(true));
    }

    @Test
    @DisplayName("TC14: Phân quyền: Tài khoản không có quyền phê duyệt/quản lý ngân sách không thể tự phê duyệt vượt hạn mức")
    void tc14_nonHrManagerCannotOverrideBudget_returnsForbidden() throws Exception {
        createBudget(5, 100_000_000L);
        RecruitmentRequisition req = createRequisition(6, 10_000_000L); // Vượt headcount (6 > 5)

        // 1. Hiring Manager cố gửi lý do ghi đè trong approve -> 403 Forbidden
        Map<String, Object> hmBody = Map.of(
                "action", "APPROVE",
                "comments", "HM cố gắng ghi đè",
                "overrideReason", "Lý do ghi đè bởi hiring manager không có thẩm quyền"
        );
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(hmBody)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Trưởng phòng Nhân sự")));

        // 2. Admin đơn thuần (không có role HR_MANAGER) gọi endpoint override-approve -> 403 Forbidden
        OverrideApprovalRequest overrideReq = new OverrideApprovalRequest("Lý do ghi đè bởi tài khoản Admin");
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override-approve")
                        .header("Authorization", token(adminUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(overrideReq)))
                .andExpect(status().isForbidden());

        // 3. Người dùng chưa đăng nhập gọi approve -> 401 / 403
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(hmBody)))
                .andExpect(status().isUnauthorized());

        // Yêu cầu tuyển dụng vẫn giữ nguyên trạng thái PENDING_APPROVAL, không bị ghi đè trái phép
        RecruitmentRequisition currentReq = requisitions.findById(req.getId()).orElseThrow();
        assertThat(currentReq.getStatus()).isEqualTo("PENDING_APPROVAL");
        assertThat(currentReq.isBudgetOverridden()).isFalse();
    }

    @Test
    @DisplayName("TC15: Đồng bộ dữ liệu: Đối chiếu tính nhất quán giữa PostgreSQL, REST API và Frontend DTO")
    void tc15_dataSynchronizationAcrossDbApiAndFrontend() throws Exception {
        HeadcountBudget budget = createBudget(10, 240_000_000L);
        // Tạo yêu cầu dùng hết 10 headcount, lương 2M/tháng * 12 = 240M
        RecruitmentRequisition req = createRequisition(10, 2_000_000L);

        // Phê duyệt yêu cầu theo quy trình
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE", "comment", "Phê duyệt đồng bộ dữ liệu"))))
                .andExpect(status().isOk());

        // 1. Đối chiếu Database Entity (PostgreSQL)
        RecruitmentRequisition dbReq = requisitions.findById(req.getId()).orElseThrow();
        assertThat(dbReq.getStatus()).isEqualTo("APPROVED");
        assertThat(dbReq.getQuantity()).isEqualTo(10);

        // 2. Đối chiếu REST API Quản lý Ngân sách phòng ban (/api/headcount-budgets)
        mvc.perform(get("/api/headcount-budgets?departmentId=" + testDept.getId() + "&year=" + testYear)
                        .header("Authorization", token(hrManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].headcountQuota").value(10))
                .andExpect(jsonPath("$.content[0].headcountUsed").value(10))
                .andExpect(jsonPath("$.content[0].headcountRemaining").value(0))
                .andExpect(jsonPath("$.content[0].salaryBudgetVnd").value(240_000_000L))
                .andExpect(jsonPath("$.content[0].salaryBudgetUsedVnd").value(240_000_000L))
                .andExpect(jsonPath("$.content[0].salaryBudgetRemainingVnd").value(0L))
                .andExpect(jsonPath("$.content[0].status").value("EXHAUSTED"));

        // 3. Đối chiếu REST API Dashboard Stats (/api/headcount-budgets/stats)
        mvc.perform(get("/api/headcount-budgets/stats?year=" + testYear)
                        .header("Authorization", token(hrManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalHeadcountQuota", greaterThanOrEqualTo(10)))
                .andExpect(jsonPath("$.totalHeadcountUsed", greaterThanOrEqualTo(10)));

        // 4. Đối chiếu Service DTO tính toán (Frontend hiển thị)
        BudgetSummaryResponse summary = budgetService.getById(budget.getId());
        assertThat(summary.headcountQuota()).isEqualTo(10);
        assertThat(summary.headcountUsed()).isEqualTo(10);
        assertThat(summary.headcountRemaining()).isEqualTo(0);
        assertThat(summary.salaryBudgetUsedVnd()).isEqualTo(240_000_000L);
        assertThat(summary.salaryBudgetRemainingVnd()).isEqualTo(0L);
    }

    @Test
    @DisplayName("TC16: Đã giải quyết Override Deadlock: HR Manager ghi đè thành công ngay cả khi không phải approver cấp 1")
    void tc16_overrideApprove_deadlockAnalysis_documentsArchitecturalMismatch() throws Exception {
        createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(12, 2_000_000L); // Vượt chỉ tiêu (12 > 10)

        // HR Manager gọi endpoint chuyên biệt override-approve
        OverrideApprovalRequest hrReq = new OverrideApprovalRequest("Phê duyệt đặc cách mở rộng quy mô bộ phận");

        // Trước đây bị lỗi kiến trúc 403 Forbidden do RequisitionApprovalService kiểm tra currentStep.approverId.
        // Hiện tại: Chức năng ghi đè độc lập đã xử lý thành công trả về 200 OK.
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override-approve")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(hrReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budgetOverridden").value(true))
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

        RecruitmentRequisition overriddenReq = requisitions.findById(req.getId()).orElseThrow();
        assertThat(overriddenReq.isBudgetOverridden()).isTrue();
        assertThat(overriddenReq.getStatus()).isEqualTo("PENDING_APPROVAL");
    }
}
