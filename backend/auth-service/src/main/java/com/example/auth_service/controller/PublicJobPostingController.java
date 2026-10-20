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

import com.example.auth_service.dto.PublicJobApplicationRequest;
import com.example.auth_service.dto.PublicJobApplicationResponse;
import com.example.auth_service.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;

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
     * GET /api/public/job-postings/locations
     * SCRUM-163: Danh sách địa điểm công khai từ các tin đang hiệu lực.
     */
    @GetMapping("/locations")
    public ResponseEntity<List<String>> getPublicLocations() {
        return ResponseEntity.ok(jobPostingService.getPublicLocations());
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
            @RequestParam(required = false, defaultValue = "false") Boolean includeExpired,
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
                departmentId, workingModel, workLocation, keyword, includeExpired, pageable
        ));
    }

    /**
     * GET /api/public/job-postings/{id}
     * S4-02 / SCRUM-155 / SCRUM-166: Xem chi tiết tin tuyển dụng công khai.
     * - Trả đúng mô tả công việc, yêu cầu, quyền lợi, hạn nộp cho tin được phép công khai.
     * - Trả trạng thái đủ để giao diện thay biểu mẫu bằng thông báo khi hết hạn.
     * - 404 cho tin không tồn tại, chưa xuất bản hoặc đã gỡ không lộ thông tin nội bộ.
     */
    @GetMapping("/{id}")
    public ResponseEntity<JobPostingPublicResponse> getPublicJobPostingDetail(@PathVariable Long id) {
        return ResponseEntity.ok(jobPostingService.getPublicJobPostingDetail(id));
    }

    /**
     * POST /api/public/job-postings/{id}/apply
     * S4-02 / SCRUM-166: Ứng viên nộp hồ sơ ứng tuyển.
     * Server chặn nộp hồ sơ khi tin đã hết hạn.
     */
    @PostMapping("/{id}/apply")
    public ResponseEntity<PublicJobApplicationResponse> applyJob(
            @PathVariable Long id,
            @Valid @RequestBody PublicJobApplicationRequest request,
            Authentication authentication
    ) {
        Long authenticatedUserId = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            authenticatedUserId = principal.getId();
        }
        return ResponseEntity.ok(jobPostingService.applyPublic(id, request, authenticatedUserId));
    }
}
