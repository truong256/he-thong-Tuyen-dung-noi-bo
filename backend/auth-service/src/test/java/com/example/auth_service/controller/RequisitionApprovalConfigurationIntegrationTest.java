package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.dto.ApprovalConfigurationRequest;
import com.example.auth_service.dto.CreateRequisitionRequest;
import com.example.auth_service.dto.RequisitionRequest;
import com.example.auth_service.entity.RequisitionApprovalConfiguration;
import com.example.auth_service.entity.RequisitionApprovalConfigurationStep;
import com.example.auth_service.entity.RequisitionApprovalSnapshot;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RequisitionApprovalConfigurationRepository;
import com.example.auth_service.repository.RequisitionApprovalConfigurationStepRepository;
import com.example.auth_service.repository.RequisitionApprovalSnapshotRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RequisitionApprovalConfigurationIntegrationTest {
    private static final String CONFIGURATIONS_URL = "/api/requisition-approval-configurations";

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private DepartmentRepository departments;
    @Autowired private JobTitleRepository jobTitles;
    @Autowired private RequisitionApprovalConfigurationRepository configurations;
    @Autowired private RequisitionApprovalConfigurationStepRepository configurationSteps;
    @Autowired private RequisitionApprovalSnapshotRepository snapshots;

    private User hrManager;
    private User hiringManager;
    private User approverOne;
    private User approverTwo;
    private User approverThree;
    private User candidate;
    private Department department;
    private JobTitle jobTitle;

    @BeforeEach
    void setUp() {
        hrManager = createUser("approval-hr@example.com", RoleName.HR_MANAGER);
        hiringManager = createUser("approval-hm@example.com", RoleName.HIRING_MANAGER);
        approverOne = createUser("approval-one@example.com", RoleName.APPROVER);
        approverTwo = createUser("approval-two@example.com", RoleName.APPROVER);
        approverThree = createUser("approval-three@example.com", RoleName.APPROVER);
        candidate = createUser("approval-candidate@example.com", RoleName.CANDIDATE);

        department = new Department(null, "Phòng Duyệt " + System.nanoTime(), "APR-" + System.nanoTime(),
                "Approval test department", null, hiringManager.getId(), true, Instant.now());
        department = departments.save(department);

        jobTitle = new JobTitle();
        jobTitle.setTitle("Chuyên viên kiểm thử phê duyệt");
        jobTitle.setCode("APR-TEST-" + System.nanoTime());
        jobTitle.setDepartment(department);
        jobTitle.setActive(true);
        jobTitle.setMinSalary(1_000_000L);
        jobTitle.setMaxSalary(200_000_000L);
        jobTitle = jobTitles.save(jobTitle);
    }

    @Test
    void hrManagerCanCreateVersionUpdateAndDeactivateConfiguration() throws Exception {
        ApprovalConfigurationRequest initialRequest = request(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverOne.getId()),
                new ApprovalConfigurationRequest.ApprovalStepRequest(50_000_000L, approverTwo.getId())
        );
        String createdJson = mvc.perform(post(CONFIGURATIONS_URL)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(initialRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.steps.length()").value(2))
                .andReturn().getResponse().getContentAsString();
        Long firstId = mapper.readTree(createdJson).get("id").asLong();

        ApprovalConfigurationRequest updatedRequest = request(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverTwo.getId()),
                new ApprovalConfigurationRequest.ApprovalStepRequest(75_000_000L, approverThree.getId())
        );
        String updatedJson = mvc.perform(put(CONFIGURATIONS_URL + "/" + firstId)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(updatedRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.active").value(true))
                .andReturn().getResponse().getContentAsString();
        Long secondId = mapper.readTree(updatedJson).get("id").asLong();

        assertThat(configurations.findById(firstId)).get().satisfies(old -> {
            assertThat(old.isActive()).isFalse();
            assertThat(old.getVersion()).isEqualTo(1);
        });
        assertThat(configurationSteps.findAllByConfigurationIdOrderByStepOrderAsc(firstId)).hasSize(2);

        mvc.perform(get(CONFIGURATIONS_URL + "/" + firstId)
                        .header("Authorization", token(hrManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.steps[1].minimumSalary").value(50_000_000));

        mvc.perform(patch(CONFIGURATIONS_URL + "/" + secondId + "/deactivate")
                        .header("Authorization", token(hrManager)))
                .andExpect(status().isNoContent());
        assertThat(configurations.findById(secondId)).get().extracting(RequisitionApprovalConfiguration::isActive)
                .isEqualTo(false);
    }

    @Test
    void approvalConfigurationRequiresHrManagerAndValidApprovers() throws Exception {
        ApprovalConfigurationRequest validRequest = request(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverOne.getId())
        );

        mvc.perform(post(CONFIGURATIONS_URL)
                        .header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(validRequest)))
                .andExpect(status().isForbidden());

        mvc.perform(post(CONFIGURATIONS_URL)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request(
                                new ApprovalConfigurationRequest.ApprovalStepRequest(1_000_000L, approverOne.getId())
                        ))))
                .andExpect(status().isBadRequest());

        mvc.perform(post(CONFIGURATIONS_URL)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request(
                                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, candidate.getId())
                        ))))
                .andExpect(status().isBadRequest());

        assertThat(configurations.findAll()).isEmpty();
    }

    @Test
    void submissionSnapshotsApplicableSalaryStepsAndApprovalsRemainSequential() throws Exception {
        ApprovalConfigurationRequest initialRequest = request(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverOne.getId()),
                new ApprovalConfigurationRequest.ApprovalStepRequest(50_000_000L, approverTwo.getId()),
                new ApprovalConfigurationRequest.ApprovalStepRequest(100_000_000L, approverThree.getId())
        );
        String configJson = mvc.perform(post(CONFIGURATIONS_URL)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(initialRequest)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long configId = mapper.readTree(configJson).get("id").asLong();

        CreateRequisitionRequest requisitionRequest = new CreateRequisitionRequest(
                "Yêu cầu tuyển dụng cần nhiều cấp duyệt",
                department.getId(),
                jobTitle.getId(),
                1,
                "NEW",
                "Mở rộng nhóm",
                40_000_000L,
                70_000_000L,
                "VND",
                null,
                LocalDate.now().plusDays(30),
                "Mô tả công việc",
                "Kinh nghiệm phù hợp",
                null,
                "Hà Nội",
                "ONSITE"
        );
        String requisitionJson = mvc.perform(post("/api/requisitions")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(requisitionRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andReturn().getResponse().getContentAsString();
        Long requisitionId = mapper.readTree(requisitionJson).get("id").asLong();

        List<RequisitionApprovalSnapshot> snapshot = snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisitionId);
        assertThat(snapshot).hasSize(2);
        assertThat(snapshot).extracting(RequisitionApprovalSnapshot::getConfigurationVersion).containsOnly(1);
        assertThat(snapshot).extracting(RequisitionApprovalSnapshot::getApproverUserId)
                .containsExactly(approverOne.getId(), approverTwo.getId());

        ApprovalConfigurationRequest nextVersion = request(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverThree.getId())
        );
        mvc.perform(put(CONFIGURATIONS_URL + "/" + configId)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(nextVersion)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));

        assertThat(snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisitionId))
                .extracting(RequisitionApprovalSnapshot::getApproverUserId)
                .containsExactly(approverOne.getId(), approverTwo.getId());

        mvc.perform(put("/api/requisitions/" + requisitionId + "/approve")
                        .header("Authorization", token(approverTwo)))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/requisitions/" + requisitionId + "/approve")
                        .header("Authorization", token(approverOne)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

        mvc.perform(put("/api/requisitions/" + requisitionId + "/approve")
                        .header("Authorization", token(approverTwo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void recruitmentRequestsApiUsesTheConfiguredApprovalSnapshot() throws Exception {
        ApprovalConfigurationRequest configurationRequest = request(
                new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approverOne.getId()),
                new ApprovalConfigurationRequest.ApprovalStepRequest(50_000_000L, approverTwo.getId())
        );
        mvc.perform(post(CONFIGURATIONS_URL)
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(configurationRequest)))
                .andExpect(status().isCreated());

        RequisitionRequest request = new RequisitionRequest(
                null,
                "Yêu cầu qua API tuyển dụng mới",
                jobTitle.getId(),
                null,
                department.getId(),
                null,
                1,
                "NEW",
                "Mở rộng nhóm",
                40_000_000L,
                70_000_000L,
                null,
                LocalDate.now().plusDays(30),
                null,
                "Mô tả công việc",
                "Kinh nghiệm phù hợp",
                "SUBMITTED",
                false
        );
        String responseJson = mvc.perform(post("/api/recruitment-requests")
                        .header("Authorization", token(hiringManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andReturn().getResponse().getContentAsString();
        Long requisitionId = mapper.readTree(responseJson).get("id").asLong();

        assertThat(snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisitionId))
                .extracting(RequisitionApprovalSnapshot::getApproverUserId)
                .containsExactly(approverOne.getId(), approverTwo.getId());
    }

    private ApprovalConfigurationRequest request(ApprovalConfigurationRequest.ApprovalStepRequest... steps) {
        return new ApprovalConfigurationRequest(department.getId(), List.of(steps));
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