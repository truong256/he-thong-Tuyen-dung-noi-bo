package com.example.auth_service.controller;

import com.example.auth_service.dto.CreateRequisitionRequest;
import com.example.auth_service.dto.RequisitionDraftRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.service.RequisitionService;
import jakarta.validation.Valid;
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
     * API tạo và gửi phê duyệt yêu cầu tuyển dụng chính thức.
     */
    @PostMapping
    public ResponseEntity<RequisitionResponse> createAndSubmit(
            @Valid @RequestBody CreateRequisitionRequest request
    ) {
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

    /**
     * API danh sách yêu cầu tuyển dụng có phân trang, lọc theo trạng thái, phòng ban và từ khóa.
     */
    @GetMapping
    public ResponseEntity<Page<RequisitionResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.clamp(size, 1, 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<RequisitionResponse> result = service.list(status, departmentId, keyword, pageable);
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
