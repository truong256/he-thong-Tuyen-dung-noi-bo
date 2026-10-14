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

    @GetMapping("/candidates")
    public Page<CandidateSummaryDto> candidates(@RequestParam(required = false) Long requisitionId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.candidates(requisitionId, pageable(page, size));
    }
    @GetMapping("/candidates/{id}")
    public CandidateSummaryDto candidate(@PathVariable Long id) { return service.candidate(id); }
    @GetMapping("/salary-ranges")
    public Page<SalaryRange> salaries(@RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "20") int size) {
        return service.salaries(pageable(page, size));
    }
    @GetMapping("/salary-ranges/{id}")
    public SalaryRange salary(@PathVariable Long id) { return service.salary(id); }


    private Pageable pageable(int page, int size) {
        return PageRequest.of(Math.max(0, page), Math.clamp(size, 1, 100), Sort.by("id"));
    }
}
