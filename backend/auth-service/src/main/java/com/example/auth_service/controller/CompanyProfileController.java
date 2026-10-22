package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.CompanyProfile;
import com.example.auth_service.repository.*;
import com.example.auth_service.service.CompanyProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/organization")
public class CompanyProfileController {

    private final CompanyProfileService profileService;
    private final DepartmentRepository departmentRepository;
    private final JobTitleRepository jobTitleRepository;
    private final UserRepository userRepository;
    private final CommonCategoryRepository categoryRepository;
    private final InterviewQuestionRepository questionRepository;

    public CompanyProfileController(
            CompanyProfileService profileService,
            DepartmentRepository departmentRepository,
            JobTitleRepository jobTitleRepository,
            UserRepository userRepository,
            CommonCategoryRepository categoryRepository,
            InterviewQuestionRepository questionRepository
    ) {
        this.profileService = profileService;
        this.departmentRepository = departmentRepository;
        this.jobTitleRepository = jobTitleRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.questionRepository = questionRepository;
    }

    @GetMapping("/profile")
    public CompanyProfile getProfile() {
        return profileService.getProfile();
    }

    @PutMapping("/profile")
    public ResponseEntity<CompanyProfile> updateProfile(
            @RequestBody CompanyProfile payload,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : "Quản trị viên";
        CompanyProfile updated = profileService.updateProfile(payload, username);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        Map<String, Object> stats = new HashMap<>();
        long deptCount = departmentRepository.count();
        long activeDepts = departmentRepository.findAll().stream().filter(d -> d != null && d.isActive()).count();
        long totalEmp = userRepository.count();
        long jobTitleCount = jobTitleRepository.count();
        long userCount = userRepository.count();
        long categoryCount = categoryRepository.count();
        long questionCount = questionRepository.count();

        stats.put("totalDepartments", deptCount);
        stats.put("activeDepartments", activeDepts);
        stats.put("totalEmployees", totalEmp);
        stats.put("totalJobTitles", jobTitleCount);
        stats.put("totalUsers", userCount);
        stats.put("totalCategories", categoryCount);
        stats.put("totalQuestions", questionCount);
        stats.put("totalLocations", 3); // 1 HQ + 2 branches
        stats.put("headcountFulfillmentRate", 94.2);
        stats.put("openRequisitionsCount", jobTitleRepository.count());

        return ResponseEntity.ok(stats);
    }

    @PostMapping("/profile/logo")
    public ResponseEntity<CompanyProfile> uploadLogo(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : "Quản trị viên";
        CompanyProfile updated = profileService.uploadLogo(file, username);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/profile/image")
    public ResponseEntity<CompanyProfile> uploadImage(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : "Quản trị viên";
        CompanyProfile updated = profileService.uploadImage(file, username);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/profile/images/{filename:.+}")
    public ResponseEntity<Resource> serveImage(@PathVariable String filename) {
        Resource file = profileService.loadCompanyResource(filename);
        String contentType = "image/jpeg";
        if (filename.toLowerCase().endsWith(".png")) {
            contentType = "image/png";
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFilename() + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(file);
    }
}
