package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.BudgetAuditLog;
import com.example.auth_service.domain.sprint3.HeadcountBudget;
import com.example.auth_service.dto.budget.BudgetOverrideRequest;
import com.example.auth_service.dto.budget.BudgetSummaryResponse;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.JwtUtils;
import com.example.auth_service.service.HeadcountBudgetService;
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
 * Kiểm thử tự động chuyên biệt cho Chức năng Ghi Đè Ngân Sách Headcount (TC01 - TC12)
 * Đáp ứng đầy đủ yêu cầu nghiệp vụ Mục 8 của Prompt:
 * TC01: HR Manager ghi đè hợp lệ -> Thành công (200 OK, giữ nguyên PENDING_APPROVAL, ghi audit log)
 * TC02: Recruiter ghi đè -> 403 Forbidden
 * TC03: Không nhập lý do / lý do < 10 ký tự -> 400 Validation Error
 * TC04: Ghi đè yêu cầu không vượt hạn mức -> 400 Bad Request
 * TC05: Ghi đè hai lần -> 400 Bad Request (không tạo bản ghi trùng)
 * TC06: Ghi đè rồi phê duyệt -> Đúng luồng phê duyệt đa cấp
 * TC07: Ghi đè rồi từ chối -> Lưu lịch sử, ngân sách không bị trừ
 * TC08: Tải lại trang (Persistence check) -> Dữ liệu DB và API đối chiếu đồng nhất
 * TC09: Gọi API trực tiếp không có quyền -> 401/403
 * TC10: Hai thao tác ghi đè đồng thời -> Khóa bi quan ngăn race condition
 * TC11: Ghi đè ngân sách nhưng vẫn vượt Headcount -> Chặn khi duyệt với 409 Conflict
 * TC12: Thay đổi ngân sách sau ghi đè -> Tái kiểm tra chặn nếu vượt quá mức đã chấp thuận
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class BudgetOverrideIntegrationTest {

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
    @Autowired private PlatformTransactionManager transactionManager;

    private User hrManager;
    private User hiringManager;
    private User recruiterUser;
    private User approverUser;
    private Department testDept;
    private JobTitle testJob;
    private final int testYear = 2026;

    private final List<User> createdUsers = new ArrayList<>();

    @BeforeEach
    void setUp() {
        hrManager = createUser("hr_mgr_" + System.nanoTime() + "@test.com", RoleName.HR_MANAGER);
        hiringManager = createUser("hm_" + System.nanoTime() + "@test.com", RoleName.HIRING_MANAGER);
        recruiterUser = createUser("recruiter_" + System.nanoTime() + "@test.com", RoleName.RECRUITER);
        approverUser = createUser("approver_" + System.nanoTime() + "@test.com", RoleName.APPROVER);

        String suffix = UUID.randomUUID().toString().substring(0, 6);
        testDept = new Department(null, "BOD " + suffix, "BOD-" + suffix,
                "Ban Giám Đốc", null, hiringManager.getId(), true, Instant.now());
        testDept = departments.save(testDept);

        testJob = new JobTitle();
        testJob.setTitle("CTO " + suffix);
        testJob.setCode("CTO-" + suffix);
        testJob.setDepartment(testDept);
        testJob.setActive(true);
        testJob.setMinSalary(50_000_000L);
        testJob.setMaxSalary(300_000_000L);
        testJob = jobTitles.save(testJob);

        // Cấu hình quy trình phê duyệt: Cấp 1 HM, Cấp 2 Approver
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
        step2.setMinimumSalary(100_000_000L);
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
                "Ngân sách BOD 2026",
                hrManager.getId(),
                hrManager.getId()
        );
        return budgetRepository.save(b);
    }

    private RecruitmentRequisition createRequisition(int quantity, long monthlySalary) {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setRequisitionCode("REQ-202610-" + UUID.randomUUID().toString().substring(0, 4));
        req.setTitle("Tuyển Giám đốc Công nghệ (CTO)");
        req.setDepartmentId(testDept.getId());
        req.setJobTitleId(testJob.getId());
        req.setQuantity(quantity);
        req.setRecruitmentType("NEW_HEADCOUNT");
        req.setReason("Mở rộng Ban Giám Đốc");
        req.setSalaryMin(monthlySalary);
        req.setSalaryMax(monthlySalary);
        req.setProposedMinSalary(monthlySalary);
        req.setProposedMaxSalary(monthlySalary);
        req.setCurrency("VND");
        req.setNeededDate(LocalDate.of(testYear, 12, 31));
        req.setTargetDate(LocalDate.of(testYear, 12, 31));
        req.setJobDescription("JD CTO");
        req.setCandidateRequirements("Yêu cầu CTO");
        req.setStatus("PENDING_APPROVAL");
        req.setCreatedByUserId(hiringManager.getId());
        req.setCreatedAt(Instant.now());
        req.setSubmittedAt(Instant.now());
        req = requisitions.save(req);

        workflowService.snapshotForSubmission(req);
        return req;
    }

    // =========================================================================
    // TC01: HR Manager ghi đè hợp lệ
    // =========================================================================
    @Test
    @DisplayName("TC01: HR Manager ghi đè hợp lệ -> Thành công (200 OK, budgetOverridden=true, status retains PENDING_APPROVAL, audit log recorded)")
    void tc01_hrManagerOverridesBudget_success() throws Exception {
        createBudget(10, 240_000_000L); // Quota 10, ngân sách 240M
        RecruitmentRequisition req = createRequisition(13, 25_000_000L); // Tuyển 13 người (vượt 3), chi phí 3.9 tỷ (vượt 3.66 tỷ)

        BudgetOverrideRequest overrideRequest = new BudgetOverrideRequest("Phê duyệt đặc cách mở rộng bộ máy BOD theo chỉ đạo của HĐQT");

        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(overrideRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requisitionId").value(req.getId()))
                .andExpect(jsonPath("$.budgetOverridden").value(true))
                .andExpect(jsonPath("$.headcountOverridden").value(true))
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.excessHeadcount").value(3))
                .andExpect(jsonPath("$.excessSalaryVnd").value(3_660_000_000L))
                .andExpect(jsonPath("$.overrideReason").value("Phê duyệt đặc cách mở rộng bộ máy BOD theo chỉ đạo của HĐQT"));

        // Kiểm tra Database Requisition
        RecruitmentRequisition updated = requisitions.findById(req.getId()).orElseThrow();
        assertThat(updated.isBudgetOverridden()).isTrue();
        assertThat(updated.isHeadcountOverridden()).isTrue();
        assertThat(updated.getBudgetOverrideByUserId()).isEqualTo(hrManager.getId());
        assertThat(updated.getBudgetOverrideReason()).isEqualTo("Phê duyệt đặc cách mở rộng bộ máy BOD theo chỉ đạo của HĐQT");
        assertThat(updated.getBudgetOverrideAt()).isNotNull();
        assertThat(updated.getStatus()).isEqualTo("PENDING_APPROVAL");

        // Kiểm tra Audit Log
        List<BudgetAuditLog> logs = auditLogRepository.findByRequisitionIdOrderByCreatedAtDesc(req.getId());
        assertThat(logs).isNotEmpty();
        BudgetAuditLog overrideLog = logs.stream()
                .filter(l -> "BUDGET_OVERRIDE".equals(l.getAction()))
                .findFirst().orElseThrow();
        assertThat(overrideLog.getUserId()).isEqualTo(hrManager.getId());
        assertThat(overrideLog.getReason()).contains("HĐQT");
    }

    // =========================================================================
    // TC02: Recruiter ghi đè
    // =========================================================================
    @Test
    @DisplayName("TC02: Recruiter ghi đè -> 403 Forbidden")
    void tc02_recruiterOverridesBudget_forbidden() throws Exception {
        createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(13, 25_000_000L);

        BudgetOverrideRequest overrideRequest = new BudgetOverrideRequest("Recruiter tự ý ghi đè ngân sách tuyển dụng");

        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(recruiterUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(overrideRequest)))
                .andExpect(status().isForbidden());

        RecruitmentRequisition current = requisitions.findById(req.getId()).orElseThrow();
        assertThat(current.isBudgetOverridden()).isFalse();
    }

    // =========================================================================
    // TC03: Không nhập lý do / lý do < 10 ký tự
    // =========================================================================
    @Test
    @DisplayName("TC03: Không nhập lý do / lý do < 10 ký tự -> 400 Validation error")
    void tc03_emptyOrShortReason_validationError() throws Exception {
        createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(13, 25_000_000L);

        // Lý do quá ngắn (< 10 ký tự)
        BudgetOverrideRequest shortReq = new BudgetOverrideRequest("Lý do");
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(shortReq)))
                .andExpect(status().isBadRequest());

        // Lý do rỗng
        BudgetOverrideRequest blankReq = new BudgetOverrideRequest("   ");
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(blankReq)))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // TC04: Ghi đè yêu cầu không vượt hạn mức
    // =========================================================================
    @Test
    @DisplayName("TC04: Ghi đè yêu cầu không vượt hạn mức -> 400 Bad Request xử lý đúng quy tắc")
    void tc04_overrideWithinLimitRequisition_badRequest() throws Exception {
        createBudget(10, 500_000_000L);
        RecruitmentRequisition req = createRequisition(2, 5_000_000L); // 2 người, 120M chi phí < 500M

        BudgetOverrideRequest overrideRequest = new BudgetOverrideRequest("Ghi đè dù yêu cầu không hề vượt hạn mức");

        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(overrideRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("không cần ghi đè")));

        RecruitmentRequisition current = requisitions.findById(req.getId()).orElseThrow();
        assertThat(current.isBudgetOverridden()).isFalse();
    }

    // =========================================================================
    // TC05: Ghi đè hai lần
    // =========================================================================
    @Test
    @DisplayName("TC05: Ghi đè hai lần -> Không tạo bản ghi trùng (400 Bad Request)")
    void tc05_duplicateOverride_blockedWithBadRequest() throws Exception {
        createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(13, 25_000_000L);

        BudgetOverrideRequest overrideRequest = new BudgetOverrideRequest("Ghi đè lần thứ nhất hợp lệ theo quy chế");

        // Lần 1: Thành công
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(overrideRequest)))
                .andExpect(status().isOk());

        // Lần 2: Bị chặn với 400
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new BudgetOverrideRequest("Cố gắng ghi đè thêm lần 2"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("đã được ghi đè ngân sách trước đó")));
    }

    // =========================================================================
    // TC06: Ghi đè rồi phê duyệt
    // =========================================================================
    @Test
    @DisplayName("TC06: Ghi đè rồi phê duyệt -> Đúng luồng phê duyệt đa cấp và trừ ngân sách khi duyệt cuối")
    void tc06_overrideThenApprove_proceedsThroughWorkflowSuccessfully() throws Exception {
        HeadcountBudget budget = createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(13, 150_000_000L); // Lương 150M >= 100M -> cần HM (cấp 1) & Approver (cấp 2)

        // Trước khi ghi đè: HM duyệt bị chặn 409
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("HEADCOUNT_BUDGET_EXCEEDED"));

        // HR Manager ghi đè ngoại lệ
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new BudgetOverrideRequest("Đồng ý ngoại lệ mở rộng dự án trọng điểm"))))
                .andExpect(status().isOk());

        // Sau khi ghi đè: Yêu cầu vẫn là PENDING_APPROVAL
        RecruitmentRequisition reqAfterOverride = requisitions.findById(req.getId()).orElseThrow();
        assertThat(reqAfterOverride.getStatus()).isEqualTo("PENDING_APPROVAL");

        // Cấp 1 (Hiring Manager) duyệt
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE", "comments", "HM duyệt sau ghi đè"))))
                .andExpect(status().isOk());

        // Yêu cầu chuyển sang chờ cấp 2
        RecruitmentRequisition reqAfterStep1 = requisitions.findById(req.getId()).orElseThrow();
        assertThat(reqAfterStep1.getStatus()).isEqualTo("PENDING_APPROVAL");

        // Cấp 2 (Approver) duyệt bước cuối
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(approverUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE", "comments", "Approver duyệt bước cuối"))))
                .andExpect(status().isOk());

        // Đã đạt trạng thái APPROVED
        RecruitmentRequisition finalReq = requisitions.findById(req.getId()).orElseThrow();
        assertThat(finalReq.getStatus()).isEqualTo("APPROVED");

        // Ngân sách được cập nhật đúng giá trị vượt được ngoại lệ
        BudgetSummaryResponse summary = budgetService.getById(budget.getId());
        assertThat(summary.headcountUsed()).isEqualTo(13);
        assertThat(summary.headcountRemaining()).isEqualTo(-3); // Thể hiện số vượt ngoại lệ
    }

    // =========================================================================
    // TC07: Ghi đè rồi từ chối
    // =========================================================================
    @Test
    @DisplayName("TC07: Ghi đè rồi từ chối -> Chuyển REJECTED, lưu lịch sử, ngân sách không bị trừ")
    void tc07_overrideThenReject_recordsHistoryAndDoesNotConsumeBudget() throws Exception {
        HeadcountBudget budget = createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(13, 25_000_000L);

        // HR Manager ghi đè ngoại lệ
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new BudgetOverrideRequest("Ghi đè trước khi xem xét phương án kinh doanh"))))
                .andExpect(status().isOk());

        // Hiring Manager từ chối yêu cầu
        mvc.perform(put("/api/requisitions/" + req.getId() + "/reject")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("rejectionReason", "Kế hoạch kinh doanh quý 3 bị hủy bỏ"))))
                .andExpect(status().isOk());

        // Yêu cầu chuyển sang REJECTED
        RecruitmentRequisition rejectedReq = requisitions.findById(req.getId()).orElseThrow();
        assertThat(rejectedReq.getStatus()).isEqualTo("REJECTED");
        assertThat(rejectedReq.isBudgetOverridden()).isTrue();

        // Ngân sách used vẫn là 0
        BudgetSummaryResponse summary = budgetService.getById(budget.getId());
        assertThat(summary.headcountUsed()).isEqualTo(0);
        assertThat(summary.salaryBudgetUsedVnd()).isEqualTo(0L);
    }

    // =========================================================================
    // TC08: Tải lại trang (Persistence Check)
    // =========================================================================
    @Test
    @DisplayName("TC08: Tải lại trang -> Dữ liệu ghi đè vẫn tồn tại và đối chiếu đồng nhất qua API và DB")
    void tc08_reloadPage_dataPersistsCorrectly() throws Exception {
        createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(13, 25_000_000L);

        // Thực hiện ghi đè
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new BudgetOverrideRequest("Lý do ghi đè kiểm tra tính bền vững dữ liệu"))))
                .andExpect(status().isOk());

        // Giả lập người dùng tải lại trang: Gọi GET /api/requisitions/{id}
        mvc.perform(get("/api/requisitions/" + req.getId())
                        .header("Authorization", token(hrManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(req.getId()))
                .andExpect(jsonPath("$.budgetOverridden").value(true))
                .andExpect(jsonPath("$.headcountOverridden").value(true))
                .andExpect(jsonPath("$.budgetOverrideReason").value("Lý do ghi đè kiểm tra tính bền vững dữ liệu"))
                .andExpect(jsonPath("$.budgetOverrideByUserId").value(hrManager.getId()))
                .andExpect(jsonPath("$.budgetOverrideAt").isNotEmpty());

        // Kiểm tra đối chiếu Database entity
        RecruitmentRequisition dbReq = requisitions.findById(req.getId()).orElseThrow();
        assertThat(dbReq.isBudgetOverridden()).isTrue();
        assertThat(dbReq.isHeadcountOverridden()).isTrue();
        assertThat(dbReq.getOverriddenExcessHeadcount()).isEqualTo(3);
        assertThat(dbReq.getOverriddenExcessSalaryVnd()).isEqualTo(3_660_000_000L);
    }

    // =========================================================================
    // TC09: Gọi API trực tiếp không có quyền
    // =========================================================================
    @Test
    @DisplayName("TC09: Gọi API trực tiếp không có quyền -> 401 Unauthorized và 403 Forbidden")
    void tc09_unauthorizedDirectApiCall_blocked() throws Exception {
        createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(13, 25_000_000L);

        BudgetOverrideRequest overrideRequest = new BudgetOverrideRequest("Thử tấn công gọi API ghi đè trực tiếp");

        // 1. Không truyền token -> 401 Unauthorized
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(overrideRequest)))
                .andExpect(status().isUnauthorized());

        // 2. Hiring Manager gọi trực tiếp -> 403 Forbidden
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(overrideRequest)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // TC10: Hai thao tác ghi đè đồng thời (Concurrent Overrides)
    // =========================================================================
    @Test
    @DisplayName("TC10: Hai thao tác ghi đè đồng thời -> Khóa bi quan ngăn xung đột và không tạo bản ghi trùng")
    void tc10_concurrentOverrideOperations_preventsInconsistency() throws Exception {
        createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(13, 25_000_000L);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);

        Callable<Void> overrideTask = () -> {
            barrier.await();
            try {
                txTemplate.execute(status -> {
                    budgetService.overrideBudget(req.getId(), new BudgetOverrideRequest("Ghi đè đồng thời kiểm tra race condition"), hrManager);
                    return null;
                });
                successCount.incrementAndGet();
            } catch (Throwable e) {
                failureCount.incrementAndGet();
            }
            return null;
        };

        Future<Void> f1 = executor.submit(overrideTask);
        Future<Void> f2 = executor.submit(overrideTask);

        f1.get(10, TimeUnit.SECONDS);
        f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Đúng 1 giao dịch thành công, 1 giao dịch bị chặn bởi kiểm tra trùng/khóa
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(1);

        // Kiểm tra audit log chỉ có đúng 1 bản ghi ghi đè
        List<BudgetAuditLog> logs = auditLogRepository.findByRequisitionIdOrderByCreatedAtDesc(req.getId());
        long overrideLogCount = logs.stream().filter(l -> "BUDGET_OVERRIDE".equals(l.getAction())).count();
        assertThat(overrideLogCount).isEqualTo(1);
    }

    // =========================================================================
    // TC11: Ghi đè ngân sách nhưng vẫn vượt Headcount
    // =========================================================================
    @Test
    @DisplayName("TC11: Ghi đè ngân sách nhưng vẫn vượt Headcount -> Không bỏ qua kiểm soát Headcount")
    void tc11_salaryOverriddenWithoutHeadcountOverride_blocksApproval() throws Exception {
        createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(13, 25_000_000L);

        // Giả lập trường hợp đặc biệt: Chỉ ghi đè ngân sách lương, không ghi đè headcount
        req.setBudgetOverridden(true);
        req.setHeadcountOverridden(false);
        req.setBudgetOverrideReason("Chỉ ghi đè ngân sách lương, chưa phê duyệt vượt headcount");
        requisitions.save(req);

        // Approver duyệt -> Bị chặn 409 Conflict do vượt Headcount mà chưa được ghi đè
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("HEADCOUNT_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.message", containsString("vượt chỉ tiêu headcount phòng ban")));
    }

    // =========================================================================
    // TC12: Thay đổi ngân sách sau ghi đè
    // =========================================================================
    @Test
    @DisplayName("TC12: Thay đổi ngân sách sau ghi đè -> Xử lý theo quy tắc tái kiểm tra khi vượt lớn hơn mức chấp thuận")
    void tc12_budgetDecreasedAfterOverride_reEvaluationBlocksApproval() throws Exception {
        HeadcountBudget budget = createBudget(10, 240_000_000L);
        RecruitmentRequisition req = createRequisition(10, 25_000_000L); // 10 người, lương tháng 25M * 12 = 300M (vượt 60M)

        // HR Manager ghi đè với mức vượt hiện tại (60M)
        mvc.perform(post("/api/headcount-budgets/requisitions/" + req.getId() + "/override")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new BudgetOverrideRequest("Chấp thuận vượt 60 triệu chi phí lương"))))
                .andExpect(status().isOk());

        // Sau khi ghi đè, Giám đốc tài chính cắt giảm ngân sách phòng ban từ 240M xuống còn 100M
        // Khiến mức vượt thực tế bây giờ là 200M (lớn hơn 60M đã được HR Manager phê duyệt ngoại lệ trước đó)
        budget.setSalaryBudgetVnd(100_000_000L);
        budgetRepository.save(budget);

        // Approver duyệt -> enforceOnApproval phát hiện mức vượt thực tế (200M) > mức đã duyệt ghi đè (60M) -> 409 Conflict
        mvc.perform(put("/api/requisitions/" + req.getId() + "/approve")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("action", "APPROVE"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("BUDGET_EXCEEDED_AFTER_OVERRIDE"))
                .andExpect(jsonPath("$.message", containsString("phần vượt mới phát sinh")));
    }
}
