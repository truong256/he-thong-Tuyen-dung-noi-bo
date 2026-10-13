package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.ApprovalStepResponse;
import com.example.auth_service.dto.RequisitionApprovalTimelineResponse;
import com.example.auth_service.entity.RequisitionApprovalConfiguration;
import com.example.auth_service.entity.RequisitionApprovalConfigurationStep;
import com.example.auth_service.entity.RequisitionApprovalSnapshot;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.DecimalFormat;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class RequisitionApprovalWorkflowService {

    private final RequisitionApprovalConfigurationRepository configurations;
    private final RequisitionApprovalConfigurationStepRepository configurationSteps;
    private final RequisitionApprovalSnapshotRepository snapshots;
    private final RecruitmentRequisitionRepository requisitions;
    private final UserRepository users;
    private final DepartmentRepository departments;

    public RequisitionApprovalWorkflowService(
            RequisitionApprovalConfigurationRepository configurations,
            RequisitionApprovalConfigurationStepRepository configurationSteps,
            RequisitionApprovalSnapshotRepository snapshots,
            RecruitmentRequisitionRepository requisitions,
            UserRepository users,
            DepartmentRepository departments
    ) {
        this.configurations = configurations;
        this.configurationSteps = configurationSteps;
        this.snapshots = snapshots;
        this.requisitions = requisitions;
        this.users = users;
        this.departments = departments;
    }

    /**
     * Khởi tạo snapshot luồng phê duyệt khi nộp yêu cầu tuyển dụng.
     * Áp dụng quy tắc vượt hạn mức và xử lý nhất quán trường hợp chưa có cấu hình.
     */
    public boolean snapshotForSubmission(RecruitmentRequisition requisition) {
        if (requisition.getDepartmentId() == null) {
            throw new BadRequestException("Yêu cầu tuyển dụng chưa được gắn phòng ban.");
        }

        // Xử lý nhất quán trường hợp chưa có cấu hình: ném ngoại lệ rõ ràng thay vì bỏ lửng
        Optional<RequisitionApprovalConfiguration> activeConfiguration = configurations
                .findByDepartmentIdAndActiveTrue(requisition.getDepartmentId());
        if (activeConfiguration.isEmpty()) {
            throw new BadRequestException("Phòng ban chưa có cấu hình luồng phê duyệt đang hoạt động. Vui lòng liên hệ Trưởng phòng Nhân sự để cấu hình trước khi gửi yêu cầu tuyển dụng.");
        }

        if (snapshots.existsByRequisitionId(requisition.getId())) {
            throw new BadRequestException("Yêu cầu tuyển dụng đã có snapshot luồng phê duyệt.");
        }

        RequisitionApprovalConfiguration configuration = activeConfiguration.get();
        long proposedSalary = requisition.getSalaryMax() != null
                ? requisition.getSalaryMax()
                : (requisition.getSalaryMin() != null ? requisition.getSalaryMin() : 0L);

        List<RequisitionApprovalConfigurationStep> applicableSteps = configurationSteps
                .findAllByConfigurationIdOrderByStepOrderAsc(configuration.getId())
                .stream()
                .filter(step -> step.getMinimumSalary() <= proposedSalary)
                .toList();

        if (applicableSteps.isEmpty()) {
            throw new BadRequestException("Không có cấp phê duyệt phù hợp với mức lương đề xuất (" + formatCurrency(proposedSalary) + ").");
        }

        // Quy tắc vượt hạn mức: Lương từ 30.000.000 VNĐ trở lên bắt buộc phải có cấp duyệt cao hơn (APPROVER / HR_MANAGER)
        boolean isHighSalary = proposedSalary >= 30_000_000L;
        if (isHighSalary) {
            boolean hasHighLevelApprover = applicableSteps.stream().anyMatch(step -> {
                User approver = users.findById(step.getApproverUserId()).orElse(null);
                return approver != null && approver.getRoles().stream()
                        .anyMatch(role -> role.getName() == RoleName.APPROVER || role.getName() == RoleName.HR_MANAGER);
            });
            if (!hasHighLevelApprover) {
                throw new BadRequestException("Mức lương đề xuất vượt hạn mức (" + formatCurrency(proposedSalary) + ") bắt buộc phải có cấp phê duyệt cấp cao (Ban Giám Đốc/APPROVER hoặc HR_MANAGER) trong luồng.");
            }
        }

        List<RequisitionApprovalSnapshot> workflow = applicableSteps.stream().map(step -> {
            User approver = users.findById(step.getApproverUserId())
                    .orElseThrow(() -> new BadRequestException("Người phê duyệt đã bị xóa."));
            boolean eligible = "ACTIVE".equals(approver.getStatus()) && approver.getRoles().stream()
                    .anyMatch(role -> role.getName() == RoleName.APPROVER || role.getName() == RoleName.HR_MANAGER);
            if (!eligible) {
                throw new BadRequestException("Cấu hình có người phê duyệt không còn hợp lệ.");
            }

            RequisitionApprovalSnapshot snapshot = new RequisitionApprovalSnapshot();
            snapshot.setRequisitionId(requisition.getId());
            snapshot.setConfigurationId(configuration.getId());
            snapshot.setConfigurationVersion(configuration.getVersion());
            snapshot.setStepOrder(step.getStepOrder());
            snapshot.setMinimumSalary(step.getMinimumSalary());
            snapshot.setApproverUserId(step.getApproverUserId());
            snapshot.setStatus("PENDING");
            return snapshot;
        }).toList();

        snapshots.saveAll(workflow);
        return true;
    }

    @Transactional(readOnly = true)
    public List<RequisitionApprovalSnapshot> getSnapshot(Long requisitionId) {
        return snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisitionId);
    }

    /**
     * Lấy cấu trúc timeline động chuẩn xác từ snapshot của yêu cầu, kiểm tra quyền theo từng yêu cầu.
     */
    @Transactional(readOnly = true)
    public RequisitionApprovalTimelineResponse getTimelineResponse(Long requisitionId, Long currentUserId) {
        RecruitmentRequisition req = requisitions.findById(requisitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + requisitionId));

        User currentUser = users.findById(currentUserId)
                .orElseThrow(() -> new AccessDeniedException("Người dùng không tồn tại."));

        // Lấy danh sách snapshot thực tế từ DB
        List<RequisitionApprovalSnapshot> snapshotList = snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisitionId);

        // Kiểm tra quyền xem lịch sử theo từng yêu cầu
        boolean isCreator = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(currentUserId);
        boolean isHrOrAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);
        boolean isApproverInSnapshot = snapshotList.stream()
                .anyMatch(s -> s.getApproverUserId() != null && s.getApproverUserId().equals(currentUserId));

        if (!isCreator && !isHrOrAdmin && !isApproverInSnapshot) {
            throw new AccessDeniedException("Bạn không có quyền xem tiến trình phê duyệt của yêu cầu tuyển dụng này.");
        }

        String deptName = "";
        if (req.getDepartmentId() != null) {
            deptName = departments.findById(req.getDepartmentId()).map(Department::getName).orElse("");
        }

        long proposedSalary = req.getSalaryMax() != null
                ? req.getSalaryMax()
                : (req.getSalaryMin() != null ? req.getSalaryMin() : 0L);

        List<ApprovalStepResponse> stepResponses = new ArrayList<>();
        int completedCount = 0;
        String currentWaitingDesk = null;
        boolean foundFirstPending = false;

        for (RequisitionApprovalSnapshot s : snapshotList) {
            User approver = users.findById(s.getApproverUserId()).orElse(null);
            String approverName = (approver != null && approver.getFullName() != null && !approver.getFullName().isBlank())
                    ? approver.getFullName()
                    : (approver != null ? approver.getEmail() : "Người phê duyệt");
            String approverEmail = approver != null ? approver.getEmail() : "";
            String approverRole = (approver != null && !approver.getRoles().isEmpty())
                    ? approver.getRoles().iterator().next().getName().name()
                    : "APPROVER";

            String stepStatus;
            String action;
            Instant actionAt = s.getApprovedAt();
            String comments;

            if ("APPROVED".equalsIgnoreCase(s.getStatus())) {
                stepStatus = "COMPLETED";
                action = "APPROVE";
                completedCount++;
                comments = "Đã phê duyệt (Hạn mức từ " + formatCurrency(s.getMinimumSalary()) + ")";
            } else if ("REJECTED".equalsIgnoreCase(s.getStatus()) || "REJECTED".equalsIgnoreCase(req.getStatus())) {
                stepStatus = "REJECTED";
                action = "REJECT";
                comments = req.getRejectionReason() != null ? req.getRejectionReason() : "Từ chối phê duyệt";
            } else {
                if (!foundFirstPending) {
                    stepStatus = "PENDING";
                    action = "WAITING";
                    comments = "Đang chờ phê duyệt";
                    currentWaitingDesk = approverName + " (" + approverRole + ")";
                    foundFirstPending = true;
                } else {
                    stepStatus = "UPCOMING";
                    action = "WAITING";
                    comments = "Chờ cấp trước hoàn tất";
                }
            }

            stepResponses.add(ApprovalStepResponse.builder()
                    .stepOrder(s.getStepOrder())
                    .stepName("Cấp " + s.getStepOrder() + " - " + approverRole)
                    .approverId(s.getApproverUserId())
                    .approverName(approverName)
                    .approverEmail(approverEmail)
                    .approverRole(approverRole)
                    .minimumSalary(s.getMinimumSalary())
                    .status(stepStatus)
                    .action(action)
                    .actionAt(actionAt)
                    .comments(comments)
                    .build());
        }

        boolean isCompleted = "APPROVED".equalsIgnoreCase(req.getStatus()) || (completedCount == snapshotList.size() && !snapshotList.isEmpty());
        boolean isRejected = "REJECTED".equalsIgnoreCase(req.getStatus());

        return RequisitionApprovalTimelineResponse.builder()
                .requisitionId(req.getId())
                .requisitionCode(req.getRequisitionCode())
                .title(req.getTitle())
                .departmentName(deptName)
                .proposedSalary(proposedSalary)
                .status(req.getStatus())
                .totalSteps(snapshotList.size())
                .completedSteps(completedCount)
                .currentWaitingOn(currentWaitingDesk)
                .isCompleted(isCompleted)
                .isRejected(isRejected)
                .rejectionReason(req.getRejectionReason())
                .steps(stepResponses)
                .build();
    }

    /**
     * Phê duyệt cấp hiện tại trong snapshot.
     */
    public Optional<RecruitmentRequisition> approveCurrentStep(Long requisitionId, Long userId) {
        List<RequisitionApprovalSnapshot> allSteps = snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisitionId);
        if (allSteps.isEmpty()) {
            return Optional.empty();
        }

        RecruitmentRequisition requisition = requisitions.findById(requisitionId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu tuyển dụng."));
        if (!"PENDING_APPROVAL".equalsIgnoreCase(requisition.getStatus())) {
            throw new BadRequestException("Yêu cầu tuyển dụng không ở trạng thái chờ phê duyệt.");
        }

        List<RequisitionApprovalSnapshot> pending = snapshots.findPendingForUpdate(requisitionId);
        if (pending.isEmpty()) {
            throw new BadRequestException("Luồng phê duyệt này đã hoàn tất.");
        }
        RequisitionApprovalSnapshot currentStep = pending.getFirst();

        User currentUser = users.findById(userId)
                .orElseThrow(() -> new AccessDeniedException("Người dùng không tồn tại."));
        boolean isHrOrAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);

        if (!currentStep.getApproverUserId().equals(userId) && !isHrOrAdmin) {
            throw new AccessDeniedException("Bạn không phải người phê duyệt ở cấp hiện tại.");
        }

        currentStep.setStatus("APPROVED");
        currentStep.setApprovedByUserId(userId);
        currentStep.setApprovedAt(Instant.now());
        snapshots.save(currentStep);

        boolean hasNextStep = pending.size() > 1;
        if (!hasNextStep) {
            requisition.setStatus("APPROVED");
            requisition.setApprovedByUserId(userId);
            requisition.setApprovedAt(Instant.now());
            requisitions.save(requisition);
        }
        return Optional.of(requisition);
    }

    private String formatCurrency(long amount) {
        DecimalFormat fmt = new DecimalFormat("#,###");
        return fmt.format(amount) + " VND";
    }
}