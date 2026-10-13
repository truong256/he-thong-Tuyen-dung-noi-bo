package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.dto.ApprovalConfigurationRequest;
import com.example.auth_service.dto.CreateRequisitionRequest;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RequisitionApprovalTimelineIntegrationTest {

    private static final String CONFIGURATIONS_URL = "/api/requisition-approval-configurations";
    private static final String REQUISITIONS_URL = "/api/requisitions";

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private DepartmentRepository departments;
    @Autowired private JobTitleRepository jobTitles;

    private User hrManager;
    private User hiringManager;
    private User approverOne;
    private User approverTwo;
    private User approverThree;
    private User outsider;
    private Department department;
    private JobTitle jobTitle;

    @BeforeEach
    void setUp() {
        hrManager = createUser("timeline-hr@example.com", RoleName.HR_MANAGER);
        hiringManager = createUser("timeline-hm@example.com", RoleName.HIRING_MANAGER);
        approverOne = createUser("timeline-appr1@example.com", RoleName.APPROVER);
        approverTwo = createUser("timeline-appr2@example.com", RoleName.APPROVER);
        approverThree = createUser("timeline-appr3@example.com", RoleName.APPROVER);
        outsider = createUser("timeline-outsider@example.com", RoleName.RECRUITER);

        department = new Department(null, "Phòng Công nghệ " + System.nanoTime(), "TECH-" + System.nanoTime(),
                "Phòng công nghệ thông tin", null, hiringManager.getId(), true, Instant.now());
        department = departments.save(department);

        jobTitle = new JobTitle();
        jobTitle.setTitle("Kỹ sư phần mềm");
        jobTitle.setCode("SWE-" + System.nanoTime());
        jobTitle.setDepartment(department);
        jobTitle.setActive(true);
        jobTitle.setMinSalary(10_000_000L);
        jobTitle.setMaxSalary(100_000_000L);
        jobTitle = jobTitles.save(jobTitle);
    }

    @Test
    @DisplayName("Tiêu chí 1 & 3: Timeline trả về đúng cấu trúc từ snapshot thực tế (2 cấp thay vì 4 cấp hardcode)")
    void timeline_returnsActualSnapshotSteps_notHardcodedChain() throws Exception {
        // Cấu hình 2 cấp phê duyệt: Cấp 1 (>=0đ), Cấp 2 (>=50tr)
        ApprovalConfigurationRequest configReq = new ApprovalConfigurationRequest(department.getId(), List.of(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverOne.getId()),
                new ApprovalConfigurationRequest.ApprovalStepRequest(50_000_000L, approverTwo.getId())
        ));
        mvc.perform(post(CONFIGURATIONS_URL)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(configReq)))
                .andExpect(status().isCreated());

        // Tạo yêu cầu với lương 60tr -> khớp cả 2 cấp
        CreateRequisitionRequest req = createRequisitionPayload(60_000_000L);
        String createdJson = mvc.perform(post(REQUISITIONS_URL)
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long requisitionId = mapper.readTree(createdJson).get("id").asLong();

        // Kiểm tra API /api/requisitions/{id}/timeline
        mvc.perform(get(REQUISITIONS_URL + "/" + requisitionId + "/timeline")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requisitionId").value(requisitionId))
                .andExpect(jsonPath("$.totalSteps").value(2))
                .andExpect(jsonPath("$.completedSteps").value(0))
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.steps.length()").value(2))
                .andExpect(jsonPath("$.steps[0].stepOrder").value(1))
                .andExpect(jsonPath("$.steps[0].status").value("PENDING"))
                .andExpect(jsonPath("$.steps[0].approverName").value(approverOne.getFullName()))
                .andExpect(jsonPath("$.steps[1].stepOrder").value(2))
                .andExpect(jsonPath("$.steps[1].status").value("UPCOMING"))
                .andExpect(jsonPath("$.steps[1].approverName").value(approverTwo.getFullName()));

        // Kiểm tra API alias /api/requisitions/{id}/approve/timeline
        mvc.perform(get(REQUISITIONS_URL + "/" + requisitionId + "/approve/timeline")
                        .header("Authorization", token(approverOne)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSteps").value(2))
                .andExpect(jsonPath("$.steps.length()").value(2));
    }

    @Test
    @DisplayName("Tiêu chí 1 & 3: Tiến trình duyệt tuần tự và cập nhật timeline theo từng bước")
    void timeline_stepByStepApproval_updatesProgressAndStatus() throws Exception {
        // Cấu hình 2 cấp: approverOne và approverTwo
        ApprovalConfigurationRequest configReq = new ApprovalConfigurationRequest(department.getId(), List.of(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverOne.getId()),
                new ApprovalConfigurationRequest.ApprovalStepRequest(50_000_000L, approverTwo.getId())
        ));
        mvc.perform(post(CONFIGURATIONS_URL)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(configReq)))
                .andExpect(status().isCreated());

        CreateRequisitionRequest req = createRequisitionPayload(70_000_000L);
        String createdJson = mvc.perform(post(REQUISITIONS_URL)
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long requisitionId = mapper.readTree(createdJson).get("id").asLong();

        // Bước 1: Approver 1 phê duyệt
        mvc.perform(put(REQUISITIONS_URL + "/" + requisitionId + "/approve")
                        .header("Authorization", token(approverOne)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

        // Timeline sau bước 1: completedSteps = 1, step 1 COMPLETED, step 2 PENDING
        mvc.perform(get(REQUISITIONS_URL + "/" + requisitionId + "/timeline")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedSteps").value(1))
                .andExpect(jsonPath("$.steps[0].status").value("COMPLETED"))
                .andExpect(jsonPath("$.steps[0].action").value("APPROVE"))
                .andExpect(jsonPath("$.steps[1].status").value("PENDING"));

        // Bước 2: Approver 2 phê duyệt
        mvc.perform(put(REQUISITIONS_URL + "/" + requisitionId + "/approve")
                        .header("Authorization", token(approverTwo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // Timeline sau bước 2: completedSteps = 2, status = APPROVED
        mvc.perform(get(REQUISITIONS_URL + "/" + requisitionId + "/timeline")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedSteps").value(2))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.steps[0].status").value("COMPLETED"))
                .andExpect(jsonPath("$.steps[1].status").value("COMPLETED"));
    }

    @Test
    @DisplayName("Tiêu chí 1: Phân quyền xem timeline theo từng yêu cầu (Người ngoài bị chặn 403)")
    void timeline_accessControl_forbidsUnauthorizedUsers() throws Exception {
        ApprovalConfigurationRequest configReq = new ApprovalConfigurationRequest(department.getId(), List.of(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverOne.getId())
        ));
        mvc.perform(post(CONFIGURATIONS_URL)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(configReq)))
                .andExpect(status().isCreated());

        CreateRequisitionRequest req = createRequisitionPayload(20_000_000L);
        String createdJson = mvc.perform(post(REQUISITIONS_URL)
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long requisitionId = mapper.readTree(createdJson).get("id").asLong();

        // 1. Creator (hiringManager) -> 200 OK
        mvc.perform(get(REQUISITIONS_URL + "/" + requisitionId + "/timeline")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk());

        // 2. Approver trong snapshot -> 200 OK
        mvc.perform(get(REQUISITIONS_URL + "/" + requisitionId + "/timeline")
                        .header("Authorization", token(approverOne)))
                .andExpect(status().isOk());

        // 3. HR Manager -> 200 OK
        mvc.perform(get(REQUISITIONS_URL + "/" + requisitionId + "/timeline")
                        .header("Authorization", token(hrManager)))
                .andExpect(status().isOk());

        // 4. Outsider không thuộc luồng duyệt -> 403 Forbidden
        mvc.perform(get(REQUISITIONS_URL + "/" + requisitionId + "/timeline")
                        .header("Authorization", token(outsider)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Tiêu chí 2: Phòng ban chưa có cấu hình phê duyệt bị chặn với 400 Bad Request rõ ràng")
    void submission_withoutApprovalConfig_returnsBadRequest() throws Exception {
        // Tạo phòng ban mới chưa hề có cấu hình phê duyệt
        Department emptyDept = departments.save(new Department(null, "Phòng Mới " + System.nanoTime(),
                "NEW-" + System.nanoTime(), "Mô tả", null, hiringManager.getId(), true, Instant.now()));
        JobTitle newJob = new JobTitle();
        newJob.setTitle("Nhân viên mới");
        newJob.setCode("NW-" + System.nanoTime());
        newJob.setDepartment(emptyDept);
        newJob.setActive(true);
        newJob.setMinSalary(5_000_000L);
        newJob.setMaxSalary(15_000_000L);
        newJob = jobTitles.save(newJob);

        CreateRequisitionRequest req = new CreateRequisitionRequest(
                "Yêu cầu phòng ban chưa có cấu hình",
                emptyDept.getId(),
                newJob.getId(),
                1,
                "NEW",
                "Tuyển mới",
                8_000_000L,
                12_000_000L,
                "VND",
                null,
                LocalDate.now().plusDays(30),
                "Mô tả",
                "Kinh nghiệm",
                null,
                "Hà Nội",
                "ONSITE"
        );

        mvc.perform(post(REQUISITIONS_URL)
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("cấu hình")));
    }

    @Test
    @DisplayName("Tiêu chí 3: Snapshot bất biến bảo vệ luồng duyệt cũ khi cấu hình cập nhật Version 2")
    void snapshot_preservesOriginalApprovalChain_whenConfigUpdatedToV2() throws Exception {
        // Cấu hình V1: approverOne và approverTwo
        ApprovalConfigurationRequest v1 = new ApprovalConfigurationRequest(department.getId(), List.of(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverOne.getId()),
                new ApprovalConfigurationRequest.ApprovalStepRequest(50_000_000L, approverTwo.getId())
        ));
        String configJson = mvc.perform(post(CONFIGURATIONS_URL)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(v1)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long configId = mapper.readTree(configJson).get("id").asLong();

        // Tạo requisition gắn với V1
        CreateRequisitionRequest req = createRequisitionPayload(80_000_000L);
        String reqJson = mvc.perform(post(REQUISITIONS_URL)
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long requisitionId = mapper.readTree(reqJson).get("id").asLong();

        // HR Manager cập nhật cấu hình sang Version 2: chỉ có 1 cấp với approverThree
        ApprovalConfigurationRequest v2 = new ApprovalConfigurationRequest(department.getId(), List.of(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverThree.getId())
        ));
        mvc.perform(put(CONFIGURATIONS_URL + "/" + configId)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(v2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));

        // Kiểm tra timeline của requisition cũ: Vẫn giữ nguyên 2 cấp của Version 1
        mvc.perform(get(REQUISITIONS_URL + "/" + requisitionId + "/timeline")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSteps").value(2))
                .andExpect(jsonPath("$.steps[0].approverName").value(approverOne.getFullName()))
                .andExpect(jsonPath("$.steps[1].approverName").value(approverTwo.getFullName()));
    }

    private CreateRequisitionRequest createRequisitionPayload(Long maxSalary) {
        return new CreateRequisitionRequest(
                "Yêu cầu thử nghiệm timeline",
                department.getId(),
                jobTitle.getId(),
                1,
                "NEW",
                "Mở rộng nhóm",
                maxSalary != null && maxSalary > 10_000_000L ? maxSalary - 10_000_000L : 10_000_000L,
                maxSalary,
                "VND",
                null,
                LocalDate.now().plusDays(30),
                "Mô tả công việc",
                "Kinh nghiệm phù hợp",
                null,
                "Hà Nội",
                "ONSITE"
        );
    }

    private User createUser(String email, RoleName roleName) {
        User user = new User(email, "hashed_pw", roleName.name());
        user.setFullName(roleName.name() + " " + email);
        user.setStatus("ACTIVE");
        Role role = roles.findByName(roleName).orElseGet(() -> roles.save(new Role(roleName, roleName.name())));
        user.setRoles(Set.of(role));
        return users.save(user);
    }

    private String token(User user) {
        return "Bearer " + jwt.generateAccessToken(
                user.getEmail(),
                user.getRoles().stream().map(role -> role.getName().name()).collect(java.util.stream.Collectors.toSet()),
                user.getTokenVersion(),
                false
        );
    }
}
