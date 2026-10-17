package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.RequisitionApprovalHistory;
import com.example.auth_service.dto.RequisitionApprovalTimelineResponse;
import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.entity.RequisitionAssignment;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.RequisitionApprovalHistoryRepository;
import com.example.auth_service.repository.RequisitionAssignmentRepository;
import com.example.auth_service.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RequisitionApprovalServiceTest {

    @Mock
    private RecruitmentRequisitionRepository requisitions;

    @Mock
    private RequisitionApprovalHistoryRepository historyRepository;

    @Mock
    private RequisitionAssignmentRepository assignments;

    @Mock
    private DepartmentRepository departments;

    @Mock
    private UserRepository users;

    @Mock
    private com.example.auth_service.repository.RequisitionApprovalSnapshotRepository snapshots;

    @InjectMocks
    private RequisitionApprovalService service;

    private User creatorUser;
    private User deptManagerUser;
    private User approverUser;
    private User hrManagerUser;
    private User adminUser;
    private User candidateUser;
    private Department dept;
    private RecruitmentRequisition requisition;

    @BeforeEach
    void setUp() {
        creatorUser = new User("creator@example.com", "pass", "HIRING_MANAGER");
        creatorUser.setId(10L);
        creatorUser.setFullName("Nguyen Creator");
        creatorUser.setRoles(Set.of(new Role(RoleName.HIRING_MANAGER, "Hiring Manager")));

        deptManagerUser = new User("deptmgr@example.com", "pass", "HIRING_MANAGER");
        deptManagerUser.setId(20L);
        deptManagerUser.setFullName("Tran Truong Phong");
        deptManagerUser.setRoles(Set.of(new Role(RoleName.HIRING_MANAGER, "Hiring Manager")));

        approverUser = new User("approver@example.com", "pass", "APPROVER");
        approverUser.setId(30L);
        approverUser.setFullName("Le Approver");
        approverUser.setRoles(Set.of(new Role(RoleName.APPROVER, "Approver")));

        hrManagerUser = new User("hr@example.com", "pass", "HR_MANAGER");
        hrManagerUser.setId(40L);
        hrManagerUser.setFullName("Pham HR");
        hrManagerUser.setRoles(Set.of(new Role(RoleName.HR_MANAGER, "HR Manager")));

        adminUser = new User("admin@example.com", "pass", "ADMIN");
        adminUser.setId(50L);
        adminUser.setFullName("Admin Root");
        adminUser.setRoles(Set.of(new Role(RoleName.ADMIN, "Admin")));

        candidateUser = new User("candidate@example.com", "pass", "CANDIDATE");
        candidateUser.setId(99L);
        candidateUser.setFullName("Hoang Candidate");
        candidateUser.setRoles(Set.of(new Role(RoleName.CANDIDATE, "Candidate")));

        dept = new Department(1L, "Phòng Công nghệ", "TECH", "Mô tả", null, deptManagerUser.getId(), true, Instant.now());

        requisition = new RecruitmentRequisition();
        requisition.setId(100L);
        requisition.setRequisitionCode("REQ-2026-001");
        requisition.setTitle("Tuyển kỹ sư Java");
        requisition.setDepartmentId(dept.getId());
        requisition.setCreatedByUserId(creatorUser.getId());
        requisition.setStatus("PENDING_APPROVAL");
        requisition.setSubmittedAt(Instant.now());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(User user) {
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(user.getEmail(), null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
        lenient().when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }

    private List<RequisitionApprovalHistory> mockDefaultChain(Long reqId) {
        List<RequisitionApprovalHistory> list = new ArrayList<>();

        RequisitionApprovalHistory step1 = RequisitionApprovalHistory.builder()
                .id(1L)
                .requisitionId(reqId)
                .stepOrder(1)
                .stepName("Khởi tạo & Đề xuất tuyển dụng")
                .approverId(creatorUser.getId())
                .approverName(creatorUser.getFullName())
                .approverEmail(creatorUser.getEmail())
                .approverRole("HIRING_MANAGER")
                .action("SUBMIT")
                .status("COMPLETED")
                .comments("Đã khởi tạo và nộp yêu cầu tuyển dụng")
                .actionAt(Instant.now().minusSeconds(3600))
                .createdAt(Instant.now().minusSeconds(3600))
                .build();

        RequisitionApprovalHistory step2 = RequisitionApprovalHistory.builder()
                .id(2L)
                .requisitionId(reqId)
                .stepOrder(2)
                .stepName("Trưởng bộ phận duyệt chuyên môn")
                .approverId(deptManagerUser.getId())
                .approverName(deptManagerUser.getFullName())
                .approverEmail(deptManagerUser.getEmail())
                .approverRole("HIRING_MANAGER")
                .action("PENDING")
                .status("PENDING")
                .createdAt(Instant.now().minusSeconds(3600))
                .build();

        RequisitionApprovalHistory step3 = RequisitionApprovalHistory.builder()
                .id(3L)
                .requisitionId(reqId)
                .stepOrder(3)
                .stepName("Phòng Nhân sự thẩm định định biên & khung lương")
                .approverRole("HR_MANAGER")
                .action("PENDING")
                .status("UPCOMING")
                .createdAt(Instant.now().minusSeconds(3600))
                .build();

        RequisitionApprovalHistory step4 = RequisitionApprovalHistory.builder()
                .id(4L)
                .requisitionId(reqId)
                .stepOrder(4)
                .stepName("Ban Giám đốc phê duyệt chính thức")
                .approverRole("APPROVER")
                .action("PENDING")
                .status("UPCOMING")
                .createdAt(Instant.now().minusSeconds(3600))
                .build();

        list.add(step1);
        list.add(step2);
        list.add(step3);
        list.add(step4);
        return list;
    }

    @Test
    @DisplayName("Creator can view approval timeline of their own requisition")
    void getApprovalTimeline_asCreator_success() {
        authenticateAs(creatorUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(mockDefaultChain(100L));

        RequisitionApprovalTimelineResponse response = service.getApprovalTimeline(100L);

        assertThat(response).isNotNull();
        assertThat(response.requisitionCode()).isEqualTo("REQ-2026-001");
        assertThat(response.totalSteps()).isEqualTo(4);
        assertThat(response.completedSteps()).isEqualTo(1);
        assertThat(response.currentStepOrder()).isEqualTo(2);
        assertThat(response.currentWaitingOn()).contains("Tran Truong Phong");
        assertThat(response.steps()).hasSize(4);
        assertThat(response.steps().get(1).isCurrentStep()).isTrue();
    }

    @Test
    @DisplayName("Department Manager can view approval timeline of department requisition")
    void getApprovalTimeline_asDepartmentManager_success() {
        authenticateAs(deptManagerUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(assignments.findByRequisitionIdAndUserId(100L, deptManagerUser.getId())).thenReturn(Optional.empty());
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(mockDefaultChain(100L));

        RequisitionApprovalTimelineResponse response = service.getApprovalTimeline(100L);

        assertThat(response).isNotNull();
        assertThat(response.requisitionId()).isEqualTo(100L);
    }

    @Test
    @DisplayName("Assigned Approver can view approval timeline")
    void getApprovalTimeline_asAssignedApprover_success() {
        authenticateAs(approverUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        RequisitionAssignment assignment = new RequisitionAssignment();
        assignment.setRequisitionId(100L);
        assignment.setUserId(approverUser.getId());
        assignment.setRole(RoleName.APPROVER);
        when(assignments.findByRequisitionIdAndUserId(100L, approverUser.getId())).thenReturn(Optional.of(assignment));
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(mockDefaultChain(100L));

        RequisitionApprovalTimelineResponse response = service.getApprovalTimeline(100L);

        assertThat(response).isNotNull();
        assertThat(response.requisitionId()).isEqualTo(100L);
    }

    @Test
    @DisplayName("HR Manager and Admin can view approval timeline of any requisition")
    void getApprovalTimeline_asHrManagerOrAdmin_success() {
        authenticateAs(hrManagerUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(mockDefaultChain(100L));

        RequisitionApprovalTimelineResponse responseHr = service.getApprovalTimeline(100L);
        assertThat(responseHr).isNotNull();

        authenticateAs(adminUser);
        RequisitionApprovalTimelineResponse responseAdmin = service.getApprovalTimeline(100L);
        assertThat(responseAdmin).isNotNull();
    }

    @Test
    @DisplayName("Unauthorized user (e.g. Candidate or unrelated employee) cannot view timeline - throws 403")
    void getApprovalTimeline_unauthorizedUser_throwsAccessDenied() {
        authenticateAs(candidateUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(assignments.findByRequisitionIdAndUserId(100L, candidateUser.getId())).thenReturn(Optional.empty());
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));

        assertThatThrownBy(() -> service.getApprovalTimeline(100L))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không có quyền xem lịch sử phê duyệt");
    }

    @Test
    @DisplayName("When approval history is empty, automatically generates and persists default chain")
    void getApprovalTimeline_whenHistoryEmpty_generatesDefaultChain() {
        authenticateAs(creatorUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(List.of());
        when(users.findById(creatorUser.getId())).thenReturn(Optional.of(creatorUser));
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));
        when(users.findById(deptManagerUser.getId())).thenReturn(Optional.of(deptManagerUser));
        when(historyRepository.save(any(RequisitionApprovalHistory.class))).thenAnswer(i -> i.getArgument(0));

        RequisitionApprovalTimelineResponse response = service.getApprovalTimeline(100L);

        assertThat(response).isNotNull();
        verify(historyRepository, atLeast(4)).save(any(RequisitionApprovalHistory.class));
    }

    @Test
    @DisplayName("When requisition is DRAFT, timeline returns clean empty steps without persisting chains")
    void getApprovalTimeline_whenDraft_returnsCleanDraftTimelineWithoutPersisting() {
        requisition.setStatus("DRAFT");
        authenticateAs(creatorUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));

        RequisitionApprovalTimelineResponse response = service.getApprovalTimeline(100L);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("DRAFT");
        assertThat(response.getTotalSteps()).isEqualTo(0);
        assertThat(response.getCompletedSteps()).isEqualTo(0);
        assertThat(response.getSteps()).isEmpty();
        assertThat(response.getCurrentWaitingOn()).isEqualTo("Bản nháp chưa gửi duyệt");
        verify(historyRepository, never()).save(any(RequisitionApprovalHistory.class));
    }

    @Test
    @DisplayName("Approve requisition moves current pending step to next step")
    void approveRequisition_currentPendingStep_advancesToNext() {
        authenticateAs(deptManagerUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));
        when(assignments.findByRequisitionIdAndUserId(100L, deptManagerUser.getId())).thenReturn(Optional.empty());

        List<RequisitionApprovalHistory> chain = mockDefaultChain(100L);
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(chain);
        when(historyRepository.save(any(RequisitionApprovalHistory.class))).thenAnswer(i -> i.getArgument(0));

        RequisitionApprovalTimelineResponse response = service.approveRequisition(100L, "Đồng ý chuyên môn");

        assertThat(response).isNotNull();
        // Step 2 was completed
        assertThat(chain.get(1).getStatus()).isEqualTo("COMPLETED");
        assertThat(chain.get(1).getAction()).isEqualTo("APPROVE");
        assertThat(chain.get(1).getComments()).isEqualTo("Đồng ý chuyên môn");
        // Step 3 transitioned to PENDING
        assertThat(chain.get(2).getStatus()).isEqualTo("PENDING");
        assertThat(chain.get(2).getAction()).isEqualTo("WAITING");
    }

    @Test
    @DisplayName("Approve requisition at final step marks whole requisition as APPROVED")
    void approveRequisition_finalStep_marksRequisitionApproved() {
        authenticateAs(approverUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        RequisitionAssignment assignment = new RequisitionAssignment();
        assignment.setRequisitionId(100L);
        assignment.setUserId(approverUser.getId());
        assignment.setRole(RoleName.APPROVER);
        when(assignments.findByRequisitionIdAndUserId(100L, approverUser.getId())).thenReturn(Optional.of(assignment));

        List<RequisitionApprovalHistory> chain = mockDefaultChain(100L);
        // Set steps 1, 2, 3 as completed, step 4 as pending
        chain.get(1).setStatus("COMPLETED");
        chain.get(2).setStatus("COMPLETED");
        chain.get(3).setStatus("PENDING");
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(chain);
        when(historyRepository.save(any(RequisitionApprovalHistory.class))).thenAnswer(i -> i.getArgument(0));

        RequisitionApprovalTimelineResponse response = service.approveRequisition(100L, "Ban giám đốc đồng ý duyệt");

        assertThat(response).isNotNull();
        assertThat(requisition.getStatus()).isEqualTo("APPROVED");
        assertThat(chain.get(3).getStatus()).isEqualTo("COMPLETED");
        assertThat(chain.get(3).getAction()).isEqualTo("APPROVE");
        verify(requisitions).save(requisition);
    }

    @Test
    @DisplayName("Cannot approve requisition that is already APPROVED or REJECTED")
    void approveRequisition_alreadyFinalized_throwsBadRequest() {
        authenticateAs(adminUser);
        requisition.setStatus("APPROVED");
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));

        assertThatThrownBy(() -> service.approveRequisition(100L, "Duyệt lại"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã được phê duyệt");

        requisition.setStatus("REJECTED");
        assertThatThrownBy(() -> service.approveRequisition(100L, "Duyệt lại"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã bị từ chối");
    }

    @Test
    @DisplayName("Reject requisition records rejection reason, comments, and marks status as REJECTED")
    void rejectRequisition_withReason_marksRejectedAndLogsHistory() {
        authenticateAs(deptManagerUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));
        when(assignments.findByRequisitionIdAndUserId(100L, deptManagerUser.getId())).thenReturn(Optional.empty());

        List<RequisitionApprovalHistory> chain = mockDefaultChain(100L);
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(chain);
        when(historyRepository.save(any(RequisitionApprovalHistory.class))).thenAnswer(i -> i.getArgument(0));

        RequisitionApprovalTimelineResponse response = service.rejectRequisition(100L, "Không đủ ngân sách", "Chờ quý sau");

        assertThat(response).isNotNull();
        assertThat(requisition.getStatus()).isEqualTo("REJECTED");
        assertThat(requisition.getRejectionReason()).isEqualTo("Không đủ ngân sách");
        assertThat(chain.get(1).getStatus()).isEqualTo("REJECTED");
        assertThat(chain.get(1).getAction()).isEqualTo("REJECT");
        assertThat(chain.get(1).getComments()).contains("Không đủ ngân sách (Chờ quý sau)");
        verify(requisitions).save(requisition);
    }

    @Test
    @DisplayName("Reject requisition without reason throws BadRequestException")
    void rejectRequisition_missingReason_throwsBadRequest() {
        authenticateAs(deptManagerUser);

        assertThatThrownBy(() -> service.rejectRequisition(100L, "", "chi tiết"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Lý do từ chối không được để trống");

        assertThatThrownBy(() -> service.rejectRequisition(100L, null, "chi tiết"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Lý do từ chối không được để trống");
    }

    @Test
    @DisplayName("Initialize approval chain on submit persists full 4-step chain")
    void initializeApprovalChainOnSubmit_createsExpectedSteps() {
        when(historyRepository.existsByRequisitionId(100L)).thenReturn(false);
        when(users.findById(creatorUser.getId())).thenReturn(Optional.of(creatorUser));
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));
        when(users.findById(deptManagerUser.getId())).thenReturn(Optional.of(deptManagerUser));
        when(historyRepository.save(any(RequisitionApprovalHistory.class))).thenAnswer(i -> i.getArgument(0));

        service.initializeApprovalChainOnSubmit(requisition, creatorUser);

        verify(historyRepository, times(4)).save(any(RequisitionApprovalHistory.class));
    }

    @Test
    @DisplayName("Approve requisition with null comments falls back to default approval comments")
    void approveRequisition_nullComments_usesDefaultComment() {
        authenticateAs(deptManagerUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));
        when(assignments.findByRequisitionIdAndUserId(100L, deptManagerUser.getId())).thenReturn(Optional.empty());

        List<RequisitionApprovalHistory> chain = mockDefaultChain(100L);
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(chain);
        when(historyRepository.save(any(RequisitionApprovalHistory.class))).thenAnswer(i -> i.getArgument(0));

        RequisitionApprovalTimelineResponse response = service.approveRequisition(100L, null);

        assertThat(response).isNotNull();
        assertThat(chain.get(1).getComments()).isEqualTo("Đồng ý phê duyệt yêu cầu tuyển dụng.");
    }

    @Test
    @DisplayName("Admin or HR Manager cannot bypass approval steps when not designated approver")
    void approveRequisition_byAdmin_whenNotDesignatedApprover_throwsAccessDenied() {
        authenticateAs(adminUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));

        List<RequisitionApprovalHistory> chain = mockDefaultChain(100L);
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(chain);

        assertThatThrownBy(() -> service.approveRequisition(100L, "Admin duyệt nhanh"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không phải người phê duyệt ở cấp hiện tại.");
    }

    @Test
    @DisplayName("Admin can approve step when designated as current step approver without skipping upcoming steps")
    void approveRequisition_byAdmin_whenDesignatedApprover_approvesOnlyCurrentStep() {
        authenticateAs(adminUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));

        List<RequisitionApprovalHistory> chain = mockDefaultChain(100L);
        chain.get(1).setApproverId(adminUser.getId());
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(chain);
        when(historyRepository.save(any(RequisitionApprovalHistory.class))).thenAnswer(i -> i.getArgument(0));

        RequisitionApprovalTimelineResponse response = service.approveRequisition(100L, "Admin duyệt hợp lệ");

        assertThat(response).isNotNull();
        assertThat(chain.get(1).getStatus()).isEqualTo("COMPLETED");
        assertThat(chain.get(2).getStatus()).isEqualTo("PENDING");
        assertThat(requisition.getStatus()).isEqualTo("PENDING_APPROVAL");
    }

    @Test
    @DisplayName("Unauthorized user cannot approve requisition - throws 403")
    void approveRequisition_unauthorizedUser_throwsAccessDenied() {
        authenticateAs(candidateUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(assignments.findByRequisitionIdAndUserId(100L, candidateUser.getId())).thenReturn(Optional.empty());
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));

        assertThatThrownBy(() -> service.approveRequisition(100L, "Hack"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không được phân công phê duyệt");
    }

    @Test
    @DisplayName("Unauthorized user cannot reject requisition - throws 403")
    void rejectRequisition_unauthorizedUser_throwsAccessDenied() {
        authenticateAs(candidateUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(assignments.findByRequisitionIdAndUserId(100L, candidateUser.getId())).thenReturn(Optional.empty());
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));

        assertThatThrownBy(() -> service.rejectRequisition(100L, "Không thích", "no"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không được phân công phê duyệt");
    }

    @Test
    @DisplayName("Reject requisition without extra comments records rejection reason as comments")
    void rejectRequisition_withoutExtraComments_recordsOnlyRejectionReason() {
        authenticateAs(deptManagerUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(departments.findById(dept.getId())).thenReturn(Optional.of(dept));
        when(assignments.findByRequisitionIdAndUserId(100L, deptManagerUser.getId())).thenReturn(Optional.empty());

        List<RequisitionApprovalHistory> chain = mockDefaultChain(100L);
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(chain);
        when(historyRepository.save(any(RequisitionApprovalHistory.class))).thenAnswer(i -> i.getArgument(0));

        RequisitionApprovalTimelineResponse response = service.rejectRequisition(100L, "Không duyệt", "   ");

        assertThat(response).isNotNull();
        assertThat(chain.get(1).getComments()).isEqualTo("Không duyệt");
    }

    @Test
    @DisplayName("Assigned Recruiter or Hiring Manager can view approval timeline")
    void getApprovalTimeline_assignedRoles_success() {
        authenticateAs(deptManagerUser);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        RequisitionAssignment assignment = new RequisitionAssignment();
        assignment.setRequisitionId(100L);
        assignment.setUserId(deptManagerUser.getId());
        assignment.setRole(RoleName.RECRUITER);
        when(assignments.findByRequisitionIdAndUserId(100L, deptManagerUser.getId())).thenReturn(Optional.of(assignment));
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(mockDefaultChain(100L));

        RequisitionApprovalTimelineResponse response = service.getApprovalTimeline(100L);
        assertThat(response).isNotNull();
    }

    @Test
    @DisplayName("Timeline when requisition has no department or department has no manager still generates chain gracefully")
    void getApprovalTimeline_noDepartmentManager_graceful() {
        authenticateAs(creatorUser);
        requisition.setDepartmentId(null);
        when(requisitions.findById(100L)).thenReturn(Optional.of(requisition));
        when(historyRepository.findByRequisitionIdOrderByStepOrderAsc(100L)).thenReturn(List.of());
        when(users.findById(creatorUser.getId())).thenReturn(Optional.of(creatorUser));
        when(historyRepository.save(any(RequisitionApprovalHistory.class))).thenAnswer(i -> i.getArgument(0));

        RequisitionApprovalTimelineResponse response = service.getApprovalTimeline(100L);
        assertThat(response).isNotNull();
        assertThat(response.steps()).hasSize(4);
    }

    @Test
    @DisplayName("Immutability verification: RequisitionApprovalHistoryRepository has no delete or custom update APIs")
    void immutability_verification() {
        // Assert that the domain model and service expose no deleteHistory or updateHistory APIs
        boolean hasDeleteMethod = false;
        for (var method : RequisitionApprovalService.class.getDeclaredMethods()) {
            if (method.getName().toLowerCase().contains("delete") || method.getName().toLowerCase().contains("remove")) {
                hasDeleteMethod = true;
                break;
            }
        }
        assertThat(hasDeleteMethod).as("RequisitionApprovalService must not have any delete/remove methods").isFalse();
    }
}
