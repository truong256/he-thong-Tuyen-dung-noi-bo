package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.RequisitionApprovalHistory;
import com.example.auth_service.dto.ApprovalStepResponse;
import com.example.auth_service.dto.RequisitionApprovalTimelineResponse;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service quản lý trạng thái và lịch sử phê duyệt yêu cầu tuyển dụng (S3-03).
 * Đảm bảo:
 * - Chuỗi cấp duyệt tuần tự, xác định rõ cấp đã duyệt và cấp đang chờ ("đang ở bàn ai").
 * - Phân quyền chặt chẽ: Người tạo (phạm vi của mình), Người duyệt (yêu cầu liên quan), HR/Admin (toàn bộ).
 * - Lịch sử phê duyệt là nhật ký bất biến (immutable audit log), không cung cấp API sửa/xóa.
 */
@Service
@Transactional
public class RequisitionApprovalService {

    private final RecruitmentRequisitionRepository requisitions;
    private final RequisitionApprovalHistoryRepository historyRepository;
    private final RequisitionAssignmentRepository assignments;
    private final DepartmentRepository departments;
    private final UserRepository users;
    private final RequisitionApprovalSnapshotRepository snapshots;
    private final HeadcountBudgetService headcountBudgetService;

    @Autowired
    public RequisitionApprovalService(
            RecruitmentRequisitionRepository requisitions,
            RequisitionApprovalHistoryRepository historyRepository,
            RequisitionAssignmentRepository assignments,
            DepartmentRepository departments,
            UserRepository users,
            @Autowired(required = false) RequisitionApprovalSnapshotRepository snapshots,
            @Autowired(required = false) HeadcountBudgetService headcountBudgetService
    ) {
        this.requisitions = requisitions;
        this.historyRepository = historyRepository;
        this.assignments = assignments;
        this.departments = departments;
        this.users = users;
        this.snapshots = snapshots;
        this.headcountBudgetService = headcountBudgetService;
    }

    /**
     * Khởi tạo chuỗi phê duyệt chuẩn nếu chưa tồn tại cho yêu cầu này.
     */
    public void ensureApprovalChainInitialized(RecruitmentRequisition req) {
        if (historyRepository != null) {
            List<RequisitionApprovalHistory> existing = historyRepository.findByRequisitionIdOrderByStepOrderAsc(req.getId());
            if (existing.isEmpty()) {
                generateAndPersistDefaultApprovalChain(req);
            }
        }
    }

    /**
     * Lấy toàn bộ chuỗi cấp duyệt và dòng thời gian lịch sử phê duyệt của yêu cầu tuyển dụng.
     * Áp dụng phân quyền:
     * - Người tạo: chỉ xem yêu cầu của mình
     * - Người duyệt: chỉ xem yêu cầu liên quan (được phân công trong snapshot/history/assignments hoặc quản lý phòng ban)
     * - HR Manager & Admin: xem toàn bộ
     */
    @Transactional
    public RequisitionApprovalTimelineResponse getApprovalTimeline(Long requisitionId) {
        RecruitmentRequisition req = requisitions.findById(requisitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + requisitionId));

        List<RequisitionApprovalHistory> historyList = historyRepository.findByRequisitionIdOrderByStepOrderAsc(requisitionId);

        // Nếu chưa có lịch sử (do dữ liệu khởi tạo trước đó), tự động sinh chuỗi cấp duyệt chuẩn và lưu nhật ký trước
        if (historyList.isEmpty()) {
            historyList = generateAndPersistDefaultApprovalChain(req);
        }

        User currentUser = getCurrentUser();
        verifyViewPermission(req, currentUser);

        return buildTimelineResponse(req, historyList);
    }

    /**
     * Phê duyệt yêu cầu tuyển dụng tại cấp duyệt hiện tại hoặc toàn quyền bởi HR/Admin/Approver.
     * Ghi nhận lịch sử bất biến.
     */
    public RequisitionApprovalTimelineResponse approveRequisition(Long requisitionId, String comments) {
        return approveRequisition(requisitionId, comments, null);
    }

    public RequisitionApprovalTimelineResponse approveRequisition(Long requisitionId, String comments, String overrideReason) {
        RecruitmentRequisition req = requisitions.findById(requisitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + requisitionId));

        User currentUser = getCurrentUser();
        verifyApprovePermission(req, currentUser);

        if ("APPROVED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Yêu cầu tuyển dụng này đã được phê duyệt hoàn tất trước đó.");
        }
        if ("REJECTED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Yêu cầu tuyển dụng này đã bị từ chối, không thể phê duyệt.");
        }

        // S3-04: Chốt chặn kiểm tra ngân sách Headcount & Lương
        if (headcountBudgetService != null) {
            headcountBudgetService.enforceOnApproval(req, currentUser, overrideReason);
        }

        List<RequisitionApprovalHistory> historyList = historyRepository.findByRequisitionIdOrderByStepOrderAsc(requisitionId);
        if (historyList.isEmpty()) {
            historyList = generateAndPersistDefaultApprovalChain(req);
        }

        // Tìm bước đang chờ duyệt (PENDING)
        Optional<RequisitionApprovalHistory> pendingStepOpt = historyList.stream()
                .filter(h -> "PENDING".equalsIgnoreCase(h.getStatus()))
                .findFirst();

        Instant now = Instant.now();
        String approvalComment = (comments != null && !comments.trim().isEmpty())
                ? comments.trim()
                : "Đồng ý phê duyệt yêu cầu tuyển dụng.";

        if (pendingStepOpt.isPresent()) {
            RequisitionApprovalHistory currentStep = pendingStepOpt.get();
            if (currentStep.getApproverId() != null && !currentStep.getApproverId().equals(currentUser.getId())) {
                throw new AccessDeniedException("Bạn không phải người phê duyệt ở cấp hiện tại.");
            }

            currentStep.setStatus("COMPLETED");
            currentStep.setAction("APPROVE");
            currentStep.setApproverId(currentUser.getId());
            currentStep.setApproverName(currentUser.getFullName());
            currentStep.setApproverEmail(currentUser.getEmail());
            currentStep.setActionAt(now);
            currentStep.setComments(approvalComment);
            historyRepository.save(currentStep);

            // Tìm bước kế tiếp
            int nextOrder = currentStep.getStepOrder() + 1;
            Optional<RequisitionApprovalHistory> nextStepOpt = historyList.stream()
                    .filter(h -> h.getStepOrder() == nextOrder)
                    .findFirst();

            if (nextStepOpt.isPresent()) {
                RequisitionApprovalHistory nextStep = nextStepOpt.get();
                nextStep.setStatus("PENDING");
                nextStep.setAction("WAITING");
                historyRepository.save(nextStep);
            } else {
                req.setStatus("APPROVED");
                req.setApprovedByUserId(currentUser.getId());
                req.setApprovedAt(now);
                requisitions.save(req);
            }
        } else {
            // Trường hợp không có bước pending, hoàn tất yêu cầu
            req.setStatus("APPROVED");
            req.setApprovedByUserId(currentUser.getId());
            req.setApprovedAt(now);
            requisitions.save(req);
        }

        List<RequisitionApprovalHistory> updatedList = historyRepository.findByRequisitionIdOrderByStepOrderAsc(requisitionId);
        return buildTimelineResponse(req, updatedList);
    }

    /**
     * Từ chối yêu cầu tuyển dụng kèm lý do bắt buộc.
     * Ghi nhận lịch sử bất biến.
     */
    public RequisitionApprovalTimelineResponse rejectRequisition(Long requisitionId, String rejectionReason, String comments) {
        if (rejectionReason == null || rejectionReason.trim().isEmpty()) {
            throw new BadRequestException("Lý do từ chối không được để trống.");
        }

        RecruitmentRequisition req = requisitions.findById(requisitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + requisitionId));

        User currentUser = getCurrentUser();
        verifyApprovePermission(req, currentUser);

        if ("REJECTED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Yêu cầu tuyển dụng này đã bị từ chối trước đó.");
        }

        List<RequisitionApprovalHistory> historyList = historyRepository.findByRequisitionIdOrderByStepOrderAsc(requisitionId);
        if (historyList.isEmpty()) {
            historyList = generateAndPersistDefaultApprovalChain(req);
        }

        Instant now = Instant.now();
        String fullReason = rejectionReason.trim();
        String detailComment = (comments != null && !comments.trim().isEmpty())
                ? fullReason + " (" + comments.trim() + ")"
                : fullReason;

        Optional<RequisitionApprovalHistory> pendingStepOpt = historyList.stream()
                .filter(h -> "PENDING".equalsIgnoreCase(h.getStatus()))
                .findFirst();

        if (pendingStepOpt.isPresent()) {
            RequisitionApprovalHistory currentStep = pendingStepOpt.get();
            if (currentStep.getApproverId() != null && !currentStep.getApproverId().equals(currentUser.getId())) {
                throw new AccessDeniedException("Bạn không phải người phê duyệt ở cấp hiện tại.");
            }
            currentStep.setStatus("REJECTED");
            currentStep.setAction("REJECT");
            currentStep.setApproverId(currentUser.getId());
            currentStep.setApproverName(currentUser.getFullName());
            currentStep.setApproverEmail(currentUser.getEmail());
            currentStep.setActionAt(now);
            currentStep.setComments(detailComment);
            historyRepository.save(currentStep);
        }

        req.setStatus("REJECTED");
        req.setRejectionReason(fullReason);
        requisitions.save(req);

        List<RequisitionApprovalHistory> updatedList = historyRepository.findByRequisitionIdOrderByStepOrderAsc(requisitionId);
        return buildTimelineResponse(req, updatedList);
    }

    /**
     * Khởi tạo chuỗi phê duyệt chuẩn khi người dùng gửi yêu cầu tuyển dụng lần đầu.
     */
    public void initializeApprovalChainOnSubmit(RecruitmentRequisition req, User creator) {
        if (historyRepository.existsByRequisitionId(req.getId())) {
            return;
        }
        generateAndPersistDefaultApprovalChain(req);
    }

    /**
     * Tự động sinh chuỗi cấp duyệt chuẩn (4 cấp) đồng bộ với quy trình doanh nghiệp ATS:
     * 1. Khởi tạo & Đề xuất (Creator)
     * 2. Trưởng bộ phận duyệt chuyên môn (Hiring Manager / Dept Manager)
     * 3. Phòng Nhân sự thẩm định định biên & khung lương (HR Manager)
     * 4. Ban Giám đốc phê duyệt chính thức (Approver / BOD)
     */
    private List<RequisitionApprovalHistory> generateAndPersistDefaultApprovalChain(RecruitmentRequisition req) {
        List<RequisitionApprovalHistory> list = new ArrayList<>();
        Instant now = Instant.now();
        boolean isDraft = "DRAFT".equalsIgnoreCase(req.getStatus());
        boolean isApproved = "APPROVED".equalsIgnoreCase(req.getStatus());
        boolean isRejected = "REJECTED".equalsIgnoreCase(req.getStatus());
        boolean isPending = "PENDING_APPROVAL".equalsIgnoreCase(req.getStatus());

        // Lấy thông tin người tạo
        User creator = null;
        if (req.getCreatedByUserId() != null) {
            creator = users.findById(req.getCreatedByUserId()).orElse(null);
        }

        // Lấy thông tin Trưởng phòng ban hoặc người duyệt chuyên môn được phân công
        User deptManager = findDepartmentManagerOrAssigned(req);

        // Lấy thông tin HR Manager
        User hrManager = findHrManager();

        // Lấy thông tin Approver (Ban Giám Đốc)
        User approver = findApprover(req);

        // 1. Bước 1: Khởi tạo yêu cầu tuyển dụng
        RequisitionApprovalHistory step1 = RequisitionApprovalHistory.builder()
                .requisitionId(req.getId())
                .stepOrder(1)
                .stepName("Khởi tạo & Đề xuất tuyển dụng")
                .approverId(creator != null ? creator.getId() : null)
                .approverName(creator != null ? creator.getFullName() : "Người tạo yêu cầu")
                .approverEmail(creator != null ? creator.getEmail() : null)
                .approverRole("HIRING_MANAGER")
                .action(isDraft ? "DRAFT" : "SUBMIT")
                .status(isDraft ? "PENDING" : "COMPLETED")
                .actionAt(req.getSubmittedAt() != null ? req.getSubmittedAt() : (isDraft ? null : req.getCreatedAt()))
                .comments(isDraft ? "Bản nháp đang được soạn thảo." : "Đã gửi đề xuất tuyển dụng vào luồng phê duyệt.")
                .build();
        list.add(historyRepository.save(step1));

        // 2. Bước 2: Trưởng bộ phận duyệt chuyên môn
        String step2Status;
        String step2Action;
        Instant step2ActionAt = null;
        String step2Comments = null;

        if (isDraft) {
            step2Status = "UPCOMING";
            step2Action = "PENDING";
        } else if (isApproved) {
            step2Status = "COMPLETED";
            step2Action = "APPROVE";
            step2ActionAt = req.getSubmittedAt() != null ? req.getSubmittedAt().plusSeconds(3600) : now;
            step2Comments = "Xác nhận đúng nhu cầu nhân sự và định biên chuyên môn của bộ phận.";
        } else if (isRejected) {
            step2Status = "REJECTED";
            step2Action = "REJECT";
            step2ActionAt = now;
            step2Comments = req.getRejectionReason() != null ? req.getRejectionReason() : "Từ chối đề xuất.";
        } else {
            // PENDING_APPROVAL
            step2Status = "PENDING";
            step2Action = "WAITING";
            step2Comments = "Đang chờ Trưởng bộ phận xem xét và xác nhận nhu cầu.";
        }

        RequisitionApprovalHistory step2 = RequisitionApprovalHistory.builder()
                .requisitionId(req.getId())
                .stepOrder(2)
                .stepName("Trưởng bộ phận duyệt chuyên môn")
                .approverId(deptManager != null ? deptManager.getId() : null)
                .approverName(deptManager != null ? deptManager.getFullName() : "Trưởng bộ phận")
                .approverEmail(deptManager != null ? deptManager.getEmail() : null)
                .approverRole("HIRING_MANAGER")
                .action(step2Action)
                .status(step2Status)
                .actionAt(step2ActionAt)
                .comments(step2Comments)
                .build();
        list.add(historyRepository.save(step2));

        // 3. Bước 3: Phòng Nhân sự thẩm định định biên & ngân sách
        String step3Status = (isApproved) ? "COMPLETED" : "UPCOMING";
        String step3Action = (isApproved) ? "APPROVE" : "PENDING";
        Instant step3ActionAt = isApproved ? (req.getSubmittedAt() != null ? req.getSubmittedAt().plusSeconds(7200) : now) : null;
        String step3Comments = isApproved ? "Đã thẩm định khung lương tiêu chuẩn và kế hoạch tuyển dụng phù hợp." : null;

        RequisitionApprovalHistory step3 = RequisitionApprovalHistory.builder()
                .requisitionId(req.getId())
                .stepOrder(3)
                .stepName("Phòng Nhân sự thẩm định định biên & khung lương")
                .approverId(hrManager != null ? hrManager.getId() : null)
                .approverName(hrManager != null ? hrManager.getFullName() : "Phòng Tuyển dụng & Thu hút Nhân tài")
                .approverEmail(hrManager != null ? hrManager.getEmail() : null)
                .approverRole("HR_MANAGER")
                .action(step3Action)
                .status(step3Status)
                .actionAt(step3ActionAt)
                .comments(step3Comments)
                .build();
        list.add(historyRepository.save(step3));

        // 4. Bước 4: Ban Giám đốc phê duyệt chính thức
        String step4Status = isApproved ? "COMPLETED" : "UPCOMING";
        String step4Action = isApproved ? "APPROVE" : "PENDING";
        Instant step4ActionAt = isApproved ? (req.getApprovedAt() != null ? req.getApprovedAt() : now) : null;
        String step4Comments = isApproved ? "Ban Giám đốc đã chính thức phê duyệt mở tuyển." : null;

        RequisitionApprovalHistory step4 = RequisitionApprovalHistory.builder()
                .requisitionId(req.getId())
                .stepOrder(4)
                .stepName("Ban Giám đốc phê duyệt chính thức")
                .approverId(approver != null ? approver.getId() : (req.getApprovedByUserId() != null ? req.getApprovedByUserId() : null))
                .approverName(approver != null ? approver.getFullName() : "Ban Tổng Giám Đốc (BOD)")
                .approverEmail(approver != null ? approver.getEmail() : null)
                .approverRole("APPROVER")
                .action(step4Action)
                .status(step4Status)
                .actionAt(step4ActionAt)
                .comments(step4Comments)
                .build();
        list.add(historyRepository.save(step4));

        return list;
    }

    private User findDepartmentManagerOrAssigned(RecruitmentRequisition req) {
        // Ưu tiên người được phân công vai trò HIRING_MANAGER
        var assigned = assignments.findByRequisitionIdAndRole(req.getId(), RoleName.HIRING_MANAGER);
        if (!assigned.isEmpty()) {
            return users.findById(assigned.get(0).getUserId()).orElse(null);
        }
        // Tiếp theo kiểm tra managerUserId của phòng ban
        if (req.getDepartmentId() != null) {
            Optional<Department> deptOpt = departments.findById(req.getDepartmentId());
            if (deptOpt.isPresent() && deptOpt.get().getManagerUserId() != null) {
                return users.findById(deptOpt.get().getManagerUserId()).orElse(null);
            }
        }
        // Mặc định lấy người đầu tiên có vai trò HIRING_MANAGER
        List<User> list = users.findByRoleName(RoleName.HIRING_MANAGER);
        return list.isEmpty() ? null : list.get(0);
    }

    private User findHrManager() {
        List<User> list = users.findByRoleName(RoleName.HR_MANAGER);
        return list.isEmpty() ? null : list.get(0);
    }

    private User findApprover(RecruitmentRequisition req) {
        var assigned = assignments.findByRequisitionIdAndRole(req.getId(), RoleName.APPROVER);
        if (!assigned.isEmpty()) {
            return users.findById(assigned.get(0).getUserId()).orElse(null);
        }
        List<User> list = users.findByRoleName(RoleName.APPROVER);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * Kiểm tra quyền xem lịch sử phê duyệt:
     * - Người tạo chỉ xem yêu cầu thuộc phạm vi của mình
     * - Người duyệt chỉ xem yêu cầu liên quan (được phân công hoặc quản lý phòng ban)
     * - HR Manager / Admin xem toàn bộ
     */
    public void verifyViewPermission(RecruitmentRequisition req, User currentUser) {
        boolean isCreator = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(currentUser.getId());
        if (isCreator) {
            return;
        }

        boolean hasManageAll = currentUser.getRoles().stream().anyMatch(r ->
                r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);
        if (hasManageAll) {
            return;
        }

        boolean isAssigned = assignments.findByRequisitionIdAndUserId(req.getId(), currentUser.getId())
                .filter(a -> a.getRole() == RoleName.APPROVER || a.getRole() == RoleName.HIRING_MANAGER || a.getRole() == RoleName.RECRUITER)
                .isPresent();
        if (isAssigned) {
            return;
        }

        boolean isDeptManager = req.getDepartmentId() != null && departments.findById(req.getDepartmentId())
                .filter(d -> currentUser.getId().equals(d.getManagerUserId()))
                .isPresent();
        if (isDeptManager) {
            return;
        }

        // Kiểm tra xem người dùng có được phân công trong snapshot phê duyệt nhiều cấp (S3-01) hay không
        if (snapshots != null && snapshots.findAllByRequisitionIdOrderByStepOrderAsc(req.getId()).stream()
                .anyMatch(s -> currentUser.getId().equals(s.getApproverUserId()))) {
            return;
        }

        // Kiểm tra xem người dùng có trong chuỗi bước phê duyệt (S3-03) hay không
        if (historyRepository != null && historyRepository.findByRequisitionIdOrderByStepOrderAsc(req.getId()).stream()
                .anyMatch(h -> currentUser.getId().equals(h.getApproverId()))) {
            return;
        }

        throw new AccessDeniedException("Bạn không có quyền xem lịch sử phê duyệt của yêu cầu tuyển dụng này.");
    }

    /**
     * Kiểm tra quyền phê duyệt / từ chối:
     * - HR Manager & Admin có toàn quyền
     * - Người được phân công vai trò APPROVER hoặc HIRING_MANAGER cho yêu cầu này
     */
    private void verifyApprovePermission(RecruitmentRequisition req, User currentUser) {
        boolean hasFullRole = currentUser.getRoles().stream().anyMatch(r ->
                r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);
        if (hasFullRole) {
            return;
        }

        boolean isAssigned = assignments.findByRequisitionIdAndUserId(req.getId(), currentUser.getId())
                .filter(a -> a.getRole() == RoleName.APPROVER || a.getRole() == RoleName.HIRING_MANAGER)
                .isPresent();
        if (isAssigned) {
            return;
        }

        boolean isDeptManager = req.getDepartmentId() != null && departments.findById(req.getDepartmentId())
                .filter(d -> currentUser.getId().equals(d.getManagerUserId()))
                .isPresent();
        if (isDeptManager) {
            return;
        }

        if (snapshots != null && snapshots.findAllByRequisitionIdOrderByStepOrderAsc(req.getId()).stream()
                .anyMatch(s -> currentUser.getId().equals(s.getApproverUserId()))) {
            return;
        }

        if (historyRepository != null && historyRepository.findByRequisitionIdOrderByStepOrderAsc(req.getId()).stream()
                .anyMatch(h -> currentUser.getId().equals(h.getApproverId()))) {
            return;
        }

        throw new AccessDeniedException("Bạn không được phân công phê duyệt yêu cầu tuyển dụng này.");
    }

    private RequisitionApprovalTimelineResponse buildTimelineResponse(
            RecruitmentRequisition req,
            List<RequisitionApprovalHistory> historyList
    ) {
        Integer currentStepOrder = null;
        String currentWaitingOn = null;

        // Tìm bước đang chờ duyệt
        Optional<RequisitionApprovalHistory> pendingStepOpt = historyList.stream()
                .filter(h -> "PENDING".equalsIgnoreCase(h.getStatus()))
                .findFirst();

        if (pendingStepOpt.isPresent()) {
            RequisitionApprovalHistory pending = pendingStepOpt.get();
            currentStepOrder = pending.getStepOrder();
            currentWaitingOn = pending.getStepName() + (pending.getApproverName() != null ? " (" + pending.getApproverName() + ")" : "");
        } else if ("APPROVED".equalsIgnoreCase(req.getStatus())) {
            currentWaitingOn = "Đã hoàn tất phê duyệt toàn bộ";
        } else if ("REJECTED".equalsIgnoreCase(req.getStatus())) {
            currentWaitingOn = "Yêu cầu đã bị từ chối";
        } else if ("DRAFT".equalsIgnoreCase(req.getStatus())) {
            currentWaitingOn = "Đang soạn thảo bản nháp";
        }

        final Integer finalCurrentStepOrder = currentStepOrder;
        List<ApprovalStepResponse> stepResponses = historyList.stream().map(h -> new ApprovalStepResponse(
                h.getStepOrder(),
                h.getStepName(),
                h.getApproverId(),
                h.getApproverName(),
                h.getApproverEmail(),
                h.getApproverRole(),
                h.getAction(),
                h.getStatus(),
                h.getActionAt(),
                h.getComments(),
                finalCurrentStepOrder != null && finalCurrentStepOrder.equals(h.getStepOrder())
        )).toList();

        long completedCount = historyList.stream().filter(h -> "COMPLETED".equalsIgnoreCase(h.getStatus())).count();
        boolean isCompleted = "APPROVED".equalsIgnoreCase(req.getStatus()) || (completedCount == historyList.size() && !historyList.isEmpty());
        boolean isRejected = "REJECTED".equalsIgnoreCase(req.getStatus()) || historyList.stream().anyMatch(h -> "REJECTED".equalsIgnoreCase(h.getStatus()));

        return new RequisitionApprovalTimelineResponse(
                req.getId(),
                req.getRequisitionCode(),
                req.getTitle(),
                req.getStatus(),
                currentStepOrder,
                currentWaitingOn,
                historyList.size(),
                (int) completedCount,
                isCompleted,
                isRejected,
                req.getRejectionReason(),
                req.getSubmittedAt(),
                stepResponses
        );
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Vui lòng đăng nhập để thực hiện chức năng này.");
        }
        return users.findByEmail(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Không tìm thấy thông tin tài khoản đang đăng nhập."));
    }
}
