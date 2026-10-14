package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.SalaryRange;
import com.example.auth_service.dto.CandidateSummaryDto;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.CandidateScope;
import com.example.auth_service.exception.ResourceNotFoundException;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RecruitmentReadService {
    private final CandidateApplicationRepository candidates;
    private final SalaryRangeRepository salaries;
    public RecruitmentReadService(CandidateApplicationRepository candidates, SalaryRangeRepository salaries) {
        this.candidates = candidates;
        this.salaries = salaries;
    }

    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'CANDIDATE_READ_OWN')")
    public Page<CandidateSummaryDto> candidates(Long requisitionId, Pageable pageable) {
        var scope = CandidateScope.visibleTo(SecurityContextHolder.getContext().getAuthentication());
        if (requisitionId != null) scope = scope.and((root, query, cb) -> cb.equal(root.get("requisitionId"), requisitionId));
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
        var scope = CandidateScope.visibleTo(SecurityContextHolder.getContext().getAuthentication());
        var app = candidates.findOne(scope.and((root, query, cb) -> cb.equal(root.get("id"), candidateId)))
                .orElseThrow(() -> new AccessDeniedException("Bạn không có quyền quản lý pipeline của ứng viên này hoặc ứng viên ngoài phạm vi phụ trách."));
        app.setStage(stage != null ? stage.trim() : "APPLIED");
        return CandidateSummaryDto.from(candidates.save(app));
    }
}
