package com.example.auth_service.controller;

import com.example.auth_service.dto.CreateRequisitionRequest;
import com.example.auth_service.dto.RequisitionDraftRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.service.RequisitionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/requisitions")
public class RequisitionController {

    private final RequisitionService service;

    public RequisitionController(RequisitionService service) {
        this.service = service;
    }

    /**
     * API lưu mới bản nháp yêu cầu tuyển dụng.
     */
    @PostMapping("/draft")
    public ResponseEntity<RequisitionResponse> saveDraft(@RequestBody RequisitionDraftRequest request) {
        RequisitionResponse created = service.saveDraft(request);
        return ResponseEntity.created(URI.create("/api/requisitions/" + created.id())).body(created);
    }

    /**
     * API cập nhật bản nháp yêu cầu tuyển dụng đã lưu.
     */
    @PutMapping("/{id}/draft")
    public ResponseEntity<RequisitionResponse> updateDraft(
            @PathVariable Long id,
            @RequestBody RequisitionDraftRequest request
    ) {
        RequisitionResponse updated = service.updateDraft(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * API cập nhật yêu cầu tuyển dụng.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RequisitionResponse> update(
            @PathVariable Long id,
            @RequestBody CreateRequisitionRequest request
    ) {
        RequisitionResponse updated = service.updateDraft(id, request.toDraftRequest());
        return ResponseEntity.ok(updated);
    }

    /**
     * API tạo và gửi phê duyệt yêu cầu tuyển dụng chính thức.
     * Hỗ trợ lưu nháp nếu payload truyền isDraft = true.
     */
    @PostMapping
    public ResponseEntity<RequisitionResponse> createAndSubmit(
            @RequestBody CreateRequisitionRequest request
    ) {
        if (Boolean.TRUE.equals(request.isDraft())) {
            RequisitionResponse created = service.saveDraft(request.toDraftRequest());
            return ResponseEntity.created(URI.create("/api/requisitions/" + created.id())).body(created);
        }

        RequisitionResponse created = service.createAndSubmit(request);
        return ResponseEntity.created(URI.create("/api/requisitions/" + created.id())).body(created);
    }

    /**
     * API nộp phê duyệt từ một bản nháp hiện có.
     */
    @PostMapping("/{id}/submit")
    public ResponseEntity<RequisitionResponse> submitDraft(@PathVariable Long id) {
        RequisitionResponse submitted = service.submitDraft(id);
        return ResponseEntity.ok(submitted);
    }

    /**
     * API lấy chi tiết yêu cầu tuyển dụng theo ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<RequisitionResponse> getById(@PathVariable Long id) {
        RequisitionResponse requisition = service.getById(id);
        return ResponseEntity.ok(requisition);
    }

    private static final java.util.Set<String> ALLOWED_REQUISITION_SORT_FIELDS = java.util.Set.of(
            "createdAt", "title", "requisitionCode", "status", "quantity", "neededDate", "targetDate", "id"
    );

    /**
     * API danh sách yêu cầu tuyển dụng có phân trang, lọc theo trạng thái, phòng ban và từ khóa.
     */
    @GetMapping
    public ResponseEntity<Page<RequisitionResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortOrder
    ) {
        String effectiveKeyword = (search != null && !search.isBlank()) ? search : keyword;
        Pageable pageable = com.example.auth_service.util.PaginationUtils.createPageable(
                page, size, sortBy, sortOrder, "createdAt", Sort.Direction.DESC, ALLOWED_REQUISITION_SORT_FIELDS
        );
        Page<RequisitionResponse> result = service.list(status, departmentId, effectiveKeyword, pageable);
        return ResponseEntity.ok(result);
    }

    /**
     * API xóa bản nháp yêu cầu tuyển dụng.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
