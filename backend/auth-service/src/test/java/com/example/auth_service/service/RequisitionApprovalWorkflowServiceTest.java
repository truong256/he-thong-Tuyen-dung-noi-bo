package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.RequisitionApprovalTimelineResponse;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RequisitionApprovalWorkflowServiceTest {

    @Mock
    private RequisitionApprovalConfigurationRepository configurations;

    @Mock
    private RequisitionApprovalConfigurationStepRepository configurationSteps;

    @Mock
    private RequisitionApprovalSnapshotRepository snapshots;

    @Mock
    private RequisitionApprovalLogRepository approvalLogs;

    @Mock
    private RecruitmentRequisitionRepository requisitions;

    @Mock
    private UserRepository users;

    @Mock
    private DepartmentRepository departments;

    @InjectMocks
    private RequisitionApprovalWorkflowService workflowService;

    private Department itDept;
    private User creatorUser;
    private User deptManager;
    private User bodApprover;
    private User normalUser;
    private User hrManagerUser;
    private RequisitionApprovalConfiguration configV1;
    private RequisitionApprovalConfigurationStep step1;
    private RequisitionApprovalConfigurationStep step2;

    @BeforeEach
    void setUp() {
        itDept = new Department();
        itDept.setId(1L);
        itDept.setName("Phòng Công Nghệ Thông Tin");

        Role approverRole = new Role();
        approverRole.setName(RoleName.APPROVER);

        Role hrRole = new Role();
        hrRole.setName(RoleName.HR_MANAGER);

        Role recruiterRole = new Role();
        recruiterRole.setName(RoleName.RECRUITER);

        creatorUser = new User();
        creatorUser.setId(10L);
        creatorUser.setEmail("creator@company.com");
        creatorUser.setFullName("Nguyen Van Creator");
        creatorUser.setStatus("ACTIVE");
        creatorUser.setRoles(Set.of(recruiterRole));

        deptManager = new User();
        deptManager.setId(20L);
        deptManager.setEmail("dept_manager@company.com");
        deptManager.setFullName("Tran Dept Manager");
        deptManager.setStatus("ACTIVE");
        deptManager.setRoles(Set.of(approverRole));

        bodApprover = new User();
        bodApprover.setId(30L);
        bodApprover.setEmail("bod@company.com");
        bodApprover.setFullName("Pham BOD Approver");
        bodApprover.setStatus("ACTIVE");
        bodApprover.setRoles(Set.of(approverRole));

        normalUser = new User();
        normalUser.setId(40L);
        normalUser.setEmail("stranger@company.com");
        normalUser.setFullName("Le Stranger");
        normalUser.setStatus("ACTIVE");
        normalUser.setRoles(Set.of(recruiterRole));

        hrManagerUser = new User();
        hrManagerUser.setId(50L);
        hrManagerUser.setEmail("hr_manager@company.com");
        hrManagerUser.setFullName("Hoang HR Manager");
        hrManagerUser.setStatus("ACTIVE");
        hrManagerUser.setRoles(Set.of(hrRole));

        configV1 = new RequisitionApprovalConfiguration();
        configV1.setId(100L);
        configV1.setDepartmentId(itDept.getId());
        configV1.setVersion(1);
        configV1.setActive(true);

        step1 = new RequisitionApprovalConfigurationStep();
        step1.setId(1001L);
        step1.setConfigurationId(configV1.getId());
        step1.setStepOrder(1);
        step1.setMinimumSalary(0L);
        step1.setApproverUserId(deptManager.getId());

        step2 = new RequisitionApprovalConfigurationStep();
        step2.setId(1002L);
        step2.setConfigurationId(configV1.getId());
        step2.setStepOrder(2);
        step2.setMinimumSalary(30_000_000L);
        step2.setApproverUserId(bodApprover.getId());
    }

    // =========================================================================
    // TIÊU CHÍ 2: XỬ LÝ NHẤT QUÁN KHI CHƯA CÓ CẤU HÌNH & QUY TẮC VƯỢT HẠN MỨC
    // =========================================================================

    @Test
    @DisplayName("TC01 - Chưa có cấu hình phê duyệt: ném BadRequestException rõ ràng, không để lửng")
    void snapshotForSubmission_noActiveConfig_throwsBadRequest() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(1L);
        req.setDepartmentId(itDept.getId());

        when(configurations.findByDepartmentIdAndActiveTrue(itDept.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.snapshotForSubmission(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Phòng ban chưa có cấu hình luồng phê duyệt đang hoạt động");
    }

    @Test
    @DisplayName("TC02 - Test biên lương: Lương đề xuất = 29.999.999 VNĐ (< 30M) chỉ tạo 1 cấp phê duyệt (Cấp 1)")
    void snapshotForSubmission_boundaryBelow30M_createsSingleStep() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(2L);
        req.setDepartmentId(itDept.getId());
        req.setSalaryMin(20_000_000L);
        req.setSalaryMax(29_999_999L);

        when(configurations.findByDepartmentIdAndActiveTrue(itDept.getId())).thenReturn(Optional.of(configV1));
        when(snapshots.existsByRequisitionId(req.getId())).thenReturn(false);
        when(configurationSteps.findAllByConfigurationIdOrderByStepOrderAsc(configV1.getId()))
                .thenReturn(List.of(step1, step2));
        when(users.findById(deptManager.getId())).thenReturn(Optional.of(deptManager));

        boolean result = workflowService.snapshotForSubmission(req);
        assertThat(result).isTrue();

        verify(snapshots).saveAll(argThat((List<RequisitionApprovalSnapshot> list) -> {
            assertThat(list).hasSize(1);
            assertThat(list.get(0).getStepOrder()).isEqualTo(1);
            assertThat(list.get(0).getApproverUserId()).isEqualTo(deptManager.getId());
            assertThat(list.get(0).getMinimumSalary()).isEqualTo(0L);
            return true;
        }));
    }

    @Test
    @DisplayName("TC03 - Test biên lương: Lương đề xuất đúng bằng 30.000.000 VNĐ áp dụng cả Cấp 1 và Cấp 2")
    void snapshotForSubmission_boundaryExact30M_createsTwoSteps() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(3L);
        req.setDepartmentId(itDept.getId());
        req.setSalaryMin(15_000_000L);
        req.setSalaryMax(30_000_000L);

        when(configurations.findByDepartmentIdAndActiveTrue(itDept.getId())).thenReturn(Optional.of(configV1));
        when(snapshots.existsByRequisitionId(req.getId())).thenReturn(false);
        when(configurationSteps.findAllByConfigurationIdOrderByStepOrderAsc(configV1.getId()))
                .thenReturn(List.of(step1, step2));
        when(users.findById(deptManager.getId())).thenReturn(Optional.of(deptManager));
        when(users.findById(bodApprover.getId())).thenReturn(Optional.of(bodApprover));

        boolean result = workflowService.snapshotForSubmission(req);
        assertThat(result).isTrue();

        verify(snapshots).saveAll(argThat((List<RequisitionApprovalSnapshot> list) -> {
            assertThat(list).hasSize(2);
            assertThat(list.get(0).getStepOrder()).isEqualTo(1);
            assertThat(list.get(1).getStepOrder()).isEqualTo(2);
            assertThat(list.get(1).getMinimumSalary()).isEqualTo(30_000_000L);
            return true;
        }));
    }

    @Test
    @DisplayName("TC04 - Test biên lương: Lương đề xuất = 30.000.001 VNĐ (> 30M) áp dụng đầy đủ 2 cấp phê duyệt")
    void snapshotForSubmission_boundaryAbove30M_createsTwoSteps() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(4L);
        req.setDepartmentId(itDept.getId());
        req.setSalaryMin(30_000_001L);
        req.setSalaryMax(30_000_001L);

        when(configurations.findByDepartmentIdAndActiveTrue(itDept.getId())).thenReturn(Optional.of(configV1));
        when(snapshots.existsByRequisitionId(req.getId())).thenReturn(false);
        when(configurationSteps.findAllByConfigurationIdOrderByStepOrderAsc(configV1.getId()))
                .thenReturn(List.of(step1, step2));
        when(users.findById(deptManager.getId())).thenReturn(Optional.of(deptManager));
        when(users.findById(bodApprover.getId())).thenReturn(Optional.of(bodApprover));

        boolean result = workflowService.snapshotForSubmission(req);
        assertThat(result).isTrue();

        verify(snapshots).saveAll(argThat((List<RequisitionApprovalSnapshot> list) -> list.size() == 2));
    }

    // =========================================================================
    // TIÊU CHÍ 3: TEST TÍNH BẤT BIẾN SNAPSHOT V1/V2
    // =========================================================================

    @Test
    @DisplayName("TC05 - Tính bất biến Snapshot V1 vs V2: Requisition cũ giữ nguyên cấu hình V1 khi V2 được kích hoạt")
    void snapshotImmutability_v1PreservedAfterV2Activated() {
        // Requisition 10 được tạo lúc Config V1
        RequisitionApprovalSnapshot snapV1Step1 = new RequisitionApprovalSnapshot();
        snapV1Step1.setRequisitionId(10L);
        snapV1Step1.setConfigurationId(configV1.getId());
        snapV1Step1.setConfigurationVersion(1);
        snapV1Step1.setStepOrder(1);
        snapV1Step1.setApproverUserId(deptManager.getId());
        snapV1Step1.setStatus("APPROVED");

        when(snapshots.findAllByRequisitionIdOrderByStepOrderAsc(10L)).thenReturn(List.of(snapV1Step1));

        List<RequisitionApprovalSnapshot> existingSnapshots = workflowService.getSnapshot(10L);
        assertThat(existingSnapshots).hasSize(1);
        assertThat(existingSnapshots.get(0).getConfigurationVersion()).isEqualTo(1);
        assertThat(existingSnapshots.get(0).getApproverUserId()).isEqualTo(deptManager.getId());

        // Tạo Requisition 20 lúc Config V2 (thay đổi approver sang hrManagerUser)
        RequisitionApprovalConfiguration configV2 = new RequisitionApprovalConfiguration();
        configV2.setId(200L);
        configV2.setDepartmentId(itDept.getId());
        configV2.setVersion(2);
        configV2.setActive(true);

        RequisitionApprovalConfigurationStep stepV2 = new RequisitionApprovalConfigurationStep();
        stepV2.setId(2001L);
        stepV2.setConfigurationId(configV2.getId());
        stepV2.setStepOrder(1);
        stepV2.setMinimumSalary(0L);
        stepV2.setApproverUserId(hrManagerUser.getId());

        RecruitmentRequisition req20 = new RecruitmentRequisition();
        req20.setId(20L);
        req20.setDepartmentId(itDept.getId());
        req20.setSalaryMax(15_000_000L);

        when(configurations.findByDepartmentIdAndActiveTrue(itDept.getId())).thenReturn(Optional.of(configV2));
        when(snapshots.existsByRequisitionId(20L)).thenReturn(false);
        when(configurationSteps.findAllByConfigurationIdOrderByStepOrderAsc(configV2.getId()))
                .thenReturn(List.of(stepV2));
        when(users.findById(hrManagerUser.getId())).thenReturn(Optional.of(hrManagerUser));

        workflowService.snapshotForSubmission(req20);

        // Xác nhận Snapshot mới ghi nhận Version 2
        verify(snapshots).saveAll(argThat((List<RequisitionApprovalSnapshot> list) -> {
            assertThat(list.get(0).getConfigurationVersion()).isEqualTo(2);
            assertThat(list.get(0).getApproverUserId()).isEqualTo(hrManagerUser.getId());
            return true;
        }));
    }

    // =========================================================================
    // TIÊU CHÍ 1 & 3: TIMELINE TỪ SNAPSHOT THỰC TẾ & PHÂN QUYỀN XEM
    // =========================================================================

    @Test
    @DisplayName("TC06 - Timeline: Trả về chính xác số cấp thực tế từ Snapshot (2 cấp thay vì hardcode 4 cấp)")
    void getTimelineResponse_returnsActualStepsFromSnapshot() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(5L);
        req.setRequisitionCode("REQ-2026-0005");
        req.setTitle("Senior Java Backend Engineer");
        req.setDepartmentId(itDept.getId());
        req.setCreatedByUserId(creatorUser.getId());
        req.setStatus("PENDING_APPROVAL");

        RequisitionApprovalSnapshot s1 = new RequisitionApprovalSnapshot();
        s1.setId(501L);
        s1.setRequisitionId(5L);
        s1.setStepOrder(1);
        s1.setMinimumSalary(0L);
        s1.setApproverUserId(deptManager.getId());
        s1.setStatus("APPROVED");
        s1.setApprovedAt(Instant.now());

        RequisitionApprovalSnapshot s2 = new RequisitionApprovalSnapshot();
        s2.setId(502L);
        s2.setRequisitionId(5L);
        s2.setStepOrder(2);
        s2.setMinimumSalary(30_000_000L);
        s2.setApproverUserId(bodApprover.getId());
        s2.setStatus("PENDING");

        when(requisitions.findById(5L)).thenReturn(Optional.of(req));
        when(users.findById(creatorUser.getId())).thenReturn(Optional.of(creatorUser));
        when(snapshots.findAllByRequisitionIdOrderByStepOrderAsc(5L)).thenReturn(List.of(s1, s2));
        when(departments.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(users.findById(deptManager.getId())).thenReturn(Optional.of(deptManager));
        when(users.findById(bodApprover.getId())).thenReturn(Optional.of(bodApprover));

        // Người tạo xem timeline
        RequisitionApprovalTimelineResponse timeline = workflowService.getTimelineResponse(5L, creatorUser.getId());

        assertThat(timeline).isNotNull();
        assertThat(timeline.getTotalSteps()).isEqualTo(2); // Chỉ đúng 2 cấp thực tế
        assertThat(timeline.getCompletedSteps()).isEqualTo(1);
        assertThat(timeline.getSteps()).hasSize(2);
        assertThat(timeline.getSteps().get(0).getStatus()).isEqualTo("COMPLETED");
        assertThat(timeline.getSteps().get(1).getStatus()).isEqualTo("PENDING");
        assertThat(timeline.getCurrentWaitingOn()).contains("Pham BOD Approver");
    }

    @Test
    @DisplayName("TC07 - Phân quyền xem timeline: Người dùng ngoài luồng (không phải creator, approver, HR/Admin) bị chặn 403")
    void getTimelineResponse_unauthorizedUser_throwsAccessDenied() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(6L);
        req.setCreatedByUserId(creatorUser.getId());
        req.setDepartmentId(itDept.getId());

        RequisitionApprovalSnapshot s1 = new RequisitionApprovalSnapshot();
        s1.setApproverUserId(deptManager.getId());

        when(requisitions.findById(6L)).thenReturn(Optional.of(req));
        when(users.findById(normalUser.getId())).thenReturn(Optional.of(normalUser));
        when(snapshots.findAllByRequisitionIdOrderByStepOrderAsc(6L)).thenReturn(List.of(s1));

        // strangerUser cố tình truy cập timeline
        assertThatThrownBy(() -> workflowService.getTimelineResponse(6L, normalUser.getId()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không có quyền xem tiến trình phê duyệt");
    }

    @Test
    @DisplayName("TC08 - Phân quyền xem timeline: HR Manager và Approver trong snapshot được phép xem hợp lệ")
    void getTimelineResponse_hrManagerAndApproverAllowed() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(7L);
        req.setCreatedByUserId(creatorUser.getId());
        req.setDepartmentId(itDept.getId());
        req.setStatus("PENDING_APPROVAL");

        RequisitionApprovalSnapshot s1 = new RequisitionApprovalSnapshot();
        s1.setApproverUserId(deptManager.getId());
        s1.setStatus("PENDING");

        when(requisitions.findById(7L)).thenReturn(Optional.of(req));
        when(snapshots.findAllByRequisitionIdOrderByStepOrderAsc(7L)).thenReturn(List.of(s1));
        when(departments.findById(itDept.getId())).thenReturn(Optional.of(itDept));
        when(users.findById(deptManager.getId())).thenReturn(Optional.of(deptManager));

        // Approver xem
        RequisitionApprovalTimelineResponse approverView = workflowService.getTimelineResponse(7L, deptManager.getId());
        assertThat(approverView).isNotNull();

        // HR Manager xem
        when(users.findById(hrManagerUser.getId())).thenReturn(Optional.of(hrManagerUser));
        RequisitionApprovalTimelineResponse hrView = workflowService.getTimelineResponse(7L, hrManagerUser.getId());
        assertThat(hrView).isNotNull();
    }

    // =========================================================================
    // TIÊU CHÍ 3: TEST DUYỆT TỪNG BƯỚC & TEST PHÂN QUYỀN DUYỆT
    // =========================================================================

    @Test
    @DisplayName("TC09 - Phê duyệt từng cấp: Người không phải approver cấp hiện tại gọi duyệt bị chặn 403")
    void approveCurrentStep_wrongApprover_throwsAccessDenied() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(8L);
        req.setStatus("PENDING_APPROVAL");

        RequisitionApprovalSnapshot s1 = new RequisitionApprovalSnapshot();
        s1.setStepOrder(1);
        s1.setApproverUserId(deptManager.getId());
        s1.setStatus("PENDING");

        when(snapshots.findAllByRequisitionIdOrderByStepOrderAsc(8L)).thenReturn(List.of(s1));
        when(requisitions.findById(8L)).thenReturn(Optional.of(req));
        when(snapshots.findPendingForUpdate(8L)).thenReturn(List.of(s1));
        when(users.findById(normalUser.getId())).thenReturn(Optional.of(normalUser));

        assertThatThrownBy(() -> workflowService.approveCurrentStep(8L, normalUser.getId()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không phải người phê duyệt ở cấp hiện tại");
    }

    @Test
    @DisplayName("TC10 - Phê duyệt lần lượt từng cấp: Cấp 1 duyệt xong giữ PENDING_APPROVAL, Cấp 2 duyệt xong thành APPROVED")
    void approveCurrentStep_stepByStepSuccess() {
        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(9L);
        req.setStatus("PENDING_APPROVAL");

        RequisitionApprovalSnapshot s1 = new RequisitionApprovalSnapshot();
        s1.setId(901L);
        s1.setStepOrder(1);
        s1.setApproverUserId(deptManager.getId());
        s1.setStatus("PENDING");

        RequisitionApprovalSnapshot s2 = new RequisitionApprovalSnapshot();
        s2.setId(902L);
        s2.setStepOrder(2);
        s2.setApproverUserId(bodApprover.getId());
        s2.setStatus("PENDING");

        // Bước 1: Dept Manager duyệt cấp 1
        when(snapshots.findAllByRequisitionIdOrderByStepOrderAsc(9L)).thenReturn(List.of(s1, s2));
        when(requisitions.findById(9L)).thenReturn(Optional.of(req));
        when(snapshots.findPendingForUpdate(9L)).thenReturn(List.of(s1, s2));
        when(users.findById(deptManager.getId())).thenReturn(Optional.of(deptManager));

        Optional<RecruitmentRequisition> result1 = workflowService.approveCurrentStep(9L, deptManager.getId());
        assertThat(result1).isPresent();
        assertThat(s1.getStatus()).isEqualTo("APPROVED");
        assertThat(req.getStatus()).isEqualTo("PENDING_APPROVAL"); // Vẫn chờ cấp 2

        // Bước 2: BOD duyệt cấp 2 (cấp cuối)
        s1.setStatus("APPROVED");
        when(snapshots.findPendingForUpdate(9L)).thenReturn(List.of(s2));
        when(users.findById(bodApprover.getId())).thenReturn(Optional.of(bodApprover));

        Optional<RecruitmentRequisition> result2 = workflowService.approveCurrentStep(9L, bodApprover.getId());
        assertThat(result2).isPresent();
        assertThat(s2.getStatus()).isEqualTo("APPROVED");
        assertThat(req.getStatus()).isEqualTo("APPROVED"); // Hoàn tất toàn bộ luồng
        assertThat(req.getApprovedByUserId()).isEqualTo(bodApprover.getId());
    }
}
