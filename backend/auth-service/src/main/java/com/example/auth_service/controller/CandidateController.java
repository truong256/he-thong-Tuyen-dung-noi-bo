package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.service.CandidateService;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/candidates")
public class CandidateController {

    private final CandidateService candidateService;

    public CandidateController(CandidateService candidateService) {
        this.candidateService = candidateService;
    }

    /**
     * S4-04: Advanced list/search candidates with scope filtering
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'CANDIDATE_READ_OWN')")
    public Page<CandidateSummaryDto> searchCandidates(
            @RequestParam(required = false) Long requisitionId,
            @RequestParam(required = false) String stage,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.clamp(size, 1, 100), Sort.by(Sort.Direction.DESC, "id"));
        return candidateService.getCandidates(requisitionId, stage, keyword, pageable);
    }

    /**
     * S4-04: Get detailed candidate profile with CV parsed values & verified values
     */
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'CANDIDATE_READ_OWN')")
    public CandidateDetailDto getCandidateDetail(@PathVariable Long id) {
        return candidateService.getCandidateDetail(id);
    }

    /**
     * S4-04: Parse CV file directly to preview suggestions
     */
    @PostMapping(value = "/parse-cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'ROLE_RECRUITER', 'ROLE_HR_MANAGER', 'ROLE_ADMIN')")
    public CvParseResultDto parseCv(@RequestParam("file") MultipartFile file) {
        return candidateService.parseCvPreview(file);
    }

    /**
     * S4-04: Re-parse CV for an existing candidate (does NOT overwrite verified fields)
     */
    @PostMapping(value = "/{id}/reparse-cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'ROLE_RECRUITER', 'ROLE_HR_MANAGER', 'ROLE_ADMIN')")
    public CandidateDetailDto reparseCv(
            @PathVariable Long id,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        return candidateService.reparseCv(id, file);
    }

    /**
     * S4-04: Recruiter confirms or edits the candidate information.
     * Only this endpoint updates the verified fullName, email, and phone!
     */
    @PutMapping("/{id}/confirm-parsed")
    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'ROLE_RECRUITER', 'ROLE_HR_MANAGER', 'ROLE_ADMIN')")
    public CandidateDetailDto confirmParsedInfo(
            @PathVariable Long id,
            @Valid @RequestBody ConfirmCandidateInfoRequest request
    ) {
        return candidateService.confirmParsedInfo(id, request);
    }

    /**
     * S4-04: Recruiter creates a candidate application with optional CV file
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'ROLE_RECRUITER', 'ROLE_HR_MANAGER', 'ROLE_ADMIN')")
    public ResponseEntity<CandidateDetailDto> createCandidate(
            @RequestParam("requisitionId") Long requisitionId,
            @RequestParam("fullName") String fullName,
            @RequestParam("email") String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "sourceId", required = false) Long sourceId,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        CandidateDetailDto created = candidateService.submitApplication(
                requisitionId, fullName, email, phone, sourceId, file
        );
        return ResponseEntity.ok(created);
    }

    /**
     * View/download candidate CV file
     */
    @GetMapping("/{id}/cv")
    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_ALL', 'CANDIDATE_READ_ASSIGNED', 'CANDIDATE_READ_OWN')")
    public ResponseEntity<Resource> downloadCv(@PathVariable Long id) {
        byte[] bytes = candidateService.getCvFileBytes(id);
        ByteArrayResource resource = new ByteArrayResource(bytes);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"candidate_cv_" + id + ".pdf\"")
                .body(resource);
    }
}
