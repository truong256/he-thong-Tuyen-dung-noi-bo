package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.ApproveRequisitionRequest;
import com.example.auth_service.dto.RejectRequisitionRequest;
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
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RequisitionApprovalIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private DepartmentRepository departments;
    @Autowired private JobTitleRepository jobTitles;
    @Autowired private RecruitmentRequisitionRepository requisitions;
    @Autowired private RequisitionAssignmentRepository assignments;

    private User hiringManager;
    private User hrManager;
    private User approverUser;
    private User candidateUser;
    private User adminUser;
    private User unassignedApprover;
    private Department dept;
    private JobTitle job;
    private RecruitmentRequisition requisition;

    @BeforeEach
    void setUp() {
        hiringManager = createUser("hm_s3@example.com", RoleName.HIRING_MANAGER);
        hrManager = createUser("hr_s3@example.com", RoleName.HR_MANAGER);
        approverUser = createUser("approver_s3@example.com", RoleName.APPROVER);
        candidateUser = createUser("cand_s3@example.com", RoleName.CANDIDATE);
        adminUser = createUser("admin_s3@example.com", RoleName.ADMIN);
        unassignedApprover = createUser("other_appr_s3@example.com", RoleName.APPROVER);

        dept = new Department(null, "Phòng Công nghệ S3", "TECH-S3", "Mô tả", null, hiringManager.getId(), true, Instant.now());
        dept = departments.save(dept);

        job = new JobTitle();
        job.setTitle("Kỹ sư Phần mềm S3");
        job.setCode("SWE-S3");
        job.setDepartment(dept);
        job.setActive(true);
        job.setMinSalary(15_000_000L);
        job.setMaxSalary(30_000_000L);
        job = jobTitles.save(job);

        requisition = new RecruitmentRequisition();
        requisition.setRequisitionCode("REQ-S3-001");
        requisition.setTitle("Tuyển Kỹ sư Phần mềm S3");
        requisition.setDepartmentId(dept.getId());
        requisition.setJobTitleId(job.getId());
        requisition.setQuantity(2);
        requisition.setRecruitmentType("NEW");
        requisition.setReason("Mở rộng dự án");
        requisition.setSalaryMin(18_000_000L);
        requisition.setSalaryMax(25_000_000L);
        requisition.setCurrency("VND");
        requisition.setNeededDate(LocalDate.now().plusDays(30));
        requisition.setJobDescription("JD chi tiết");
        requisition.setCandidateRequirements("Yêu cầu chi tiết");
        requisition.setStatus("PENDING_APPROVAL");
        requisition.setCreatedByUserId(hiringManager.getId());
        requisition.setCreatedAt(Instant.now());
        requisition.setSubmittedAt(Instant.now());
        requisition = requisitions.save(requisition);

        RequisitionAssignment assignment = new RequisitionAssignment();
        assignment.setRequisitionId(requisition.getId());
        assignment.setUserId(approverUser.getId());
        assignment.setRole(RoleName.APPROVER);
        assignments.save(assignment);
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

    @Test
    @DisplayName("Creator (Hiring Manager) can view approval history timeline")
    void creatorCanViewApprovalHistoryTimeline() throws Exception {
        mvc.perform(get("/api/requisitions/" + requisition.getId() + "/approval-history")
                        .header("Authorization", token(hiringManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requisitionId", is(requisition.getId().intValue())))
                .andExpect(jsonPath("$.requisitionCode", is("REQ-S3-001")))
                .andExpect(jsonPath("$.totalSteps", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.steps").isArray());
    }

    @Test
    @DisplayName("Unauthorized user (e.g. Candidate) is blocked with 403 Forbidden")
    void unauthorizedUserCannotViewApprovalHistory() throws Exception {
        mvc.perform(get("/api/requisitions/" + requisition.getId() + "/approval-history")
                        .header("Authorization", token(candidateUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Assigned Approver can approve requisition with comments")
    void assignedApproverCanApproveRequisition() throws Exception {
        ApproveRequisitionRequest request = new ApproveRequisitionRequest("Phê duyệt chuyên môn tốt");

        mvc.perform(put("/api/requisitions/" + requisition.getId() + "/approve")
                        .header("Authorization", token(approverUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requisitionId", is(requisition.getId().intValue())))
                .andExpect(jsonPath("$.steps").isArray());
    }

    @Test
    @DisplayName("Rejecting requisition with reason marks as REJECTED and saves comments")
    void assignedApproverCanRejectRequisition() throws Exception {
        RejectRequisitionRequest request = new RejectRequisitionRequest("Không đủ ngân sách", "Chuyển sang quý sau");

        mvc.perform(put("/api/requisitions/" + requisition.getId() + "/reject")
                        .header("Authorization", token(approverUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isRejected", is(true)))
                .andExpect(jsonPath("$.rejectionReason", is("Không đủ ngân sách")));
    }

    @Test
    @DisplayName("Rejecting requisition without reason returns 400 Bad Request")
    void rejectRequisitionWithoutReasonReturnsBadRequest() throws Exception {
        RejectRequisitionRequest request = new RejectRequisitionRequest("", "Thiếu lý do");

        mvc.perform(put("/api/requisitions/" + requisition.getId() + "/reject")
                        .header("Authorization", token(approverUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("S3-02: Assigned Approver can request changes with comments, setting status to DRAFT")
    void assignedApproverCanRequestChanges() throws Exception {
        java.util.Map<String, String> request = java.util.Map.of("comment", "Cần bổ sung chi tiết yêu cầu ứng viên");

        mvc.perform(post("/api/requisitions/" + requisition.getId() + "/request-changes")
                        .header("Authorization", token(approverUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andExpect(jsonPath("$.rejectionReason", is("Cần bổ sung chi tiết yêu cầu ứng viên")));
    }

    @Test
    @DisplayName("S3-02: Request changes without comments returns 400 Bad Request")
    void requestChangesWithoutCommentReturnsBadRequest() throws Exception {
        java.util.Map<String, String> request = java.util.Map.of("comment", "   ");

        mvc.perform(post("/api/requisitions/" + requisition.getId() + "/request-changes")
                        .header("Authorization", token(approverUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")));
    }

    @Test
    @DisplayName("Defect 4: Admin cannot approve requisition when not assigned as step approver")
    void adminCannotApproveRequisitionWhenNotAssigned() throws Exception {
        ApproveRequisitionRequest request = new ApproveRequisitionRequest("Admin duyệt vượt cấp");

        mvc.perform(put("/api/requisitions/" + requisition.getId() + "/approve")
                        .header("Authorization", token(adminUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Defect 1 & 2: Unassigned Approver cannot view detail, approval history, or approve requisition")
    void unassignedApproverCannotViewOrActOnRequisition() throws Exception {
        // Detail view -> 403 Forbidden
        mvc.perform(get("/api/requisitions/" + requisition.getId())
                        .header("Authorization", token(unassignedApprover)))
                .andExpect(status().isForbidden());

        // Approval history view -> 403 Forbidden
        mvc.perform(get("/api/requisitions/" + requisition.getId() + "/approval-history")
                        .header("Authorization", token(unassignedApprover)))
                .andExpect(status().isForbidden());

        // Approve action -> 403 Forbidden
        ApproveRequisitionRequest request = new ApproveRequisitionRequest("Người ngoài duyệt");
        mvc.perform(put("/api/requisitions/" + requisition.getId() + "/approve")
                        .header("Authorization", token(unassignedApprover))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Defect 1: Assigned Approver can view requisition detail within assigned scope")
    void assignedApproverCanViewRequisitionDetail() throws Exception {
        mvc.perform(get("/api/requisitions/" + requisition.getId())
                        .header("Authorization", token(approverUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(requisition.getId().intValue())));
    }
}
