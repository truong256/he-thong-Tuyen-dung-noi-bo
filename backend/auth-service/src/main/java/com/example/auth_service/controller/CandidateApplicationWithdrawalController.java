package com.example.auth_service.controller;

import com.example.auth_service.dto.CandidateApplicationPortalDto;
import com.example.auth_service.dto.WithdrawApplicationRequest;
import com.example.auth_service.dto.WithdrawalResultResponse;
import com.example.auth_service.dto.WithdrawalValidationResponse;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.CandidateApplicationWithdrawalService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CandidateApplicationWithdrawalController {

    private final CandidateApplicationWithdrawalService withdrawalService;

    public CandidateApplicationWithdrawalController(CandidateApplicationWithdrawalService withdrawalService) {
        this.withdrawalService = withdrawalService;
    }

    /**
     * S4-06: Danh sách các hồ sơ ứng tuyển của chính ứng viên đăng nhập.
     */
    @GetMapping("/candidate/applications")
    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_OWN', 'ROLE_CANDIDATE')")
    public ResponseEntity<List<CandidateApplicationPortalDto>> getMyApplications(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<CandidateApplicationPortalDto> list = withdrawalService.getCandidateApplications(principal.getId());
        return ResponseEntity.ok(list);
    }

    /**
     * AC1: Validates token without mutating data (safe for GET, link preview, bots).
     */
    @GetMapping("/public/applications/withdraw")
    public ResponseEntity<WithdrawalValidationResponse> validateWithdrawalToken(@RequestParam("token") String token) {
        WithdrawalValidationResponse response = withdrawalService.validateWithdrawalToken(token);
        return ResponseEntity.ok(response);
    }

    /**
     * AC1 & AC2: Confirms application withdrawal via POST after candidate clicks confirm.
     */
    @PostMapping("/public/applications/withdraw")
    public ResponseEntity<WithdrawalResultResponse> confirmWithdrawal(
            @Valid @RequestBody WithdrawApplicationRequest request
    ) {
        WithdrawalResultResponse result = withdrawalService.confirmWithdrawal(
                request.token(),
                request.reason()
        );
        return ResponseEntity.ok(result);
    }

    /**
     * Candidate directly confirms withdrawal when logged in to their portal.
     */
    @PostMapping("/candidate/applications/{id}/withdraw")
    @PreAuthorize("hasAnyAuthority('CANDIDATE_READ_OWN', 'ROLE_CANDIDATE')")
    public ResponseEntity<WithdrawalResultResponse> confirmWithdrawalByCandidate(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String reason = body != null ? body.get("reason") : null;
        WithdrawalResultResponse result = withdrawalService.confirmWithdrawalByCandidate(
                id,
                principal.getId(),
                reason
        );
        return ResponseEntity.ok(result);
    }
}
