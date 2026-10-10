package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.entity.RequisitionApprovalConfiguration;
import com.example.auth_service.entity.RequisitionApprovalConfigurationStep;
import com.example.auth_service.entity.RequisitionApprovalSnapshot;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.repository.RequisitionApprovalConfigurationRepository;
import com.example.auth_service.repository.RequisitionApprovalConfigurationStepRepository;
import com.example.auth_service.repository.RequisitionApprovalSnapshotRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
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
    private final RecruitmentRequisitionRepository requisitions;
    private final UserRepository users;

    public RequisitionApprovalWorkflowService(
            RequisitionApprovalConfigurationRepository configurations,
            RequisitionApprovalConfigurationStepRepository configurationSteps,
            RequisitionApprovalSnapshotRepository snapshots,
            RecruitmentRequisitionRepository requisitions,
            UserRepository users
    ) {
        this.configurations = configurations;
        this.configurationSteps = configurationSteps;
        this.snapshots = snapshots;
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
            throw new BadRequestException("Yêu cầu tuyển dụng đã có snapshot luồng phê duyệt.");
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
        if (!currentStep.getApproverUserId().equals(userId)) {
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
}