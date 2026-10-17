package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.BudgetAuditLog;
import com.example.auth_service.domain.sprint3.HeadcountBudget;
import com.example.auth_service.dto.budget.*;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.BudgetExceededException;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.repository.BudgetAuditLogRepository;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.HeadcountBudgetRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HeadcountBudgetServiceTest {

    @Mock
    private HeadcountBudgetRepository budgetRepository;

    @Mock
    private BudgetAuditLogRepository auditLogRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private RecruitmentRequisitionRepository requisitionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private HeadcountBudgetService budgetService;

    private User hrManager;
    private User regularAdmin;
    private User approver;
    private Department itDept;
    private HeadcountBudget budget2026;

    @BeforeEach
    void setUp() {
        Role hrRole = new Role(RoleName.HR_MANAGER, "HR Manager");
        hrManager = new User("hr@company.com", "pass");
        hrManager.setId(10L);
        hrManager.setFullName("Nguyễn Thị HR");
        hrManager.setRoles(Set.of(hrRole));
        hrManager.setRole("HR_MANAGER");

        Role adminRole = new Role(RoleName.ADMIN, "Administrator");
        regularAdmin = new User("admin@company.com", "pass");
        regularAdmin.setId(20L);
        regularAdmin.setFullName("Trần Văn Admin");
        regularAdmin.setRoles(Set.of(adminRole));
        regularAdmin.setRole("ADMIN");

        Role approverRole = new Role(RoleName.APPROVER, "Approver");
        approver = new User("approver@company.com", "pass");
        approver.setId(30L);
        approver.setFullName("Lê Người Duyệt");
        approver.setRoles(Set.of(approverRole));
        approver.setRole("APPROVER");

        itDept = new Department();
        itDept.setId(1L);
        itDept.setName("Phòng Công nghệ thông tin");
        itDept.setCode("IT");
        itDept.setActive(true);

        budget2026 = new HeadcountBudget();
        budget2026.setId(100L);
        budget2026.setDepartmentId(1L);
        budget2026.setYear(2026);
        budget2026.setHeadcountQuota(10);
        budget2026.setSalaryBudgetVnd(1_200_000_000L); // 1.2 tỷ VND / năm (100tr/tháng cho 10 người)
        budget2026.setCreatedBy(10L);
        budget2026.setUpdatedBy(10L);
        budget2026.setVersion(1);
    }

    @Test
    @DisplayName("TC01: Khai báo ngân sách thành công")
    void tc01_createBudget_success() {
        CreateBudgetRequest request = new CreateBudgetRequest(1L, 2026, 10, 1_200_000_000L, "Ngân sách 2026 IT");

        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));
        when(budgetRepository.existsByDepartmentIdAndYear(1L, 2026)).thenReturn(false);
        when(budgetRepository.save(any(HeadcountBudget.class))).thenAnswer(inv -> {
            HeadcountBudget b = inv.getArgument(0);
            b.setId(100L);
            return b;
        });

        BudgetSummaryResponse response = budgetService.create(request, hrManager);

        assertThat(response).isNotNull();
        assertThat(response.departmentId()).isEqualTo(1L);
        assertThat(response.year()).isEqualTo(2026);
        assertThat(response.headcountQuota()).isEqualTo(10);
        assertThat(response.salaryBudgetVnd()).isEqualTo(1_200_000_000L);

        verify(auditLogRepository).save(any(BudgetAuditLog.class));
    }

    @Test
    @DisplayName("TC02: Không tạo được ngân sách trùng phòng ban/năm")
    void tc02_createBudget_duplicateConflict() {
        CreateBudgetRequest request = new CreateBudgetRequest(1L, 2026, 10, 1_200_000_000L, "Trùng lặp");

        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));
        when(budgetRepository.existsByDepartmentIdAndYear(1L, 2026)).thenReturn(true);

        assertThatThrownBy(() -> budgetService.create(request, hrManager))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("đã có ngân sách năm 2026");

        verify(budgetRepository, never()).save(any());
    }

    @Test
    @DisplayName("TC03: Hiển thị đúng Headcount còn lại")
    void tc03_calculateUsageAndRemaining() {
        RecruitmentRequisition req1 = new RecruitmentRequisition();
        req1.setId(501L);
        req1.setDepartmentId(1L);
        req1.setQuantity(3);
        req1.setSalaryMax(15_000_000L); // 15 triệu / tháng
        req1.setStatus("APPROVED");
        req1.setNeededDate(LocalDate.of(2026, 3, 1));

        RecruitmentRequisition req2 = new RecruitmentRequisition();
        req2.setId(502L);
        req2.setDepartmentId(1L);
        req2.setQuantity(2);
        req2.setProposedMaxSalary(20_000_000L); // 20 triệu / tháng
        req2.setStatus("OPEN");
        req2.setNeededDate(LocalDate.of(2026, 5, 1));

        when(requisitionRepository.findByDepartmentIdAndStatusIn(eq(1L), anyCollection()))
                .thenReturn(List.of(req1, req2));

        HeadcountBudgetService.BudgetUsage usage = budgetService.calculateUsage(1L, 2026, null);

        // Headcount đã dùng = 3 + 2 = 5
        assertThat(usage.headcountUsed()).isEqualTo(5);
        // Lương đã dùng = (3 * 15m * 12) + (2 * 20m * 12) = 540m + 480m = 1,020,000,000 VND
        assertThat(usage.salaryUsedVnd()).isEqualTo(1_020_000_000L);

        // Remaining = 10 - 5 = 5 headcount, Remaining Salary = 1.2B - 1.02B = 180,000,000 VND
        when(budgetRepository.findByDepartmentIdAndYear(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));

        BudgetEvaluationResponse eval = budgetService.evaluate(new BudgetEvaluationRequest(1L, 2026, 2, 5_000_000L, null));
        assertThat(eval.headcountRemaining()).isEqualTo(5);
        assertThat(eval.salaryBudgetRemainingVnd()).isEqualTo(180_000_000L);
        assertThat(eval.exceedsHeadcount()).isFalse();
        assertThat(eval.exceedsSalary()).isFalse();
        assertThat(eval.requiresOverride()).isFalse();
    }

    @Test
    @DisplayName("TC04: Yêu cầu trong hạn mức được duyệt theo luồng hợp lệ không ném ngoại lệ")
    void tc04_enforceOnApproval_withinLimit_passes() {
        when(budgetRepository.findByDepartmentIdAndYearForUpdate(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(budgetRepository.findByDepartmentIdAndYear(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));
        when(requisitionRepository.findByDepartmentIdAndStatusIn(eq(1L), anyCollection())).thenReturn(List.of());

        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(701L);
        req.setDepartmentId(1L);
        req.setQuantity(2);
        req.setSalaryMax(10_000_000L);
        req.setNeededDate(LocalDate.of(2026, 4, 1));

        // Approver duyệt yêu cầu trong hạn mức -> Không bị lỗi
        budgetService.enforceOnApproval(req, approver, null);

        verify(auditLogRepository, never()).save(any());
        assertThat(req.isBudgetOverridden()).isFalse();
    }

    @Test
    @DisplayName("TC05: Vượt Headcount bị chặn khi duyệt (ném 409 BudgetExceededException)")
    void tc05_enforceOnApproval_exceedHeadcount_throwsConflict() {
        when(budgetRepository.findByDepartmentIdAndYearForUpdate(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(budgetRepository.findByDepartmentIdAndYear(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));

        // Đã dùng 8/10
        RecruitmentRequisition existing = new RecruitmentRequisition();
        existing.setId(601L);
        existing.setDepartmentId(1L);
        existing.setQuantity(8);
        existing.setNeededDate(LocalDate.of(2026, 1, 1));
        when(requisitionRepository.findByDepartmentIdAndStatusIn(eq(1L), anyCollection())).thenReturn(List.of(existing));

        // Yêu cầu đề xuất tuyển 3 người -> Vượt 1 (còn lại 2)
        RecruitmentRequisition newReq = new RecruitmentRequisition();
        newReq.setId(702L);
        newReq.setDepartmentId(1L);
        newReq.setQuantity(3);
        newReq.setSalaryMax(5_000_000L);
        newReq.setNeededDate(LocalDate.of(2026, 6, 1));

        assertThatThrownBy(() -> budgetService.enforceOnApproval(newReq, approver, null))
                .isInstanceOf(BudgetExceededException.class)
                .satisfies(ex -> {
                    BudgetExceededException be = (BudgetExceededException) ex;
                    assertThat(be.getErrorCode()).isEqualTo("HEADCOUNT_BUDGET_EXCEEDED");
                    assertThat(be.getEvaluation().excessHeadcount()).isEqualTo(1);
                    assertThat(be.isCanOverride()).isFalse(); // approver không thể ghi đè
                });
    }

    @Test
    @DisplayName("TC06: Vượt ngân sách lương bị chặn khi duyệt")
    void tc06_enforceOnApproval_exceedSalary_throwsConflict() {
        when(budgetRepository.findByDepartmentIdAndYearForUpdate(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(budgetRepository.findByDepartmentIdAndYear(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));
        when(requisitionRepository.findByDepartmentIdAndStatusIn(eq(1L), anyCollection())).thenReturn(List.of());

        // Quota còn 10 người, nhưng lương đề xuất 1 người = 120 triệu/tháng -> 120m * 12 = 1.44 tỷ > 1.2 tỷ ngân sách
        RecruitmentRequisition newReq = new RecruitmentRequisition();
        newReq.setId(703L);
        newReq.setDepartmentId(1L);
        newReq.setQuantity(1);
        newReq.setProposedMaxSalary(120_000_000L);
        newReq.setNeededDate(LocalDate.of(2026, 6, 1));

        assertThatThrownBy(() -> budgetService.enforceOnApproval(newReq, approver, null))
                .isInstanceOf(BudgetExceededException.class)
                .satisfies(ex -> {
                    BudgetExceededException be = (BudgetExceededException) ex;
                    assertThat(be.getEvaluation().exceedsSalary()).isTrue();
                    assertThat(be.getEvaluation().excessSalaryVnd()).isEqualTo(240_000_000L);
                });
    }

    @Test
    @DisplayName("TC07: HR Manager ghi đè thành công kèm lý do")
    void tc07_hrManager_override_success() {
        when(budgetRepository.findByDepartmentIdAndYearForUpdate(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(budgetRepository.findByDepartmentIdAndYear(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));
        when(requisitionRepository.findByDepartmentIdAndStatusIn(eq(1L), anyCollection())).thenReturn(List.of());

        RecruitmentRequisition newReq = new RecruitmentRequisition();
        newReq.setId(704L);
        newReq.setDepartmentId(1L);
        newReq.setQuantity(15); // Vượt 5 người so với quota 10
        newReq.setTitle("Tuyển kỹ sư Core AI");
        newReq.setRequisitionCode("REQ-2026-AI");
        newReq.setNeededDate(LocalDate.of(2026, 6, 1));

        String overrideReason = "Dự án trọng điểm cấp bách được Tổng Giám đốc phê duyệt bổ sung.";

        budgetService.enforceOnApproval(newReq, hrManager, overrideReason);

        assertThat(newReq.isBudgetOverridden()).isTrue();
        assertThat(newReq.getBudgetOverrideReason()).isEqualTo(overrideReason);
        verify(requisitionRepository).save(newReq);

        ArgumentCaptor<BudgetAuditLog> logCaptor = ArgumentCaptor.forClass(BudgetAuditLog.class);
        verify(auditLogRepository).save(logCaptor.capture());
        BudgetAuditLog log = logCaptor.getValue();
        assertThat(log.getAction()).isEqualTo("BUDGET_OVERRIDE");
        assertThat(log.getReason()).isEqualTo(overrideReason);
        assertThat(log.getUserId()).isEqualTo(hrManager.getId());
    }

    @Test
    @DisplayName("TC08: Vai trò Admin hoặc Approver không đủ quyền bị từ chối ghi đè (403 Forbidden)")
    void tc08_admin_cannot_override() {
        when(budgetRepository.findByDepartmentIdAndYearForUpdate(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(budgetRepository.findByDepartmentIdAndYear(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));
        when(requisitionRepository.findByDepartmentIdAndStatusIn(eq(1L), anyCollection())).thenReturn(List.of());

        RecruitmentRequisition newReq = new RecruitmentRequisition();
        newReq.setId(705L);
        newReq.setDepartmentId(1L);
        newReq.setQuantity(15);
        newReq.setNeededDate(LocalDate.of(2026, 6, 1));

        // Admin (không có role HR_MANAGER) cố tình ghi đè -> Bị chặn 403
        assertThatThrownBy(() -> budgetService.enforceOnApproval(newReq, regularAdmin, "Admin muốn duyệt vượt ngân sách"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Chỉ Trưởng phòng Nhân sự (HR Manager)");
    }

    @Test
    @DisplayName("TC09: Nhật ký ghi đè chính xác và yêu cầu lý do >= 10 ký tự")
    void tc09_shortReason_throwsBadRequest() {
        when(budgetRepository.findByDepartmentIdAndYearForUpdate(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(budgetRepository.findByDepartmentIdAndYear(1L, 2026)).thenReturn(Optional.of(budget2026));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));
        when(requisitionRepository.findByDepartmentIdAndStatusIn(eq(1L), anyCollection())).thenReturn(List.of());

        RecruitmentRequisition newReq = new RecruitmentRequisition();
        newReq.setId(706L);
        newReq.setDepartmentId(1L);
        newReq.setQuantity(15);
        newReq.setNeededDate(LocalDate.of(2026, 6, 1));

        assertThatThrownBy(() -> budgetService.enforceOnApproval(newReq, hrManager, "Lý do"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("tối thiểu 10 ký tự");
    }

    @Test
    @DisplayName("TC10: Hủy yêu cầu cập nhật lại hạn mức đúng quy tắc")
    void tc10_cancelledRequisition_releasesHeadcount() {
        RecruitmentRequisition req1 = new RecruitmentRequisition();
        req1.setId(801L);
        req1.setDepartmentId(1L);
        req1.setQuantity(4);
        req1.setStatus("APPROVED");
        req1.setNeededDate(LocalDate.of(2026, 2, 1));

        // Khi query requisitionRepository với COUNTED_STATUSES ("APPROVED", "OPEN", "FILLED"),
        // một yêu cầu bị CANCELLED hoặc REJECTED sẽ không được trả về từ repository
        when(requisitionRepository.findByDepartmentIdAndStatusIn(eq(1L), anyCollection()))
                .thenReturn(List.of(req1));

        HeadcountBudgetService.BudgetUsage usage = budgetService.calculateUsage(1L, 2026, null);
        assertThat(usage.headcountUsed()).isEqualTo(4);

        // Giả sử req1 bị hủy -> repository trả về empty
        when(requisitionRepository.findByDepartmentIdAndStatusIn(eq(1L), anyCollection()))
                .thenReturn(List.of());

        HeadcountBudgetService.BudgetUsage updatedUsage = budgetService.calculateUsage(1L, 2026, null);
        assertThat(updatedUsage.headcountUsed()).isEqualTo(0);
    }

    @Test
    @DisplayName("TC11: Backend ngăn giảm chỉ tiêu hoặc ngân sách thấp hơn số đã sử dụng")
    void tc11_updateBudget_belowUsage_throwsBadRequest() {
        when(budgetRepository.findById(100L)).thenReturn(Optional.of(budget2026));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(itDept));

        RecruitmentRequisition req = new RecruitmentRequisition();
        req.setId(901L);
        req.setDepartmentId(1L);
        req.setQuantity(6);
        req.setSalaryMax(10_000_000L); // 6 * 10m * 12 = 720 triệu
        req.setStatus("APPROVED");
        req.setNeededDate(LocalDate.of(2026, 2, 1));

        when(requisitionRepository.findByDepartmentIdAndStatusIn(eq(1L), anyCollection()))
                .thenReturn(List.of(req));

        // Cố tình giảm quota xuống 5 (trong khi đã dùng 6) -> Bị chặn
        UpdateBudgetRequest invalidQuota = new UpdateBudgetRequest(5, 1_200_000_000L, "Hạ chỉ tiêu");
        assertThatThrownBy(() -> budgetService.update(100L, invalidQuota, hrManager))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("thấp hơn số headcount đã sử dụng (6)");

        // Cố tình giảm ngân sách lương xuống 500 triệu (trong khi đã dùng 720 triệu) -> Bị chặn
        UpdateBudgetRequest invalidSalary = new UpdateBudgetRequest(8, 500_000_000L, "Hạ ngân sách lương");
        assertThatThrownBy(() -> budgetService.update(100L, invalidSalary, hrManager))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("thấp hơn số đã cam kết sử dụng (720000000 VND)");
    }
}
