package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CompanyProfile;
import com.example.auth_service.repository.CompanyProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.web.multipart.MultipartFile;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@Transactional
public class CompanyProfileService {

    private static final Logger logger = LoggerFactory.getLogger(CompanyProfileService.class);
    private final CompanyProfileRepository repository;

    @Value("${app.upload.company-dir:uploads/company}")
    private String companyDir;

    public CompanyProfileService(CompanyProfileRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public CompanyProfile getProfile() {
        List<CompanyProfile> all = repository.findAll();
        if (!all.isEmpty()) {
            return all.get(0);
        }
        // GET must not fabricate company facts or write inside a read-only PostgreSQL transaction.
        CompanyProfile profile = new CompanyProfile();
        profile.setCompanyName("Chưa cấu hình hồ sơ doanh nghiệp");
        profile.setCoreValues("[]");
        profile.setLegalRepresentative("{\"name\":\"\",\"title\":\"\"}");
        profile.setWorkPolicy("{\"standardWorkingHours\":\"\",\"workModel\":\"\",\"probationPeriod\":\"\",\"leaveDaysPerYear\":0,\"keyBenefits\":[]}");
        return profile;
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('HR_MANAGER')")
    public CompanyProfile updateProfile(CompanyProfile payload, String username) {
        CompanyProfile existing = getProfile();
        if (payload.getCompanyName() != null) existing.setCompanyName(payload.getCompanyName());
        if (payload.getShortName() != null) existing.setShortName(payload.getShortName());
        if (payload.getLegalName() != null) existing.setLegalName(payload.getLegalName());
        if (payload.getTaxCode() != null) existing.setTaxCode(payload.getTaxCode());
        if (payload.getBusinessLicense() != null) existing.setBusinessLicense(payload.getBusinessLicense());
        if (payload.getFoundedDate() != null) existing.setFoundedDate(payload.getFoundedDate());
        if (payload.getIndustry() != null) existing.setIndustry(payload.getIndustry());
        if (payload.getCompanySize() != null) existing.setCompanySize(payload.getCompanySize());
        if (payload.getEmail() != null) existing.setEmail(payload.getEmail());
        if (payload.getPhone() != null) existing.setPhone(payload.getPhone());
        if (payload.getWebsite() != null) existing.setWebsite(payload.getWebsite());
        if (payload.getAddress() != null) existing.setAddress(payload.getAddress());
        if (payload.getCity() != null) existing.setCity(payload.getCity());
        if (payload.getCountry() != null) existing.setCountry(payload.getCountry());
        if (payload.getDescription() != null) existing.setDescription(payload.getDescription());
        if (payload.getMission() != null) existing.setMission(payload.getMission());
        if (payload.getVision() != null) existing.setVision(payload.getVision());
        if (payload.getCoreValues() != null) existing.setCoreValues(payload.getCoreValues());
        if (payload.getLegalRepresentative() != null) existing.setLegalRepresentative(payload.getLegalRepresentative());
        if (payload.getWorkPolicy() != null) existing.setWorkPolicy(payload.getWorkPolicy());
        if (payload.getLogoUrl() != null) existing.setLogoUrl(payload.getLogoUrl());
        if (payload.getImageUrl() != null) existing.setImageUrl(payload.getImageUrl());

        existing.setUpdatedAt(Instant.now());
        existing.setUpdatedBy(username != null ? username : "Quản trị viên");
        return repository.save(existing);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('HR_MANAGER')")
    public CompanyProfile uploadLogo(MultipartFile file, String username) {
        String url = uploadFile(file, "logo_");
        CompanyProfile profile = getProfile();
        profile.setLogoUrl(url);
        profile.setUpdatedAt(Instant.now());
        profile.setUpdatedBy(username != null ? username : "Quản trị viên");
        return repository.save(profile);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('HR_MANAGER')")
    public CompanyProfile uploadImage(MultipartFile file, String username) {
        String url = uploadFile(file, "img_");
        CompanyProfile profile = getProfile();
        profile.setImageUrl(url);
        profile.setUpdatedAt(Instant.now());
        profile.setUpdatedBy(username != null ? username : "Quản trị viên");
        return repository.save(profile);
    }

    private String uploadFile(MultipartFile file, String prefix) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn tệp hình ảnh.");
        }
        if (file.getSize() > 5 * 1024 * 1024) { // 5MB limit
            throw new BadRequestException("Dung lượng tệp không được vượt quá 5MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/"))) {
            throw new BadRequestException("Chỉ chấp nhận tệp hình ảnh.");
        }

        try {
            Path uploadPath = Paths.get(companyDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.lastIndexOf('.') != -1) {
                extension = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
            }
            if (extension.isEmpty()) extension = ".jpg"; // fallback

            String filename = prefix + UUID.randomUUID().toString() + extension;
            Path filePath = uploadPath.resolve(filename);
            
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, filePath);
            }
            return "/api/organization/profile/images/" + filename;
        } catch (IOException e) {
            logger.error("Lỗi khi lưu tệp ảnh công ty: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể lưu tệp ảnh: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public Resource loadCompanyResource(String filename) {
        if (filename == null || filename.isBlank() || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new BadRequestException("Tên tệp không hợp lệ.");
        }

        Path uploadPath = Paths.get(companyDir).toAbsolutePath().normalize();
        Path filePath = uploadPath.resolve(filename).normalize();

        if (!filePath.startsWith(uploadPath)) {
            throw new BadRequestException("Đường dẫn tệp không hợp lệ.");
        }

        if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
            throw new ResourceNotFoundException("Không tìm thấy tệp ảnh: " + filename);
        }

        try {
            return new UrlResource(filePath.toUri());
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Không tìm thấy tệp ảnh: " + filename);
        }
    }
}
