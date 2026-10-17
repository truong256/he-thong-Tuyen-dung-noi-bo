package com.example.auth_service.controller;

import com.example.auth_service.dto.budget.*;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.HeadcountBudgetService;
import com.example.auth_service.service.RequisitionApprovalService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Controller Quản lý Ngân sách Headcount & Lương theo phòng ban (S3-04 / SCRUM-101 / SCRUM-124).
 */
@RestController
@RequestMapping("/api/headcount-budgets")
public class HeadcountBudgetController {

    private final HeadcountBudgetService budgetService;
    private final UserRepository userRepository;
    private final RequisitionApprovalService approvalService;

    public HeadcountBudgetController(
            HeadcountBudgetService budgetService,
            UserRepository userRepository,
            RequisitionApprovalService approvalService
    ) {
        this.budgetService = budgetService;
        this.userRepository = userRepository;
        this.approvalService = approvalService;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Vui lòng đăng nhập.");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new AccessDeniedException("Người dùng không tồn tại."));
    }

    /**
     * GET /api/headcount-budgets
     * Danh sách ngân sách có phân trang và bộ lọc theo năm, phòng ban, trạng thái.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN', 'APPROVER', 'HIRING_MANAGER', 'RECRUITER')")
    public ResponseEntity<Page<BudgetSummaryResponse>> search(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(budgetService.search(year, departmentId, status, pageable));
    }

    /**
     * GET /api/headcount-budgets/stats
     * 4 thẻ thống kê Dashboard theo năm.
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN', 'APPROVER', 'HIRING_MANAGER', 'RECRUITER')")
    public ResponseEntity<BudgetDashboardStats> getStats(
            @RequestParam(required = false) Integer year
    ) {
        return ResponseEntity.ok(budgetService.getDashboardStats(year));
    }

    /**
     * GET /api/headcount-budgets/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN', 'APPROVER', 'HIRING_MANAGER', 'RECRUITER')")
    public ResponseEntity<BudgetSummaryResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(budgetService.getById(id));
    }

    /**
     * POST /api/headcount-budgets
     * Khai báo ngân sách mới (HR Manager, Admin).
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN')")
    public ResponseEntity<BudgetSummaryResponse> create(
            @Valid @RequestBody CreateBudgetRequest request
    ) {
        User currentUser = getCurrentUser();
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.create(request, currentUser));
    }

    /**
     * PUT /api/headcount-budgets/{id}
     * Cập nhật ngân sách (HR Manager, Admin).
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN')")
    public ResponseEntity<BudgetSummaryResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBudgetRequest request
    ) {
        User currentUser = getCurrentUser();
        return ResponseEntity.ok(budgetService.update(id, request, currentUser));
    }

    /**
     * DELETE /api/headcount-budgets/{id}
     * Xóa ngân sách chưa sử dụng (HR Manager, Admin).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        budgetService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/headcount-budgets/evaluate
     * Đánh giá tác động ngân sách khi tạo / xem yêu cầu tuyển dụng.
     */
    @PostMapping("/evaluate")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN', 'APPROVER', 'HIRING_MANAGER', 'RECRUITER')")
    public ResponseEntity<BudgetEvaluationResponse> evaluate(
            @Valid @RequestBody BudgetEvaluationRequest request
    ) {
        return ResponseEntity.ok(budgetService.evaluate(request));
    }

    /**
     * GET /api/headcount-budgets/logs
     * Nhật ký thay đổi ngân sách và ghi đè vượt hạn mức.
     */
    @GetMapping("/logs")
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ADMIN')")
    public ResponseEntity<Page<BudgetAuditLogResponse>> getLogs(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return ResponseEntity.ok(budgetService.getAuditLogs(departmentId, year, pageable));
    }

    /**
     * POST /api/headcount-budgets/requisitions/{id}/override-approve
     * Phê duyệt ghi đè vượt ngân sách - DUY NHẤT HR_MANAGER được thực hiện, bắt buộc có lý do.
     */
    @PostMapping("/requisitions/{id}/override-approve")
    @PreAuthorize("hasRole('HR_MANAGER')")
    public ResponseEntity<?> overrideApprove(
            @PathVariable Long id,
            @Valid @RequestBody OverrideApprovalRequest request
    ) {
        User currentUser = getCurrentUser();
        boolean isHrManager = currentUser.getRoles().stream().anyMatch(r -> r.getName() == RoleName.HR_MANAGER)
                || "HR_MANAGER".equalsIgnoreCase(currentUser.getRole());
        if (!isHrManager) {
            throw new AccessDeniedException("Chỉ Trưởng phòng Nhân sự (HR Manager) được quyền ghi đè phê duyệt vượt ngân sách.");
        }

        var res = approvalService.approveRequisition(id, "Phê duyệt ghi đè vượt ngân sách", request.reason());
        return ResponseEntity.ok(res);
    }
}
