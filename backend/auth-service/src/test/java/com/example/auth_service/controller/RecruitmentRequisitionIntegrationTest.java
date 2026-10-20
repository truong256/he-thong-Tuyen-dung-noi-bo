package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.dto.RequisitionRequest;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
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

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RecruitmentRequisitionIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private DepartmentRepository departments;
    @Autowired private JobTitleRepository jobTitles;
    @Autowired private com.example.auth_service.repository.RequisitionApprovalConfigurationRepository configurations;
    @Autowired private com.example.auth_service.repository.RequisitionApprovalConfigurationStepRepository configurationSteps;

    private User hiringManager;
    private User otherManager;
    private User hrManager;
    private User candidate;
    private Department itDept;
    private Department salesDept;
    private JobTitle devJob;

    @BeforeEach
    void setUp() {
        hiringManager = createUser("hm-int", RoleName.HIRING_MANAGER);
        otherManager = createUser("other-hm-int", RoleName.HIRING_MANAGER);
        hrManager = createUser("hr-int", RoleName.HR_MANAGER);
        candidate = createUser("cand-int", RoleName.CANDIDATE);

        itDept = new Department();
        itDept.setName("Công nghệ thông tin S2-10");
        itDept.setCode("IT-S2-10");
        itDept.setManagerUserId(hiringManager.getId());
        itDept.setActive(true);
        itDept = departments.saveAndFlush(itDept);

        salesDept = new Department();
        salesDept.setName("Kinh doanh S2-10");
        salesDept.setCode("SALES-S2-10");
        salesDept.setManagerUserId(otherManager.getId());
        salesDept.setActive(true);
        salesDept = departments.saveAndFlush(salesDept);

        devJob = new JobTitle();
        devJob.setTitle("Backend Engineer S2-10");
        devJob.setCode("BE-ENG-10");
        devJob.setMinSalary(12_000_000L);
        devJob.setMaxSalary(28_000_000L);
        devJob.setDepartment(itDept);
        devJob.setActive(true);
        devJob = jobTitles.saveAndFlush(devJob);
        com.example.auth_service.entity.RequisitionApprovalConfiguration config = new com.example.auth_service.entity.RequisitionApprovalConfiguration();
        config.setDepartmentId(itDept.getId());
        config.setVersion(1);
        config.setActive(true);
        config.setCreatedByUserId(hrManager.getId());
        config = configurations.save(config);

        com.example.auth_service.entity.RequisitionApprovalConfigurationStep step = new com.example.auth_service.entity.RequisitionApprovalConfigurationStep();
        step.setConfigurationId(config.getId());
        step.setStepOrder(1);
        step.setMinimumSalary(0L);
        step.setApproverUserId(hrManager.getId());
        configurationSteps.save(step);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("API yêu cầu tuyển dụng trả 401 khi chưa đăng nhập")
    void unauthenticated_returns401() throws Exception {
        mvc.perform(post("/api/recruitment-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CANDIDATE không có quyền tạo yêu cầu tuyển dụng (trả 403)")
    void candidate_forbidden_returns403() throws Exception {
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Lý do", 15_000_000L, 20_000_000L, null,
                LocalDate.now().plusMonths(1), null, null, null, "DRAFT", true
        );

        mvc.perform(post("/api/recruitment-requests")
                        .header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("SCRUM-93: Trưởng bộ phận lưu nháp (DRAFT) thành công trả HTTP 201")
    void hiringManager_createDraft_returns201() throws Exception {
        RequisitionRequest request = new RequisitionRequest(
                null,
                "Bản nháp tuyển Backend Engineer",
                devJob.getId(),
                null,
                itDept.getId(),
                null,
                2,
                "NEW",
                "Mở rộng team thanh toán",
                15_000_000L,
                25_000_000L,
                null,
                LocalDate.now().plusMonths(1),
                null,
                "Phát triển microservice",
                "Kinh nghiệm 2 năm Java",
                "DRAFT",
                true
        );

        mvc.perform(post("/api/recruitment-requests")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.quantity").value(2))
                .andExpect(jsonPath("$.departmentName").value("Công nghệ thông tin S2-10"))
                .andExpect(jsonPath("$.jobTitleName").value("Backend Engineer S2-10"))
                .andExpect(jsonPath("$.outsideSalaryRange").value(false));
    }

    @Test
    @DisplayName("SCRUM-93: Trưởng bộ phận cố tạo yêu cầu ngoài phòng ban mình phụ trách trả 403")
    void hiringManager_unmanagedDepartment_returns403() throws Exception {
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, salesDept.getId(), null,
                1, "NEW", "Cần thêm người", null, null, null,
                LocalDate.now().plusMonths(1), null, null, null, "DRAFT", true
        );

        mvc.perform(post("/api/recruitment-requests")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("SCRUM-94: Chặn ngày cần người trong quá khứ trả HTTP 400")
    void hiringManager_pastTargetDate_returns400() throws Exception {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Cần tuyển", null, null, null,
                yesterday, null, null, null, "DRAFT", true
        );

        mvc.perform(post("/api/recruitment-requests")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Ngày cần người không được nằm trong quá khứ."));
    }

    @Test
    @DisplayName("SCRUM-94: Lương ngoài dải chuẩn không có giải trình trả HTTP 400")
    void hiringManager_outsideSalaryWithoutExplanation_returns400() throws Exception {
        // Dev standard is 12M - 28M. Request is 15M - 35M (> 28M).
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Cần Tech Lead", 15_000_000L, 35_000_000L, null,
                LocalDate.now().plusMonths(1), null, null, null, "DRAFT", true
        );

        mvc.perform(post("/api/recruitment-requests")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Dải lương đề xuất ngoài dải chuẩn của chức danh thì bắt buộc nhập giải trình."));
    }

    @Test
    @DisplayName("SCRUM-94: Lương ngoài dải chuẩn kèm giải trình hợp lệ được lưu thành công")
    void hiringManager_outsideSalaryWithExplanation_returns201() throws Exception {
        RequisitionRequest request = new RequisitionRequest(
                null, null, devJob.getId(), null, itDept.getId(), null,
                1, "NEW", "Cần Tech Lead", 15_000_000L, 35_000_000L,
                "Ứng viên chuyên gia giải pháp đám mây",
                LocalDate.now().plusMonths(1), null, null, null, "DRAFT", true
        );

        mvc.perform(post("/api/recruitment-requests")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.outsideSalaryRange").value(true))
                .andExpect(jsonPath("$.salaryExplanation").value("Ứng viên chuyên gia giải pháp đám mây"));
    }

    @Test
    @DisplayName("SCRUM-93: Gửi yêu cầu tuyển dụng (submit) và lấy chi tiết / danh sách")
    void hiringManager_submitAndGetDetail() throws Exception {
        // 1. Create draft
        RequisitionRequest draftReq = new RequisitionRequest(
                null, "Yêu cầu tuyển Dev 2", devJob.getId(), null, itDept.getId(), null,
                2, "REPLACEMENT", "Thay nhân sự chuyển phòng", 15_000_000L, 25_000_000L, null,
                LocalDate.now().plusMonths(1), null, "Mô tả công việc chi tiết",
                "Yêu cầu ứng viên chi tiết", "DRAFT", true
        );

        String createContent = mvc.perform(post("/api/recruitment-requests")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(draftReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long reqId = mapper.readTree(createContent).get("id").asLong();

        // 2. Submit draft
        mvc.perform(post("/api/recruitment-requests/" + reqId + "/submit")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

        // 3. Get detail
        mvc.perform(get("/api/recruitment-requests/" + reqId)
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(reqId))
                .andExpect(jsonPath("$.title").value("Yêu cầu tuyển Dev 2"));

        // 4. List requisitions
        mvc.perform(get("/api/recruitment-requests")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));
    }

    @Test
    @DisplayName("SCRUM-128: Clone yêu cầu tuyển dụng sao chép JD, requirements và tạo bản nháp mới (DRAFT)")
    void cloneRequisition_success_createsDraftWithCopiedJd() throws Exception {
        // 1. Tạo yêu cầu tuyển dụng gốc
        RequisitionRequest sourceReq = new RequisitionRequest(
                null,
                "Senior Java Engineer Gốc",
                devJob.getId(),
                null,
                itDept.getId(),
                null,
                3,
                "NEW",
                "Mở rộng dự án thanh toán quốc tế",
                15_000_000L,
                25_000_000L,
                null,
                LocalDate.now().plusMonths(2),
                null,
                "Chịu trách nhiệm thiết kế hệ thống Microservice và tối ưu cơ sở dữ liệu PostgreSQL",
                "Tối thiểu 3 năm kinh nghiệm với Spring Boot, Redis, Kafka, Docker",
                "SUBMITTED",
                false
        );

        String createContent = mvc.perform(post("/api/recruitment-requests")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(sourceReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long sourceId = mapper.readTree(createContent).get("id").asLong();
        String sourceCode = mapper.readTree(createContent).get("requisitionCode").asString();

        // 2. Thực hiện gọi API clone
        String cloneContent = mvc.perform(post("/api/recruitment-requests/" + sourceId + "/clone")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.jobDescription").value("Chịu trách nhiệm thiết kế hệ thống Microservice và tối ưu cơ sở dữ liệu PostgreSQL"))
                .andExpect(jsonPath("$.candidateRequirements").value("Tối thiểu 3 năm kinh nghiệm với Spring Boot, Redis, Kafka, Docker"))
                .andExpect(jsonPath("$.quantity").value(3))
                .andExpect(jsonPath("$.title").value("Senior Java Engineer Gốc"))
                .andReturn().getResponse().getContentAsString();

        Long clonedId = mapper.readTree(cloneContent).get("id").asLong();
        String clonedCode = mapper.readTree(cloneContent).get("requisitionCode").asString();

        // ID và mã bản sao phải khác bản gốc
        org.junit.jupiter.api.Assertions.assertNotEquals(sourceId, clonedId);
        org.junit.jupiter.api.Assertions.assertNotEquals(sourceCode, clonedCode);
    }
    private User createUser(String emailPrefix, RoleName roleName) {
        User user = new User(emailPrefix + "@test.local", "password123");
        user.setFullName("User " + emailPrefix);
        user.setRoles(Set.of(roles.findByName(roleName).orElseThrow()));
        return users.saveAndFlush(user);
    }

    private String token(User user) {
        return "Bearer " + jwt.generateAccessToken(user.getEmail(), Set.of(user.getRole()), user.getTokenVersion());
    }
}
