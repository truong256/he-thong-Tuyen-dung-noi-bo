package com.example.auth_service.service;

import com.example.auth_service.dto.AvatarUploadResponse;
import com.example.auth_service.dto.UserSummaryDto;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.AccountLockedException;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AvatarService {

    private static final Logger logger = LoggerFactory.getLogger(AvatarService.class);
    public static final long MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    private final UserRepository userRepository;

    @Value("${app.upload.avatar-dir:uploads/avatars}")
    private String avatarDir;

    @Value("${app.upload.thumbnail-size:150}")
    private int thumbnailSize;

    public AvatarService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public void setAvatarDir(String avatarDir) {
        this.avatarDir = avatarDir;
    }

    public void setThumbnailSize(int thumbnailSize) {
        this.thumbnailSize = thumbnailSize;
    }

    @Transactional
    @PreAuthorize("hasAuthority('PROFILE_UPDATE')")
    public AvatarUploadResponse uploadAvatar(String email, MultipartFile file) {
        User user = userRepository.findByEmail(email)
                .or(() -> userRepository.findByUsername(email))
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại."));

        if (!user.isAccountNonLocked()) {
            throw new AccountLockedException(user.getLockedUntil());
        }
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BadRequestException("Tài khoản chưa được kích hoạt hoặc đã bị khóa.");
        }

        // 1. Kiểm tra tệp rỗng / null
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn tệp ảnh đại diện.");
        }

        // 2. Kiểm tra dung lượng tối đa 2MB
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("Dung lượng tệp không được vượt quá 2MB.");
        }

        // 3. Kiểm tra loại tệp JPG và PNG (Content-Type & Extension)
        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();

        boolean isJpegMime = contentType != null && (
                contentType.equalsIgnoreCase("image/jpeg") ||
                contentType.equalsIgnoreCase("image/jpg") ||
                contentType.equalsIgnoreCase("image/pjpeg")
        );
        boolean isPngMime = contentType != null && (
                contentType.equalsIgnoreCase("image/png") ||
                contentType.equalsIgnoreCase("image/x-png")
        );

        String extension = "";
        if (originalFilename != null && originalFilename.lastIndexOf('.') != -1) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
        }
        boolean isJpegExt = extension.equals(".jpg") || extension.equals(".jpeg");
        boolean isPngExt = extension.equals(".png");

        if (!((isJpegMime || isJpegExt) || (isPngMime || isPngExt))) {
            throw new BadRequestException("Chỉ chấp nhận tệp hình ảnh định dạng JPG hoặc PNG.");
        }

        // 4. Giải mã và kiểm tra tính hợp lệ của ảnh
        BufferedImage originalImage;
        try (InputStream inputStream = file.getInputStream()) {
            originalImage = ImageIO.read(inputStream);
        } catch (IOException e) {
            throw new BadRequestException("Không thể đọc tệp hình ảnh: " + e.getMessage());
        }

        if (originalImage == null) {
            throw new BadRequestException("Tệp tải lên không phải là ảnh hợp lệ hoặc đã bị lỗi.");
        }

        int width = originalImage.getWidth();
        int height = originalImage.getHeight();
        if (width <= 0 || height <= 0) {
            throw new BadRequestException("Kích thước ảnh không hợp lệ.");
        }

        // 5. Cắt vuông ở giữa ảnh (Center crop to square)
        int size = Math.min(width, height);
        int x = (width - size) / 2;
        int y = (height - size) / 2;

        BufferedImage croppedSub = originalImage.getSubimage(x, y, size, size);

        boolean hasAlpha = originalImage.getColorModel().hasAlpha();
        boolean isPng = isPngMime || isPngExt || hasAlpha;
        int imageType = isPng ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;

        BufferedImage squareImage = new BufferedImage(size, size, imageType);
        Graphics2D g2 = squareImage.createGraphics();
        if (!isPng) {
            g2.setColor(Color.WHITE);
            g2.fillRect(0, 0, size, size);
        }
        g2.drawImage(croppedSub, 0, 0, null);
        g2.dispose();

        // 6. Tạo thumbnail từ ảnh đã cắt vuông
        int targetThumbSize = Math.min(thumbnailSize > 0 ? thumbnailSize : 150, size);
        BufferedImage thumbImage = new BufferedImage(targetThumbSize, targetThumbSize, imageType);
        Graphics2D gThumb = thumbImage.createGraphics();
        if (!isPng) {
            gThumb.setColor(Color.WHITE);
            gThumb.fillRect(0, 0, targetThumbSize, targetThumbSize);
        }
        gThumb.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        gThumb.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        gThumb.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        gThumb.drawImage(squareImage, 0, 0, targetThumbSize, targetThumbSize, null);
        gThumb.dispose();

        // 7. Lưu ảnh vuông và thumbnail vào thư mục lưu trữ
        Path uploadPath = Paths.get(avatarDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);

            String formatName = isPng ? "png" : "jpg";
            String fileExt = isPng ? ".png" : ".jpg";
            String baseName = "user_" + user.getId() + "_" + UUID.randomUUID().toString();
            String avatarFileName = baseName + fileExt;
            String thumbFileName = baseName + "_thumb" + fileExt;

            Path avatarPath = uploadPath.resolve(avatarFileName);
            Path thumbPath = uploadPath.resolve(thumbFileName);

            ImageIO.write(squareImage, formatName, avatarPath.toFile());
            ImageIO.write(thumbImage, formatName, thumbPath.toFile());

            // Xóa ảnh cũ nếu có
            deleteOldAvatarFiles(uploadPath, user.getAvatarUrl(), user.getAvatarThumbnailUrl());

            // 8. Cập nhật URL ảnh và thumbnail vào hồ sơ người dùng
            String avatarUrl = "/api/auth/avatar/" + avatarFileName;
            String thumbnailUrl = "/api/auth/avatar/" + thumbFileName;

            user.setAvatarUrl(avatarUrl);
            user.setAvatarThumbnailUrl(thumbnailUrl);
            user.setUpdatedAt(Instant.now());
            User saved = userRepository.saveAndFlush(user);

            UserSummaryDto userSummary = mapToSummary(saved);

            return AvatarUploadResponse.builder()
                    .message("Tải lên ảnh đại diện thành công!")
                    .avatarUrl(avatarUrl)
                    .thumbnailUrl(thumbnailUrl)
                    .avatarThumbnailUrl(thumbnailUrl)
                    .user(userSummary)
                    .build();

        } catch (IOException e) {
            logger.error("Lỗi khi lưu tệp ảnh đại diện cho người dùng {}: {}", email, e.getMessage(), e);
            throw new RuntimeException("Không thể lưu tệp ảnh đại diện: " + e.getMessage(), e);
        }
    }

    public Resource loadAvatarResource(String filename) {
        if (filename == null || filename.isBlank() || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new BadRequestException("Tên tệp không hợp lệ.");
        }

        Path uploadPath = Paths.get(avatarDir).toAbsolutePath().normalize();
        Path filePath = uploadPath.resolve(filename).normalize();

        if (!filePath.startsWith(uploadPath)) {
            throw new BadRequestException("Đường dẫn tệp không hợp lệ.");
        }

        if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
            throw new ResourceNotFoundException("Không tìm thấy ảnh đại diện: " + filename);
        }

        try {
            return new UrlResource(filePath.toUri());
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Không tìm thấy ảnh đại diện: " + filename);
        }
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('PROFILE_READ')")
    public Resource loadCurrentUserAvatar(String email, boolean thumbnail) {
        User user = userRepository.findByEmail(email)
                .or(() -> userRepository.findByUsername(email))
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại."));

        String url = thumbnail ? user.getAvatarThumbnailUrl() : user.getAvatarUrl();
        if (url == null || url.isBlank()) {
            throw new ResourceNotFoundException("Người dùng chưa có ảnh đại diện.");
        }

        String filename = url.substring(url.lastIndexOf('/') + 1);
        return loadAvatarResource(filename);
    }

    @Transactional
    @PreAuthorize("hasAuthority('PROFILE_UPDATE')")
    public void deleteAvatar(String email) {
        User user = userRepository.findByEmail(email)
                .or(() -> userRepository.findByUsername(email))
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại."));

        Path uploadPath = Paths.get(avatarDir).toAbsolutePath().normalize();
        deleteOldAvatarFiles(uploadPath, user.getAvatarUrl(), user.getAvatarThumbnailUrl());

        user.setAvatarUrl(null);
        user.setAvatarThumbnailUrl(null);
        user.setUpdatedAt(Instant.now());
        userRepository.saveAndFlush(user);
    }

    public MediaType determineMediaType(String filename) {
        if (filename != null && filename.toLowerCase().endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        return MediaType.IMAGE_JPEG;
    }

    private void deleteOldAvatarFiles(Path uploadPath, String oldAvatarUrl, String oldThumbUrl) {
        try {
            if (oldAvatarUrl != null && oldAvatarUrl.contains("/api/auth/avatar/")) {
                String oldFilename = oldAvatarUrl.substring(oldAvatarUrl.lastIndexOf('/') + 1);
                Path oldFile = uploadPath.resolve(oldFilename).normalize();
                if (oldFile.startsWith(uploadPath)) {
                    Files.deleteIfExists(oldFile);
                }
            }
            if (oldThumbUrl != null && oldThumbUrl.contains("/api/auth/avatar/")) {
                String oldThumbFilename = oldThumbUrl.substring(oldThumbUrl.lastIndexOf('/') + 1);
                Path oldThumbFile = uploadPath.resolve(oldThumbFilename).normalize();
                if (oldThumbFile.startsWith(uploadPath)) {
                    Files.deleteIfExists(oldThumbFile);
                }
            }
        } catch (IOException e) {
            logger.warn("Không thể xóa tệp ảnh cũ: {}", e.getMessage());
        }
    }

    private UserSummaryDto mapToSummary(User user) {
        Set<String> roleNames = user.getRoles() != null && !user.getRoles().isEmpty()
                ? user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toSet())
                : Set.of();

        UserSummaryDto dto = new UserSummaryDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getDisplayName(),
                user.getDepartment(),
                roleNames,
                user.getStatus()
        );
        dto.setMustChangePassword(user.isMustChangePassword());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setAvatarThumbnailUrl(user.getAvatarThumbnailUrl());
        return dto;
    }
}
