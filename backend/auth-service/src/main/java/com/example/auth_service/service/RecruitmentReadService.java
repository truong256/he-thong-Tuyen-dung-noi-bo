package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.SalaryRange;
import com.example.auth_service.dto.CandidateSummaryDto;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.CandidateScope;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.exception.ResourceNotFoundException;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import java.net.URI;
import com.example.auth_service.entity.CandidateApplication;

@Service
@Transactional(readOnly = true)
public class RecruitmentReadService {
    private final CandidateApplicationRepository candidates;
    private final SalaryRangeRepository salaries;
    private final CvStorageService cvStorageService;

    public static final String STAGE_WITHDRAWN = "WITHDRAWN";
    public static final String STAGE_WITHDRAWN_VI = "Ứng viên rút";

    public static boolean isWithdrawnStage(String stage) {
        if (stage == null) return false;
        String s = stage.trim();
        return STAGE_WITHDRAWN.equalsIgnoreCase(s) || STAGE_WITHDRAWN_VI.equalsIgnoreCase(s);
    }

    @Autowired
    public RecruitmentReadService(
            CandidateApplicationRepository candidates,
            SalaryRangeRepository salaries,
            @Autowired(required = false) CvStorageService cvStorageService
    ) {
        this.candidates = candidates;
        this.salaries = salaries;
        this.cvStorageService = cvStorageService;
    }

    public RecruitmentReadService(CandidateApplicationRepository candidates, SalaryRangeRepository salaries) {
        this(candidates, salaries, null);
    }

    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'CANDIDATE_READ_OWN')")
    public Page<CandidateSummaryDto> candidates(Long requisitionId, Pageable pageable) {
        return candidates(requisitionId, null, null, pageable);
    }

    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'CANDIDATE_READ_OWN')")
    public Page<CandidateSummaryDto> candidates(Long requisitionId, Boolean activePipelineOnly, String stage, Pageable pageable) {
        var scope = CandidateScope.visibleTo(SecurityContextHolder.getContext().getAuthentication());
        if (requisitionId != null) {
            scope = scope.and((root, query, cb) -> cb.equal(root.get("requisitionId"), requisitionId));
        }

        if (Boolean.TRUE.equals(activePipelineOnly)) {
            scope = scope.and((root, query, cb) -> cb.or(
                    cb.isNull(root.get("stage")),
                    cb.not(root.get("stage").in(
                            STAGE_WITHDRAWN,
                            STAGE_WITHDRAWN_VI
                    ))
            ));
        }
        if (stage != null && !stage.isBlank()) {
            scope = scope.and((root, query, cb) -> cb.equal(root.get("stage"), stage.trim()));
        }
        return candidates.findAll(scope, pageable).map(CandidateSummaryDto::from);
    }

    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'CANDIDATE_READ_OWN')")
    public CandidateSummaryDto candidate(Long id) {
        var scope = CandidateScope.visibleTo(SecurityContextHolder.getContext().getAuthentication());
        return candidates.findOne(scope.and((root, query, cb) -> cb.equal(root.get("id"), id)))
                .map(CandidateSummaryDto::from)
                .orElseThrow(() -> new AccessDeniedException("Bạn không có quyền xem hồ sơ ứng viên này."));
    }

    @PreAuthorize("hasAuthority('SALARY_READ')")
    public Page<SalaryRange> salaries(Pageable pageable) { return salaries.findAll(pageable); }

    @PreAuthorize("hasAuthority('SALARY_READ')")
    public SalaryRange salary(Long id) {
        return salaries.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dải lương."));
    }

    @PreAuthorize("hasAuthority('PIPELINE_MANAGE')")
    @Transactional
    public CandidateSummaryDto updatePipelineStage(Long candidateId, String stage) {
        return updatePipelineStage(candidateId, stage, null);
    }

    @PreAuthorize("hasAuthority('PIPELINE_MANAGE')")
    @Transactional
    public CandidateSummaryDto updatePipelineStage(Long candidateId, String stage, String reason) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var scope = CandidateScope.visibleTo(authentication);
        var app = candidates.findOne(scope.and(
                (root, query, cb) -> cb.equal(root.get("id"), candidateId)))
                .orElseThrow(() -> new AccessDeniedException(
                        "Bạn không có quyền quản lý pipeline của ứng viên này hoặc ứng viên ngoài phạm vi phụ trách."));

        if (isWithdrawnStage(app.getStage())) {
            throw new com.example.auth_service.exception.BadRequestException(
                    "Hồ sơ đã được ứng viên rút và không thể tiếp tục chuyển giai đoạn trong pipeline.");
        }

        String normalizedStage = stage == null ? "" : stage.trim();
        if ("REJECTED".equals(normalizedStage)) {
            if (reason == null || reason.trim().length() < 5) {
                throw new com.example.auth_service.exception.BadRequestException(
                        "Lý do từ chối phải có ít nhất 5 ký tự.");
            }
            app.setRejectionReason(reason.trim());
        } else {
            app.setRejectionReason(null);
        }

        Long actorId = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            actorId = ((UserPrincipal) authentication.getPrincipal()).getId();
        }

        app.setStage(normalizedStage.isEmpty() ? "APPLIED" : normalizedStage);
        app.setStageChangedById(actorId);
        app.setStageChangedAt(java.time.Instant.now());
        return CandidateSummaryDto.from(candidates.save(app));
    }

    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'CANDIDATE_READ_OWN')")
    public ResponseEntity<Resource> downloadCandidateCv(Long id) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var scope = CandidateScope.visibleTo(authentication);
        CandidateApplication app = candidates.findOne(scope.and((root, query, cb) -> cb.equal(root.get("id"), id)))
                .orElseThrow(() -> new AccessDeniedException("Bạn không có quyền xem CV của hồ sơ này."));

        if (app.getStoredFileName() == null || app.getStoredFileName().isBlank()) {
            if (app.getCvFileUrl() != null && app.getCvFileUrl().startsWith("http")) {
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(app.getCvFileUrl()))
                        .build();
            }
            throw new ResourceNotFoundException("Hồ sơ này không có tệp CV đính kèm.");
        }

        if (cvStorageService == null) {
            throw new ResourceNotFoundException("Dịch vụ lưu trữ CV chưa sẵn sàng.");
        }

        Resource resource = cvStorageService.loadCvResource(app.getStoredFileName());
        String contentType = cvStorageService.determineContentType(app.getStoredFileName());
        String filename = app.getCvFileName() != null && !app.getCvFileName().isBlank()
                ? app.getCvFileName()
                : "candidate_cv.pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }
}
