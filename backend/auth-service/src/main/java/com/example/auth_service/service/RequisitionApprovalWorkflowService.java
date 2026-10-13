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
    private final com.example.auth_service.repository.JobTitleRepository jobTitles;

    @org.springframework.beans.factory.annotation.Autowired
    public RequisitionApprovalWorkflowService(
            RequisitionApprovalConfigurationRepository configurations,
            RequisitionApprovalConfigurationStepRepository configurationSteps,
            RequisitionApprovalSnapshotRepository snapshots,
            RecruitmentRequisitionRepository requisitions,
            UserRepository users,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.example.auth_service.repository.JobTitleRepository jobTitles
    ) {
        this.configurations = configurations;
        this.configurationSteps = configurationSteps;
        this.snapshots = snapshots;
        this.requisitions = requisitions;
        this.users = users;
        this.jobTitles = jobTitles;
    }

    public RequisitionApprovalWorkflowService(
            RequisitionApprovalConfigurationRepository configurations,
            RequisitionApprovalConfigurationStepRepository configurationSteps,
            RequisitionApprovalSnapshotRepository snapshots,
            RecruitmentRequisitionRepository requisitions,
            UserRepository users
    ) {
        this(configurations, configurationSteps, snapshots, requisitions, users, null);
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

        // Xóa snapshot cũ nếu có để cho phép submit lại bản nháp
        if (snapshots.existsByRequisitionId(requisition.getId())) {
            List<RequisitionApprovalSnapshot> existing = snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisition.getId());
            snapshots.deleteAll(existing);
        }

        RequisitionApprovalConfiguration configuration = activeConfiguration.get();
        Long salMax = requisition.getSalaryMax() != null ? requisition.getSalaryMax() : requisition.getProposedMaxSalary();
        Long salMin = requisition.getSalaryMin() != null ? requisition.getSalaryMin() : requisition.getProposedMinSalary();
        if (salMax == null && salMin == null && requisition.getJobTitleId() != null && jobTitles != null) {
            var jtOpt = jobTitles.findById(requisition.getJobTitleId());
            if (jtOpt.isPresent()) {
                salMax = jtOpt.get().getMaxSalary();
                salMin = jtOpt.get().getMinSalary();
            }
        }
        long proposedSalary = salMax != null ? salMax : (salMin != null ? salMin : 0L);

        List<RequisitionApprovalConfigurationStep> allSteps = configurationSteps
                .findAllByConfigurationIdOrderByStepOrderAsc(configuration.getId());
        if (allSteps.isEmpty()) {
            throw new BadRequestException("Cấu hình phê duyệt của phòng ban chưa có bước phê duyệt nào.");
        }

        List<RequisitionApprovalConfigurationStep> applicableSteps = allSteps.stream()
                .filter(step -> step.getMinimumSalary() <= proposedSalary)
                .toList();

        // Nếu mức lương đề xuất thấp hơn mức sàn các bước, fallback về bước 1 (cấp phê duyệt cơ sở)
        if (applicableSteps.isEmpty()) {
            applicableSteps = List.of(allSteps.getFirst());
        }

        List<RequisitionApprovalSnapshot> workflow = applicableSteps.stream().map(step -> {
            if (step.getApproverUserId() == null) {
                throw new BadRequestException("Cấu hình phê duyệt bước " + step.getStepOrder() + " chưa thiết lập Người phê duyệt (Approver).");
            }
            User approver = users.findById(step.getApproverUserId())
                    .orElseThrow(() -> new BadRequestException("Người phê duyệt (ID: " + step.getApproverUserId() + ") tại bước " + step.getStepOrder() + " không tồn tại hoặc đã bị xóa."));
            boolean eligible = "ACTIVE".equalsIgnoreCase(approver.getStatus()) && approver.getRoles().stream()
                    .anyMatch(role -> role.getName() == RoleName.APPROVER || role.getName() == RoleName.HR_MANAGER || role.getName() == RoleName.ADMIN);
            if (!eligible) {
                throw new BadRequestException("Người phê duyệt (" + approver.getFullName() + ") tại bước " + step.getStepOrder() + " không ở trạng thái hoạt động hoặc thiếu vai trò phê duyệt (APPROVER/HR_MANAGER).");
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