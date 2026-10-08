package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.entity.RequisitionAssignment;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.RequisitionAssignmentRepository;
import com.example.auth_service.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/requisitions/{id}/approve")
@org.springframework.context.annotation.Profile("sprint3-preview")
public class RequisitionApprovalController {

    private final RecruitmentRequisitionRepository requisitions;
    private final RequisitionAssignmentRepository assignments;

    public RequisitionApprovalController(RecruitmentRequisitionRepository requisitions,
                                         RequisitionAssignmentRepository assignments) {
        this.requisitions = requisitions;
        this.assignments = assignments;
    }

    @PutMapping
    @Transactional
    @PreAuthorize("hasAuthority('REQUISITION_APPROVE')")
    public ResponseEntity<RecruitmentRequisition> approveRequisition(@PathVariable Long id) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng."));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Vui lòng đăng nhập.");
        }

        boolean isFullAuthority = auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_HR_MANAGER".equals(a.getAuthority()) || "ROLE_ADMIN".equals(a.getAuthority()));

        if (!isFullAuthority) {
            // Must have an assignment for this requisition
            boolean isAssigned = assignments.findByRequisitionIdAndUserId(id, principal.getId())
                    .filter(a -> a.getRole() == RoleName.APPROVER || a.getRole() == RoleName.HIRING_MANAGER)
                    .isPresent();

            if (!isAssigned) {
                throw new AccessDeniedException("Bạn không được phân công phê duyệt yêu cầu tuyển dụng này.");
            }
        }

        req.setStatus("APPROVED");
        RecruitmentRequisition updated = requisitions.save(req);
        return ResponseEntity.ok(updated);
    }
}
