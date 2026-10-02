package com.example.auth_service.security;

import com.example.auth_service.dto.LoginRequest;
import com.example.auth_service.dto.LoginResponse;
import com.example.auth_service.entity.RefreshToken;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class SessionHardeningIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User testUser;
    private final String rawPassword = "ValidPassword123@";

    @BeforeEach
    void setUp() {
        Role recruiterRole = roleRepository.findByName(RoleName.RECRUITER)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.RECRUITER, "Tuyển dụng viên")));

        testUser = new User("session-hardening@company.com", passwordEncoder.encode(rawPassword), "RECRUITER");
        testUser.setFullName("Session Test User");
        testUser.setStatus("ACTIVE");
        testUser.setTokenVersion(1);
        testUser.setRoles(Set.of(recruiterRole));
        testUser = userRepository.saveAndFlush(testUser);
    }

    @Test
    @DisplayName("TEST A & F: Đăng nhập -> Token hợp lệ (200), Logout -> Token cũ lập tức bị từ chối (401)")
    void testA_and_testF_logoutImmediatelyInvalidatesAccessToken() throws Exception {
        // 1. Authenticate via AuthService
        LoginResponse loginResponse = authService.login(new LoginRequest(testUser.getEmail(), rawPassword));
        String accessToken = loginResponse.getAccessToken();
        String refreshToken = loginResponse.getRefreshToken();

        assertNotNull(accessToken);
        assertNotNull(refreshToken);

        // 2. Call protected API with Access Token A -> must return 200 OK
        mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // 3. Perform logout with Bearer A and refreshToken
        mvc.perform(post("/api/auth/logout")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
                .andExpect(status().isOk());

        // 4. TEST F: Re-using the old Access Token A on protected API MUST return 401 Unauthorized
        mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());

        // 5. TEST D & E: Refresh token must be revoked in DB and cannot be used
        RefreshToken storedRefreshToken = refreshTokenRepository.findByToken(refreshToken).orElse(null);
        assertNotNull(storedRefreshToken);
        assertTrue(storedRefreshToken.isRevoked(), "Refresh token must be marked as revoked in database");

        mvc.perform(post("/api/auth/refresh-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Direct Token Version Mismatch: JWT với tokenVersion cũ bị từ chối 401")
    void testDirectTokenVersionMismatch_rejectedWith401() throws Exception {
        // Generate JWT with tokenVersion = 1
        String tokenV1 = jwtUtils.generateAccessToken(testUser.getEmail(), Set.of("RECRUITER"), 1);

        // Valid initially
        mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + tokenV1))
                .andExpect(status().isOk());

        // Increment tokenVersion in database to 2
        testUser.setTokenVersion(2);
        userRepository.saveAndFlush(testUser);

        // Request with tokenV1 must now return 401 Unauthorized
        mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + tokenV1))
                .andExpect(status().isUnauthorized());

        // Token generated with new version 2 must return 200 OK
        String tokenV2 = jwtUtils.generateAccessToken(testUser.getEmail(), Set.of("RECRUITER"), 2);
        mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + tokenV2))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("TEST D, E, F: Đổi mật khẩu thành công -> thu hồi session cũ, token/refresh token cũ bị từ chối, pass cũ FAIL, pass mới PASS")
    void testChangePassword_revokesCurrentSession_and_oldTokensRejected_and_newPasswordWorks() throws Exception {
        // 1. Authenticate with current rawPassword
        LoginResponse loginResponse = authService.login(new LoginRequest(testUser.getEmail(), rawPassword));
        String oldAccessToken = loginResponse.getAccessToken();
        String oldRefreshToken = loginResponse.getRefreshToken();

        assertNotNull(oldAccessToken);
        assertNotNull(oldRefreshToken);

        // Verify old token works initially on protected endpoint
        mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + oldAccessToken))
                .andExpect(status().isOk());

        // 2. TEST D: Perform Change Password via API
        String brandNewPassword = "BrandNewSecurePassword123@";
        Map<String, String> changePwdBody = Map.of(
                "currentPassword", rawPassword,
                "newPassword", brandNewPassword,
                "confirmPassword", brandNewPassword
        );

        mvc.perform(post("/api/auth/change-password")
                .header("Authorization", "Bearer " + oldAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(changePwdBody)))
                .andExpect(status().isOk());

        // 3. TEST E: Re-using the old Access Token on protected API MUST return 401 Unauthorized
        mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + oldAccessToken))
                .andExpect(status().isUnauthorized());

        // Refresh token cũ không tạo được access token mới (revoked / 400 Bad Request)
        mvc.perform(post("/api/auth/refresh-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("refreshToken", oldRefreshToken))))
                .andExpect(status().isBadRequest());

        // 4. TEST F: Đăng nhập bằng mật khẩu cũ -> Expected FAIL (401)
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(testUser.getEmail(), rawPassword))))
                .andExpect(status().isUnauthorized());

        // Đăng nhập bằng mật khẩu mới -> Expected PASS (200)
        String newLoginContent = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(testUser.getEmail(), brandNewPassword))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        LoginResponse newLoginResponse = objectMapper.readValue(newLoginContent, LoginResponse.class);
        assertNotNull(newLoginResponse.getAccessToken());
        assertNotNull(newLoginResponse.getRefreshToken());

        // New access token works on protected API
        mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + newLoginResponse.getAccessToken()))
                .andExpect(status().isOk());
    }
}
