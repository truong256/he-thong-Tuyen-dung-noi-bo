package com.example.auth_service.controller;

import com.example.auth_service.dto.RequisitionRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.RecruitmentRequisitionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/recruitment-requests")
public class RecruitmentRequisitionController {

    private final RecruitmentRequisitionService service;
    private final UserRepository userRepository;

    public RecruitmentRequisitionController(
            RecruitmentRequisitionService service,
            UserRepository userRepository
    ) {
        this.service = service;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<RequisitionResponse> create(
            @Valid @RequestBody RequisitionRequest request,
            Authentication authentication
    ) {
        User currentUser = getCurrentUser(authentication);
        RequisitionResponse created = service.create(request, currentUser);
        return ResponseEntity.created(URI.create("/api/requisitions/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RequisitionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RequisitionRequest request,
            Authentication authentication
    ) {
        User currentUser = getCurrentUser(authentication);
        RequisitionResponse updated = service.update(id, request, currentUser);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<RequisitionResponse> submit(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User currentUser = getCurrentUser(authentication);
        RequisitionResponse submitted = service.submit(id, currentUser);
        return ResponseEntity.ok(submitted);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequisitionResponse> get(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User currentUser = getCurrentUser(authentication);
        RequisitionResponse response = service.get(id, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Page<RequisitionResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long jobTitleId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        User currentUser = getCurrentUser(authentication);
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.clamp(size, 1, 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<RequisitionResponse> response = service.list(
                search, departmentId, jobTitleId, status, currentUser, pageable
        );
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User currentUser = getCurrentUser(authentication);
        service.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            throw new BadRequestException("Vui lòng đăng nhập để truy cập chức năng này.");
        }
        if (authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userRepository.findById(principal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản đăng nhập."));
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản đăng nhập."));
    }
}
