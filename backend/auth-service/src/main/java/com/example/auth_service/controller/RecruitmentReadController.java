package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.SalaryRange;
import com.example.auth_service.dto.CandidateSummaryDto;
import com.example.auth_service.service.RecruitmentReadService;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class RecruitmentReadController {
    private final RecruitmentReadService service;
    public RecruitmentReadController(RecruitmentReadService service) { this.service = service; }

    private static final java.util.Set<String> ALLOWED_CANDIDATE_SORT_FIELDS = java.util.Set.of("fullName", "email", "stage", "id");
    private static final java.util.Set<String> ALLOWED_SALARY_SORT_FIELDS = java.util.Set.of("name", "minSalary", "maxSalary", "id");

    @GetMapping("/candidates")
    public Page<CandidateSummaryDto> candidates(
            @RequestParam(required = false) Long requisitionId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortOrder
    ) {
        Pageable pageable = com.example.auth_service.util.PaginationUtils.createPageable(
                page, size, sortBy, sortOrder, "id", Sort.Direction.ASC, ALLOWED_CANDIDATE_SORT_FIELDS
        );
        return service.candidates(requisitionId, pageable);
    }

    @GetMapping("/candidates/{id}")
    public CandidateSummaryDto candidate(@PathVariable Long id) { return service.candidate(id); }

    @GetMapping("/salary-ranges")
    public Page<SalaryRange> salaries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortOrder
    ) {
        Pageable pageable = com.example.auth_service.util.PaginationUtils.createPageable(
                page, size, sortBy, sortOrder, "id", Sort.Direction.ASC, ALLOWED_SALARY_SORT_FIELDS
        );
        return service.salaries(pageable);
    }

    @GetMapping("/salary-ranges/{id}")
    public SalaryRange salary(@PathVariable Long id) { return service.salary(id); }
}
