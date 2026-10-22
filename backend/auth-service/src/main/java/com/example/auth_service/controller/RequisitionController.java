package com.example.auth_service.controller;

import com.example.auth_service.dto.CreateRequisitionRequest;
import com.example.auth_service.dto.RequisitionDraftRequest;
import com.example.auth_service.dto.RequisitionResponse;
import com.example.auth_service.service.RequisitionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;

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
     * API cập nhật và gửi phê duyệt yêu cầu tuyển dụng.
     * Hỗ trợ lưu nháp nếu payload truyền isDraft = true, ngược lại cập nhật và nộp phê duyệt.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RequisitionResponse> update(
            @PathVariable Long id,
            @RequestBody CreateRequisitionRequest request
    ) {
        if (Boolean.TRUE.equals(request.isDraft())) {
            RequisitionResponse updated = service.updateDraft(id, request.toDraftRequest());
            return ResponseEntity.ok(updated);
        }
        service.updateDraft(id, request.toDraftRequest());
        RequisitionResponse submitted = service.submitDraft(id);
        return ResponseEntity.ok(submitted);
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

    /**
     * API danh sách yêu cầu tuyển dụng có phân trang, lọc theo trạng thái, phòng ban, từ khóa, ngày tạo, recruiter, SLA.
     */
    @GetMapping
    public ResponseEntity<Page<RequisitionResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long recruiterId,
            @RequestParam(required = false) String sla,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        String effectiveKeyword = keyword != null && !keyword.trim().isEmpty()
                ? keyword.trim()
                : (search != null && !search.trim().isEmpty() ? search.trim() : null);

        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.clamp(size, 1, 100),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );
        Page<RequisitionResponse> result = service.list(
                status,
                departmentId,
                effectiveKeyword,
                fromDate,
                toDate,
                recruiterId,
                sla,
                pageable
        );
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

    /**
     * API tạm dừng yêu cầu tuyển dụng (S3-07).
     */
    @PostMapping("/{id}/hold")
    public ResponseEntity<RequisitionResponse> hold(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(service.hold(id, reason));
    }

    /**
     * API tiếp tục yêu cầu tuyển dụng đang tạm dừng (S3-07).
     */
    @PostMapping("/{id}/resume")
    public ResponseEntity<RequisitionResponse> resume(@PathVariable Long id) {
        return ResponseEntity.ok(service.resume(id));
    }

    /**
     * API đóng yêu cầu tuyển dụng (S3-07).
     */
    @PostMapping("/{id}/close")
    public ResponseEntity<RequisitionResponse> close(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(service.close(id, reason));
    }

    /**
     * API hủy yêu cầu tuyển dụng (S3-07).
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<RequisitionResponse> cancel(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(service.cancel(id, reason));
    }

    /**
     * API kiểm tra tóm tắt cảnh báo pipeline ứng viên trước khi đóng/hủy (SCRUM-135 / S3-07).
     */
    @GetMapping("/{id}/pipeline-summary")
    public ResponseEntity<com.example.auth_service.dto.PipelineSummaryResponse> getPipelineSummary(@PathVariable Long id) {
        return ResponseEntity.ok(service.getPipelineSummary(id));
    }

}



