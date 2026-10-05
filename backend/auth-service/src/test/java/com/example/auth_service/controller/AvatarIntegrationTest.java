package com.example.auth_service.controller;

import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AvatarIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;

    private User recruiter;
    private User interviewer;

    @BeforeEach
    void setUp() {
        recruiter = createUser("avatar-recruiter@test.com", RoleName.RECRUITER);
        interviewer = createUser("avatar-interviewer@test.com", RoleName.INTERVIEWER);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private User createUser(String email, RoleName... roleNames) {
        User user = new User(email, "hashedPassword");
        user.setFullName("User " + email);
        Set<Role> roleSet = Arrays.stream(roleNames)
                .map(rn -> roles.findByName(rn).orElseGet(() -> roles.save(new Role(rn, rn.name()))))
                .collect(Collectors.toSet());
        user.setRoles(roleSet);
        user.setStatus("ACTIVE");
        return users.saveAndFlush(user);
    }

    private String token(User user) {
        Set<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());
        return "Bearer " + jwt.generateAccessToken(user.getEmail(), roleNames, user.getTokenVersion());
    }

    private byte[] createTestImage(int width, int height, String format) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.CYAN);
        g.fillRect(0, 0, width, height);
        g.setColor(Color.BLACK);
        g.drawString("AVATAR", 10, height / 2);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, format, baos);
        return baos.toByteArray();
    }

    @Test
    @DisplayName("S2-03: POST /api/auth/avatar không có Authorization header bị chặn 401")
    void testUploadAvatar_unauthorized() throws Exception {
        byte[] imageBytes = createTestImage(200, 200, "jpg");
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", imageBytes);

        mvc.perform(multipart("/api/auth/avatar").file(file))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("S2-03: POST /api/auth/avatar thành công trả về 200, URLs ảnh và thumbnail, cập nhật vào /api/auth/me")
    void testUploadAvatar_success_andServe() throws Exception {
        byte[] imageBytes = createTestImage(400, 200, "jpg");
        MockMultipartFile file = new MockMultipartFile("file", "my-avatar.jpg", "image/jpeg", imageBytes);

        MvcResult result = mvc.perform(multipart("/api/auth/avatar")
                        .file(file)
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Tải lên ảnh đại diện thành công!"))
                .andExpect(jsonPath("$.avatarUrl").exists())
                .andExpect(jsonPath("$.thumbnailUrl").exists())
                .andReturn();

        JsonNode json = mapper.readTree(result.getResponse().getContentAsString());
        String avatarUrl = json.get("avatarUrl").asText();
        String thumbnailUrl = json.get("thumbnailUrl").asText();

        assertThat(avatarUrl).startsWith("/api/auth/avatar/");
        assertThat(thumbnailUrl).contains("_thumb");

        // 1. Phục vụ ảnh đại diện công khai /api/auth/avatar/{filename}
        mvc.perform(get(avatarUrl))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG));

        // 2. Phục vụ thumbnail /api/auth/avatar/{thumbFilename}
        mvc.perform(get(thumbnailUrl))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG));

        // 3. /api/auth/me trả về avatarUrl và avatarThumbnailUrl của người dùng đang đăng nhập
        mvc.perform(get("/api/auth/me").header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(avatarUrl))
                .andExpect(jsonPath("$.avatarThumbnailUrl").value(thumbnailUrl));

        // 4. Lấy avatar của chính mình qua GET /api/auth/avatar
        mvc.perform(get("/api/auth/avatar").header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG));

        // 5. Lấy thumbnail của chính mình qua GET /api/auth/avatar/thumbnail
        mvc.perform(get("/api/auth/avatar/thumbnail").header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG));
    }

    @Test
    @DisplayName("S2-03: POST /api/auth/avatar từ chối tệp vượt quá 2MB trả về 400")
    void testUploadAvatar_tooLarge_rejected() throws Exception {
        byte[] largeBytes = new byte[2 * 1024 * 1024 + 10];
        MockMultipartFile file = new MockMultipartFile("file", "large.jpg", "image/jpeg", largeBytes);

        mvc.perform(multipart("/api/auth/avatar")
                        .file(file)
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Dung lượng tệp không được vượt quá 2MB."));
    }

    @Test
    @DisplayName("S2-03: POST /api/auth/avatar từ chối định dạng không hợp lệ trả về 400")
    void testUploadAvatar_invalidFormat_rejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "document.pdf", "application/pdf", new byte[]{1, 2, 3});

        mvc.perform(multipart("/api/auth/avatar")
                        .file(file)
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Chỉ chấp nhận tệp hình ảnh định dạng JPG hoặc PNG."));
    }

    @Test
    @DisplayName("S2-03: POST /api/auth/profile/avatar (alias) hoạt động đồng nhất")
    void testUploadAvatar_profileAliasEndpoint() throws Exception {
        byte[] imageBytes = createTestImage(300, 300, "png");
        MockMultipartFile file = new MockMultipartFile("avatar", "profile.png", "image/png", imageBytes);

        mvc.perform(multipart("/api/auth/profile/avatar")
                        .file(file)
                        .header("Authorization", token(interviewer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").exists())
                .andExpect(jsonPath("$.thumbnailUrl").exists());
    }

    @Test
    @DisplayName("S2-03: DELETE /api/auth/avatar xóa ảnh đại diện thành công")
    void testDeleteAvatar_success() throws Exception {
        // Upload trước
        byte[] imageBytes = createTestImage(200, 200, "jpg");
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", imageBytes);
        mvc.perform(multipart("/api/auth/avatar").file(file).header("Authorization", token(recruiter)))
                .andExpect(status().isOk());

        // Xóa
        mvc.perform(delete("/api/auth/avatar").header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đã xóa ảnh đại diện thành công!"));

        // /api/auth/me không còn avatarUrl
        mvc.perform(get("/api/auth/me").header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());
    }
}
