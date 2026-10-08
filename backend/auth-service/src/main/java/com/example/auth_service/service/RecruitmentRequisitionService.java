package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.RequisitionRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Year;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class RecruitmentRequisitionService {

    private final RecruitmentRequisitionRepository requisitions;
    private final DepartmentRepository departments;
    private final JobTitleRepository jobTitles;
    private final UserRepository users;

    private static final AtomicLong REQ_COUNTER = new AtomicLong(100);

    public RecruitmentRequisitionService(
            RecruitmentRequisitionRepository requisitions,
            DepartmentRepository departments,
            JobTitleRepository jobTitles,
            UserRepository users
    ) {
        this.requisitions = requisitions;
        this.departments = departments;
        this.jobTitles = jobTitles;
        this.users = users;
    }

    @Transactional
    public RequisitionResponse createRequisition(RequisitionRequest req, Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);

        Department dept = departments.findById(req.departmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban với id: " + req.departmentId()));

        if (!dept.isActive()) {
            throw new BadRequestException("Phòng ban đang ngừng hoạt động, không thể tạo yêu cầu tuyển dụng.");
        }

        JobTitle jobTitle = jobTitles.findById(req.jobTitleId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với id: " + req.jobTitleId()));

        // S2-10 Validation: Target date must not be in the past
        if (req.targetDate() != null && req.targetDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được ở quá khứ.");
        }

        // S2-10 Validation: Salary range vs JobTitle standard range
        validateProposedSalary(req, jobTitle);

        // S2-10 Scope Check: Hiring Manager can only create for their managed department
        boolean isHrOrAdmin = hasRole(auth, "ROLE_HR_MANAGER") || hasRole(auth, "ROLE_ADMIN");
        if (!isHrOrAdmin) {
            boolean isManagerOfDept = dept.getManagerUserId() != null && dept.getManagerUserId().equals(principal.getId());
            if (!isManagerOfDept) {
                throw new AccessDeniedException("Trưởng bộ phận chỉ được tạo yêu cầu tuyển dụng cho phòng ban mình phụ trách.");
            }
        }

        String code = generateRequisitionCode();
        String status = Boolean.TRUE.equals(req.isDraft()) ? "DRAFT" : "PENDING_APPROVAL";

        RecruitmentRequisition entity = new RecruitmentRequisition();
        entity.setRequisitionCode(code);
        entity.setTitle(req.title().trim());
        entity.setDepartmentId(dept.getId());
        entity.setJobTitleId(jobTitle.getId());
        entity.setQuantity(req.quantity() != null ? req.quantity() : 1);
        entity.setReason(req.reason() != null ? req.reason().trim() : "NEW_HEADCOUNT");
        entity.setProposedMinSalary(req.proposedMinSalary());
        entity.setProposedMaxSalary(req.proposedMaxSalary());
        entity.setSalaryExplanation(req.salaryExplanation() != null ? req.salaryExplanation().trim() : null);
        entity.setTargetDate(req.targetDate());
        entity.setJobDescription(req.jobDescription() != null ? req.jobDescription().trim() : null);
        entity.setRequirements(req.requirements() != null ? req.requirements().trim() : null);
        entity.setStatus(status);
        entity.setCreatedByUserId(principal.getId());

        RecruitmentRequisition saved = requisitions.save(entity);
        return toResponse(saved, dept, jobTitle, principal.getFullName());
    }

    @Transactional(readOnly = true)
    public Page<RequisitionResponse> listRequisitions(String search, String status, Long departmentId, Pageable pageable, Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);
        boolean isHrOrAdmin = hasRole(auth, "ROLE_HR_MANAGER") || hasRole(auth, "ROLE_ADMIN");

        List<RecruitmentRequisition> all = requisitions.findAll();

        // Scope filter
        List<RecruitmentRequisition> scoped = all.stream().filter(r -> {
            if (isHrOrAdmin) return true;

            // Hiring Manager: must manage the department OR be the creator
            if (r.getCreatedByUserId() != null && r.getCreatedByUserId().equals(principal.getId())) {
                return true;
            }
            if (r.getDepartmentId() != null) {
                return departments.findById(r.getDepartmentId())
                        .map(d -> d.getManagerUserId() != null && d.getManagerUserId().equals(principal.getId()))
                        .orElse(false);
            }
            return false;
        }).toList();

        // Attribute filters
        List<RecruitmentRequisition> filtered = scoped.stream().filter(r -> {
            if (status != null && !status.isBlank() && !r.getStatus().equalsIgnoreCase(status.trim())) {
                return false;
            }
            if (departmentId != null && !departmentId.equals(r.getDepartmentId())) {
                return false;
            }
            if (search != null && !search.isBlank()) {
                String q = search.trim().toLowerCase();
                boolean matchesCode = r.getRequisitionCode() != null && r.getRequisitionCode().toLowerCase().contains(q);
                boolean matchesTitle = r.getTitle() != null && r.getTitle().toLowerCase().contains(q);
                return matchesCode || matchesTitle;
            }
            return true;
        }).toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<RecruitmentRequisition> pageContent = (start <= end) ? filtered.subList(start, end) : Collections.emptyList();

        List<RequisitionResponse> responses = pageContent.stream().map(this::toResponse).toList();
        return new PageImpl<>(responses, pageable, filtered.size());
    }

    @Transactional(readOnly = true)
    public RequisitionResponse getRequisition(Long id, Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với id: " + id));

        checkAccessScope(req, principal, auth);
        return toResponse(req);
    }

    @Transactional
    public RequisitionResponse updateRequisition(Long id, RequisitionRequest updateReq, Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với id: " + id));

        checkAccessScope(req, principal, auth);

        if (!"DRAFT".equalsIgnoreCase(req.getStatus()) && !"PENDING_APPROVAL".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ có thể chỉnh sửa yêu cầu tuyển dụng ở trạng thái DRAFT hoặc PENDING_APPROVAL.");
        }

        Department dept = departments.findById(updateReq.departmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban."));
        JobTitle jobTitle = jobTitles.findById(updateReq.jobTitleId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh."));

        if (updateReq.targetDate() != null && updateReq.targetDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được ở quá khứ.");
        }

        validateProposedSalary(updateReq, jobTitle);

        req.setTitle(updateReq.title().trim());
        req.setDepartmentId(dept.getId());
        req.setJobTitleId(jobTitle.getId());
        req.setQuantity(updateReq.quantity() != null ? updateReq.quantity() : 1);
        req.setReason(updateReq.reason() != null ? updateReq.reason().trim() : req.getReason());
        req.setProposedMinSalary(updateReq.proposedMinSalary());
        req.setProposedMaxSalary(updateReq.proposedMaxSalary());
        req.setSalaryExplanation(updateReq.salaryExplanation() != null ? updateReq.salaryExplanation().trim() : null);
        req.setTargetDate(updateReq.targetDate());
        req.setJobDescription(updateReq.jobDescription() != null ? updateReq.jobDescription().trim() : null);
        req.setRequirements(updateReq.requirements() != null ? updateReq.requirements().trim() : null);

        if (Boolean.TRUE.equals(updateReq.isDraft())) {
            req.setStatus("DRAFT");
        } else if (Boolean.FALSE.equals(updateReq.isDraft()) && "DRAFT".equalsIgnoreCase(req.getStatus())) {
            req.setStatus("PENDING_APPROVAL");
        }

        RecruitmentRequisition updated = requisitions.save(req);
        return toResponse(updated, dept, jobTitle, null);
    }

    @Transactional
    public void deleteRequisition(Long id, Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với id: " + id));

        checkAccessScope(req, principal, auth);

        if (!"DRAFT".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ có thể xóa yêu cầu tuyển dụng ở trạng thái DRAFT (Lưu nháp).");
        }

        requisitions.delete(req);
    }

    private void validateProposedSalary(RequisitionRequest req, JobTitle jobTitle) {
        if (req.proposedMinSalary() != null && req.proposedMaxSalary() != null
                && req.proposedMinSalary() > req.proposedMaxSalary()) {
            throw new BadRequestException("Mức lương tối thiểu đề xuất không được lớn hơn mức lương tối đa đề xuất.");
        }

        boolean outOfStandard = false;
        if (jobTitle.getMinSalary() != null && req.proposedMinSalary() != null && req.proposedMinSalary() < jobTitle.getMinSalary()) {
            outOfStandard = true;
        }
        if (jobTitle.getMaxSalary() != null && req.proposedMaxSalary() != null && req.proposedMaxSalary() > jobTitle.getMaxSalary()) {
            outOfStandard = true;
        }

        if (outOfStandard) {
            if (req.salaryExplanation() == null || req.salaryExplanation().trim().isBlank()) {
                throw new BadRequestException("Dải lương đề xuất nằm ngoài khung chuẩn của chức danh, bắt buộc nhập giải trình.");
            }
        }
    }

    private void checkAccessScope(RecruitmentRequisition req, UserPrincipal principal, Authentication auth) {
        boolean isHrOrAdmin = hasRole(auth, "ROLE_HR_MANAGER") || hasRole(auth, "ROLE_ADMIN");
        if (isHrOrAdmin) return;

        boolean isCreator = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(principal.getId());
        if (isCreator) return;

        if (req.getDepartmentId() != null) {
            boolean isDeptManager = departments.findById(req.getDepartmentId())
                    .map(d -> d.getManagerUserId() != null && d.getManagerUserId().equals(principal.getId()))
                    .orElse(false);
            if (isDeptManager) return;
        }

        throw new AccessDeniedException("Bạn không có quyền truy cập yêu cầu tuyển dụng này.");
    }

    private String generateRequisitionCode() {
        int year = Year.now().getValue();
        long nextId = REQ_COUNTER.incrementAndGet();
        String code = "REQ-" + year + "-" + String.format("%04d", nextId);
        while (requisitions.existsByRequisitionCodeIgnoreCase(code)) {
            nextId = REQ_COUNTER.incrementAndGet();
            code = "REQ-" + year + "-" + String.format("%04d", nextId);
        }
        return code;
    }

    private RequisitionResponse toResponse(RecruitmentRequisition r) {
        Department dept = r.getDepartmentId() != null ? departments.findById(r.getDepartmentId()).orElse(null) : null;
        JobTitle jt = r.getJobTitleId() != null ? jobTitles.findById(r.getJobTitleId()).orElse(null) : null;
        String creatorName = r.getCreatedByUserId() != null ? users.findById(r.getCreatedByUserId()).map(User::getFullName).orElse(null) : null;
        return toResponse(r, dept, jt, creatorName);
    }

    private RequisitionResponse toResponse(RecruitmentRequisition r, Department dept, JobTitle jt, String creatorName) {
        return new RequisitionResponse(
                r.getId(),
                r.getRequisitionCode(),
                r.getTitle(),
                r.getDepartmentId(),
                dept != null ? dept.getName() : null,
                r.getJobTitleId(),
                jt != null ? jt.getTitle() : null,
                r.getQuantity(),
                r.getTargetDate(),
                r.getStatus(),
                r.getReason(),
                r.getProposedMinSalary(),
                r.getProposedMaxSalary(),
                r.getSalaryExplanation(),
                r.getJobDescription(),
                r.getRequirements(),
                r.getCreatedByUserId(),
                creatorName,
                r.getCreatedAt()
        );
    }

    private UserPrincipal extractPrincipal(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal p) {
            return p;
        }
        throw new AccessDeniedException("Vui lòng đăng nhập.");
    }

    private boolean hasRole(Authentication auth, String role) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> role.equals(a.getAuthority()));
    }
}
