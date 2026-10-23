package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.ApprovalStepResponse;
import com.example.auth_service.dto.RequisitionApprovalLogResponse;
import com.example.auth_service.dto.RequisitionApprovalTimelineResponse;
import com.example.auth_service.entity.RequisitionApprovalConfiguration;
import com.example.auth_service.entity.RequisitionApprovalConfigurationStep;
import com.example.auth_service.entity.RequisitionApprovalLog;
import com.example.auth_service.entity.RequisitionApprovalSnapshot;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.RequisitionApprovalConfigurationRepository;
import com.example.auth_service.repository.RequisitionApprovalConfigurationStepRepository;
import com.example.auth_service.repository.RequisitionApprovalLogRepository;
import com.example.auth_service.repository.RequisitionApprovalSnapshotRepository;
import com.example.auth_service.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.DecimalFormat;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class RequisitionApprovalWorkflowService {

    private final RequisitionApprovalConfigurationRepository configurations;
    private final RequisitionApprovalConfigurationStepRepository configurationSteps;
    private final RequisitionApprovalSnapshotRepository snapshots;
    private final RequisitionApprovalLogRepository approvalLogs;
    private final RecruitmentRequisitionRepository requisitions;
    private final UserRepository users;
 feature/scrum-128-129-clone-recruitment-request
    private final com.example.auth_service.repository.JobTitleRepository jobTitles;

    private final DepartmentRepository departments;
 dev

    @org.springframework.beans.factory.annotation.Autowired
    public RequisitionApprovalWorkflowService(
            RequisitionApprovalConfigurationRepository configurations,
            RequisitionApprovalConfigurationStepRepository configurationSteps,
            RequisitionApprovalSnapshotRepository snapshots,
            RequisitionApprovalLogRepository approvalLogs,
            RecruitmentRequisitionRepository requisitions,
            UserRepository users,
 feature/scrum-128-129-clone-recruitment-request
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.example.auth_service.repository.JobTitleRepository jobTitles

            DepartmentRepository departments
 dev
    ) {
        this.configurations = configurations;
        this.configurationSteps = configurationSteps;
        this.snapshots = snapshots;
        this.approvalLogs = approvalLogs;
        this.requisitions = requisitions;
        this.users = users;
 feature/scrum-128-129-clone-recruitment-request
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

        this.departments = departments;
 dev
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

 feature/scrum-128-129-clone-recruitment-request
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

        if (snapshots.existsByRequisitionId(requisition.getId())) {
            if ("DRAFT".equalsIgnoreCase(requisition.getStatus())
                    || "PENDING_APPROVAL".equalsIgnoreCase(requisition.getStatus())
                    || "SUBMITTED".equalsIgnoreCase(requisition.getStatus())) {
                snapshots.deleteAllByRequisitionId(requisition.getId());
                snapshots.flush();
            } else {
                throw new BadRequestException("Yêu cầu tuyển dụng đã có snapshot luồng phê duyệt.");
            }
        }

        RequisitionApprovalConfiguration configuration = activeConfiguration.get();
        if (requisition.getSalaryMax() == null && requisition.getSalaryMin() == null) {
            throw new BadRequestException("Dải lương đề xuất không được để trống khi xác định cấp phê duyệt.");
        }
        long proposedSalary = requisition.getSalaryMax() != null
                ? requisition.getSalaryMax()
                : requisition.getSalaryMin();
        if (proposedSalary <= 0) {
            throw new BadRequestException("Mức lương đề xuất phải lớn hơn 0 để xác định cấp phê duyệt.");
        }

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
dev
        }

        List<RequisitionApprovalSnapshot> workflow = applicableSteps.stream().map(step -> {
            if (step.getApproverUserId() == null) {
                throw new BadRequestException("Cấu hình phê duyệt bước " + step.getStepOrder() + " chưa thiết lập Người phê duyệt (Approver).");
            }
            User approver = users.findById(step.getApproverUserId())
 feature/scrum-128-129-clone-recruitment-request
                    .orElseThrow(() -> new BadRequestException("Người phê duyệt (ID: " + step.getApproverUserId() + ") tại bước " + step.getStepOrder() + " không tồn tại hoặc đã bị xóa."));
            boolean eligible = "ACTIVE".equalsIgnoreCase(approver.getStatus()) && approver.getRoles().stream()
                    .anyMatch(role -> role.getName() == RoleName.APPROVER || role.getName() == RoleName.HR_MANAGER || role.getName() == RoleName.ADMIN);

                    .orElseThrow(() -> new BadRequestException("Người phê duyệt đã bị xóa."));
            boolean eligible = "ACTIVE".equals(approver.getStatus()) && approver.getRoles().stream()
                    .anyMatch(role -> role.getName() == RoleName.APPROVER || role.getName() == RoleName.HR_MANAGER || role.getName() == RoleName.HIRING_MANAGER);
 dev
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

    @Transactional(readOnly = true)
    public List<RequisitionApprovalSnapshot> getSnapshot(Long requisitionId) {
        return snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisitionId);
    }

    public boolean hasWorkflowSnapshot(Long requisitionId) {
        return snapshots.existsByRequisitionId(requisitionId);
    }

    /**
     * Bổ sung các cấp phê duyệt phía sau từ cấu hình phòng ban đang hoạt động nếu snapshot cũ bị thiếu.
     */
    @Transactional
    public void syncMissingSubsequentSteps(RecruitmentRequisition req, long proposedSalary) {
        if (req == null || req.getDepartmentId() == null) {
            return;
        }
        if (!"PENDING_APPROVAL".equalsIgnoreCase(req.getStatus())) {
            return;
        }

        Optional<RequisitionApprovalConfiguration> activeConfigOpt = configurations
                .findByDepartmentIdAndActiveTrue(req.getDepartmentId());
        if (activeConfigOpt.isEmpty()) {
            return;
        }

        RequisitionApprovalConfiguration activeConfig = activeConfigOpt.get();
        List<RequisitionApprovalConfigurationStep> applicableSteps = configurationSteps
                .findAllByConfigurationIdOrderByStepOrderAsc(activeConfig.getId())
                .stream()
                .filter(step -> step.getMinimumSalary() <= proposedSalary)
                .toList();

        if (applicableSteps.isEmpty()) {
            return;
        }

        List<RequisitionApprovalSnapshot> existingSnapshots = snapshots
                .findAllByRequisitionIdOrderByStepOrderAsc(req.getId());

        if (existingSnapshots.isEmpty()) {
            return;
        }

        Integer snapshotVersion = existingSnapshots.get(0).getConfigurationVersion();
        if (snapshotVersion != null && !snapshotVersion.equals(activeConfig.getVersion())) {
            // Snapshot belongs to an earlier frozen configuration version (S3-01 immutability rule)
            return;
        }

        Set<Long> existingApproverIds = existingSnapshots.stream()
                .map(RequisitionApprovalSnapshot::getApproverUserId)
                .collect(Collectors.toSet());

        List<RequisitionApprovalConfigurationStep> missingSteps = applicableSteps.stream()
                .filter(step -> !existingApproverIds.contains(step.getApproverUserId()))
                .sorted(Comparator.comparingLong(RequisitionApprovalConfigurationStep::getMinimumSalary)
                        .thenComparingInt(RequisitionApprovalConfigurationStep::getStepOrder))
                .toList();

        if (missingSteps.isEmpty()) {
            return;
        }

        int maxOrder = existingSnapshots.stream()
                .mapToInt(RequisitionApprovalSnapshot::getStepOrder)
                .max()
                .orElse(0);

        List<RequisitionApprovalSnapshot> newSnapshots = new ArrayList<>();
        for (RequisitionApprovalConfigurationStep step : missingSteps) {
            maxOrder++;
            RequisitionApprovalSnapshot s = new RequisitionApprovalSnapshot();
            s.setRequisitionId(req.getId());
            s.setConfigurationId(activeConfig.getId());
            s.setConfigurationVersion(activeConfig.getVersion());
            s.setStepOrder(maxOrder);
            s.setMinimumSalary(step.getMinimumSalary());
            s.setApproverUserId(step.getApproverUserId());
            s.setStatus("PENDING");
            newSnapshots.add(s);
            existingApproverIds.add(step.getApproverUserId());
        }

        snapshots.saveAll(newSnapshots);
    }

    /**
     * Lấy cấu trúc timeline động chuẩn xác từ snapshot của yêu cầu, kiểm tra quyền theo từng yêu cầu.
     * Đồng bộ với nhật ký phê duyệt thực tế và bảo đảm bất biến khi chỉ xem lịch sử.
     */
    @Transactional(readOnly = true)
    public RequisitionApprovalTimelineResponse getTimelineResponse(Long requisitionId, Long currentUserId) {
        RecruitmentRequisition req = requisitions.findById(requisitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + requisitionId));

        User currentUser = users.findById(currentUserId)
                .orElseThrow(() -> new AccessDeniedException("Người dùng không tồn tại."));

        long proposedSalary = req.getSalaryMax() != null
                ? req.getSalaryMax()
                : (req.getSalaryMin() != null ? req.getSalaryMin() : 0L);

        // Lấy danh sách snapshot thực tế từ DB (bất biến, không mutate khi chỉ xem lịch sử)
        List<RequisitionApprovalSnapshot> snapshotList = snapshots.findAllByRequisitionIdOrderByStepOrderAsc(requisitionId);

        // Lấy nhật ký phê duyệt thực tế để đồng bộ quyết định và ý kiến
        List<RequisitionApprovalLog> logs = approvalLogs != null
                ? approvalLogs.findAllByRequisitionIdOrderByCreatedAtAsc(requisitionId)
                : List.of();

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

        List<ApprovalStepResponse> stepResponses = new ArrayList<>();
        int completedCount = 0;
        String currentWaitingDesk = null;
        Integer currentStepOrder = null;
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

            // Tìm nhật ký phê duyệt thực tế gần nhất cho cấp duyệt này
            Optional<RequisitionApprovalLog> stepLog = logs.stream()
                    .filter(l -> (l.getStepOrder() != null && l.getStepOrder() == s.getStepOrder())
                            || (l.getApproverUserId() != null && l.getApproverUserId().equals(s.getApproverUserId())))
                    .reduce((first, second) -> second);

            String stepStatus;
            String action;
            Instant actionAt = s.getApprovedAt() != null
                    ? s.getApprovedAt()
                    : stepLog.map(RequisitionApprovalLog::getCreatedAt).orElse(null);
            String comments;
            boolean isCurrent = false;

            if ("APPROVED".equalsIgnoreCase(s.getStatus())) {
                stepStatus = "COMPLETED";
                action = "APPROVE";
                completedCount++;
                String logComment = stepLog.map(RequisitionApprovalLog::getComment).filter(c -> !c.isBlank()).orElse(null);
                comments = logComment != null ? logComment : ("Đã phê duyệt (Hạn mức từ " + formatCurrency(s.getMinimumSalary()) + ")");
            } else if ("REJECTED".equalsIgnoreCase(s.getStatus()) || "REJECTED".equalsIgnoreCase(req.getStatus())) {
                stepStatus = "REJECTED";
                action = "REJECT";
                String logComment = stepLog.map(RequisitionApprovalLog::getComment).filter(c -> !c.isBlank()).orElse(null);
                comments = logComment != null ? logComment : (req.getRejectionReason() != null ? req.getRejectionReason() : "Từ chối phê duyệt");
            } else if ("REQUEST_CHANGES".equalsIgnoreCase(s.getStatus())
                    || stepLog.filter(l -> "REQUEST_CHANGES".equalsIgnoreCase(l.getAction())).isPresent()) {
                stepStatus = "REQUEST_CHANGES";
                action = "REQUEST_CHANGES";
                String logComment = stepLog.map(RequisitionApprovalLog::getComment).filter(c -> !c.isBlank()).orElse(null);
                comments = logComment != null ? logComment : (req.getRejectionReason() != null ? req.getRejectionReason() : "Yêu cầu bổ sung thông tin");
            } else {
                if (!foundFirstPending) {
                    stepStatus = "PENDING";
                    action = "WAITING";
                    comments = "Đang chờ phê duyệt";
                    currentWaitingDesk = approverName + " (" + approverRole + ")";
                    currentStepOrder = s.getStepOrder();
                    isCurrent = true;
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
                    .isCurrentStep(isCurrent)
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
                .currentStepOrder(currentStepOrder)
                .totalSteps(snapshotList.size())
                .completedSteps(completedCount)
                .currentWaitingOn(currentWaitingDesk)
                .isCompleted(isCompleted)
                .isRejected(isRejected)
                .rejectionReason(req.getRejectionReason())
                .submittedAt(req.getCreatedAt())
                .steps(stepResponses)
                .build();
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

        users.findById(userId)
                .orElseThrow(() -> new AccessDeniedException("Người dùng không tồn tại."));

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
        if (approvalLogs != null) {
            approvalLogs.save(log);
        }

        return Optional.ofNullable(saved != null ? saved : requisition);
    }

    /**
     * Ghi log phê duyệt dự phòng (cho trường hợp không có snapshot cấu hình).
     */
    public void recordFallbackApprovalLog(Long requisitionId, Long userId, String rawAction, String comment) {
        if (approvalLogs == null) {
            return;
        }
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

    private String formatCurrency(long amount) {
        DecimalFormat fmt = new DecimalFormat("#,###");
        return fmt.format(amount) + " VND";
    }
}