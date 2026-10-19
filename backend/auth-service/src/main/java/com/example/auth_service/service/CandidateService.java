package com.example.auth_service.service;

import com.example.auth_service.dto.*;
import com.example.auth_service.entity.CandidateApplication;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.CandidateApplicationRepository;
import com.example.auth_service.security.CandidateScope;
import com.example.auth_service.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class CandidateService {
    private static final Logger log = LoggerFactory.getLogger(CandidateService.class);

    private final CandidateApplicationRepository candidateRepository;
    private final CvParsingService cvParsingService;

    @Value("${app.upload.cv-dir:uploads/cvs}")
    private String cvDir;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.example.auth_service.repository.RecruitmentRequisitionRepository requisitionRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.example.auth_service.repository.JobPostingRepository jobPostingRepository;

    public CandidateService(CandidateApplicationRepository candidateRepository,
                            CvParsingService cvParsingService) {
        this.candidateRepository = candidateRepository;
        this.cvParsingService = cvParsingService;
    }

    /**
     * Get paginated candidates with keyword search and scope filtering
     */
    @Transactional(readOnly = true)
    public Page<CandidateSummaryDto> getCandidates(Long requisitionId, String stage, String keyword, Pageable pageable) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Specification<CandidateApplication> spec = CandidateScope.visibleTo(auth);

        if (requisitionId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("requisitionId"), requisitionId));
        }

        if (stage != null && !stage.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.upper(root.get("stage")), stage.trim().toUpperCase()));
        }

        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("fullName")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern),
                    cb.like(cb.lower(root.get("phone")), pattern)
            ));
        }

        return candidateRepository.findAll(spec, pageable).map(CandidateSummaryDto::from);
    }

    /**
     * Get candidate detail with suggested parsing info and verified data
     */
    @Transactional(readOnly = true)
    public CandidateDetailDto getCandidateDetail(Long id) {
        CandidateApplication app = findInScopeOrThrow(id);
        return CandidateDetailDto.from(app);
    }

    /**
     * S4-04: Recruiter confirms or edits the candidate information based on CV suggestions.
     * Original data is only overwritten upon this explicit confirmation.
     */
    public CandidateDetailDto confirmParsedInfo(Long id, ConfirmCandidateInfoRequest request) {
        CandidateApplication app = findInScopeOrThrow(id);

        if (request.fullName() == null || request.fullName().isBlank()) {
            throw new BadRequestException("Họ và tên ứng viên không được để trống.");
        }
        if (request.email() == null || request.email().isBlank()) {
            throw new BadRequestException("Email ứng viên không được để trống.");
        }

        app.setFullName(request.fullName().trim());
        app.setEmail(request.email().trim());
        if (request.phone() != null) {
            app.setPhone(request.phone().trim());
        }
        if (request.stage() != null && !request.stage().isBlank()) {
            app.setStage(request.stage().trim());
        }

        app.setIsParsedConfirmed(true);
        app.setConfirmedByUserId(getCurrentUserId());
        app.setConfirmedAt(Instant.now());
        app.setUpdatedAt(Instant.now());

        CandidateApplication saved = candidateRepository.save(app);
        log.info("Recruiter confirmed candidate info for ID {}: name={}, email={}, phone={}",
                saved.getId(), saved.getFullName(), saved.getEmail(), saved.getPhone());
        return CandidateDetailDto.from(saved);
    }

    /**
     * S4-04: Recruiter requests re-parsing of CV for candidate.
     * Safe execution: Does NOT overwrite currently verified fullName, email, or phone.
     */
    public CandidateDetailDto reparseCv(Long id, MultipartFile newCvFile) {
        CandidateApplication app = findInScopeOrThrow(id);

        byte[] pdfBytes = null;
        if (newCvFile != null && !newCvFile.isEmpty()) {
            try {
                String originalFilename = newCvFile.getOriginalFilename();
                String savedFileName = saveCvFile(newCvFile);
                app.setCvFileName(originalFilename);
                app.setCvUrl("/api/candidates/" + app.getId() + "/cv");
                pdfBytes = newCvFile.getBytes();
            } catch (IOException e) {
                log.warn("Lỗi khi đọc file CV mới: {}", e.getMessage());
            }
        } else if (app.getCvFileName() != null) {
            // Attempt to read from stored path if available
            pdfBytes = loadStoredCvBytes(app);
        }

        if (pdfBytes != null && pdfBytes.length > 0) {
            CvParseResultDto parseResult = cvParsingService.parseCv(pdfBytes);
            app.setParsedFullName(parseResult.fullName());
            app.setParsedEmail(parseResult.email());
            app.setParsedPhone(parseResult.phone());
            app.setParsedStatus(parseResult.status());
            app.setParsedMessage(parseResult.message());
        } else {
            app.setParsedStatus("FAILED");
            app.setParsedMessage("Không tìm thấy dữ liệu tệp CV để bóc tách.");
        }

        app.setUpdatedAt(Instant.now());
        CandidateApplication saved = candidateRepository.save(app);
        return CandidateDetailDto.from(saved);
    }

    /**
     * S4-04: Create or submit a candidate application with optional CV file.
     * Critical AC: CV parsing failure NEVER blocks the application submission.
     */
    public CandidateDetailDto submitApplication(Long requisitionId,
                                                String fullName,
                                                String email,
                                                String phone,
                                                Long sourceId,
                                                MultipartFile cvFile) {
        if (requisitionId == null) {
            throw new BadRequestException("requisitionId không được để trống.");
        }
        if (requisitionRepository != null && !requisitionRepository.existsById(requisitionId)) {
            if (jobPostingRepository != null) {
                var postingOpt = jobPostingRepository.findById(requisitionId);
                if (postingOpt.isPresent() && postingOpt.get().getRequisitionId() != null) {
                    log.info("Resolved requisitionId {} from JobPosting ID {} to {}", requisitionId, postingOpt.get().getId(), postingOpt.get().getRequisitionId());
                    requisitionId = postingOpt.get().getRequisitionId();
                }
            }
        }
        if (fullName == null || fullName.isBlank()) {
            throw new BadRequestException("Họ tên không được để trống.");
        }
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email không được để trống.");
        }

        CandidateApplication app = new CandidateApplication();
        app.setRequisitionId(requisitionId);
        app.setFullName(fullName.trim());
        app.setEmail(email.trim());
        if (phone != null) {
            app.setPhone(phone.trim());
        }
        app.setCandidateSourceId(sourceId);
        app.setStage("APPLIED");
        Long candUid = getCurrentUserId();
        app.setCandidateUserId(candUid != null ? candUid : 1L);
        app.setIsParsedConfirmed(false);
        app.setCreatedAt(Instant.now());
        app.setUpdatedAt(Instant.now());

        if (cvFile != null && !cvFile.isEmpty()) {
            try {
                String originalFilename = cvFile.getOriginalFilename();
                String storedFileName = saveCvFile(cvFile);
                app.setCvFileName(originalFilename);
                app.setCvUrl(storedFileName);

                // Run parsing safe from exceptions
                byte[] bytes = cvFile.getBytes();
                CvParseResultDto parseResult = cvParsingService.parseCv(bytes);
                app.setParsedFullName(parseResult.fullName());
                app.setParsedEmail(parseResult.email());
                app.setParsedPhone(parseResult.phone());
                app.setParsedStatus(parseResult.status());
                app.setParsedMessage(parseResult.message());
            } catch (Exception e) {
                // S4-04 AC: Parsing error must NOT block application submission
                log.warn("Lỗi bóc tách CV trong quá trình nộp hồ sơ: {}", e.getMessage());
                app.setParsedStatus("FAILED");
                app.setParsedMessage("Không thể bóc tách tự động: " + e.getMessage());
            }
        } else {
            app.setParsedStatus("NOT_PARSED");
            app.setParsedMessage("Không có tệp CV đính kèm.");
        }

        CandidateApplication saved = candidateRepository.save(app);
        if (saved.getCvUrl() != null && !saved.getCvUrl().startsWith("/api/")) {
            saved.setCvUrl("/api/candidates/" + saved.getId() + "/cv");
            saved = candidateRepository.save(saved);
        }

        return CandidateDetailDto.from(saved);
    }

    /**
     * Preview parse CV file directly without saving to database
     */
    public CvParseResultDto parseCvPreview(MultipartFile file) {
        return cvParsingService.parseCv(file);
    }

    /**
     * Load stored CV bytes for viewing or re-parsing
     */
    @Transactional(readOnly = true)
    public byte[] getCvFileBytes(Long id) {
        CandidateApplication app = findInScopeOrThrow(id);
        byte[] bytes = loadStoredCvBytes(app);
        if (bytes == null || bytes.length == 0) {
            throw new ResourceNotFoundException("Tệp CV không tồn tại hoặc chưa được tải lên.");
        }
        return bytes;
    }

    private CandidateApplication findInScopeOrThrow(Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Specification<CandidateApplication> spec = CandidateScope.visibleTo(auth)
                .and((root, query, cb) -> cb.equal(root.get("id"), id));
        return candidateRepository.findOne(spec)
                .orElseThrow(() -> new AccessDeniedException("Bạn không có quyền xem hoặc thao tác trên hồ sơ ứng viên này."));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal user) {
            return user.getId();
        }
        return null;
    }

    private String saveCvFile(MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(cvDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        String originalFilename = file.getOriginalFilename();
        String extension = ".pdf";
        if (originalFilename != null && originalFilename.lastIndexOf('.') != -1) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
        }

        String uniqueFileName = UUID.randomUUID() + extension;
        Path targetLocation = uploadPath.resolve(uniqueFileName);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        return uniqueFileName;
    }

    private byte[] loadStoredCvBytes(CandidateApplication app) {
        if (app.getCvUrl() == null && app.getCvFileName() == null) {
            return null;
        }
        try {
            Path uploadPath = Paths.get(cvDir).toAbsolutePath().normalize();
            // Try resolving by cvUrl or cvFileName
            if (app.getCvUrl() != null && !app.getCvUrl().startsWith("/api/")) {
                Path filePath = uploadPath.resolve(app.getCvUrl());
                if (Files.exists(filePath)) {
                    return Files.readAllBytes(filePath);
                }
            }
        } catch (Exception e) {
            log.warn("Không thể tải tệp CV từ đĩa: {}", e.getMessage());
        }
        return null;
    }
}
