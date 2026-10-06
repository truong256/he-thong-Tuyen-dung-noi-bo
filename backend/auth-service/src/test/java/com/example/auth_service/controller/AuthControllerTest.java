package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.exception.AccountLockedException;
import com.example.auth_service.exception.GlobalExceptionHandler;
import com.example.auth_service.exception.InvalidCredentialsException;
import com.example.auth_service.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @Mock
    private com.example.auth_service.service.AvatarService avatarService;

    @InjectMocks
    private AuthController authController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("API: POST /api/auth/login thành công trả về 200, tokens và user summary")
    void testApiLoginSuccess() throws Exception {
        LoginResponse mockResponse = new LoginResponse(
                "Đăng nhập thành công!",
                "access-token-xyz",
                "refresh-token-xyz",
                new UserSummaryDto(1L, "recruiter@company.com", "RECRUITER")
        );

        when(authService.login(any(LoginRequest.class))).thenReturn(mockResponse);

        LoginRequest request = new LoginRequest("recruiter@company.com", "Password123@");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đăng nhập thành công!"))
                .andExpect(jsonPath("$.accessToken").value("access-token-xyz"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token-xyz"))
                .andExpect(jsonPath("$.user.email").value("recruiter@company.com"))
                .andExpect(jsonPath("$.user.role").value("RECRUITER"));
    }

    @Test
    @DisplayName("API: POST /api/auth/login sai thông tin trả về 401 generic message")
    void testApiLoginInvalidCredentials() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new InvalidCredentialsException(AuthService.GENERIC_ERROR_MESSAGE));

        LoginRequest request = new LoginRequest("recruiter@company.com", "WrongPassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Email hoặc mật khẩu không chính xác."));
    }

    @Test
    @DisplayName("API: POST /api/auth/login sai thông tin trả về 401 kèm số lần thử còn lại")
    void testApiLoginInvalidCredentialsWithRemainingAttempts() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new InvalidCredentialsException(AuthService.GENERIC_ERROR_MESSAGE, 3));

        LoginRequest request = new LoginRequest("recruiter@company.com", "WrongPassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Email hoặc mật khẩu không chính xác. Bạn còn 3 lần thử trước khi tài khoản bị khóa."))
                .andExpect(jsonPath("$.remainingAttempts").value(3));
    }

    @Test
    @DisplayName("API: POST /api/auth/login tài khoản bị khóa trả về 423 Locked")
    void testApiLoginLockedAccount() throws Exception {
        Instant lockedUntil = Instant.now().plus(15, ChronoUnit.MINUTES);
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new AccountLockedException(lockedUntil));

        LoginRequest request = new LoginRequest("recruiter@company.com", "WrongPassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isLocked())
                .andExpect(jsonPath("$.message").value(containsString("Tài khoản tạm thời bị khóa")))
                .andExpect(jsonPath("$.lockedUntil").exists());
    }

    @Test
    @DisplayName("API: POST /api/auth/forgot-password trả về 200 generic message")
    void testApiForgotPassword() throws Exception {
        when(authService.forgotPassword(any(ForgotPasswordRequest.class)))
                .thenReturn(Map.of("message", "Nếu email tồn tại, hướng dẫn khôi phục mật khẩu đã được gửi."));

        ForgotPasswordRequest request = new ForgotPasswordRequest("user@company.com");

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Nếu email tồn tại, hướng dẫn khôi phục mật khẩu đã được gửi."));
    }

    @Test
    @DisplayName("API: POST /api/auth/reset-password trả về 200 khi thành công")
    void testApiResetPassword() throws Exception {
        when(authService.resetPassword(any(ResetPasswordRequest.class)))
                .thenReturn(Map.of("message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới."));

        ResetPasswordRequest request = new ResetPasswordRequest("token-123", "NewPassword123@", "NewPassword123@");

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(containsString("Đặt lại mật khẩu thành công")));
    }
}
