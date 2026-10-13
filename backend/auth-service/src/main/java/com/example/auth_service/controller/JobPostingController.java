package com.example.auth_service.controller;

import com.example.auth_service.dto.JobPostingRequest;
import com.example.auth_service.dto.JobPostingResponse;
import com.example.auth_service.dto.JobPostingTemplateResponse;
import com.example.auth_service.service.JobPostingService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/**
 * Controller API quản lý tin tuyển dụng soạn từ yêu cầu đã duyệt (S3-09).
 */
@RestController
@RequestMapping("/api/job-postings")
public class JobPostingController {

    private final JobPostingService jobPostingService;

    public JobPostingController(JobPostingService jobPostingService) {
        this.jobPostingService = jobPostingService;
    }

    /**
     * Lấy dữ liệu khởi tạo tin tuyển dụng kế thừa từ yêu cầu tuyển dụng đã duyệt.
     */
    @GetMapping("/template")
    public ResponseEntity<JobPostingTemplateResponse> getTemplate(@RequestParam Long requisitionId) {
        JobPostingTemplateResponse template = jobPostingService.getTemplate(requisitionId);
        return ResponseEntity.ok(template);
    }

    @GetMapping("/template/{requisitionId}")
    public ResponseEntity<JobPostingTemplateResponse> getTemplateByPath(@PathVariable Long requisitionId) {
        JobPostingTemplateResponse template = jobPostingService.getTemplate(requisitionId);
        return ResponseEntity.ok(template);
    }

    /**
     * Tạo mới tin tuyển dụng (nháp hoặc nộp duyệt).
     * Yêu cầu nguồn phải ở trạng thái APPROVED.
     */
    @PostMapping
    public ResponseEntity<JobPostingResponse> create(@Valid @RequestBody JobPostingRequest request) {
        JobPostingResponse created = jobPostingService.create(request);
        return ResponseEntity.created(URI.create("/api/job-postings/" + created.id())).body(created);
    }

    /**
     * Cập nhật tin tuyển dụng hiện có.
     */
    @PutMapping("/{id}")
    public ResponseEntity<JobPostingResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody JobPostingRequest request
    ) {
        JobPostingResponse updated = jobPostingService.update(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Lấy chi tiết tin tuyển dụng theo ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<JobPostingResponse> getById(@PathVariable Long id) {
        JobPostingResponse response = jobPostingService.getById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy tin tuyển dụng gắn với yêu cầu tuyển dụng nguồn (nếu có).
     */
    @GetMapping("/by-requisition/{requisitionId}")
    public ResponseEntity<JobPostingResponse> getByRequisitionId(@PathVariable Long requisitionId) {
        return jobPostingService.getByRequisitionId(requisitionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * Danh sách tin tuyển dụng có phân trang, tìm kiếm và lọc.
     */
    @GetMapping
    public ResponseEntity<Page<JobPostingResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long requisitionId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.clamp(size, 1, 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<JobPostingResponse> result = jobPostingService.search(status, keyword, requisitionId, pageable);
        return ResponseEntity.ok(result);
    }
}
