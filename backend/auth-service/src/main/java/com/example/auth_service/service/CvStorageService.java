package com.example.auth_service.service;

import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class CvStorageService {

    private static final Logger logger = LoggerFactory.getLogger(CvStorageService.class);

    public static final long DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    @Value("${app.upload.cv-dir:uploads/resumes}")
    private String cvDir;

    @Value("${app.upload.cv-max-size:10485760}")
    private long maxFileSize;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".pdf", ".doc", ".docx");

    public record StoredCv(String storedFileName, String originalFileName, long fileSize, String contentType) {}

    public StoredCv storeCv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn tệp CV.");
        }

        long limit = maxFileSize > 0 ? maxFileSize : DEFAULT_MAX_FILE_SIZE;
        if (file.getSize() > limit) {
            throw new BadRequestException("Dung lượng tệp CV không được vượt quá 10MB.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new BadRequestException("Tên tệp không hợp lệ.");
        }

        // 1. Validate extension
        String extension = "";
        int dotIdx = originalFilename.lastIndexOf('.');
        if (dotIdx != -1) {
            extension = originalFilename.substring(dotIdx).toLowerCase(Locale.ROOT);
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Chỉ chấp nhận tệp CV định dạng PDF, DOC hoặc DOCX.");
        }

        // 2. Validate MIME & Magic bytes
        validateFileContent(file, extension);

        // 3. Prepare secure destination path
        Path uploadPath = Paths.get(cvDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);

            // Sanitize original filename (remove path separators and non-standard characters)
            String rawBaseName = originalFilename.substring(0, dotIdx);
            String safeBaseName = rawBaseName.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (safeBaseName.length() > 60) {
                safeBaseName = safeBaseName.substring(0, 60);
            }
            String storedFileName = "cv_" + UUID.randomUUID() + "_" + safeBaseName + extension;

            Path targetFilePath = uploadPath.resolve(storedFileName).normalize();
            if (!targetFilePath.startsWith(uploadPath)) {
                throw new BadRequestException("Đường dẫn lưu tệp không an toàn.");
            }

            try (InputStream is = file.getInputStream()) {
                Files.copy(is, targetFilePath, StandardCopyOption.REPLACE_EXISTING);
            }

            logger.info("Successfully stored CV file {} as {}", originalFilename, storedFileName);

            return new StoredCv(
                    storedFileName,
                    originalFilename,
                    file.getSize(),
                    determineContentType(storedFileName)
            );
        } catch (IOException e) {
            logger.error("Failed to store CV file {}: {}", originalFilename, e.getMessage(), e);
            throw new RuntimeException("Không thể lưu trữ tệp CV: " + e.getMessage(), e);
        }
    }

    public Resource loadCvResource(String storedFileName) {
        if (storedFileName == null || storedFileName.isBlank()
                || storedFileName.contains("..")
                || storedFileName.contains("/")
                || storedFileName.contains("\\")) {
            throw new BadRequestException("Tên tệp CV không hợp lệ.");
        }

        Path uploadPath = Paths.get(cvDir).toAbsolutePath().normalize();
        Path filePath = uploadPath.resolve(storedFileName).normalize();

        if (!filePath.startsWith(uploadPath)) {
            throw new BadRequestException("Đường dẫn tệp không hợp lệ.");
        }

        if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
            throw new ResourceNotFoundException("Không tìm thấy tệp CV: " + storedFileName);
        }

        try {
            return new UrlResource(filePath.toUri());
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Lỗi truy xuất tệp CV: " + storedFileName);
        }
    }

    public String determineContentType(String fileName) {
        if (fileName == null) {
            return "application/octet-stream";
        }
        String lower = fileName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (lower.endsWith(".doc")) {
            return "application/msword";
        }
        if (lower.endsWith(".docx")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
        return "application/octet-stream";
    }

    private void validateFileContent(MultipartFile file, String extension) {
        byte[] header = new byte[8];
        int read;
        try (InputStream is = file.getInputStream()) {
            read = is.read(header);
        } catch (IOException e) {
            throw new BadRequestException("Không thể đọc nội dung tệp để kiểm tra tính hợp lệ.");
        }

        if (read < 4) {
            throw new BadRequestException("Tệp tải lên rỗng hoặc bị lỗi định dạng.");
        }

        if (".pdf".equals(extension)) {
            // PDF files start with %PDF- (0x25 0x50 0x44 0x46)
            if (header[0] != 0x25 || header[1] != 0x50 || header[2] != 0x44 || header[3] != 0x46) {
                throw new BadRequestException("Nội dung tệp không phải là tài liệu PDF hợp lệ.");
            }
        } else if (".doc".equals(extension)) {
            // DOC files (OLE2 compound document) start with D0 CF 11 E0 A1 B1 1A E1
            byte[] ole2Magic = new byte[]{(byte)0xD0, (byte)0xCF, 0x11, (byte)0xE0};
            if (header[0] != ole2Magic[0] || header[1] != ole2Magic[1] || header[2] != ole2Magic[2] || header[3] != ole2Magic[3]) {
                throw new BadRequestException("Nội dung tệp không phải là tài liệu DOC hợp lệ.");
            }
        } else if (".docx".equals(extension)) {
            // DOCX files (ZIP container) start with PK\x03\x04 (0x50 0x4B 0x03 0x04)
            if (header[0] != 0x50 || header[1] != 0x4B || header[2] != 0x03 || header[3] != 0x04) {
                throw new BadRequestException("Nội dung tệp không phải là tài liệu DOCX hợp lệ.");
            }
        }
    }
}
