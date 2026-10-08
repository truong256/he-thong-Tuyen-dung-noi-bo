package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.CreateRequisitionRequest;
import com.example.auth_service.dto.RequisitionDraftRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class RequisitionService {

    private final RecruitmentRequisitionRepository requisitions;
    private final DepartmentRepository departments;
    private final JobTitleRepository jobTitles;
    private final UserRepository users;

    public RequisitionService(
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

    /**
     * Lưu mới bản nháp yêu cầu tuyển dụng.
     * Cho phép lưu cả khi thiếu thông tin bắt buộc để người dùng có thể quay lại điền tiếp.
     */
    public RequisitionResponse saveDraft(RequisitionDraftRequest request) {
        User currentUser = getCurrentUser();

        // Kiểm tra phòng ban nếu có truyền
        if (request.departmentId() != null) {
            Department dept = departments.findById(request.departmentId())
                    .orElseThrow(() -> new BadRequestException("Phòng ban không tồn tại"));
            if (!dept.isActive()) {
                throw new BadRequestException("Phòng ban đã ngừng áp dụng");
            }
        }

        // Kiểm tra chức danh nếu có truyền
        if (request.jobTitleId() != null) {
            JobTitle job = jobTitles.findById(request.jobTitleId())
                    .orElseThrow(() -> new BadRequestException("Chức danh không tồn tại"));
            if (!Boolean.TRUE.equals(job.getActive())) {
                throw new BadRequestException("Chức danh đã tạm ngưng");
            }
        }

        // Kiểm tra mức lương không được là số âm
        if ((request.salaryMin() != null && request.salaryMin() < 0) || (request.salaryMax() != null && request.salaryMax() < 0)) {
            throw new BadRequestException("Mức lương không được là số âm");
        }

        // Kiểm tra dải lương cơ bản nếu cả hai đều có
        if (request.salaryMin() != null && request.salaryMax() != null && request.salaryMin() > request.salaryMax()) {
            throw new BadRequestException("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu");
        }

        // Kiểm tra ngày cần người nếu có truyền
        if (request.neededDate() != null && request.neededDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được ở trong quá khứ");
        }

        RecruitmentRequisition requisition = new RecruitmentRequisition();
        requisition.setRequisitionCode(generateRequisitionCode());

        String title = (request.title() != null && !request.title().isBlank())
                ? request.title().trim()
                : "Bản nháp - " + requisition.getRequisitionCode();
        requisition.setTitle(title);

        requisition.setDepartmentId(request.departmentId());
        requisition.setJobTitleId(request.jobTitleId());
        requisition.setQuantity(request.quantity() != null && request.quantity() >= 1 ? request.quantity() : 1);
        requisition.setRecruitmentType(request.recruitmentType());
        requisition.setReason(request.reason());
        requisition.setSalaryMin(request.salaryMin());
        requisition.setSalaryMax(request.salaryMax());
        requisition.setCurrency(request.currency() != null ? request.currency() : "VND");
        requisition.setSalaryExplanation(request.salaryExplanation());
        requisition.setNeededDate(request.neededDate());
        requisition.setTargetDate(request.neededDate());
        requisition.setJobDescription(request.jobDescription());
        requisition.setCandidateRequirements(request.candidateRequirements());
        requisition.setBenefits(request.benefits());
        requisition.setWorkLocation(request.workLocation());
        requisition.setWorkingModel(request.workingModel() != null ? request.workingModel() : "ONSITE");

        requisition.setStatus("DRAFT");
        requisition.setCreatedByUserId(currentUser.getId());
        requisition.setCreatedAt(Instant.now());
        requisition.setUpdatedAt(Instant.now());

        RecruitmentRequisition saved = requisitions.save(requisition);
        return toResponse(saved);
    }

    /**
     * Cập nhật bản nháp đã lưu trước đó.
     */
    public RequisitionResponse updateDraft(Long id, RequisitionDraftRequest request) {
        RecruitmentRequisition requisition = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        if (!"DRAFT".equalsIgnoreCase(requisition.getStatus())) {
            throw new BadRequestException("Chỉ được chỉnh sửa yêu cầu ở trạng thái bản nháp (DRAFT). Trạng thái hiện tại: " + requisition.getStatus());
        }

        User currentUser = getCurrentUser();
        boolean isOwner = requisition.getCreatedByUserId() != null && requisition.getCreatedByUserId().equals(currentUser.getId());
        boolean hasManageAll = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);

        if (!isOwner && !hasManageAll) {
            throw new AccessDeniedException("Bạn không có quyền chỉnh sửa bản nháp này");
        }

        if (request.departmentId() != null) {
            Department dept = departments.findById(request.departmentId())
                    .orElseThrow(() -> new BadRequestException("Phòng ban không tồn tại"));
            if (!dept.isActive()) {
                throw new BadRequestException("Phòng ban đã ngừng áp dụng");
            }
            requisition.setDepartmentId(request.departmentId());
        }

        if (request.jobTitleId() != null) {
            JobTitle job = jobTitles.findById(request.jobTitleId())
                    .orElseThrow(() -> new BadRequestException("Chức danh không tồn tại"));
            if (!Boolean.TRUE.equals(job.getActive())) {
                throw new BadRequestException("Chức danh đã tạm ngưng");
            }
            requisition.setJobTitleId(request.jobTitleId());
        }

        if (request.title() != null && !request.title().isBlank()) {
            requisition.setTitle(request.title().trim());
        }
        if (request.quantity() != null && request.quantity() >= 1) {
            requisition.setQuantity(request.quantity());
        }
        if (request.recruitmentType() != null) {
            requisition.setRecruitmentType(request.recruitmentType());
        }
        if (request.reason() != null) {
            requisition.setReason(request.reason());
        }
        if (request.salaryMin() != null) {
            requisition.setSalaryMin(request.salaryMin());
        }
        if (request.salaryMax() != null) {
            requisition.setSalaryMax(request.salaryMax());
        }
        if (request.currency() != null) {
            requisition.setCurrency(request.currency());
        }
        if (request.salaryExplanation() != null) {
            requisition.setSalaryExplanation(request.salaryExplanation());
        }
        if (request.neededDate() != null) {
            requisition.setNeededDate(request.neededDate());
            requisition.setTargetDate(request.neededDate());
        }
        if (request.jobDescription() != null) {
            requisition.setJobDescription(request.jobDescription());
        }
        if (request.candidateRequirements() != null) {
            requisition.setCandidateRequirements(request.candidateRequirements());
        }
        if (request.benefits() != null) {
            requisition.setBenefits(request.benefits());
        }
        if (request.workLocation() != null) {
            requisition.setWorkLocation(request.workLocation());
        }
        if (request.workingModel() != null) {
            requisition.setWorkingModel(request.workingModel());
        }

        if ((requisition.getSalaryMin() != null && requisition.getSalaryMin() < 0) ||
            (requisition.getSalaryMax() != null && requisition.getSalaryMax() < 0)) {
            throw new BadRequestException("Mức lương không được là số âm");
        }

        if (requisition.getSalaryMin() != null && requisition.getSalaryMax() != null && requisition.getSalaryMin() > requisition.getSalaryMax()) {
            throw new BadRequestException("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu");
        }

        if (requisition.getNeededDate() != null && requisition.getNeededDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được ở trong quá khứ");
        }

        requisition.setUpdatedAt(Instant.now());
        RecruitmentRequisition saved = requisitions.save(requisition);
        return toResponse(saved);
    }

    /**
     * Tạo và gửi yêu cầu tuyển dụng chính thức đi phê duyệt.
     * Kiểm tra toàn bộ dữ liệu hợp lệ và ràng buộc khung lương.
     */
    public RequisitionResponse createAndSubmit(CreateRequisitionRequest request) {
        User currentUser = getCurrentUser();

        Department dept = departments.findById(request.departmentId())
                .orElseThrow(() -> new BadRequestException("Phòng ban không tồn tại"));
        if (!dept.isActive()) {
            throw new BadRequestException("Phòng ban đã ngừng áp dụng, không thể tạo yêu cầu tuyển dụng");
        }

        JobTitle job = jobTitles.findById(request.jobTitleId())
                .orElseThrow(() -> new BadRequestException("Chức danh không tồn tại"));
        if (!Boolean.TRUE.equals(job.getActive())) {
            throw new BadRequestException("Chức danh đã tạm ngưng, không thể tạo yêu cầu tuyển dụng");
        }

        if (request.quantity() == null || request.quantity() < 1) {
            throw new BadRequestException("Số lượng tuyển dụng phải lớn hơn 0");
        }

        if (request.neededDate() != null && request.neededDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được ở trong quá khứ");
        }

        if ((request.salaryMin() != null && request.salaryMin() < 0) || (request.salaryMax() != null && request.salaryMax() < 0)) {
            throw new BadRequestException("Mức lương không được là số âm");
        }

        if (request.salaryMin() != null && request.salaryMax() != null && request.salaryMin() > request.salaryMax()) {
            throw new BadRequestException("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu");
        }

        // Kiểm tra khung lương tiêu chuẩn của chức danh
        validateSalaryAgainstJobTitle(job, request.salaryMin(), request.salaryMax(), request.salaryExplanation());

        RecruitmentRequisition requisition = new RecruitmentRequisition();
        requisition.setRequisitionCode(generateRequisitionCode());
        requisition.setTitle(request.title().trim());
        requisition.setDepartmentId(request.departmentId());
        requisition.setJobTitleId(request.jobTitleId());
        requisition.setQuantity(request.quantity());
        requisition.setRecruitmentType(request.recruitmentType());
        requisition.setReason(request.reason());
        requisition.setSalaryMin(request.salaryMin());
        requisition.setSalaryMax(request.salaryMax());
        requisition.setCurrency(request.currency() != null ? request.currency() : "VND");
        requisition.setSalaryExplanation(request.salaryExplanation());
        requisition.setNeededDate(request.neededDate());
        requisition.setTargetDate(request.neededDate());
        requisition.setJobDescription(request.jobDescription());
        requisition.setCandidateRequirements(request.candidateRequirements());
        requisition.setBenefits(request.benefits());
        requisition.setWorkLocation(request.workLocation());
        requisition.setWorkingModel(request.workingModel() != null ? request.workingModel() : "ONSITE");

        requisition.setStatus("PENDING_APPROVAL");
        requisition.setSubmittedAt(Instant.now());
        requisition.setCreatedByUserId(currentUser.getId());
        requisition.setCreatedAt(Instant.now());
        requisition.setUpdatedAt(Instant.now());

        RecruitmentRequisition saved = requisitions.save(requisition);
        return toResponse(saved);
    }

    /**
     * Gửi duyệt từ bản nháp hiện có.
     * Validate chặt chẽ thông tin để đảm bảo đủ điều kiện gửi phê duyệt.
     */
    public RequisitionResponse submitDraft(Long id) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        if (!"DRAFT".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ được gửi phê duyệt yêu cầu ở trạng thái bản nháp. Trạng thái hiện tại: " + req.getStatus());
        }

        User currentUser = getCurrentUser();
        boolean isOwner = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(currentUser.getId());
        boolean hasManageAll = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);

        if (!isOwner && !hasManageAll) {
            throw new AccessDeniedException("Bạn không có quyền gửi phê duyệt bản nháp này");
        }

        // Kiểm tra tính đầy đủ
        if (req.getTitle() == null || req.getTitle().trim().isEmpty() || req.getTitle().startsWith("Bản nháp - ")) {
            throw new BadRequestException("Vui lòng nhập tiêu đề yêu cầu tuyển dụng trước khi gửi phê duyệt");
        }
        if (req.getDepartmentId() == null) {
            throw new BadRequestException("Vui lòng chọn phòng ban trước khi gửi phê duyệt");
        }
        Department dept = departments.findById(req.getDepartmentId())
                .orElseThrow(() -> new BadRequestException("Phòng ban không tồn tại"));
        if (!dept.isActive()) {
            throw new BadRequestException("Phòng ban đã ngừng áp dụng");
        }

        if (req.getJobTitleId() == null) {
            throw new BadRequestException("Vui lòng chọn chức danh trước khi gửi phê duyệt");
        }
        JobTitle job = jobTitles.findById(req.getJobTitleId())
                .orElseThrow(() -> new BadRequestException("Chức danh không tồn tại"));
        if (!Boolean.TRUE.equals(job.getActive())) {
            throw new BadRequestException("Chức danh đã tạm ngưng");
        }

        if (req.getQuantity() < 1) {
            throw new BadRequestException("Số lượng tuyển dụng phải lớn hơn 0");
        }
        if (req.getRecruitmentType() == null || req.getRecruitmentType().isBlank()) {
            throw new BadRequestException("Vui lòng chọn loại tuyển dụng (Tuyển mới hoặc Tuyển thay thế)");
        }
        if (req.getReason() == null || req.getReason().isBlank()) {
            throw new BadRequestException("Vui lòng nhập lý do tuyển dụng");
        }
        if (req.getNeededDate() == null) {
            throw new BadRequestException("Vui lòng chọn ngày cần người");
        }
        if (req.getNeededDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Ngày cần người không được ở trong quá khứ");
        }
        if (req.getJobDescription() == null || req.getJobDescription().isBlank()) {
            throw new BadRequestException("Vui lòng nhập mô tả công việc");
        }
        if (req.getCandidateRequirements() == null || req.getCandidateRequirements().isBlank()) {
            throw new BadRequestException("Vui lòng nhập yêu cầu ứng viên");
        }

        if ((req.getSalaryMin() != null && req.getSalaryMin() < 0) || (req.getSalaryMax() != null && req.getSalaryMax() < 0)) {
            throw new BadRequestException("Mức lương không được là số âm");
        }

        if (req.getSalaryMin() != null && req.getSalaryMax() != null && req.getSalaryMin() > req.getSalaryMax()) {
            throw new BadRequestException("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu");
        }

        // Kiểm tra khung lương chức danh
        validateSalaryAgainstJobTitle(job, req.getSalaryMin(), req.getSalaryMax(), req.getSalaryExplanation());

        req.setStatus("PENDING_APPROVAL");
        req.setSubmittedAt(Instant.now());
        req.setUpdatedAt(Instant.now());

        RecruitmentRequisition saved = requisitions.save(req);
        return toResponse(saved);
    }

    /**
     * Lấy chi tiết yêu cầu tuyển dụng theo ID với kiểm tra phân quyền dữ liệu.
     */
    @Transactional(readOnly = true)
    public RequisitionResponse getById(Long id) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        User currentUser = getCurrentUser();
        boolean canReadAll = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN || r.getName() == RoleName.APPROVER);
        boolean isOwner = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(currentUser.getId());

        if (!canReadAll && !isOwner) {
            throw new AccessDeniedException("Bạn không có quyền truy cập yêu cầu tuyển dụng này");
        }

        return toResponse(req);
    }

    /**
     * Danh sách yêu cầu tuyển dụng phân trang kèm lọc trạng thái, phòng ban, từ khóa.
     * Hiring Manager chỉ thấy yêu cầu do chính mình tạo. HR_MANAGER / ADMIN thấy tất cả.
     */
    @Transactional(readOnly = true)
    public Page<RequisitionResponse> list(String status, Long departmentId, String keyword, Pageable pageable) {
        User currentUser = getCurrentUser();
        boolean canReadAll = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN || r.getName() == RoleName.APPROVER);

        Long filterUserId = canReadAll ? null : currentUser.getId();

        Page<RecruitmentRequisition> page = requisitions.search(filterUserId, status, departmentId, keyword, pageable);
        return page.map(this::toResponse);
    }

    /**
     * Xóa bản nháp yêu cầu tuyển dụng.
     */
    public void delete(Long id) {
        RecruitmentRequisition req = requisitions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với ID: " + id));

        if (!"DRAFT".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Chỉ có thể xóa yêu cầu ở trạng thái bản nháp. Trạng thái hiện tại: " + req.getStatus());
        }

        User currentUser = getCurrentUser();
        boolean isOwner = req.getCreatedByUserId() != null && req.getCreatedByUserId().equals(currentUser.getId());
        boolean canManageAll = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.HR_MANAGER || r.getName() == RoleName.ADMIN);

        if (!isOwner && !canManageAll) {
            throw new AccessDeniedException("Bạn không có quyền xóa bản nháp này");
        }

        requisitions.delete(req);
    }

    private void validateSalaryAgainstJobTitle(JobTitle job, Long salaryMin, Long salaryMax, String salaryExplanation) {
        boolean outside = false;
        if (salaryMin != null && job.getMinSalary() != null && salaryMin < job.getMinSalary()) {
            outside = true;
        }
        if (salaryMax != null && job.getMaxSalary() != null && salaryMax > job.getMaxSalary()) {
            outside = true;
        }

        if (outside && (salaryExplanation == null || salaryExplanation.trim().isEmpty())) {
            String jobMinStr = job.getMinSalary() != null ? String.format("%,d", job.getMinSalary()) : "Không giới hạn";
            String jobMaxStr = job.getMaxSalary() != null ? String.format("%,d", job.getMaxSalary()) : "Không giới hạn";
            throw new BadRequestException(
                    "Dải lương nằm ngoài khung lương tiêu chuẩn của chức danh (" + jobMinStr + " – " + jobMaxStr + " VND). " +
                    "Vui lòng nhập giải trình dải lương."
            );
        }
    }

    private String generateRequisitionCode() {
        String prefix = "REQ-" + DateTimeFormatter.ofPattern("yyyyMM").format(LocalDate.now()) + "-";
        long count = requisitions.countByRequisitionCodeStartingWith(prefix) + 1;
        String candidate = String.format("%s%04d", prefix, count);
        while (requisitions.existsByRequisitionCode(candidate)) {
            count++;
            candidate = String.format("%s%04d", prefix, count);
        }
        return candidate;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Vui lòng đăng nhập để thực hiện chức năng này");
        }
        return users.findByEmail(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Không tìm thấy thông tin tài khoản đang đăng nhập"));
    }

    private RequisitionResponse toResponse(RecruitmentRequisition req) {
        String deptName = null;
        String deptCode = null;
        if (req.getDepartmentId() != null) {
            Optional<Department> dept = departments.findById(req.getDepartmentId());
            if (dept.isPresent()) {
                deptName = dept.get().getName();
                deptCode = dept.get().getCode();
            }
        }

        String jobName = null;
        if (req.getJobTitleId() != null) {
            Optional<JobTitle> job = jobTitles.findById(req.getJobTitleId());
            if (job.isPresent()) {
                jobName = job.get().getTitle();
            }
        }

        String creatorName = null;
        if (req.getCreatedByUserId() != null) {
            Optional<User> creator = users.findById(req.getCreatedByUserId());
            if (creator.isPresent()) {
                creatorName = creator.get().getFullName();
            }
        }

        return new RequisitionResponse(
                req.getId(),
                req.getRequisitionCode(),
                req.getTitle(),
                req.getDepartmentId(),
                deptName,
                deptCode,
                req.getJobTitleId(),
                jobName,
                req.getQuantity(),
                req.getRecruitmentType(),
                req.getSalaryMin(),
                req.getSalaryMax(),
                req.getCurrency(),
                req.getSalaryExplanation(),
                req.getNeededDate(),
                req.getTargetDate(),
                req.getJobDescription(),
                req.getCandidateRequirements(),
                req.getBenefits(),
                req.getWorkLocation(),
                req.getWorkingModel(),
                req.getStatus(),
                req.getReason(),
                req.getRejectionReason(),
                req.getCreatedByUserId(),
                creatorName,
                req.getSubmittedAt(),
                req.getApprovedByUserId(),
                req.getApprovedAt(),
                req.getCreatedAt(),
                req.getUpdatedAt()
        );
    }
}
