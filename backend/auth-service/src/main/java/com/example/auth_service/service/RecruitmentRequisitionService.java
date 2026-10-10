package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.RequisitionRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.Random;

@Service
@Transactional
public class RecruitmentRequisitionService {

    private final RecruitmentRequisitionRepository requisitionRepository;
    private final DepartmentRepository departmentRepository;
    private final JobTitleRepository jobTitleRepository;
    private final UserRepository userRepository;
    private final RequisitionApprovalWorkflowService approvalWorkflow;
    private final Random random = new Random();

    public RecruitmentRequisitionService(
            RecruitmentRequisitionRepository requisitionRepository,
            DepartmentRepository departmentRepository,
            JobTitleRepository jobTitleRepository,
            UserRepository userRepository,
            RequisitionApprovalWorkflowService approvalWorkflow
    ) {
        this.requisitionRepository = requisitionRepository;
        this.departmentRepository = departmentRepository;
        this.jobTitleRepository = jobTitleRepository;
        this.userRepository = userRepository;
        this.approvalWorkflow = approvalWorkflow;
    }

    public RequisitionResponse create(RequisitionRequest request, User currentUser) {
        Department department = resolveDepartment(request);
        if (!department.isActive()) {
            throw new BadRequestException("Phòng ban đã ngừng áp dụng, không thể tạo yêu cầu tuyển dụng.");
        }
        checkDepartmentManagerScope(currentUser, department);

        JobTitle jobTitle = resolveJobTitle(request, department, false);

        boolean isDraft = isDraftRequest(request);
        LocalDate targetDate = request.effectiveTargetDate();

        validateDates(targetDate, isDraft);
        validateQuantities(request.quantity(), isDraft);
        String recruitmentType = validateRecruitmentType(request.recruitmentType(), isDraft);
        validateSalaries(jobTitle, request.salaryMin(), request.salaryMax(), request.salaryExplanation());

        if (!isDraft) {
            validateRequiredSubmissionFields(request, jobTitle);
        }

        String code = resolveRequisitionCode(request.requisitionCode(), null);
        String title = resolveTitle(request.title(), jobTitle, department);

        RecruitmentRequisition requisition = new RecruitmentRequisition();
        requisition.setRequisitionCode(code);
        requisition.setTitle(title);
        requisition.setDepartmentId(department.getId());
        requisition.setJobTitleId(jobTitle != null ? jobTitle.getId() : null);
        requisition.setQuantity(request.quantity() != null ? request.quantity() : 1);
        requisition.setRecruitmentType(recruitmentType);
        requisition.setReason(request.reason());
        requisition.setSalaryMin(request.salaryMin());
        requisition.setSalaryMax(request.salaryMax());
        requisition.setSalaryExplanation(request.salaryExplanation());
        requisition.setTargetDate(targetDate);
        requisition.setJobDescription(request.jobDescription());
        requisition.setCandidateRequirements(request.candidateRequirements());
        requisition.setStatus(isDraft ? "DRAFT" : "SUBMITTED");
        requisition.setCreatedByUserId(currentUser.getId());
        requisition.setCreatedAt(Instant.now());
        requisition.setUpdatedAt(Instant.now());

        RecruitmentRequisition saved = requisitionRepository.save(requisition);
        if (!isDraft && approvalWorkflow.snapshotForSubmission(saved)) {
            saved.setStatus("PENDING_APPROVAL");
            saved = requisitionRepository.save(saved);
        }
        return toResponse(saved, department, jobTitle, currentUser);
    }

    public RequisitionResponse update(Long id, RequisitionRequest request, User currentUser) {
        RecruitmentRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        Department currentDepartment = departmentRepository.findById(requisition.getDepartmentId())
                .orElse(null);
        checkUpdatePermission(currentUser, requisition, currentDepartment);

        if (List.of("APPROVED", "CLOSED", "CANCELLED").contains(
                requisition.getStatus() != null ? requisition.getStatus().toUpperCase() : "")) {
            throw new BadRequestException("Không thể chỉnh sửa yêu cầu tuyển dụng đã duyệt hoặc đã đóng.");
        }

        Department targetDepartment = (request.departmentId() != null || request.department() != null)
                ? resolveDepartment(request)
                : currentDepartment;

        if (targetDepartment != null) {
            if (!targetDepartment.isActive()) {
                throw new BadRequestException("Phòng ban đã ngừng áp dụng, không thể cập nhật yêu cầu tuyển dụng.");
            }
            checkDepartmentManagerScope(currentUser, targetDepartment);
            requisition.setDepartmentId(targetDepartment.getId());
        }

        JobTitle jobTitle = resolveJobTitle(request, targetDepartment, true);
        if (jobTitle == null && requisition.getJobTitleId() != null) {
            jobTitle = jobTitleRepository.findById(requisition.getJobTitleId()).orElse(null);
        }

        boolean willBeDraft = request.isDraft() != null
                ? request.isDraft()
                : "DRAFT".equalsIgnoreCase(request.status() != null ? request.status() : requisition.getStatus());

        LocalDate targetDate = request.effectiveTargetDate() != null
                ? request.effectiveTargetDate()
                : requisition.getTargetDate();

        validateDates(targetDate, willBeDraft);

        Integer quantity = request.quantity() != null ? request.quantity() : requisition.getQuantity();
        validateQuantities(quantity, willBeDraft);

        String recruitmentType = request.recruitmentType() != null
                ? validateRecruitmentType(request.recruitmentType(), willBeDraft)
                : requisition.getRecruitmentType();

        Long salaryMin = request.salaryMin() != null ? request.salaryMin() : requisition.getSalaryMin();
        Long salaryMax = request.salaryMax() != null ? request.salaryMax() : requisition.getSalaryMax();
        String explanation = request.salaryExplanation() != null ? request.salaryExplanation() : requisition.getSalaryExplanation();

        validateSalaries(jobTitle, salaryMin, salaryMax, explanation);

        if (request.requisitionCode() != null && !request.requisitionCode().isBlank()) {
            String code = resolveRequisitionCode(request.requisitionCode(), requisition.getId());
            requisition.setRequisitionCode(code);
        }

        if (request.title() != null && !request.title().isBlank()) {
            requisition.setTitle(request.title().trim());
        } else if (jobTitle != null && targetDepartment != null) {
            requisition.setTitle(resolveTitle(null, jobTitle, targetDepartment));
        }

        requisition.setJobTitleId(jobTitle != null ? jobTitle.getId() : requisition.getJobTitleId());
        requisition.setQuantity(quantity);
        requisition.setRecruitmentType(recruitmentType);
        if (request.reason() != null) requisition.setReason(request.reason());
        requisition.setSalaryMin(salaryMin);
        requisition.setSalaryMax(salaryMax);
        requisition.setSalaryExplanation(explanation);
        requisition.setTargetDate(targetDate);
        if (request.jobDescription() != null) requisition.setJobDescription(request.jobDescription());
        if (request.candidateRequirements() != null) requisition.setCandidateRequirements(request.candidateRequirements());

        if (request.status() != null && !request.status().isBlank()) {
            String newStatus = request.status().trim().toUpperCase();
            if (!willBeDraft) {
                validateRequiredSubmissionFields(request, jobTitle);
            }
            requisition.setStatus(newStatus);
        } else if (willBeDraft) {
            requisition.setStatus("DRAFT");
        }

        requisition.setUpdatedAt(Instant.now());
        RecruitmentRequisition updated = requisitionRepository.save(requisition);

        User creator = userRepository.findById(updated.getCreatedByUserId()).orElse(currentUser);
        return toResponse(updated, targetDepartment, jobTitle, creator);
    }

    public RequisitionResponse submit(Long id, User currentUser) {
        RecruitmentRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        Department department = departmentRepository.findById(requisition.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban gắn với yêu cầu."));
        checkUpdatePermission(currentUser, requisition, department);

        if (!"DRAFT".equalsIgnoreCase(requisition.getStatus())) {
            throw new BadRequestException("Chỉ có thể gửi yêu cầu tuyển dụng đang ở trạng thái bản nháp (DRAFT).");
        }

        if (requisition.getJobTitleId() == null) {
            throw new BadRequestException("Vui lòng chọn chức danh tuyển dụng trước khi gửi.");
        }
        JobTitle jobTitle = jobTitleRepository.findById(requisition.getJobTitleId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh gắn với yêu cầu."));

        if (!jobTitle.getActive()) {
            throw new BadRequestException("Chức danh đã ngừng áp dụng, không thể gửi yêu cầu.");
        }

        validateDates(requisition.getTargetDate(), false);
        validateQuantities(requisition.getQuantity(), false);
        if (requisition.getRecruitmentType() == null || requisition.getRecruitmentType().isBlank()) {
            throw new BadRequestException("Vui lòng chọn loại tuyển dụng (REPLACEMENT hoặc NEW).");
        }
        if (requisition.getReason() == null || requisition.getReason().isBlank()) {
            throw new BadRequestException("Vui lòng nhập lý do tuyển dụng.");
        }
        if (requisition.getJobDescription() == null || requisition.getJobDescription().isBlank()) {
            throw new BadRequestException("Vui lòng nhập mô tả công việc.");
        }
        if (requisition.getCandidateRequirements() == null || requisition.getCandidateRequirements().isBlank()) {
            throw new BadRequestException("Vui lòng nhập yêu cầu ứng viên.");
        }

        validateSalaries(jobTitle, requisition.getSalaryMin(), requisition.getSalaryMax(), requisition.getSalaryExplanation());

        requisition.setStatus("SUBMITTED");
        requisition.setUpdatedAt(Instant.now());
        RecruitmentRequisition saved = requisitionRepository.save(requisition);
        if (approvalWorkflow.snapshotForSubmission(saved)) {
            saved.setStatus("PENDING_APPROVAL");
            saved = requisitionRepository.save(saved);
        }

        User creator = userRepository.findById(saved.getCreatedByUserId()).orElse(currentUser);
        return toResponse(saved, department, jobTitle, creator);
    }

    @Transactional(readOnly = true)
    public RequisitionResponse get(Long id, User currentUser) {
        RecruitmentRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        Department department = departmentRepository.findById(requisition.getDepartmentId()).orElse(null);
        checkViewPermission(currentUser, requisition, department);

        JobTitle jobTitle = requisition.getJobTitleId() != null
                ? jobTitleRepository.findById(requisition.getJobTitleId()).orElse(null)
                : null;
        User creator = userRepository.findById(requisition.getCreatedByUserId()).orElse(null);

        return toResponse(requisition, department, jobTitle, creator);
    }

    @Transactional(readOnly = true)
    public Page<RequisitionResponse> list(
            String search,
            Long departmentId,
            Long jobTitleId,
            String status,
            User currentUser,
            Pageable pageable
    ) {
        boolean isHrOrAdmin = isHrOrAdmin(currentUser);

        Page<RecruitmentRequisition> page;
        if (isHrOrAdmin) {
            page = requisitionRepository.findAllWithFilters(
                    search, departmentId, jobTitleId, status, pageable
            );
        } else {
            List<Long> managedDeptIds = departmentRepository.findByManagerUserId(currentUser.getId())
                    .stream()
                    .map(Department::getId)
                    .toList();

            if (managedDeptIds.isEmpty()) {
                page = requisitionRepository.findScopedCreatedByWithFilters(
                        search, departmentId, jobTitleId, status, currentUser.getId(), pageable
                );
            } else {
                page = requisitionRepository.findScopedWithFilters(
                        search, departmentId, jobTitleId, status, managedDeptIds, currentUser.getId(), pageable
                );
            }
        }

        return page.map(req -> {
            Department dept = req.getDepartmentId() != null
                    ? departmentRepository.findById(req.getDepartmentId()).orElse(null)
                    : null;
            JobTitle jt = req.getJobTitleId() != null
                    ? jobTitleRepository.findById(req.getJobTitleId()).orElse(null)
                    : null;
            User creator = req.getCreatedByUserId() != null
                    ? userRepository.findById(req.getCreatedByUserId()).orElse(null)
                    : null;
            return toResponse(req, dept, jt, creator);
        });
    }

    public void delete(Long id, User currentUser) {
        RecruitmentRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        Department department = departmentRepository.findById(requisition.getDepartmentId()).orElse(null);
        checkUpdatePermission(currentUser, requisition, department);

        if (!"DRAFT".equalsIgnoreCase(requisition.getStatus())) {
            throw new BadRequestException("Chỉ được xóa yêu cầu tuyển dụng ở trạng thái bản nháp (DRAFT).");
        }

        requisitionRepository.delete(requisition);
    }

    // --- Validation & Permission Helper Methods ---

    public boolean isSalaryOutsideRange(JobTitle jobTitle, Long proposedMin, Long proposedMax) {
        if (jobTitle == null) return false;
        Long standardMin = jobTitle.getMinSalary();
        Long standardMax = jobTitle.getMaxSalary();

        if (standardMin == null && standardMax == null) {
            return false;
        }
        if (standardMin != null && proposedMin != null && proposedMin < standardMin) {
            return true;
        }
        if (standardMax != null && proposedMax != null && proposedMax > standardMax) {
            return true;
        }
        if (standardMax != null && proposedMin != null && proposedMin > standardMax) {
            return true;
        }
        if (standardMin != null && proposedMax != null && proposedMax < standardMin) {
            return true;
        }
        return false;
    }

    private void validateSalaries(JobTitle jobTitle, Long min, Long max, String explanation) {
        if (min != null && min <= 0) {
            throw new BadRequestException("Lương tối thiểu phải là số nguyên lớn hơn 0.");
        }
        if (max != null && max <= 0) {
            throw new BadRequestException("Lương tối đa phải là số nguyên lớn hơn 0.");
        }
        if (min != null && max != null && min > max) {
            throw new BadRequestException("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.");
        }

        if (isSalaryOutsideRange(jobTitle, min, max)) {
            if (explanation == null || explanation.trim().isEmpty()) {
                throw new BadRequestException("Dải lương đề xuất ngoài dải chuẩn của chức danh thì bắt buộc nhập giải trình.");
            }
        }
    }

    private void validateDates(LocalDate targetDate, boolean isDraft) {
        if (targetDate != null && targetDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được nằm trong quá khứ.");
        }
        if (!isDraft && targetDate == null) {
            throw new BadRequestException("Vui lòng chọn ngày cần người.");
        }
    }

    private void validateQuantities(Integer quantity, boolean isDraft) {
        if (quantity != null && quantity < 1) {
            throw new BadRequestException("Số lượng cần tuyển phải là số nguyên lớn hơn 0.");
        }
        if (!isDraft && quantity == null) {
            throw new BadRequestException("Vui lòng nhập số lượng cần tuyển.");
        }
    }

    private String validateRecruitmentType(String type, boolean isDraft) {
        if (type == null || type.isBlank()) {
            if (!isDraft) {
                throw new BadRequestException("Vui lòng chọn loại tuyển dụng (REPLACEMENT hoặc NEW).");
            }
            return null;
        }
        String normalized = type.trim().toUpperCase();
        if (!"REPLACEMENT".equals(normalized) && !"NEW".equals(normalized)) {
            throw new BadRequestException("Loại tuyển dụng phải là REPLACEMENT (thay thế) hoặc NEW (tăng mới).");
        }
        return normalized;
    }

    private void validateRequiredSubmissionFields(RequisitionRequest request, JobTitle jobTitle) {
        if (jobTitle == null) {
            throw new BadRequestException("Vui lòng chọn chức danh tuyển dụng.");
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw new BadRequestException("Vui lòng nhập lý do tuyển dụng.");
        }
        if (request.jobDescription() == null || request.jobDescription().isBlank()) {
            throw new BadRequestException("Vui lòng nhập mô tả công việc.");
        }
        if (request.candidateRequirements() == null || request.candidateRequirements().isBlank()) {
            throw new BadRequestException("Vui lòng nhập yêu cầu ứng viên.");
        }
    }

    private void checkDepartmentManagerScope(User user, Department department) {
        if (isHrOrAdmin(user)) {
            return;
        }
        if (department.getManagerUserId() == null || !department.getManagerUserId().equals(user.getId())) {
            throw new AccessDeniedException("Trưởng bộ phận chỉ được tạo yêu cầu trong phạm vi phòng ban mình phụ trách.");
        }
    }

    private void checkUpdatePermission(User user, RecruitmentRequisition req, Department dept) {
        if (isHrOrAdmin(user)) {
            return;
        }
        boolean isCreator = Objects.equals(req.getCreatedByUserId(), user.getId());
        boolean isDeptManager = dept != null && Objects.equals(dept.getManagerUserId(), user.getId());
        if (!isCreator && !isDeptManager) {
            throw new AccessDeniedException("Bạn không có quyền chỉnh sửa yêu cầu tuyển dụng này.");
        }
    }

    private void checkViewPermission(User user, RecruitmentRequisition req, Department dept) {
        if (isHrOrAdmin(user)) {
            return;
        }
        boolean isCreator = Objects.equals(req.getCreatedByUserId(), user.getId());
        boolean isDeptManager = dept != null && Objects.equals(dept.getManagerUserId(), user.getId());
        if (!isCreator && !isDeptManager) {
            throw new AccessDeniedException("Bạn không có quyền truy cập yêu cầu tuyển dụng này.");
        }
    }

    private boolean isHrOrAdmin(User user) {
        if (user == null || user.getRoles() == null) return false;
        return user.getRoles().stream().anyMatch(r ->
                r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN
        );
    }

    private boolean isDraftRequest(RequisitionRequest request) {
        if (Boolean.TRUE.equals(request.isDraft())) return true;
        return "DRAFT".equalsIgnoreCase(request.status());
    }

    private Department resolveDepartment(RequisitionRequest request) {
        if (request.departmentId() != null) {
            return departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban với ID: " + request.departmentId()));
        }
        if (request.department() != null && !request.department().isBlank()) {
            return departmentRepository.findByNameIgnoreCase(request.department().trim())
                    .or(() -> departmentRepository.findByCodeIgnoreCase(request.department().trim()))
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban: " + request.department()));
        }
        throw new BadRequestException("Vui lòng chọn phòng ban.");
    }

    private JobTitle resolveJobTitle(RequisitionRequest request, Department department, boolean allowMissing) {
        JobTitle jt = null;
        if (request.jobTitleId() != null) {
            jt = jobTitleRepository.findById(request.jobTitleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với ID: " + request.jobTitleId()));
        } else if (request.jobTitle() != null && !request.jobTitle().isBlank()) {
            jt = jobTitleRepository.findByTitleIgnoreCase(request.jobTitle().trim())
                    .or(() -> jobTitleRepository.findByCodeIgnoreCase(request.jobTitle().trim()))
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh: " + request.jobTitle()));
        }

        if (jt != null) {
            if (!jt.getActive()) {
                throw new BadRequestException("Chức danh đã ngừng áp dụng, không thể tạo yêu cầu tuyển dụng.");
            }
            if (jt.getDepartment() != null && department != null &&
                    !jt.getDepartment().getId().equals(department.getId())) {
                throw new BadRequestException("Chức danh không thuộc phòng ban đã chọn.");
            }
        } else if (!allowMissing && !isDraftRequest(request)) {
            throw new BadRequestException("Vui lòng chọn chức danh tuyển dụng.");
        }
        return jt;
    }

    private String resolveRequisitionCode(String providedCode, Long currentId) {
        if (providedCode != null && !providedCode.isBlank()) {
            String trimmed = providedCode.trim();
            if (currentId != null) {
                if (requisitionRepository.existsByRequisitionCodeAndIdNot(trimmed, currentId)) {
                    throw new ConflictException("Mã yêu cầu tuyển dụng đã tồn tại: " + trimmed);
                }
            } else {
                if (requisitionRepository.existsByRequisitionCode(trimmed)) {
                    throw new ConflictException("Mã yêu cầu tuyển dụng đã tồn tại: " + trimmed);
                }
            }
            return trimmed;
        }

        String datePrefix = "REQ-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + "-";
        for (int i = 0; i < 20; i++) {
            String candidate = datePrefix + String.format("%04d", random.nextInt(10000));
            if (!requisitionRepository.existsByRequisitionCode(candidate)) {
                return candidate;
            }
        }
        return datePrefix + System.currentTimeMillis() % 100000;
    }

    private String resolveTitle(String providedTitle, JobTitle jobTitle, Department department) {
        if (providedTitle != null && !providedTitle.isBlank()) {
            return providedTitle.trim();
        }
        String jtName = jobTitle != null ? jobTitle.getTitle() : "Vị trí tuyển dụng";
        String deptName = department != null ? department.getName() : "";
        return deptName.isEmpty() ? jtName : jtName + " - " + deptName;
    }

    private RequisitionResponse toResponse(
            RecruitmentRequisition req,
            Department dept,
            JobTitle jt,
            User creator
    ) {
        boolean outside = isSalaryOutsideRange(jt, req.getSalaryMin(), req.getSalaryMax());
        return new RequisitionResponse(
                req.getId(),
                req.getRequisitionCode(),
                req.getTitle(),
                req.getDepartmentId(),
                dept != null ? dept.getName() : null,
                dept != null ? dept.getCode() : null,
                req.getJobTitleId(),
                jt != null ? jt.getTitle() : null,
                jt != null ? jt.getCode() : null,
                jt != null ? jt.getMinSalary() : null,
                jt != null ? jt.getMaxSalary() : null,
                req.getQuantity(),
                req.getRecruitmentType(),
                req.getReason(),
                req.getSalaryMin(),
                req.getSalaryMax(),
                req.getSalaryExplanation(),
                req.getTargetDate(),
                req.getTargetDate(),
                outside,
                req.getJobDescription(),
                req.getCandidateRequirements(),
                req.getStatus(),
                req.getCreatedByUserId(),
                creator != null ? creator.getFullName() : null,
                creator != null ? creator.getEmail() : null,
                req.getCreatedAt(),
                req.getUpdatedAt()
        );
    }
}
