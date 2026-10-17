package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.BudgetAuditLog;
import com.example.auth_service.domain.sprint3.HeadcountBudget;
import com.example.auth_service.dto.budget.*;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.BudgetExceededException;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.BudgetAuditLogRepository;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.HeadcountBudgetRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service Quản lý Ngân sách Headcount & Lương theo phòng ban (S3-04 / SCRUM-101 / SCRUM-124 / SCRUM-125).
 */
@Service
public class HeadcountBudgetService {

    private static final Logger logger = LoggerFactory.getLogger(HeadcountBudgetService.class);

    public static final int ANNUALIZATION_MONTHS = 12;
    public static final int MIN_OVERRIDE_REASON_LENGTH = 10;
    public static final List<String> COUNTED_STATUSES = List.of("APPROVED", "OPEN", "FILLED");

    private final HeadcountBudgetRepository budgetRepository;
    private final BudgetAuditLogRepository auditLogRepository;
    private final DepartmentRepository departmentRepository;
    private final RecruitmentRequisitionRepository requisitionRepository;
    private final UserRepository userRepository;

    public HeadcountBudgetService(
            HeadcountBudgetRepository budgetRepository,
            BudgetAuditLogRepository auditLogRepository,
            DepartmentRepository departmentRepository,
            RecruitmentRequisitionRepository requisitionRepository,
            UserRepository userRepository
    ) {
        this.budgetRepository = budgetRepository;
        this.auditLogRepository = auditLogRepository;
        this.departmentRepository = departmentRepository;
        this.requisitionRepository = requisitionRepository;
        this.userRepository = userRepository;
    }

    // =========================================================================
    // 1. CRUD Ngân sách
    // =========================================================================

    @Transactional
    public BudgetSummaryResponse create(CreateBudgetRequest request, User currentUser) {
        Department dept = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban với ID: " + request.departmentId()));

        if (!dept.isActive()) {
            throw new BadRequestException("Phòng ban \"" + dept.getName() + "\" đã ngừng áp dụng, không thể khai báo ngân sách.");
        }

        if (budgetRepository.existsByDepartmentIdAndYear(request.departmentId(), request.year())) {
            throw new ConflictException("Phòng ban \"" + dept.getName() + "\" đã có ngân sách năm " + request.year() + ". Hãy cập nhật thay vì tạo mới.");
        }

        HeadcountBudget budget = new HeadcountBudget(
                request.departmentId(),
                request.year(),
                request.headcountQuota(),
                request.salaryBudgetVnd(),
                request.note(),
                currentUser.getId(),
                currentUser.getId()
        );

        HeadcountBudget saved = budgetRepository.save(budget);

        writeAuditLog("BUDGET_CREATED", saved.getDepartmentId(), saved.getYear(), null, currentUser,
                "Khai báo ngân sách mới năm " + saved.getYear(),
                String.format("Chỉ tiêu: %d, Ngân sách lương: %d VND", saved.getHeadcountQuota(), saved.getSalaryBudgetVnd()));

        return toSummaryResponse(saved, dept);
    }

    @Transactional
    public BudgetSummaryResponse update(Long id, UpdateBudgetRequest request, User currentUser) {
        HeadcountBudget budget = budgetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ngân sách với ID: " + id));

        Department dept = departmentRepository.findById(budget.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban với ID: " + budget.getDepartmentId()));

        BudgetUsage usage = calculateUsage(budget.getDepartmentId(), budget.getYear(), null);

        if (request.headcountQuota() < usage.headcountUsed()) {
            throw new BadRequestException("Chỉ tiêu mới (" + request.headcountQuota() + ") thấp hơn số headcount đã sử dụng (" + usage.headcountUsed() + ").");
        }
        if (request.salaryBudgetVnd() < usage.salaryUsedVnd()) {
            throw new BadRequestException("Ngân sách lương mới thấp hơn số đã cam kết sử dụng (" + usage.salaryUsedVnd() + " VND).");
        }

        String beforeDetail = String.format("Chỉ tiêu: %d, Lương: %d VND", budget.getHeadcountQuota(), budget.getSalaryBudgetVnd());

        budget.setHeadcountQuota(request.headcountQuota());
        budget.setSalaryBudgetVnd(request.salaryBudgetVnd());
        budget.setNote(request.note());
        budget.setUpdatedBy(currentUser.getId());

        HeadcountBudget saved = budgetRepository.save(budget);

        String afterDetail = String.format("Chỉ tiêu: %d, Lương: %d VND", saved.getHeadcountQuota(), saved.getSalaryBudgetVnd());
        writeAuditLog("BUDGET_UPDATED", saved.getDepartmentId(), saved.getYear(), null, currentUser,
                "Cập nhật ngân sách năm " + saved.getYear(),
                "Trước: [" + beforeDetail + "] -> Sau: [" + afterDetail + "]");

        return toSummaryResponse(saved, dept);
    }

    @Transactional
    public void delete(Long id, User currentUser) {
        HeadcountBudget budget = budgetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ngân sách với ID: " + id));

        BudgetUsage usage = calculateUsage(budget.getDepartmentId(), budget.getYear(), null);
        if (usage.headcountUsed() > 0) {
            throw new ConflictException("Không thể xóa ngân sách đã có yêu cầu tuyển dụng được phê duyệt (" + usage.headcountUsed() + " headcount đã dùng).");
        }

        writeAuditLog("BUDGET_DELETED", budget.getDepartmentId(), budget.getYear(), null, currentUser,
                "Xóa ngân sách năm " + budget.getYear(),
                String.format("Chỉ tiêu: %d, Ngân sách lương: %d VND", budget.getHeadcountQuota(), budget.getSalaryBudgetVnd()));

        budgetRepository.delete(budget);
    }

    @Transactional(readOnly = true)
    public BudgetSummaryResponse getById(Long id) {
        HeadcountBudget budget = budgetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ngân sách với ID: " + id));
        Department dept = departmentRepository.findById(budget.getDepartmentId()).orElse(null);
        return toSummaryResponse(budget, dept);
    }

    @Transactional(readOnly = true)
    public Page<BudgetSummaryResponse> search(Integer year, Long departmentId, String statusStr, Pageable pageable) {
        int targetYear = (year != null && year > 0) ? year : LocalDate.now().getYear();

        List<HeadcountBudget> allMatching;
        if (departmentId != null) {
            allMatching = budgetRepository.findByDepartmentIdAndYear(departmentId, targetYear)
                    .map(List::of)
                    .orElse(List.of());
        } else {
            allMatching = budgetRepository.findAllByYear(targetYear);
        }

        Map<Long, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getId, Function.identity(), (d1, d2) -> d1));

        List<BudgetSummaryResponse> summaries = allMatching.stream()
                .map(b -> toSummaryResponse(b, deptMap.get(b.getDepartmentId())))
                .filter(res -> {
                    if (statusStr == null || statusStr.isBlank() || "ALL".equalsIgnoreCase(statusStr)) {
                        return true;
                    }
                    try {
                        BudgetStatus targetStatus = BudgetStatus.valueOf(statusStr.toUpperCase());
                        return res.status() == targetStatus;
                    } catch (IllegalArgumentException e) {
                        return true;
                    }
                })
                .sorted(Comparator.comparing(BudgetSummaryResponse::departmentName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), summaries.size());
        List<BudgetSummaryResponse> pageContent = (start < summaries.size()) ? summaries.subList(start, end) : List.of();

        return new PageImpl<>(pageContent, pageable, summaries.size());
    }

    // =========================================================================
    // 2. Thống kê Dashboard (4 thẻ KPI)
    // =========================================================================

    @Transactional(readOnly = true)
    public BudgetDashboardStats getDashboardStats(Integer year) {
        int targetYear = (year != null && year > 0) ? year : LocalDate.now().getYear();
        List<HeadcountBudget> budgets = budgetRepository.findAllByYear(targetYear);

        int totalQuota = 0;
        int totalUsed = 0;
        long totalSalaryBudget = 0;
        long totalSalaryUsed = 0;

        for (HeadcountBudget b : budgets) {
            totalQuota += b.getHeadcountQuota();
            totalSalaryBudget += b.getSalaryBudgetVnd();
            BudgetUsage usage = calculateUsage(b.getDepartmentId(), b.getYear(), null);
            totalUsed += usage.headcountUsed();
            totalSalaryUsed += usage.salaryUsedVnd();
        }

        int totalRemaining = totalQuota - totalUsed;
        long totalSalaryRemaining = totalSalaryBudget - totalSalaryUsed;
        double overallHeadcountRate = totalQuota > 0 ? ((double) totalUsed / totalQuota) * 100.0 : 0.0;
        double overallSalaryRate = totalSalaryBudget > 0 ? ((double) totalSalaryUsed / totalSalaryBudget) * 100.0 : 0.0;

        return new BudgetDashboardStats(
                targetYear,
                budgets.size(),
                totalQuota,
                totalUsed,
                totalRemaining,
                Math.round(overallHeadcountRate * 10.0) / 10.0,
                totalSalaryBudget,
                totalSalaryUsed,
                totalSalaryRemaining,
                Math.round(overallSalaryRate * 10.0) / 10.0
        );
    }

    // =========================================================================
    // 3. Đánh giá Ngân sách (Real-time Evaluation for Requisition)
    // =========================================================================

    @Transactional(readOnly = true)
    public BudgetEvaluationResponse evaluate(BudgetEvaluationRequest request) {
        int targetYear = request.year() != null ? request.year() : LocalDate.now().getYear();
        Long deptId = request.departmentId();

        Department dept = departmentRepository.findById(deptId).orElse(null);
        String deptName = dept != null ? dept.getName() : "Phòng ban #" + deptId;

        Optional<HeadcountBudget> budgetOpt = budgetRepository.findByDepartmentIdAndYear(deptId, targetYear);
        boolean budgetExists = budgetOpt.isPresent();

        int quota = budgetOpt.map(HeadcountBudget::getHeadcountQuota).orElse(0);
        long salaryBudget = budgetOpt.map(HeadcountBudget::getSalaryBudgetVnd).orElse(0L);

        BudgetUsage usage = calculateUsage(deptId, targetYear, request.requisitionId());
        int headcountRemaining = quota - usage.headcountUsed();
        long salaryRemaining = salaryBudget - usage.salaryUsedVnd();

        int proposedQty = request.proposedQuantity() != null ? request.proposedQuantity() : 1;
        long proposedMonthlySalary = request.proposedMaxSalaryMonthlyVnd() != null ? request.proposedMaxSalaryMonthlyVnd() : 0L;
        long proposedAnnualizedSalary = (long) proposedQty * proposedMonthlySalary * ANNUALIZATION_MONTHS;

        boolean exceedsHeadcount = budgetExists && (proposedQty > headcountRemaining);
        int excessHeadcount = exceedsHeadcount ? Math.max(0, proposedQty - headcountRemaining) : 0;

        boolean exceedsSalary = budgetExists && (proposedAnnualizedSalary > salaryRemaining);
        long excessSalaryVnd = exceedsSalary ? Math.max(0, proposedAnnualizedSalary - salaryRemaining) : 0L;

        boolean requiresOverride = exceedsHeadcount || exceedsSalary;

        String warningMessage = null;
        if (!budgetExists) {
            warningMessage = "Phòng ban \"" + deptName + "\" chưa được khai báo ngân sách năm " + targetYear + " (chưa áp dụng giới hạn định mức).";
        } else if (exceedsHeadcount && exceedsSalary) {
            warningMessage = String.format("Vượt chỉ tiêu %d headcount và %s VND ngân sách lương.", excessHeadcount, formatVnd(excessSalaryVnd));
        } else if (exceedsHeadcount) {
            warningMessage = String.format("Vượt chỉ tiêu %d headcount của phòng ban.", excessHeadcount);
        } else if (exceedsSalary) {
            warningMessage = String.format("Vượt %s VND ngân sách lương cả năm của phòng ban.", formatVnd(excessSalaryVnd));
        }

        return new BudgetEvaluationResponse(
                budgetExists,
                deptId,
                deptName,
                targetYear,
                quota,
                usage.headcountUsed(),
                headcountRemaining,
                salaryBudget,
                usage.salaryUsedVnd(),
                salaryRemaining,
                proposedQty,
                proposedMonthlySalary,
                proposedAnnualizedSalary,
                exceedsHeadcount,
                excessHeadcount,
                exceedsSalary,
                excessSalaryVnd,
                requiresOverride,
                warningMessage
        );
    }

    // =========================================================================
    // 4. Chốt chặn khi Duyệt (Pessimistic Lock & HR Manager Override Check)
    // =========================================================================

    @Transactional
    public void enforceOnApproval(RecruitmentRequisition req, User user, String overrideReason) {
        if (req.getDepartmentId() == null) {
            return;
        }

        int year = getBudgetYear(req);
        Long deptId = req.getDepartmentId();

        // Lock ngân sách bằng PESSIMISTIC_WRITE để chống duyệt đồng thời vượt hạn mức
        budgetRepository.findByDepartmentIdAndYearForUpdate(deptId, year);

        long monthlySalary = getProposedMonthlySalary(req);
        BudgetEvaluationResponse eval = evaluate(new BudgetEvaluationRequest(
                deptId,
                year,
                req.getQuantity(),
                monthlySalary,
                req.getId()
        ));

        if (!eval.requiresOverride()) {
            return;
        }

        boolean isHrManager = user.getRoles().stream().anyMatch(r -> r.getName() == RoleName.HR_MANAGER)
                || "HR_MANAGER".equalsIgnoreCase(user.getRole());

        // Nếu chưa gửi lý do ghi đè -> Từ chối duyệt bằng 409 Conflict kèm thông tin chi tiết
        if (overrideReason == null || overrideReason.trim().isEmpty()) {
            String code = eval.budgetExists() ? "HEADCOUNT_BUDGET_EXCEEDED" : "BUDGET_NOT_DEFINED";
            throw new BudgetExceededException(code, eval.warningMessage(), isHrManager, eval);
        }

        // Đã gửi lý do nhưng người duyệt KHÔNG phải HR_MANAGER -> 403 Forbidden
        if (!isHrManager) {
            throw new AccessDeniedException("Chỉ Trưởng phòng Nhân sự (HR Manager) được quyền ghi đè khi duyệt yêu cầu vượt ngân sách Headcount/Lương.");
        }

        // Lý do ghi đè phải từ 10 ký tự trở lên -> 400 Bad Request
        String cleanReason = overrideReason.trim();
        if (cleanReason.length() < MIN_OVERRIDE_REASON_LENGTH) {
            throw new BadRequestException("Phải nhập lý do ghi đè hợp lệ (tối thiểu " + MIN_OVERRIDE_REASON_LENGTH + " ký tự).");
        }

        // HR Manager ghi đè hợp lệ -> Ghi nhật ký bất biến & đánh dấu requisition
        String detail = String.format("Vượt: %d headcount, %d VND. Yêu cầu: %s (%s). Số lượng: %d, Lương tháng: %d VND",
                eval.excessHeadcount(), eval.excessSalaryVnd(), req.getTitle(), req.getRequisitionCode(), req.getQuantity(), monthlySalary);

        writeAuditLog("BUDGET_OVERRIDE", deptId, year, req.getId(), user, cleanReason, detail);

        req.setBudgetOverridden(true);
        req.setBudgetOverrideReason(cleanReason);
        requisitionRepository.save(req);
    }

    // =========================================================================
    // 5. Nhật ký Ngân sách (Immutable Audit Logs)
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<BudgetAuditLogResponse> getAuditLogs(Long departmentId, Integer year, Pageable pageable) {
        Page<BudgetAuditLog> logs;
        if (departmentId != null && year != null) {
            logs = auditLogRepository.findByDepartmentIdAndYearOrderByCreatedAtDesc(departmentId, year, pageable);
        } else if (departmentId != null) {
            logs = auditLogRepository.findByDepartmentIdOrderByCreatedAtDesc(departmentId, pageable);
        } else if (year != null) {
            logs = auditLogRepository.findByYearOrderByCreatedAtDesc(year, pageable);
        } else {
            logs = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        Map<Long, Department> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getId, Function.identity(), (d1, d2) -> d1));

        return logs.map(l -> {
            Department d = deptMap.get(l.getDepartmentId());
            String dName = d != null ? d.getName() : "Phòng ban #" + l.getDepartmentId();
            String reqTitle = null;
            if (l.getRequisitionId() != null) {
                reqTitle = requisitionRepository.findById(l.getRequisitionId())
                        .map(RecruitmentRequisition::getTitle)
                        .orElse("Yêu cầu #" + l.getRequisitionId());
            }
            return new BudgetAuditLogResponse(
                    l.getId(),
                    l.getAction(),
                    l.getDepartmentId(),
                    dName,
                    l.getYear(),
                    l.getRequisitionId(),
                    reqTitle,
                    l.getUserId(),
                    l.getUserEmail(),
                    l.getUserFullName(),
                    l.getReason(),
                    l.getDetail(),
                    l.getCreatedAt()
            );
        });
    }

    public void writeAuditLog(String action, Long departmentId, int year, Long requisitionId, User user, String reason, String detail) {
        BudgetAuditLog log = new BudgetAuditLog(
                action,
                departmentId,
                year,
                requisitionId,
                user.getId(),
                user.getEmail(),
                user.getFullName() != null ? user.getFullName() : user.getEmail(),
                reason,
                detail
        );
        auditLogRepository.save(log);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    public BudgetUsage calculateUsage(Long departmentId, int year, Long excludeRequisitionId) {
        List<RecruitmentRequisition> list = requisitionRepository.findByDepartmentIdAndStatusIn(departmentId, COUNTED_STATUSES);

        int usedHeadcount = 0;
        long usedSalaryVnd = 0;

        for (RecruitmentRequisition r : list) {
            if (excludeRequisitionId != null && excludeRequisitionId.equals(r.getId())) {
                continue;
            }
            int rYear = getBudgetYear(r);
            if (rYear == year) {
                usedHeadcount += r.getQuantity();
                long monthlySalary = getProposedMonthlySalary(r);
                usedSalaryVnd += (long) r.getQuantity() * monthlySalary * ANNUALIZATION_MONTHS;
            }
        }

        return new BudgetUsage(usedHeadcount, usedSalaryVnd);
    }

    public int getBudgetYear(RecruitmentRequisition r) {
        if (r.getNeededDate() != null) {
            return r.getNeededDate().getYear();
        }
        if (r.getTargetDate() != null) {
            return r.getTargetDate().getYear();
        }
        if (r.getCreatedAt() != null) {
            return r.getCreatedAt().atZone(ZoneId.systemDefault()).getYear();
        }
        return LocalDate.now().getYear();
    }

    public long getProposedMonthlySalary(RecruitmentRequisition r) {
        if (r.getProposedMaxSalary() != null && r.getProposedMaxSalary() > 0) {
            return r.getProposedMaxSalary();
        }
        if (r.getSalaryMax() != null && r.getSalaryMax() > 0) {
            return r.getSalaryMax();
        }
        if (r.getProposedMinSalary() != null && r.getProposedMinSalary() > 0) {
            return r.getProposedMinSalary();
        }
        if (r.getSalaryMin() != null && r.getSalaryMin() > 0) {
            return r.getSalaryMin();
        }
        return 0L;
    }

    private BudgetSummaryResponse toSummaryResponse(HeadcountBudget b, Department dept) {
        BudgetUsage usage = calculateUsage(b.getDepartmentId(), b.getYear(), null);
        int remainingHeadcount = b.getHeadcountQuota() - usage.headcountUsed();
        long remainingSalary = b.getSalaryBudgetVnd() - usage.salaryUsedVnd();

        double headcountRate = b.getHeadcountQuota() > 0
                ? ((double) usage.headcountUsed() / b.getHeadcountQuota()) * 100.0
                : 0.0;
        double salaryRate = b.getSalaryBudgetVnd() > 0
                ? ((double) usage.salaryUsedVnd() / b.getSalaryBudgetVnd()) * 100.0
                : 0.0;

        BudgetStatus status;
        if (remainingHeadcount < 0 || remainingSalary < 0) {
            status = BudgetStatus.EXCEEDED;
        } else if (remainingHeadcount == 0 || remainingSalary == 0) {
            status = BudgetStatus.EXHAUSTED;
        } else if (remainingHeadcount <= Math.max(1, (int) Math.ceil(b.getHeadcountQuota() * 0.1)) || salaryRate >= 90.0) {
            status = BudgetStatus.NEAR_LIMIT;
        } else {
            status = BudgetStatus.NORMAL;
        }

        String deptName = dept != null ? dept.getName() : "Phòng ban #" + b.getDepartmentId();
        String deptCode = dept != null ? dept.getCode() : "";

        String createdByName = userRepository.findById(b.getCreatedBy()).map(User::getFullName).orElse("Hệ thống");
        String updatedByName = userRepository.findById(b.getUpdatedBy()).map(User::getFullName).orElse("Hệ thống");

        return new BudgetSummaryResponse(
                b.getId(),
                b.getDepartmentId(),
                deptName,
                deptCode,
                b.getYear(),
                b.getHeadcountQuota(),
                usage.headcountUsed(),
                remainingHeadcount,
                Math.round(headcountRate * 10.0) / 10.0,
                b.getSalaryBudgetVnd(),
                usage.salaryUsedVnd(),
                remainingSalary,
                Math.round(salaryRate * 10.0) / 10.0,
                status,
                b.getNote(),
                b.getCreatedBy(),
                createdByName,
                b.getUpdatedBy(),
                updatedByName,
                b.getVersion(),
                b.getCreatedAt(),
                b.getUpdatedAt()
        );
    }

    private String formatVnd(long amount) {
        return String.format("%,d", amount);
    }

    public record BudgetUsage(int headcountUsed, long salaryUsedVnd) {}
}
