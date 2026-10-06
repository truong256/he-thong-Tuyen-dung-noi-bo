package com.example.auth_service.service;

import com.example.auth_service.dto.AvatarUploadResponse;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.AccountLockedException;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AvatarServiceTest {

    private UserRepository userRepository;
    private AvatarService avatarService;

    @TempDir
    Path tempUploadDir;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        avatarService = new AvatarService(userRepository);
        avatarService.setAvatarDir(tempUploadDir.toString());
        avatarService.setThumbnailSize(150);
    }

    private byte[] createTestImageBytes(int width, int height, String format, boolean hasAlpha) throws IOException {
        int imageType = hasAlpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage image = new BufferedImage(width, height, imageType);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.BLUE);
        g.fillRect(0, 0, width, height);
        g.setColor(Color.RED);
        g.fillOval(width / 4, height / 4, width / 2, height / 2);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, format, baos);
        return baos.toByteArray();
    }

    @Test
    @DisplayName("Upload avatar thành công với ảnh JPG landscape (400x300) -> cắt vuông 300x300 và tạo thumbnail 150x150")
    void testUploadAvatar_jpgLandscape_success() throws Exception {
        User user = new User("recruiter@company.com", "hash", "RECRUITER");
        user.setId(10L);
        user.setFullName("Nguyễn Văn Recruiter");
        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));

        byte[] imageBytes = createTestImageBytes(400, 300, "jpg", false);
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", imageBytes);

        AvatarUploadResponse response = avatarService.uploadAvatar("recruiter@company.com", file);

        assertNotNull(response);
        assertEquals("Tải lên ảnh đại diện thành công!", response.getMessage());
        assertNotNull(response.getAvatarUrl());
        assertNotNull(response.getThumbnailUrl());
        assertTrue(response.getAvatarUrl().startsWith("/api/auth/avatar/user_10_"));
        assertTrue(response.getThumbnailUrl().contains("_thumb.jpg"));

        // Verify files on disk
        String avatarFileName = response.getAvatarUrl().replace("/api/auth/avatar/", "");
        String thumbFileName = response.getThumbnailUrl().replace("/api/auth/avatar/", "");

        File avatarFile = tempUploadDir.resolve(avatarFileName).toFile();
        File thumbFile = tempUploadDir.resolve(thumbFileName).toFile();

        assertTrue(avatarFile.exists());
        assertTrue(thumbFile.exists());

        BufferedImage savedAvatar = ImageIO.read(avatarFile);
        assertNotNull(savedAvatar);
        assertEquals(300, savedAvatar.getWidth());
        assertEquals(300, savedAvatar.getHeight()); // Square crop!

        BufferedImage savedThumb = ImageIO.read(thumbFile);
        assertNotNull(savedThumb);
        assertEquals(150, savedThumb.getWidth());
        assertEquals(150, savedThumb.getHeight()); // Thumbnail!

        assertEquals(response.getAvatarUrl(), user.getAvatarUrl());
        assertEquals(response.getThumbnailUrl(), user.getAvatarThumbnailUrl());
    }

    @Test
    @DisplayName("Upload avatar thành công với ảnh PNG portrait (200x400) có alpha -> cắt vuông 200x200 và thumbnail 150x150")
    void testUploadAvatar_pngPortrait_success() throws Exception {
        User user = new User("interviewer@company.com", "hash", "INTERVIEWER");
        user.setId(11L);
        when(userRepository.findByEmail("interviewer@company.com")).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));

        byte[] imageBytes = createTestImageBytes(200, 400, "png", true);
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", imageBytes);

        AvatarUploadResponse response = avatarService.uploadAvatar("interviewer@company.com", file);

        assertNotNull(response);
        assertTrue(response.getAvatarUrl().endsWith(".png"));
        assertTrue(response.getThumbnailUrl().endsWith("_thumb.png"));

        String avatarFileName = response.getAvatarUrl().replace("/api/auth/avatar/", "");
        String thumbFileName = response.getThumbnailUrl().replace("/api/auth/avatar/", "");

        BufferedImage savedAvatar = ImageIO.read(tempUploadDir.resolve(avatarFileName).toFile());
        assertEquals(200, savedAvatar.getWidth());
        assertEquals(200, savedAvatar.getHeight()); // Cắt vuông 200x200

        BufferedImage savedThumb = ImageIO.read(tempUploadDir.resolve(thumbFileName).toFile());
        assertEquals(150, savedThumb.getWidth());
        assertEquals(150, savedThumb.getHeight());
    }

    @Test
    @DisplayName("Upload avatar với ảnh nhỏ hơn kích thước thumbnail (100x100) -> thumbnail có size 100x100")
    void testUploadAvatar_smallImage_thumbnailBounded() throws Exception {
        User user = new User("admin@company.com", "hash", "ADMIN");
        user.setId(12L);
        when(userRepository.findByEmail("admin@company.com")).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));

        byte[] imageBytes = createTestImageBytes(100, 100, "jpg", false);
        MockMultipartFile file = new MockMultipartFile("file", "small.jpg", "image/jpeg", imageBytes);

        AvatarUploadResponse response = avatarService.uploadAvatar("admin@company.com", file);

        String thumbFileName = response.getThumbnailUrl().replace("/api/auth/avatar/", "");
        BufferedImage savedThumb = ImageIO.read(tempUploadDir.resolve(thumbFileName).toFile());
        assertEquals(100, savedThumb.getWidth());
        assertEquals(100, savedThumb.getHeight());
    }

    @Test
    @DisplayName("Upload avatar lần 2 xóa tệp ảnh cũ của người dùng")
    void testUploadAvatar_replacesOldFiles() throws Exception {
        User user = new User("user@company.com", "hash", "RECRUITER");
        user.setId(13L);
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));

        byte[] bytes1 = createTestImageBytes(200, 200, "jpg", false);
        MockMultipartFile file1 = new MockMultipartFile("file", "old.jpg", "image/jpeg", bytes1);
        AvatarUploadResponse res1 = avatarService.uploadAvatar("user@company.com", file1);

        String oldAvatarFile = res1.getAvatarUrl().replace("/api/auth/avatar/", "");
        String oldThumbFile = res1.getThumbnailUrl().replace("/api/auth/avatar/", "");
        assertTrue(tempUploadDir.resolve(oldAvatarFile).toFile().exists());

        byte[] bytes2 = createTestImageBytes(250, 250, "png", false);
        MockMultipartFile file2 = new MockMultipartFile("file", "new.png", "image/png", bytes2);
        AvatarUploadResponse res2 = avatarService.uploadAvatar("user@company.com", file2);

        // File cũ đã bị xóa
        assertFalse(tempUploadDir.resolve(oldAvatarFile).toFile().exists());
        assertFalse(tempUploadDir.resolve(oldThumbFile).toFile().exists());

        // File mới tồn tại
        String newAvatarFile = res2.getAvatarUrl().replace("/api/auth/avatar/", "");
        assertTrue(tempUploadDir.resolve(newAvatarFile).toFile().exists());
    }

    @Test
    @DisplayName("Upload avatar từ chối tệp rỗng hoặc null")
    void testUploadAvatar_emptyFile_rejected() {
        User user = new User("user@company.com", "hash", "RECRUITER");
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));

        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.jpg", "image/jpeg", new byte[0]);
        BadRequestException ex1 = assertThrows(BadRequestException.class,
                () -> avatarService.uploadAvatar("user@company.com", emptyFile));
        assertEquals("Vui lòng chọn tệp ảnh đại diện.", ex1.getMessage());

        BadRequestException ex2 = assertThrows(BadRequestException.class,
                () -> avatarService.uploadAvatar("user@company.com", null));
        assertEquals("Vui lòng chọn tệp ảnh đại diện.", ex2.getMessage());
    }

    @Test
    @DisplayName("Upload avatar từ chối tệp vượt quá 2MB")
    void testUploadAvatar_fileTooLarge_rejected() {
        User user = new User("user@company.com", "hash", "RECRUITER");
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));

        byte[] largeBytes = new byte[2 * 1024 * 1024 + 1]; // 2MB + 1 byte
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.jpg", "image/jpeg", largeBytes);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> avatarService.uploadAvatar("user@company.com", largeFile));
        assertEquals("Dung lượng tệp không được vượt quá 2MB.", ex.getMessage());
    }

    @Test
    @DisplayName("Upload avatar từ chối định dạng không phải JPG/PNG (GIF, PDF, TXT)")
    void testUploadAvatar_invalidFormat_rejected() {
        User user = new User("user@company.com", "hash", "RECRUITER");
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));

        MockMultipartFile gifFile = new MockMultipartFile("file", "photo.gif", "image/gif", new byte[]{1, 2, 3});
        BadRequestException exGif = assertThrows(BadRequestException.class,
                () -> avatarService.uploadAvatar("user@company.com", gifFile));
        assertEquals("Chỉ chấp nhận tệp hình ảnh định dạng JPG hoặc PNG.", exGif.getMessage());

        MockMultipartFile pdfFile = new MockMultipartFile("file", "doc.pdf", "application/pdf", new byte[]{1, 2, 3});
        BadRequestException exPdf = assertThrows(BadRequestException.class,
                () -> avatarService.uploadAvatar("user@company.com", pdfFile));
        assertEquals("Chỉ chấp nhận tệp hình ảnh định dạng JPG hoặc PNG.", exPdf.getMessage());
    }

    @Test
    @DisplayName("Upload avatar từ chối tệp giả mạo hoặc bị hỏng")
    void testUploadAvatar_corruptedImage_rejected() {
        User user = new User("user@company.com", "hash", "RECRUITER");
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));

        // Tên là .jpg nhưng nội dung byte không phải ảnh hợp lệ
        MockMultipartFile fakeJpg = new MockMultipartFile("file", "fake.jpg", "image/jpeg", "not an image content".getBytes());
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> avatarService.uploadAvatar("user@company.com", fakeJpg));
        assertEquals("Tệp tải lên không phải là ảnh hợp lệ hoặc đã bị lỗi.", ex.getMessage());
    }

    @Test
    @DisplayName("Upload avatar từ chối khi tài khoản đang bị khóa")
    void testUploadAvatar_accountLocked_rejected() throws Exception {
        User user = new User("user@company.com", "hash", "RECRUITER");
        user.setLockedUntil(Instant.now().plus(1, ChronoUnit.HOURS));
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));

        byte[] bytes = createTestImageBytes(100, 100, "jpg", false);
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", bytes);

        assertThrows(AccountLockedException.class, () -> avatarService.uploadAvatar("user@company.com", file));
    }

    @Test
    @DisplayName("Upload avatar từ chối khi tài khoản không ở trạng thái ACTIVE")
    void testUploadAvatar_accountInactive_rejected() throws Exception {
        User user = new User("user@company.com", "hash", "RECRUITER");
        user.setStatus("INACTIVE");
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));

        byte[] bytes = createTestImageBytes(100, 100, "jpg", false);
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", bytes);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> avatarService.uploadAvatar("user@company.com", file));
        assertEquals("Tài khoản chưa được kích hoạt hoặc đã bị khóa.", ex.getMessage());
    }

    @Test
    @DisplayName("Upload avatar báo 404 khi người dùng không tồn tại")
    void testUploadAvatar_userNotFound() {
        when(userRepository.findByEmail("unknown@company.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("unknown@company.com")).thenReturn(Optional.empty());

        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", new byte[]{1, 2, 3});
        assertThrows(ResourceNotFoundException.class,
                () -> avatarService.uploadAvatar("unknown@company.com", file));
    }

    @Test
    @DisplayName("loadAvatarResource tải tệp hợp lệ và chặn tấn công path traversal")
    void testLoadAvatarResource_andPathTraversal() throws Exception {
        byte[] bytes = createTestImageBytes(100, 100, "jpg", false);
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", bytes);
        User user = new User("user@company.com", "hash", "RECRUITER");
        user.setId(20L);
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));

        AvatarUploadResponse res = avatarService.uploadAvatar("user@company.com", file);
        String filename = res.getAvatarUrl().replace("/api/auth/avatar/", "");

        Resource resource = avatarService.loadAvatarResource(filename);
        assertNotNull(resource);
        assertTrue(resource.exists());

        // Path traversal attempts
        assertThrows(BadRequestException.class, () -> avatarService.loadAvatarResource("../../../etc/passwd"));
        assertThrows(BadRequestException.class, () -> avatarService.loadAvatarResource("folder/file.jpg"));
        assertThrows(BadRequestException.class, () -> avatarService.loadAvatarResource("folder\\file.jpg"));
        assertThrows(BadRequestException.class, () -> avatarService.loadAvatarResource(null));
        assertThrows(BadRequestException.class, () -> avatarService.loadAvatarResource("   "));

        // Non-existent file
        assertThrows(ResourceNotFoundException.class, () -> avatarService.loadAvatarResource("non_existent_file.jpg"));
    }

    @Test
    @DisplayName("loadCurrentUserAvatar tải ảnh hoặc thumbnail của người dùng hiện tại")
    void testLoadCurrentUserAvatar() throws Exception {
        User user = new User("user@company.com", "hash", "RECRUITER");
        user.setId(21L);
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));

        // Khi chưa có avatar
        assertThrows(ResourceNotFoundException.class, () -> avatarService.loadCurrentUserAvatar("user@company.com", false));

        // Upload avatar
        byte[] bytes = createTestImageBytes(120, 120, "png", true);
        MockMultipartFile file = new MockMultipartFile("file", "me.png", "image/png", bytes);
        avatarService.uploadAvatar("user@company.com", file);

        Resource avatarRes = avatarService.loadCurrentUserAvatar("user@company.com", false);
        assertNotNull(avatarRes);
        assertTrue(avatarRes.exists());

        Resource thumbRes = avatarService.loadCurrentUserAvatar("user@company.com", true);
        assertNotNull(thumbRes);
        assertTrue(thumbRes.exists());
    }

    @Test
    @DisplayName("deleteAvatar xóa tệp trên đĩa và cập nhật thông tin trong database")
    void testDeleteAvatar() throws Exception {
        User user = new User("user@company.com", "hash", "RECRUITER");
        user.setId(22L);
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));

        byte[] bytes = createTestImageBytes(120, 120, "jpg", false);
        MockMultipartFile file = new MockMultipartFile("file", "del.jpg", "image/jpeg", bytes);
        AvatarUploadResponse res = avatarService.uploadAvatar("user@company.com", file);

        String avatarFile = res.getAvatarUrl().replace("/api/auth/avatar/", "");
        String thumbFile = res.getThumbnailUrl().replace("/api/auth/avatar/", "");
        assertTrue(tempUploadDir.resolve(avatarFile).toFile().exists());

        avatarService.deleteAvatar("user@company.com");

        assertNull(user.getAvatarUrl());
        assertNull(user.getAvatarThumbnailUrl());
        assertFalse(tempUploadDir.resolve(avatarFile).toFile().exists());
        assertFalse(tempUploadDir.resolve(thumbFile).toFile().exists());
    }

    @Test
    @DisplayName("determineMediaType trả về MIME phù hợp với phần mở rộng tệp")
    void testDetermineMediaType() {
        assertEquals(MediaType.IMAGE_PNG, avatarService.determineMediaType("test.png"));
        assertEquals(MediaType.IMAGE_PNG, avatarService.determineMediaType("TEST.PNG"));
        assertEquals(MediaType.IMAGE_JPEG, avatarService.determineMediaType("test.jpg"));
        assertEquals(MediaType.IMAGE_JPEG, avatarService.determineMediaType("test.jpeg"));
        assertEquals(MediaType.IMAGE_JPEG, avatarService.determineMediaType("other.xyz"));
    }
}
