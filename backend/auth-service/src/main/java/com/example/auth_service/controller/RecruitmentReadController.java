package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.SalaryRange;
import com.example.auth_service.dto.CandidateSummaryDto;
import com.example.auth_service.service.RecruitmentReadService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.Set;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class RecruitmentReadController {

    private final RecruitmentReadService service;

    public RecruitmentReadController(RecruitmentReadService service) {
        this.service = service;
    }

    @GetMapping("/candidates")
    public Page<CandidateSummaryDto> candidates(
            @RequestParam(required = false) Long requisitionId,
            @RequestParam(required = false) Boolean activePipelineOnly,
            @RequestParam(required = false) String stage,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return service.candidates(
                requisitionId,
                activePipelineOnly,
                stage,
                pageable(page, size)
        );
    }

    @GetMapping("/candidates/{id}")
    public CandidateSummaryDto candidate(@PathVariable Long id) {
        return service.candidate(id);
    }

    @org.springframework.web.bind.annotation.PatchMapping("/candidates/{id}/stage")
    public CandidateSummaryDto updateCandidateStage(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String stage = body == null ? null : body.get("stage");
        Set<String> allowedStages = Set.of(
                "APPLIED", "SCREENING", "SHORTLISTED",
                "INTERVIEW", "OFFER", "HIRED", "REJECTED"
        );

        if (stage == null || !allowedStages.contains(stage)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Giai doan ung vien khong hop le."
            );
        }

        String reason = body == null ? null : body.get("reason");
        if ("REJECTED".equals(stage) && (reason == null || reason.trim().length() < 5)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Lý do từ chối phải có ít nhất 5 ký tự."
            );
        }
        return service.updatePipelineStage(id, stage, reason);
    }

    @GetMapping("/salary-ranges")
    public Page<SalaryRange> salaries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return service.salaries(pageable(page, size));
    }

    @GetMapping("/salary-ranges/{id}")
    public SalaryRange salary(@PathVariable Long id) {
        return service.salary(id);
    }

    private Pageable pageable(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));

        return PageRequest.of(safePage, safeSize, Sort.by("id"));
    }
}

