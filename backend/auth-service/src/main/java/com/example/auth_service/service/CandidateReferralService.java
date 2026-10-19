package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CommonCategory;
import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.JobPosting;
import com.example.auth_service.domain.sprint4.CandidateReferral;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.CandidateApplication;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * Service: CandidateReferralService (Sprint 4 / S4-07 / SCRUM-184)
 * Xử lý nghiệp vụ giới thiệu ứng viên nội bộ:
 * - Nộp hồ sơ giới thiệu cho người quen kèm ghi chú
 * - Gắn nhãn nguồn "INTERNAL_REFERRAL" và lưu danh tính người giới thiệu
 * - Tra cứu danh sách hồ sơ theo người giới thiệu và theo dõi trạng thái ở mức tổng quát
 */
@Service
public class CandidateReferralService {

    public static final String SOURCE_INTERNAL_REFERRAL = "INTERNAL_REFERRAL";

    public static final Set<String> ALLOWED_GENERAL_STATUSES = Set.of(
            "SUBMITTED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"
    );

    private final CandidateReferralRepository referralRepository;
    private final CandidateApplicationRepository candidateApplicationRepository;
    private final JobPostingRepository jobPostingRepository;
    private final RecruitmentRequisitionRepository requisitionRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CommonCategoryRepository commonCategoryRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public CandidateReferralService(
            CandidateReferralRepository referralRepository,
            CandidateApplicationRepository candidateApplicationRepository,
            JobPostingRepository jobPostingRepository,
            RecruitmentRequisitionRepository requisitionRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            CommonCategoryRepository commonCategoryRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.referralRepository = referralRepository;
        this.candidateApplicationRepository = candidateApplicationRepository;
        this.jobPostingRepository = jobPostingRepository;
        this.requisitionRepository = requisitionRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.commonCategoryRepository = commonCategoryRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Nhân viên nội bộ nộp hồ sơ giới thiệu người quen.
     * Danh tính người giới thiệu PHẢI lấy từ UserPrincipal, tuyệt đối không nhận từ request body.
     */
    @Transactional
    public ReferralResponse submitReferral(ReferralCreateRequest req, UserPrincipal principal) {
        validateInternalEmployee(principal);
        validateReferralRequest(req);

        Long jobPostingId = req.getJobPostingId();
        Long effectiveReqId = req.getRequisitionId();

        JobPosting jobPosting = null;
        RecruitmentRequisition requisition = null;

        if (jobPostingId != null) {
            jobPosting = jobPostingRepository.findById(jobPostingId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin tuyển dụng ID: " + jobPostingId));
            if (effectiveReqId == null) {
                effectiveReqId = jobPosting.getRequisitionId();
            }
        }

        // Nếu tin tuyển dụng chưa gắn requisition_id, tự động liên kết với requisition phù hợp
        if (effectiveReqId == null && jobPosting != null) {
            Long deptId = jobPosting.getDepartmentId();
            Long titleId = jobPosting.getJobTitleId();
            List<RecruitmentRequisition> allReqs = requisitionRepository.findAll();

            effectiveReqId = allReqs.stream()
                    .filter(r -> deptId != null && deptId.equals(r.getDepartmentId()) && (titleId == null || titleId.equals(r.getJobTitleId())))
                    .map(RecruitmentRequisition::getId)
                    .findFirst()
                    .orElseGet(() -> allReqs.stream()
                            .filter(r -> deptId != null && deptId.equals(r.getDepartmentId()))
                            .map(RecruitmentRequisition::getId)
                            .findFirst()
                            .orElseGet(() -> allReqs.isEmpty() ? null : allReqs.get(0).getId()));

            if (effectiveReqId != null) {
                jobPosting.setRequisitionId(effectiveReqId);
                if (!"PUBLISHED".equalsIgnoreCase(jobPosting.getStatus())) {
                    jobPosting.setStatus("PUBLISHED");
                }
                jobPostingRepository.save(jobPosting);
            }
        }

        if (effectiveReqId != null) {
            final Long lookupReqId = effectiveReqId;
            requisition = requisitionRepository.findById(lookupReqId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu tuyển dụng ID: " + lookupReqId));
        }

        final Long finalRequisitionId = effectiveReqId;
        if (finalRequisitionId == null) {
            throw new BadRequestException("Không thể xác định vị trí tuyển dụng tương ứng. Vui lòng chọn tin tuyển dụng hoặc yêu cầu hợp lệ.");
        }

        String candidateEmail = req.getCandidateEmail().trim().toLowerCase();
        String candidateName = req.getCandidateName().trim();

        // Kiểm tra trùng lặp giới thiệu
        if (jobPostingId != null && referralRepository.existsByCandidateEmailAndJobPostingId(candidateEmail, jobPostingId)) {
            throw new BadRequestException("Ứng viên có email '" + candidateEmail + "' đã được giới thiệu cho vị trí này.");
        } else if (referralRepository.existsByCandidateEmailAndRequisitionId(candidateEmail, finalRequisitionId)) {
            throw new BadRequestException("Ứng viên có email '" + candidateEmail + "' đã được giới thiệu cho yêu cầu tuyển dụng này.");
        }

        // Tự động tìm hoặc tạo tài khoản ứng viên (Role: CANDIDATE)
        User candidateUser = findOrCreateCandidateUser(candidateEmail, candidateName, req.getCandidatePhone());

        // Lấy danh mục nguồn CANDIDATE_SOURCE = REFERRAL nếu có
        Long candidateSourceId = findReferralSourceCategoryId();

        // Tạo hồ sơ ứng tuyển trong hệ thống ATS (CandidateApplication)
        CandidateApplication application = new CandidateApplication();
        application.setRequisitionId(finalRequisitionId);
        application.setCandidateUserId(candidateUser.getId());
        application.setFullName(candidateName);
        application.setEmail(candidateEmail);
        application.setStage("APPLIED");
        application.setCandidateSourceId(candidateSourceId);
        application.setCandidateSourceCode(SOURCE_INTERNAL_REFERRAL);
        application.setReferrerUserId(principal.getId());
        application.setReferrerName(principal.getFullName());
        application.setReferralNotes(req.getReferralNotes().trim());
        application.setJobPostingId(jobPostingId);
        application.setPhone(req.getCandidatePhone());
        application.setCvUrl(req.getCvUrl());
        application.setRelationship(req.getRelationship());
        application.setCreatedAt(Instant.now());

        CandidateApplication savedApp = candidateApplicationRepository.save(application);

        // Tạo bản ghi Giới thiệu ứng viên (CandidateReferral)
        CandidateReferral referral = CandidateReferral.builder()
                .candidateApplicationId(savedApp.getId())
                .jobPostingId(jobPostingId)
                .requisitionId(finalRequisitionId)
                .candidateName(candidateName)
                .candidateEmail(candidateEmail)
                .candidatePhone(req.getCandidatePhone())
                .cvUrl(req.getCvUrl())
                .relationship(req.getRelationship())
                .referralNotes(req.getReferralNotes().trim())
                .referrerUserId(principal.getId())
                .referrerName(principal.getFullName())
                .referrerEmail(principal.getEmail())
                .source(SOURCE_INTERNAL_REFERRAL)
                .generalStatus("SUBMITTED")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        CandidateReferral savedReferral = referralRepository.save(referral);

        return mapToResponse(savedReferral, jobPosting, requisition);
    }

    /**
     * Tra cứu danh sách hồ sơ do chính người dùng hiện tại giới thiệu (theo phiên đăng nhập).
     */
    @Transactional(readOnly = true)
    public Page<ReferralResponse> getMyReferrals(String keyword, String generalStatus, Pageable pageable, UserPrincipal principal) {
        validateInternalEmployee(principal);
        String cleanKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        String cleanStatus = (generalStatus != null && !generalStatus.isBlank()) ? generalStatus.trim() : null;

        Page<CandidateReferral> page = referralRepository.findWithFilters(
                principal.getId(), cleanStatus, cleanKeyword, pageable
        );
        return page.map(this::enrichResponse);
    }

    /**
     * Xem chi tiết một hồ sơ đã giới thiệu.
     * Kiểm tra giới hạn tra cứu: Chỉ người giới thiệu hoặc người có thẩm quyền (HR/Admin) mới xem được.
     */
    @Transactional(readOnly = true)
    public ReferralResponse getReferralDetail(Long id, UserPrincipal principal) {
        validateInternalEmployee(principal);
        CandidateReferral referral = referralRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ giới thiệu ID: " + id));

        boolean isOwner = referral.getReferrerUserId().equals(principal.getId());
        boolean hasAdminAccess = hasPrivilegedAccess(principal);

        if (!isOwner && !hasAdminAccess) {
            throw new AccessDeniedException("Bạn không có quyền truy cập hồ sơ giới thiệu của người khác.");
        }

        return enrichResponse(referral);
    }

    /**
     * Tra cứu tất cả hồ sơ giới thiệu toàn công ty (Dành cho HR Manager, Admin, Recruiter).
     */
    @Transactional(readOnly = true)
    public Page<ReferralResponse> getAllReferrals(String keyword, String generalStatus, Long referrerId, Pageable pageable, UserPrincipal principal) {
        validatePrivilegedEmployee(principal);
        String cleanKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        String cleanStatus = (generalStatus != null && !generalStatus.isBlank()) ? generalStatus.trim() : null;

        Page<CandidateReferral> page = referralRepository.findWithFilters(
                referrerId, cleanStatus, cleanKeyword, pageable
        );
        return page.map(this::enrichResponse);
    }

    /**
     * Cập nhật trạng thái tổng quát (SUBMITTED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED).
     * Dành cho HR Manager, Admin, Recruiter để đồng bộ tiến độ ứng viên.
     */
    @Transactional
    public ReferralResponse updateGeneralStatus(Long id, ReferralStatusUpdateRequest req, UserPrincipal principal) {
        validatePrivilegedEmployee(principal);

        if (req == null || req.getGeneralStatus() == null || req.getGeneralStatus().isBlank()) {
            throw new BadRequestException("Trạng thái mới không được để trống.");
        }

        String targetStatus = req.getGeneralStatus().trim().toUpperCase();
        if (!ALLOWED_GENERAL_STATUSES.contains(targetStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + targetStatus + ". Danh sách cho phép: " + ALLOWED_GENERAL_STATUSES);
        }

        CandidateReferral referral = referralRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ giới thiệu ID: " + id));

        referral.setGeneralStatus(targetStatus);
        referral.setUpdatedAt(Instant.now());

        // Đồng bộ stage của CandidateApplication nếu có
        if (referral.getCandidateApplicationId() != null) {
            candidateApplicationRepository.findById(referral.getCandidateApplicationId()).ifPresent(app -> {
                String stage = mapGeneralStatusToPipelineStage(targetStatus);
                app.setStage(stage);
                candidateApplicationRepository.save(app);
            });
        }

        CandidateReferral updated = referralRepository.save(referral);
        return enrichResponse(updated);
    }

    /**
     * Danh sách các vị trí đang tuyển để nhân viên chọn trong biểu mẫu giới thiệu.
     */
    @Transactional(readOnly = true)
    public List<ReferralActivePositionResponse> getActivePositions() {
        List<ReferralActivePositionResponse> positions = new ArrayList<>();

        // 1. Lấy từ các JobPosting đang PUBLISHED
        List<JobPosting> activePostings = jobPostingRepository.findAll().stream()
                .filter(jp -> "PUBLISHED".equalsIgnoreCase(jp.getStatus()))
                .filter(jp -> jp.getApplicationDeadline() == null || !jp.getApplicationDeadline().isBefore(LocalDate.now()))
                .toList();

        Map<Long, Department> deptMap = new HashMap<>();
        departmentRepository.findAll().forEach(d -> deptMap.put(d.getId(), d));

        for (JobPosting jp : activePostings) {
            String deptName = jp.getDepartmentId() != null && deptMap.containsKey(jp.getDepartmentId())
                    ? deptMap.get(jp.getDepartmentId()).getName() : null;

            Long reqId = jp.getRequisitionId();
            if (reqId == null) {
                Long deptId = jp.getDepartmentId();
                Long titleId = jp.getJobTitleId();
                List<RecruitmentRequisition> allReqs = requisitionRepository.findAll();
                reqId = allReqs.stream()
                        .filter(r -> deptId != null && deptId.equals(r.getDepartmentId()) && (titleId == null || titleId.equals(r.getJobTitleId())))
                        .map(RecruitmentRequisition::getId)
                        .findFirst()
                        .orElseGet(() -> allReqs.stream()
                                .filter(r -> deptId != null && deptId.equals(r.getDepartmentId()))
                                .map(RecruitmentRequisition::getId)
                                .findFirst()
                                .orElseGet(() -> allReqs.isEmpty() ? null : allReqs.get(0).getId()));
                if (reqId != null) {
                    jp.setRequisitionId(reqId);
                    jobPostingRepository.save(jp);
                }
            }

            positions.add(ReferralActivePositionResponse.builder()
                    .jobPostingId(jp.getId())
                    .requisitionId(reqId)
                    .jobCode(jp.getJobCode())
                    .title(jp.getTitle())
                    .departmentId(jp.getDepartmentId())
                    .departmentName(deptName)
                    .workLocation(jp.getWorkLocation())
                    .workingModel(jp.getWorkingModel())
                    .applicationDeadline(jp.getApplicationDeadline())
                    .quantity(jp.getQuantity())
                    .build());
        }

        // 2. Nếu chưa có tin xuất bản, bổ sung các yêu cầu tuyển dụng đã duyệt (APPROVED)
        if (positions.isEmpty()) {
            List<RecruitmentRequisition> approvedReqs = requisitionRepository.findAll().stream()
                    .filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus()))
                    .toList();

            for (RecruitmentRequisition r : approvedReqs) {
                String deptName = r.getDepartmentId() != null && deptMap.containsKey(r.getDepartmentId())
                        ? deptMap.get(r.getDepartmentId()).getName() : null;

                positions.add(ReferralActivePositionResponse.builder()
                        .jobPostingId(null)
                        .requisitionId(r.getId())
                        .requisitionCode(r.getRequisitionCode())
                        .jobCode(r.getRequisitionCode())
                        .title(r.getTitle())
                        .departmentId(r.getDepartmentId())
                        .departmentName(deptName)
                        .applicationDeadline(r.getTargetDate())
                        .quantity(r.getQuantity())
                        .build());
            }
        }

        return positions;
    }

    // =========================================================================
    // HELPER METHODS & VALIDATION
    // =========================================================================

    public void validateInternalEmployee(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new AccessDeniedException("Yêu cầu đăng nhập để thực hiện tính năng này.");
        }
        boolean isInternal = principal.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .anyMatch(a -> a.equals("ROLE_ADMIN") || a.equals("ROLE_HR_MANAGER")
                        || a.equals("ROLE_RECRUITER") || a.equals("ROLE_HIRING_MANAGER")
                        || a.equals("ROLE_INTERVIEWER") || a.equals("ROLE_APPROVER"));

        if (!isInternal) {
            throw new AccessDeniedException("Chỉ nhân sự nội bộ hợp lệ mới có quyền thực hiện giới thiệu ứng viên.");
        }
    }

    public void validatePrivilegedEmployee(UserPrincipal principal) {
        validateInternalEmployee(principal);
        if (!hasPrivilegedAccess(principal)) {
            throw new AccessDeniedException("Bạn không có quyền quản lý toàn bộ hồ sơ giới thiệu hoặc cập nhật trạng thái.");
        }
    }

    public boolean hasPrivilegedAccess(UserPrincipal principal) {
        if (principal == null) return false;
        return principal.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .anyMatch(a -> a.equals("ROLE_ADMIN") || a.equals("ROLE_HR_MANAGER")
                        || a.equals("ROLE_RECRUITER") || a.equals("CANDIDATE_READ_ALL"));
    }

    private void validateReferralRequest(ReferralCreateRequest req) {
        if (req == null) {
            throw new BadRequestException("Dữ liệu giới thiệu không được để trống.");
        }
        if (req.getJobPostingId() == null && req.getRequisitionId() == null) {
            throw new BadRequestException("Vui lòng chọn vị trí việc làm hoặc yêu cầu tuyển dụng cần giới thiệu.");
        }
        if (req.getCandidateName() == null || req.getCandidateName().trim().isBlank()) {
            throw new BadRequestException("Họ và tên ứng viên không được để trống.");
        }
        if (req.getCandidateEmail() == null || req.getCandidateEmail().trim().isBlank()) {
            throw new BadRequestException("Email ứng viên không được để trống.");
        }
        if (req.getReferralNotes() == null || req.getReferralNotes().trim().isBlank()) {
            throw new BadRequestException("Ghi chú giới thiệu không được để trống.");
        }
    }

    private User findOrCreateCandidateUser(String email, String fullName, String phone) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            Role candidateRole = roleRepository.findByName(RoleName.CANDIDATE).orElseGet(() -> {
                Role r = new Role(RoleName.CANDIDATE, "Vai trò CANDIDATE");
                return roleRepository.save(r);
            });

            User newUser = new User();
            newUser.setEmail(email);
            newUser.setFullName(fullName);
            newUser.setPhone(phone);
            newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            newUser.setRoles(Set.of(candidateRole));
            newUser.setStatus("ACTIVE");
            newUser.setMustChangePassword(false);
            return userRepository.save(newUser);
        });
    }

    private Long findReferralSourceCategoryId() {
        try {
            return commonCategoryRepository.findAll().stream()
                    .filter(c -> "CANDIDATE_SOURCE".equalsIgnoreCase(c.getType()))
                    .filter(c -> "REFERRAL".equalsIgnoreCase(c.getCode()) || "INTERNAL_REFERRAL".equalsIgnoreCase(c.getCode()))
                    .map(CommonCategory::getId)
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    public static String mapGeneralStatusLabel(String status) {
        if (status == null) return "Chưa xác định";
        return switch (status.toUpperCase()) {
            case "SUBMITTED" -> "Đã tiếp nhận hồ sơ";
            case "SCREENING" -> "Đang sàng lọc hồ sơ";
            case "INTERVIEW" -> "Đang phỏng vấn";
            case "OFFER" -> "Đã gửi đề xuất tuyển dụng";
            case "HIRED" -> "Đã tuyển dụng thành công";
            case "REJECTED" -> "Chưa phù hợp";
            default -> status;
        };
    }

    public static String mapGeneralStatusToPipelineStage(String generalStatus) {
        if (generalStatus == null) return "APPLIED";
        return switch (generalStatus.toUpperCase()) {
            case "SUBMITTED" -> "APPLIED";
            case "SCREENING" -> "SCREENING";
            case "INTERVIEW" -> "INTERVIEW";
            case "OFFER" -> "OFFER";
            case "HIRED" -> "HIRED";
            case "REJECTED" -> "REJECTED";
            default -> "APPLIED";
        };
    }

    private ReferralResponse enrichResponse(CandidateReferral referral) {
        JobPosting jobPosting = referral.getJobPostingId() != null
                ? jobPostingRepository.findById(referral.getJobPostingId()).orElse(null) : null;
        RecruitmentRequisition requisition = referral.getRequisitionId() != null
                ? requisitionRepository.findById(referral.getRequisitionId()).orElse(null) : null;
        return mapToResponse(referral, jobPosting, requisition);
    }

    private ReferralResponse mapToResponse(CandidateReferral referral, JobPosting jobPosting, RecruitmentRequisition requisition) {
        String jobTitle = null;
        String jobPostingCode = null;
        String reqCode = null;
        Long departmentId = null;
        String departmentName = null;

        if (jobPosting != null) {
            jobTitle = jobPosting.getTitle();
            jobPostingCode = jobPosting.getJobCode();
            departmentId = jobPosting.getDepartmentId();
        } else if (requisition != null) {
            jobTitle = requisition.getTitle();
            reqCode = requisition.getRequisitionCode();
            departmentId = requisition.getDepartmentId();
        }

        if (requisition != null && reqCode == null) {
            reqCode = requisition.getRequisitionCode();
        }

        if (departmentId != null) {
            departmentName = departmentRepository.findById(departmentId)
                    .map(Department::getName)
                    .orElse(null);
        }

        return ReferralResponse.builder()
                .id(referral.getId())
                .candidateApplicationId(referral.getCandidateApplicationId())
                .jobPostingId(referral.getJobPostingId())
                .jobPostingCode(jobPostingCode)
                .jobTitle(jobTitle)
                .departmentId(departmentId)
                .departmentName(departmentName)
                .requisitionId(referral.getRequisitionId())
                .requisitionCode(reqCode)
                .candidateName(referral.getCandidateName())
                .candidateEmail(referral.getCandidateEmail())
                .candidatePhone(referral.getCandidatePhone())
                .cvUrl(referral.getCvUrl())
                .relationship(referral.getRelationship())
                .referralNotes(referral.getReferralNotes())
                .referrerUserId(referral.getReferrerUserId())
                .referrerName(referral.getReferrerName())
                .referrerEmail(referral.getReferrerEmail())
                .source(referral.getSource())
                .generalStatus(referral.getGeneralStatus())
                .generalStatusLabel(mapGeneralStatusLabel(referral.getGeneralStatus()))
                .createdAt(referral.getCreatedAt())
                .updatedAt(referral.getUpdatedAt())
                .build();
    }
}
