package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.CandidateReferralService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller: CandidateReferralController (Sprint 4 / S4-07 / SCRUM-184)
 * REST API giới thiệu ứng viên nội bộ và tra cứu hồ sơ:
 * - POST /api/referrals: Nộp hồ sơ giới thiệu người quen
 * - GET  /api/referrals/my-referrals: Danh sách hồ sơ do chính mình giới thiệu
 * - GET  /api/referrals/{id}: Chi tiết hồ sơ giới thiệu
 * - GET  /api/referrals: Quản lý danh sách toàn bộ hồ sơ referral (HR/Admin/Recruiter)
 * - PATCH /api/referrals/{id}/status: Cập nhật trạng thái tổng quát
 * - GET  /api/referrals/active-positions: Danh sách vị trí đang tuyển
 */
@RestController
@RequestMapping("/api/referrals")
public class CandidateReferralController {

    private final CandidateReferralService referralService;

    public CandidateReferralController(CandidateReferralService referralService) {
        this.referralService = referralService;
    }

    /**
     * Nộp hồ sơ giới thiệu ứng viên nội bộ.
     * Người giới thiệu được xác thực tự động từ JWT/Session (UserPrincipal).
     */
    @PostMapping
    public ResponseEntity<ReferralResponse> submitReferral(
            @Valid @RequestBody ReferralCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ReferralResponse response = referralService.submitReferral(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Tra cứu danh sách hồ sơ do chính người dùng hiện tại giới thiệu.
     */
    @GetMapping("/my-referrals")
    public ResponseEntity<Page<ReferralResponse>> getMyReferrals(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Pageable pageable = createPageable(page, size, sort);
        return ResponseEntity.ok(referralService.getMyReferrals(keyword, status, pageable, principal));
    }

    /**
     * Tra cứu chi tiết một hồ sơ đã giới thiệu.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ReferralResponse> getReferralDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(referralService.getReferralDetail(id, principal));
    }

    /**
     * Tra cứu toàn bộ hồ sơ giới thiệu (Dành cho HR Manager, Admin, Recruiter).
     */
    @GetMapping
    public ResponseEntity<Page<ReferralResponse>> getAllReferrals(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long referrerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Pageable pageable = createPageable(page, size, sort);
        return ResponseEntity.ok(referralService.getAllReferrals(keyword, status, referrerId, pageable, principal));
    }

    /**
     * Cập nhật trạng thái tổng quát hồ sơ giới thiệu.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ReferralResponse> updateGeneralStatus(
            @PathVariable Long id,
            @Valid @RequestBody ReferralStatusUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(referralService.updateGeneralStatus(id, request, principal));
    }

    /**
     * Danh sách vị trí đang tuyển để hiển thị trong form chọn giới thiệu.
     */
    @GetMapping("/active-positions")
    public ResponseEntity<List<ReferralActivePositionResponse>> getActivePositions() {
        return ResponseEntity.ok(referralService.getActivePositions());
    }

    private Pageable createPageable(int page, int size, String sort) {
        int safePage = Math.max(page, 0);
        int safeSize = (size <= 0 || size > 100) ? 10 : size;

        String[] sortParts = sort.split(",");
        String property = sortParts[0].trim();
        Sort.Direction direction = (sortParts.length > 1 && "asc".equalsIgnoreCase(sortParts[1].trim()))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        return PageRequest.of(safePage, safeSize, Sort.by(direction, property));
    }
}
