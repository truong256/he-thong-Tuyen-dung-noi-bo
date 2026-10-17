package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RequisitionAssignmentService {

    private final RequisitionAssignmentRepository assignments;
    private final RequisitionAssignmentHistoryRepository assignmentHistories;
    private final RecruitmentRequisitionRepository requisitions;
    private final UserRepository users;

    public RequisitionAssignmentService(
            RequisitionAssignmentRepository assignments,
            RequisitionAssignmentHistoryRepository assignmentHistories,
            RecruitmentRequisitionRepository requisitions,
            UserRepository users
    ) {
        this.assignments = assignments;
        this.assignmentHistories = assignmentHistories;
        this.requisitions = requisitions;
        this.users = users;
    }

    /**
     * Backward-compatible assignment method for legacy/existing calls.
     */
    @PreAuthorize("hasAuthority('RECRUITER_ASSIGN')")
    @Transactional
    public void assign(Long requisitionId, Long userId, String roleName) {
        assign(requisitionId, userId, roleName, false, null, null);
    }

    /**
     * Gán hoặc cập nhật phân công đơn lẻ kèm ghi nhận lịch sử chuyển giao.
     */
    @PreAuthorize("hasAuthority('RECRUITER_ASSIGN')")
    @Transactional
    public void assign(Long requisitionId, Long userId, String roleName, boolean isPrimary, String reason, String notes) {
        RoleName role;
        try {
            role = RoleName.valueOf(roleName);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new BadRequestException("Vai trò phân công không hợp lệ.");
        }
        if (role != RoleName.RECRUITER && role != RoleName.HIRING_MANAGER && role != RoleName.APPROVER) {
            throw new BadRequestException("Chỉ phân công recruiter, trưởng bộ phận hoặc người phê duyệt cho vị trí tuyển dụng.");
        }
        if (!requisitions.existsById(requisitionId)) {
            throw new ResourceNotFoundException("Không tìm thấy vị trí tuyển dụng.");
        }
        User user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng."));
        if (!"ACTIVE".equals(user.getStatus()) || user.getRoles().stream().noneMatch(r -> r.getName() == role)) {
            throw new BadRequestException("Người dùng phải đang hoạt động và có vai trò tương ứng.");
        }

        Long performerId = getCurrentUserId();
        RequisitionAssignment assignment = assignments.findByRequisitionIdAndUserId(requisitionId, userId)
                .orElseGet(RequisitionAssignment::new);

        boolean isNew = assignment.getId() == null;
        assignment.setRequisitionId(requisitionId);
        assignment.setUserId(userId);
        assignment.setRole(role);
        assignment.setPrimary(isPrimary);
        if (assignment.getAssignedAt() == null) {
            assignment.setAssignedAt(Instant.now());
        }
        assignments.save(assignment);

        // Lưu lịch sử phân công
        String assignmentType = isPrimary ? "PRIMARY" : "SUPPORT";
        String action = isNew ? "ASSIGNED" : "ROLE_CHANGED";
        saveHistory(requisitionId, userId, role, assignmentType, action, null, performerId, reason, notes);
    }

    /**
     * S3-06: Phân công một recruiter chính và nhiều recruiter hỗ trợ cho yêu cầu tuyển dụng.
     * Tự động phát hiện và ghi nhận lịch sử chuyển giao (Handover).
     */
    @PreAuthorize("hasAuthority('RECRUITER_ASSIGN')")
    @Transactional
    public RequisitionAssignmentsResponse assignRecruiters(Long requisitionId, AssignRecruiterPayload payload) {
        requisitions.findById(requisitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng."));

        if (payload.primaryRecruiterId() == null) {
            throw new BadRequestException("Vui lòng chọn một recruiter chính chịu trách nhiệm.");
        }

        User primaryUser = users.findById(payload.primaryRecruiterId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy recruiter chính."));
        validateRecruiterUser(primaryUser, "Recruiter chính");

        // Lấy danh sách ID hỗ trợ, loại bỏ trùng với recruiter chính và trùng lặp trong list
        Set<Long> supportIds = new LinkedHashSet<>();
        if (payload.supportRecruiterIds() != null) {
            for (Long sId : payload.supportRecruiterIds()) {
                if (sId != null && !sId.equals(payload.primaryRecruiterId())) {
                    supportIds.add(sId);
                }
            }
        }

        // Xác thực tất cả recruiter hỗ trợ
        List<User> supportUsers = new ArrayList<>();
        for (Long sId : supportIds) {
            User sUser = users.findById(sId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy recruiter hỗ trợ với ID " + sId));
            validateRecruiterUser(sUser, "Recruiter hỗ trợ (" + sUser.getFullName() + ")");
            supportUsers.add(sUser);
        }

        Long performerId = getCurrentUserId();

        // 1. Kiểm tra recruiter chính hiện tại để xử lý Handover
        Optional<RequisitionAssignment> currentPrimaryOpt = assignments
                .findByRequisitionIdAndRoleAndIsPrimaryTrue(requisitionId, RoleName.RECRUITER);

        Long previousPrimaryUserId = null;
        if (currentPrimaryOpt.isPresent()) {
            RequisitionAssignment currentPrimary = currentPrimaryOpt.get();
            previousPrimaryUserId = currentPrimary.getUserId();

            if (!previousPrimaryUserId.equals(payload.primaryRecruiterId())) {
                // Đổi người phụ trách chính -> Lưu lịch sử chuyển giao (Handover)
                saveHistory(
                        requisitionId,
                        payload.primaryRecruiterId(),
                        RoleName.RECRUITER,
                        "PRIMARY",
                        "HANDOVER",
                        previousPrimaryUserId,
                        performerId,
                        payload.reason() != null && !payload.reason().isBlank()
                                ? payload.reason()
                                : "Chuyển giao người phụ trách chính",
                        payload.notes()
                );

                // Nếu recruiter chính cũ chuyển sang làm hỗ trợ
                if (supportIds.contains(previousPrimaryUserId)) {
                    currentPrimary.setPrimary(false);
                    assignments.save(currentPrimary);
                } else {
                    // Nếu không nằm trong danh sách hỗ trợ -> Hủy phân công
                    assignments.delete(currentPrimary);
                    saveHistory(
                            requisitionId,
                            previousPrimaryUserId,
                            RoleName.RECRUITER,
                            "PRIMARY",
                            "UNASSIGNED",
                            null,
                            performerId,
                            "Chuyển giao vị trí phụ trách chính cho " + primaryUser.getFullName(),
                            payload.notes()
                    );
                }
            }
        } else {
            // Chưa có recruiter chính trước đó -> Gán mới
            saveHistory(
                    requisitionId,
                    payload.primaryRecruiterId(),
                    RoleName.RECRUITER,
                    "PRIMARY",
                    "ASSIGNED",
                    null,
                    performerId,
                    payload.reason(),
                    payload.notes()
            );
        }

        // Cập nhật hoặc thêm mới recruiter chính
        RequisitionAssignment primaryAssignment = assignments
                .findByRequisitionIdAndUserId(requisitionId, payload.primaryRecruiterId())
                .orElseGet(RequisitionAssignment::new);
        primaryAssignment.setRequisitionId(requisitionId);
        primaryAssignment.setUserId(payload.primaryRecruiterId());
        primaryAssignment.setRole(RoleName.RECRUITER);
        primaryAssignment.setPrimary(true);
        if (primaryAssignment.getAssignedAt() == null) {
            primaryAssignment.setAssignedAt(Instant.now());
        }
        assignments.save(primaryAssignment);

        // 2. Đồng bộ danh sách recruiter hỗ trợ
        List<RequisitionAssignment> existingRecruiters = assignments
                .findByRequisitionIdAndRole(requisitionId, RoleName.RECRUITER);

        for (RequisitionAssignment existing : existingRecruiters) {
            if (existing.getUserId().equals(payload.primaryRecruiterId())) {
                continue; // Đã xử lý ở trên
            }
            if (!supportIds.contains(existing.getUserId())) {
                // Không còn trong danh sách hỗ trợ -> Hủy phân công
                assignments.delete(existing);
                saveHistory(
                        requisitionId,
                        existing.getUserId(),
                        RoleName.RECRUITER,
                        "SUPPORT",
                        "UNASSIGNED",
                        null,
                        performerId,
                        "Ngừng tham gia hỗ trợ yêu cầu tuyển dụng",
                        null
                );
            }
        }

        for (User supportUser : supportUsers) {
            Optional<RequisitionAssignment> existingSupport = assignments
                    .findByRequisitionIdAndUserId(requisitionId, supportUser.getId());
            if (existingSupport.isEmpty()) {
                RequisitionAssignment newSupport = new RequisitionAssignment();
                newSupport.setRequisitionId(requisitionId);
                newSupport.setUserId(supportUser.getId());
                newSupport.setRole(RoleName.RECRUITER);
                newSupport.setPrimary(false);
                newSupport.setAssignedAt(Instant.now());
                assignments.save(newSupport);

                saveHistory(
                        requisitionId,
                        supportUser.getId(),
                        RoleName.RECRUITER,
                        "SUPPORT",
                        "ASSIGNED",
                        null,
                        performerId,
                        "Phân công hỗ trợ yêu cầu tuyển dụng",
                        null
                );
            } else {
                RequisitionAssignment sup = existingSupport.get();
                if (sup.isPrimary()) {
                    sup.setPrimary(false);
                    assignments.save(sup);
                }
            }
        }

        return getAssignments(requisitionId);
    }

    /**
     * Hủy phân công người dùng khỏi yêu cầu tuyển dụng và lưu lại lịch sử (không xóa lịch sử cũ).
     */
    @PreAuthorize("hasAuthority('RECRUITER_ASSIGN')")
    @Transactional
    public void unassign(Long requisitionId, Long userId) {
        unassign(requisitionId, userId, "Thu hồi phân công");
    }

    @PreAuthorize("hasAuthority('RECRUITER_ASSIGN')")
    @Transactional
    public void unassign(Long requisitionId, Long userId, String reason) {
        Optional<RequisitionAssignment> opt = assignments.findByRequisitionIdAndUserId(requisitionId, userId);
        if (opt.isPresent()) {
            RequisitionAssignment assignment = opt.get();
            String assignmentType = assignment.isPrimary() ? "PRIMARY" : "SUPPORT";
            RoleName role = assignment.getRole();
            assignments.delete(assignment);

            Long performerId = getCurrentUserId();
            saveHistory(
                    requisitionId,
                    userId,
                    role,
                    assignmentType,
                    "UNASSIGNED",
                    null,
                    performerId,
                    reason != null ? reason : "Thu hồi phân công",
                    null
            );
        }
    }

    /**
     * Lấy thông tin phân công hiện tại của một yêu cầu tuyển dụng.
     */
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_ALL', 'REQUISITION_READ_OWN', 'RECRUITER_ASSIGN', 'REQUISITION_APPROVE')")
    @Transactional(readOnly = true)
    public RequisitionAssignmentsResponse getAssignments(Long requisitionId) {
        RecruitmentRequisition req = requisitions.findById(requisitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng."));

        List<RequisitionAssignment> list = assignments.findByRequisitionId(requisitionId);

        AssignmentMemberDto primary = null;
        List<AssignmentMemberDto> supports = new ArrayList<>();
        List<AssignmentMemberDto> hiringManagers = new ArrayList<>();

        for (RequisitionAssignment item : list) {
            User u = users.findById(item.getUserId()).orElse(null);
            if (u == null) continue;

            AssignmentMemberDto dto = new AssignmentMemberDto(
                    u.getId(),
                    u.getFullName(),
                    u.getEmail(),
                    u.getDepartment(),
                    item.getRole().name(),
                    item.isPrimary(),
                    item.getAssignedAt(),
                    item.isHandoverRequired()
            );

            if (item.getRole() == RoleName.RECRUITER) {
                if (item.isPrimary()) {
                    primary = dto;
                } else {
                    supports.add(dto);
                }
            } else if (item.getRole() == RoleName.HIRING_MANAGER) {
                hiringManagers.add(dto);
            }
        }

        return new RequisitionAssignmentsResponse(
                req.getId(),
                req.getRequisitionCode(),
                req.getTitle(),
                primary,
                supports,
                hiringManagers
        );
    }

    /**
     * Lấy lịch sử chuyển giao và phân công của yêu cầu tuyển dụng.
     */
    @PreAuthorize("hasAnyAuthority('REQUISITION_CREATE', 'REQUISITION_READ_ALL', 'REQUISITION_READ_OWN', 'RECRUITER_ASSIGN', 'REQUISITION_APPROVE')")
    @Transactional(readOnly = true)
    public List<AssignmentHistoryDto> getAssignmentHistory(Long requisitionId) {
        if (!requisitions.existsById(requisitionId)) {
            throw new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng.");
        }

        List<RequisitionAssignmentHistory> histories = assignmentHistories
                .findByRequisitionIdOrderByCreatedAtDesc(requisitionId);

        Map<Long, User> userCache = new HashMap<>();

        return histories.stream().map(h -> {
            User target = userCache.computeIfAbsent(h.getUserId(), id -> users.findById(id).orElse(null));
            User prev = h.getPreviousUserId() != null
                    ? userCache.computeIfAbsent(h.getPreviousUserId(), id -> users.findById(id).orElse(null))
                    : null;
            User performer = h.getPerformedByUserId() != null
                    ? userCache.computeIfAbsent(h.getPerformedByUserId(), id -> users.findById(id).orElse(null))
                    : null;

            return new AssignmentHistoryDto(
                    h.getId(),
                    h.getRequisitionId(),
                    h.getUserId(),
                    target != null ? target.getFullName() : ("User #" + h.getUserId()),
                    target != null ? target.getEmail() : null,
                    h.getRole().name(),
                    h.getAssignmentType(),
                    h.getAction(),
                    h.getPreviousUserId(),
                    prev != null ? prev.getFullName() : null,
                    h.getPerformedByUserId(),
                    performer != null ? performer.getFullName() : null,
                    h.getReason(),
                    h.getNotes(),
                    h.getCreatedAt()
            );
        }).collect(Collectors.toList());
    }

    /**
     * Lấy danh sách các tài khoản Recruiter đang hoạt động (ACTIVE) để phân công.
     */
    @PreAuthorize("hasAuthority('RECRUITER_ASSIGN')")
    @Transactional(readOnly = true)
    public List<AssignableRecruiterDto> getAssignableRecruiters() {
        return users.findActiveUsersByRoleName(RoleName.RECRUITER).stream()
                .map(u -> new AssignableRecruiterDto(
                        u.getId(),
                        u.getFullName(),
                        u.getEmail(),
                        u.getDepartment(),
                        u.getUsername()
                ))
                .collect(Collectors.toList());
    }

    private void saveHistory(
            Long requisitionId,
            Long userId,
            RoleName role,
            String assignmentType,
            String action,
            Long previousUserId,
            Long performedByUserId,
            String reason,
            String notes
    ) {
        RequisitionAssignmentHistory history = RequisitionAssignmentHistory.builder()
                .requisitionId(requisitionId)
                .userId(userId)
                .role(role)
                .assignmentType(assignmentType)
                .action(action)
                .previousUserId(previousUserId)
                .performedByUserId(performedByUserId)
                .reason(reason)
                .notes(notes)
                .createdAt(Instant.now())
                .build();
        assignmentHistories.save(history);
    }

    private void validateRecruiterUser(User user, String roleLabel) {
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new BadRequestException(roleLabel + " phải ở trạng thái đang hoạt động (ACTIVE).");
        }
        boolean hasRecruiterRole = user.getRoles() != null &&
                user.getRoles().stream().anyMatch(r -> r.getName() == RoleName.RECRUITER);
        if (!hasRecruiterRole) {
            throw new BadRequestException(roleLabel + " phải có vai trò RECRUITER trong hệ thống.");
        }
    }

    private Long getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getId();
        }
        return null;
    }
}
