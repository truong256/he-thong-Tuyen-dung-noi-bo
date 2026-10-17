package com.example.auth_service.controller;

import com.example.auth_service.dto.JobPostingPublicResponse;
import com.example.auth_service.dto.PublicJobDepartmentResponse;
import com.example.auth_service.service.JobPostingService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/public/job-postings")
public class PublicJobPostingController {

    private final JobPostingService jobPostingService;

    public PublicJobPostingController(JobPostingService jobPostingService) {
        this.jobPostingService = jobPostingService;
    }

    @GetMapping("/departments")
    public ResponseEntity<List<PublicJobDepartmentResponse>> getPublicDepartments() {
        return ResponseEntity.ok(jobPostingService.getPublicDepartments());
    }

    /**
     * GET /api/public/job-postings
     * SCRUM-150: API công khai trả danh sách tin tuyển dụng cho ứng viên.
     * Acceptance Criteria:
     * - Chỉ trả tin đang hiệu lực và chưa hết hạn.
     * - Tin bị gỡ không xuất hiện công khai.
     */
    @GetMapping
    public ResponseEntity<Page<JobPostingPublicResponse>> getPublicJobPostings(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String workingModel,
            @RequestParam(required = false) String workLocation,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "publishedAt,desc") String sort
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = (size <= 0 || size > 100) ? 10 : size;

        String[] sortParts = sort.split(",");
        String property = sortParts[0].trim();
        Sort.Direction direction = (sortParts.length > 1 && "asc".equalsIgnoreCase(sortParts[1].trim()))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, property));
        return ResponseEntity.ok(jobPostingService.getPublicJobPostings(
                departmentId, workingModel, workLocation, keyword, pageable
        ));
    }

    /**
     * GET /api/public/job-postings/{id}
     * SCRUM-150: Xem chi tiết tin tuyển dụng công khai.
     * Chỉ trả tin nếu đang PUBLISHED và chưa hết hạn.
     */
    @GetMapping("/{id}")
    public ResponseEntity<JobPostingPublicResponse> getPublicJobPostingDetail(@PathVariable Long id) {
        return ResponseEntity.ok(jobPostingService.getPublicJobPostingDetail(id));
    }
}
