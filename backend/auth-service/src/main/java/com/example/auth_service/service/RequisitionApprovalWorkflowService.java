package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.RequisitionApprovalLogResponse;
import com.example.auth_service.entity.RequisitionApprovalConfiguration;
import com.example.auth_service.entity.RequisitionApprovalConfigurationStep;
import com.example.auth_service.entity.RequisitionApprovalLog;
import com.example.auth_service.entity.RequisitionApprovalSnapshot;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.RequisitionApprovalConfigurationRepository;
import com.example.auth_service.repository.RequisitionApprovalConfigurationStepRepository;
import com.example.auth_service.repository.RequisitionApprovalLogRepository;
import com.example.auth_service.repository.RequisitionApprovalSnapshotRepository;
import com.example.auth_service.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class RequisitionApprovalWorkflowService {
    private final RequisitionApprovalConfigurationRepository configurations;
    private final RequisitionApprovalConfigurationStepRepository configurationSteps;
    private final RequisitionApprovalSnapshotRepository snapshots;
    private final RequisitionApprovalLogRepository approvalLogs;
    private final RecruitmentRequisitionRepository requisitions;
    private final UserRepository users;

    public RequisitionApprovalWorkflowService(
            RequisitionApprovalConfigurationRepository configurations,
            RequisitionApprovalConfigurationStepRepository configurationSteps,
            RequisitionApprovalSnapshotRepository snapshots,
            RequisitionApprovalLogRepository approvalLogs,
            RecruitmentRequisitionRepository requisitions,
            UserRepository users
    ) {
        this.configurations = configurations;
        this.configurationSteps = configurationSteps;
        this.snapshots = snapshots;
        this.approvalLogs = approvalLogs;
        this.requisitions = requisitions;
        this.users = users;
    }

    public boolean snapshotForSubmission(RecruitmentRequisition requisition) {
        if (requisition.getDepartmentId() == null) {
            return false;
        }
        Optional<RequisitionApprovalConfiguration> activeConfiguration = configurations
                .findByDepartmentIdAndActiveTrue(requisition.getDepartmentId());
        if (activeConfiguration.isEmpty()) {
            return false;
        }
        if (snapshots.existsByRequisitionId(requisition.getId())) {
            if ("DRAFT".equalsIgnoreCase(requisition.getStatus())) {
                snapshots.deleteAllByRequisitionId(requisition.getId());
            } else {
                throw new BadRequestException("Yêu cầu tuyển dụng đã có snapshot luồng phê duyệt.");
            }
        }

        RequisitionApprovalConfiguration configuration = activeConfiguration.get();
        long proposedSalary = requisition.getSalaryMax() != null
                ? requisition.getSalaryMax()
                : requisition.getSalaryMin() != null ? requisition.getSalaryMin() : 0L;
        List<RequisitionApprovalConfigurationStep> applicableSteps = configurationSteps
                .findAllByConfigurationIdOrderByStepOrderAsc(configuration.getId())
                .stream()
                .filter(step -> step.getMinimumSalary() <= proposedSalary)
                .toList();
        if (applicableSteps.isEmpty()) {
            throw new BadRequestException("Không có cấp phê duyệt phù hợp với mức lương đề xuất.");
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

    public List<RequisitionApprovalSnapshot> getSnapshot(Long requisitionId) {
        return snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisitionId);
    }

    public boolean hasWorkflowSnapshot(Long requisitionId) {
        return snapshots.existsByRequisitionId(requisitionId);
    }

    /**
     * Backward-compatible approval invocation.
     */
    public Optional<RecruitmentRequisition> approveCurrentStep(Long requisitionId, Long userId) {
        return processApprovalAction(requisitionId, userId, "APPROVE", null);
    }

    /**
     * Xử lý 3 hành động phê duyệt (S3-02):
     * - APPROVE (Duyệt): chuyển sang cấp tiếp theo; cấp cuối chuyển sang APPROVED.
     * - REJECT (Từ chối): bắt buộc nhập ý kiến; chuyển yêu cầu sang REJECTED.
     * - REQUEST_CHANGES (Yêu cầu bổ sung): bắt buộc nhập ý kiến; trả hồ sơ về người tạo (DRAFT), giữ nguyên lịch sử.
     * Ghi nhận nhật ký quyết định phê duyệt bất biến trong cùng giao dịch.
     */
    public Optional<RecruitmentRequisition> processApprovalAction(
            Long requisitionId,
            Long userId,
            String rawAction,
            String comment
    ) {
        List<RequisitionApprovalSnapshot> allSteps = snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisitionId);
        if (allSteps.isEmpty()) {
            return Optional.empty();
        }

        RecruitmentRequisition requisition = requisitions.findById(requisitionId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu tuyển dụng."));
        if (!"PENDING_APPROVAL".equalsIgnoreCase(requisition.getStatus())) {
            throw new BadRequestException("Yêu cầu tuyển dụng không ở trạng thái chờ phê duyệt.");
        }

        String action = normalizeAction(rawAction);
        validateActionAndComment(action, comment);

        List<RequisitionApprovalSnapshot> pending = snapshots.findPendingForUpdate(requisitionId);
        if (pending.isEmpty()) {
            throw new BadRequestException("Luồng phê duyệt này đã hoàn tất.");
        }
        RequisitionApprovalSnapshot currentStep = pending.getFirst();
        if (!currentStep.getApproverUserId().equals(userId)) {
            throw new AccessDeniedException("Bạn không phải người phê duyệt ở cấp hiện tại.");
        }

        String trimmedComment = comment != null && !comment.isBlank() ? comment.trim() : null;

        if ("APPROVE".equals(action)) {
            currentStep.setStatus("APPROVED");
            currentStep.setApprovedByUserId(userId);
            currentStep.setApprovedAt(Instant.now());
            snapshots.save(currentStep);

            boolean hasNextStep = pending.size() > 1;
            if (!hasNextStep) {
                requisition.setStatus("APPROVED");
                requisition.setApprovedByUserId(userId);
                requisition.setApprovedAt(Instant.now());
            }
        } else if ("REJECT".equals(action)) {
            currentStep.setStatus("REJECTED");
            currentStep.setApprovedByUserId(userId);
            currentStep.setApprovedAt(Instant.now());
            snapshots.save(currentStep);

            requisition.setStatus("REJECTED");
            requisition.setRejectionReason(trimmedComment);
        } else if ("REQUEST_CHANGES".equals(action)) {
            currentStep.setStatus("REQUEST_CHANGES");
            currentStep.setApprovedByUserId(userId);
            currentStep.setApprovedAt(Instant.now());
            snapshots.save(currentStep);

            // Trả hồ sơ về người tạo (chuyển về DRAFT để người tạo có thể sửa & gửi lại)
            requisition.setStatus("DRAFT");
            requisition.setRejectionReason(trimmedComment);
        }

        requisition.setUpdatedAt(Instant.now());
        RecruitmentRequisition saved = requisitions.save(requisition);

        // Ghi nhật ký quyết định phê duyệt bất biến trong cùng giao dịch
        RequisitionApprovalLog log = new RequisitionApprovalLog(
                requisition.getId(),
                userId,
                currentStep.getStepOrder(),
                action,
                trimmedComment
        );
        approvalLogs.save(log);

        return Optional.of(saved);
    }

    /**
     * Ghi log phê duyệt dự phòng (cho trường hợp không có snapshot cấu hình).
     */
    public void recordFallbackApprovalLog(Long requisitionId, Long userId, String rawAction, String comment) {
        String action = normalizeAction(rawAction);
        String trimmedComment = comment != null && !comment.isBlank() ? comment.trim() : null;
        RequisitionApprovalLog log = new RequisitionApprovalLog(
                requisitionId,
                userId,
                1,
                action,
                trimmedComment
        );
        approvalLogs.save(log);
    }

    /**
     * Lấy danh sách nhật ký phê duyệt bất biến của yêu cầu tuyển dụng.
     */
    @Transactional(readOnly = true)
    public List<RequisitionApprovalLogResponse> getApprovalLogs(Long requisitionId) {
        if (!requisitions.existsById(requisitionId)) {
            throw new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + requisitionId);
        }
        List<RequisitionApprovalLog> logs = approvalLogs.findAllByRequisitionIdOrderByCreatedAtAsc(requisitionId);
        return logs.stream().map(log -> {
            User user = users.findById(log.getApproverUserId()).orElse(null);
            String name = user != null ? user.getFullName() : null;
            String email = user != null ? user.getEmail() : null;
            return new RequisitionApprovalLogResponse(
                    log.getId(),
                    log.getRequisitionId(),
                    log.getStepOrder(),
                    log.getAction(),
                    log.getComment(),
                    log.getApproverUserId(),
                    name,
                    email,
                    log.getCreatedAt()
            );
        }).toList();
    }

    public static String normalizeAction(String rawAction) {
        if (rawAction == null || rawAction.isBlank()) {
            return "APPROVE";
        }
        String upper = rawAction.trim().toUpperCase();
        return switch (upper) {
            case "APPROVE", "DUYET", "APPROVED" -> "APPROVE";
            case "REJECT", "TU_CHOI", "REJECTED" -> "REJECT";
            case "REQUEST_CHANGES", "REQUEST_INFO", "REQUEST_ADDITIONAL_INFO", "YEU_CAU_BO_SUNG", "BO_SUNG" -> "REQUEST_CHANGES";
            default -> upper;
        };
    }

    public static void validateActionAndComment(String action, String comment) {
        if (!List.of("APPROVE", "REJECT", "REQUEST_CHANGES").contains(action)) {
            throw new BadRequestException("Hành động phê duyệt không hợp lệ: '" + action + "'. Hỗ trợ: APPROVE, REJECT, REQUEST_CHANGES.");
        }
        if (("REJECT".equals(action) || "REQUEST_CHANGES".equals(action)) && (comment == null || comment.trim().isEmpty())) {
            throw new BadRequestException("Từ chối và yêu cầu bổ sung bắt buộc phải nhập ý kiến.");
        }
    }
}