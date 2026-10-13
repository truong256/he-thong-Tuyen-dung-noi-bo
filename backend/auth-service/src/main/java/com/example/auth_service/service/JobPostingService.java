package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.JobPosting;
import com.example.auth_service.dto.JobPostingRequest;
import com.example.auth_service.dto.JobPostingResponse;
import com.example.auth_service.dto.JobPostingTemplateResponse;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobPostingRepository;
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

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

/**
 * Service xử lý nghiệp vụ soạn tin tuyển dụng từ yêu cầu đã duyệt (S3-09).
 */
@Service
@Transactional
public class JobPostingService {

    private final JobPostingRepository jobPostingRepository;
    private final RecruitmentRequisitionRepository requisitionRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final JobTitleRepository jobTitleRepository;

    public JobPostingService(
            JobPostingRepository jobPostingRepository,
            RecruitmentRequisitionRepository requisitionRepository,
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            JobTitleRepository jobTitleRepository
    ) {
        this.jobPostingRepository = jobPostingRepository;
        this.requisitionRepository = requisitionRepository;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.jobTitleRepository = jobTitleRepository;
    }

    /**
     * Lấy dữ liệu kế thừa từ yêu cầu tuyển dụng nguồn để khởi tạo tin tuyển dụng.
     * Chặn nếu yêu cầu tuyển dụng chưa ở trạng thái APPROVED.
     */
    @Transactional(readOnly = true)
    public JobPostingTemplateResponse getTemplate(Long requisitionId) {
        RecruitmentRequisition requisition = requisitionRepository.findById(requisitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với mã: " + requisitionId));

        validateApprovedRequisition(requisition);

        String deptName = null;
        if (requisition.getDepartmentId() != null) {
            deptName = departmentRepository.findById(requisition.getDepartmentId())
                    .map(Department::getName)
                    .orElse(null);
        }

        String jobTitleName = null;
        if (requisition.getJobTitleId() != null) {
            jobTitleName = jobTitleRepository.findById(requisition.getJobTitleId())
                    .map(JobTitle::getTitle)
                    .orElse(null);
        }

        String requirements = requisition.getCandidateRequirements();
        if (requirements == null || requirements.isBlank()) {
            requirements = requisition.getRequirements();
        }

        LocalDate deadline = requisition.getNeededDate() != null ? requisition.getNeededDate() : requisition.getTargetDate();
        if (deadline == null || deadline.isBefore(LocalDate.now())) {
            deadline = LocalDate.now().plusMonths(1);
        }

        Long salaryMin = requisition.getSalaryMin();
        if (salaryMin == null) {
            salaryMin = requisition.getProposedMinSalary();
        }
        Long salaryMax = requisition.getSalaryMax();
        if (salaryMax == null) {
            salaryMax = requisition.getProposedMaxSalary();
        }

        return new JobPostingTemplateResponse(
                requisition.getId(),
                requisition.getRequisitionCode(),
                requisition.getTitle(),
                requisition.getDepartmentId(),
                deptName,
                requisition.getJobTitleId(),
                jobTitleName,
                requisition.getQuantity(),
                requisition.getRecruitmentType(),
                requisition.getTitle(),
                requisition.getJobDescription(),
                requirements,
                requisition.getBenefits(),
                requisition.getWorkLocation(),
                requisition.getWorkLocationId(),
                requisition.getWorkingModel() != null ? requisition.getWorkingModel() : "ONSITE",
                deadline,
                true,
                "RANGE",
                salaryMin,
                salaryMax,
                requisition.getCurrency() != null ? requisition.getCurrency() : "VND",
                requisition.getStatus()
        );
    }

    /**
     * Tạo mới tin tuyển dụng từ yêu cầu đã duyệt (hỗ trợ lưu DRAFT hoặc PENDING_APPROVAL).
     * Kiểm tra chặt chẽ điều kiện APPROVED ở tầng backend.
     */
    public JobPostingResponse create(JobPostingRequest request) {
        if (request.requisitionId() == null) {
            throw new BadRequestException("Mã yêu cầu tuyển dụng nguồn không được để trống.");
        }

        RecruitmentRequisition requisition = requisitionRepository.findById(request.requisitionId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng với mã: " + request.requisitionId()));

        // Chặn tạo tin từ yêu cầu chưa được duyệt
        validateApprovedRequisition(requisition);

        // Kiểm tra hạn nhận hồ sơ
        validateApplicationDeadline(request.applicationDeadline());

        // Kiểm tra dải lương
        validateSalary(request.salaryType(), request.salaryMin(), request.salaryMax());

        String status = request.resolveStatus().toUpperCase();
        if (!JobPosting.STATUS_DRAFT.equals(status) && !JobPosting.STATUS_PENDING_APPROVAL.equals(status)) {
            throw new BadRequestException("Trạng thái tin tuyển dụng chỉ có thể là DRAFT (Nháp) hoặc PENDING_APPROVAL (Chờ duyệt).");
        }

        User currentUser = getCurrentUser();

        String postingCode = generatePostingCode();

        JobPosting jobPosting = JobPosting.builder()
                .postingCode(postingCode)
                .requisitionId(requisition.getId())
                .title(request.title().trim())
                .jobDescription(request.jobDescription())
                .candidateRequirements(request.candidateRequirements())
                .benefits(request.benefits())
                .workLocation(request.workLocation().trim())
                .workLocationId(request.workLocationId())
                .workingModel(request.resolveWorkingModel().toUpperCase())
                .applicationDeadline(request.applicationDeadline())
                .showSalary(request.isShowSalary())
                .salaryType(request.resolveSalaryType().toUpperCase())
                .salaryMin(request.salaryMin())
                .salaryMax(request.salaryMax())
                .currency(request.resolveCurrency())
                .status(status)
                .createdByUserId(currentUser.getId())
                .build();

        JobPosting saved = jobPostingRepository.save(jobPosting);
        return toResponse(saved, requisition, currentUser, null);
    }

    /**
     * Cập nhật tin tuyển dụng hiện có (lưu tiếp nháp hoặc gửi duyệt).
     */
    public JobPostingResponse update(Long id, JobPostingRequest request) {
        JobPosting jobPosting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin tuyển dụng với ID: " + id));

        // Kiểm tra hạn nhận hồ sơ
        validateApplicationDeadline(request.applicationDeadline());

        // Kiểm tra dải lương
        validateSalary(request.salaryType(), request.salaryMin(), request.salaryMax());

        String targetStatus = request.resolveStatus().toUpperCase();
        if (!JobPosting.STATUS_DRAFT.equals(targetStatus) && !JobPosting.STATUS_PENDING_APPROVAL.equals(targetStatus)) {
            throw new BadRequestException("Trạng thái tin tuyển dụng chỉ có thể là DRAFT (Nháp) hoặc PENDING_APPROVAL (Chờ duyệt).");
        }

        User currentUser = getCurrentUser();

        jobPosting.setTitle(request.title().trim());
        jobPosting.setJobDescription(request.jobDescription());
        jobPosting.setCandidateRequirements(request.candidateRequirements());
        jobPosting.setBenefits(request.benefits());
        jobPosting.setWorkLocation(request.workLocation().trim());
        jobPosting.setWorkLocationId(request.workLocationId());
        jobPosting.setWorkingModel(request.resolveWorkingModel().toUpperCase());
        jobPosting.setApplicationDeadline(request.applicationDeadline());
        jobPosting.setShowSalary(request.isShowSalary());
        jobPosting.setSalaryType(request.resolveSalaryType().toUpperCase());
        jobPosting.setSalaryMin(request.salaryMin());
        jobPosting.setSalaryMax(request.salaryMax());
        jobPosting.setCurrency(request.resolveCurrency());
        jobPosting.setStatus(targetStatus);
        jobPosting.setUpdatedByUserId(currentUser.getId());

        JobPosting saved = jobPostingRepository.save(jobPosting);
        RecruitmentRequisition requisition = requisitionRepository.findById(saved.getRequisitionId()).orElse(null);
        User creator = userRepository.findById(saved.getCreatedByUserId()).orElse(currentUser);
        return toResponse(saved, requisition, creator, currentUser);
    }

    /**
     * Lấy chi tiết tin tuyển dụng theo ID.
     */
    @Transactional(readOnly = true)
    public JobPostingResponse getById(Long id) {
        JobPosting jobPosting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin tuyển dụng với ID: " + id));

        RecruitmentRequisition requisition = requisitionRepository.findById(jobPosting.getRequisitionId()).orElse(null);
        User creator = userRepository.findById(jobPosting.getCreatedByUserId()).orElse(null);
        User updater = jobPosting.getUpdatedByUserId() != null 
                ? userRepository.findById(jobPosting.getUpdatedByUserId()).orElse(null) 
                : null;

        return toResponse(jobPosting, requisition, creator, updater);
    }

    /**
     * Lấy tin tuyển dụng gắn với yêu cầu tuyển dụng (nếu đã có bản nháp hoặc tin tạo trước đó).
     */
    @Transactional(readOnly = true)
    public Optional<JobPostingResponse> getByRequisitionId(Long requisitionId) {
        return jobPostingRepository.findTopByRequisitionIdOrderByCreatedAtDesc(requisitionId)
                .map(posting -> {
                    RecruitmentRequisition req = requisitionRepository.findById(posting.getRequisitionId()).orElse(null);
                    User creator = userRepository.findById(posting.getCreatedByUserId()).orElse(null);
                    User updater = posting.getUpdatedByUserId() != null
                            ? userRepository.findById(posting.getUpdatedByUserId()).orElse(null)
                            : null;
                    return toResponse(posting, req, creator, updater);
                });
    }

    /**
     * Danh sách tin tuyển dụng có phân trang, tìm kiếm và lọc theo trạng thái.
     */
    @Transactional(readOnly = true)
    public Page<JobPostingResponse> search(String status, String keyword, Long requisitionId, Pageable pageable) {
        String trimmedStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status))
                ? status.trim().toUpperCase()
                : null;
        String trimmedKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;

        Page<JobPosting> page = jobPostingRepository.search(trimmedStatus, trimmedKeyword, requisitionId, pageable);

        return page.map(posting -> {
            RecruitmentRequisition req = requisitionRepository.findById(posting.getRequisitionId()).orElse(null);
            User creator = userRepository.findById(posting.getCreatedByUserId()).orElse(null);
            User updater = posting.getUpdatedByUserId() != null
                    ? userRepository.findById(posting.getUpdatedByUserId()).orElse(null)
                    : null;
            return toResponse(posting, req, creator, updater);
        });
    }

    // --- Private Helper Methods ---

    private void validateApprovedRequisition(RecruitmentRequisition requisition) {
        if (requisition == null || !"APPROVED".equalsIgnoreCase(requisition.getStatus())) {
            throw new BadRequestException("Chỉ có thể tạo tin tuyển dụng từ yêu cầu đã được phê duyệt.");
        }
    }

    private void validateApplicationDeadline(LocalDate deadline) {
        if (deadline == null) {
            throw new BadRequestException("Hạn nhận hồ sơ không được để trống.");
        }
        if (deadline.isBefore(LocalDate.now())) {
            throw new BadRequestException("Hạn nhận hồ sơ không thể trong quá khứ.");
        }
    }

    private void validateSalary(String salaryType, Long min, Long max) {
        if ("RANGE".equalsIgnoreCase(salaryType)) {
            if (min != null && max != null && min > max) {
                throw new BadRequestException("Mức lương tối thiểu không được lớn hơn mức lương tối đa.");
            }
        }
    }

    private synchronized String generatePostingCode() {
        String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "JP-" + todayStr + "-";
        long count = jobPostingRepository.countByPostingCodeStartingWith(prefix) + 1;
        String code = String.format("%s%04d", prefix, count);
        while (jobPostingRepository.existsByPostingCode(code)) {
            count++;
            code = String.format("%s%04d", prefix, count);
        }
        return code;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Vui lòng đăng nhập để thực hiện chức năng này.");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Không tìm thấy thông tin tài khoản đang đăng nhập."));
    }

    private JobPostingResponse toResponse(
            JobPosting posting,
            RecruitmentRequisition requisition,
            User creator,
            User updater
    ) {
        String deptName = null;
        String jobTitleName = null;
        Long deptId = null;
        Long jobTitleId = null;
        String reqCode = null;
        String reqTitle = null;

        if (requisition != null) {
            reqCode = requisition.getRequisitionCode();
            reqTitle = requisition.getTitle();
            deptId = requisition.getDepartmentId();
            jobTitleId = requisition.getJobTitleId();

            if (deptId != null) {
                deptName = departmentRepository.findById(deptId)
                        .map(Department::getName)
                        .orElse(null);
            }
            if (jobTitleId != null) {
                jobTitleName = jobTitleRepository.findById(jobTitleId)
                        .map(JobTitle::getTitle)
                        .orElse(null);
            }
        }

        String creatorName = creator != null ? creator.getFullName() : null;
        String creatorEmail = creator != null ? creator.getEmail() : null;

        return new JobPostingResponse(
                posting.getId(),
                posting.getPostingCode(),
                posting.getRequisitionId(),
                reqCode,
                reqTitle,
                deptId,
                deptName,
                jobTitleId,
                jobTitleName,
                posting.getTitle(),
                posting.getJobDescription(),
                posting.getCandidateRequirements(),
                posting.getBenefits(),
                posting.getWorkLocation(),
                posting.getWorkLocationId(),
                posting.getWorkingModel(),
                posting.getApplicationDeadline(),
                posting.isShowSalary(),
                posting.getSalaryType(),
                posting.getSalaryMin(),
                posting.getSalaryMax(),
                posting.getCurrency(),
                posting.getStatus(),
                posting.getCreatedByUserId(),
                creatorName,
                creatorEmail,
                posting.getUpdatedByUserId(),
                posting.getCreatedAt(),
                posting.getUpdatedAt()
        );
    }
}
