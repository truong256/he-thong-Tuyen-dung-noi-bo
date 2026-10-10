package com.example.auth_service.service;

import com.example.auth_service.entity.*;
import com.example.auth_service.exception.*;
import com.example.auth_service.repository.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@PreAuthorize("hasAuthority('RECRUITER_ASSIGN')")
public class RequisitionAssignmentService {
    private final RequisitionAssignmentRepository assignments;
    private final RecruitmentRequisitionRepository requisitions;
    private final UserRepository users;

    public RequisitionAssignmentService(RequisitionAssignmentRepository assignments,
            RecruitmentRequisitionRepository requisitions, UserRepository users) {
        this.assignments = assignments;
        this.requisitions = requisitions;
        this.users = users;
    }

    @Transactional
    public void assign(Long requisitionId, Long userId, String roleName) {
        RoleName role;
        try { role = RoleName.valueOf(roleName); }
        catch (IllegalArgumentException | NullPointerException ex) {
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
        RequisitionAssignment assignment = assignments.findByRequisitionIdAndUserId(requisitionId, userId)
                .orElseGet(RequisitionAssignment::new);
        assignment.setRequisitionId(requisitionId);
        assignment.setUserId(userId);
        assignment.setRole(role);
        assignments.save(assignment);
    }

    @Transactional
    public void unassign(Long requisitionId, Long userId) {
        assignments.deleteByRequisitionIdAndUserId(requisitionId, userId);
    }
}
