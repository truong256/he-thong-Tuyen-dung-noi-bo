package com.example.auth_service.controller;

import com.example.auth_service.dto.LoginRequest;
import com.example.auth_service.dto.LoginResponse;
import com.example.auth_service.dto.UserSummaryDto;
import com.example.auth_service.exception.AccountLockedException;
import com.example.auth_service.exception.InvalidCredentialsException;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.security.JwtUtils;
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
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private AuthController authController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController).build();
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
    @DisplayName("API: POST /api/auth/login tài khoản bị khóa trả về 423 Locked")
    void testApiLoginLockedAccount() throws Exception {
        Instant lockedUntil = Instant.now().plus(15, ChronoUnit.MINUTES);
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new AccountLockedException("Tài khoản tạm thời bị khóa. Vui lòng thử lại sau.", lockedUntil));

        LoginRequest request = new LoginRequest("recruiter@company.com", "WrongPassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isLocked())
                .andExpect(jsonPath("$.message").value(containsString("Tài khoản tạm thời bị khóa")))
                .andExpect(jsonPath("$.lockedUntil").exists());
    }
}
