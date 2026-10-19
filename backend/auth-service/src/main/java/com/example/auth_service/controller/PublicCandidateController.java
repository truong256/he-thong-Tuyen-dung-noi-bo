package com.example.auth_service.controller;

import com.example.auth_service.dto.CandidateDetailDto;
import com.example.auth_service.service.CandidateService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/public/candidates")
public class PublicCandidateController {

    private final CandidateService candidateService;

    public PublicCandidateController(CandidateService candidateService) {
        this.candidateService = candidateService;
    }

    /**
     * S4-04: Public candidate job application endpoint.
     * Acceptance Criteria: Bóc tách thất bại không làm hỏng việc nộp hồ sơ.
     */
    @PostMapping(value = "/apply", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CandidateDetailDto> apply(
            @RequestParam("requisitionId") Long requisitionId,
            @RequestParam("fullName") String fullName,
            @RequestParam("email") String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "sourceId", required = false) Long sourceId,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        CandidateDetailDto result = candidateService.submitApplication(
                requisitionId, fullName, email, phone, sourceId, file
        );
        return ResponseEntity.ok(result);
    }
}
