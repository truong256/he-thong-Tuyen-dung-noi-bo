package com.example.auth_service.service;

import com.example.auth_service.dto.*;
import com.example.auth_service.entity.PasswordResetToken;
import com.example.auth_service.entity.RefreshToken;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.AccountLockedException;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.InvalidCredentialsException;
import com.example.auth_service.repository.PasswordResetTokenRepository;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private MailService mailService;

    @Mock
    private JwtUtils jwtUtils;

    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    private final String rawPassword = "SecurePassword123@";
    private String encodedPassword;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        encodedPassword = passwordEncoder.encode(rawPassword);

        authService = new AuthService(refreshTokenRepository, userRepository, passwordEncoder, jwtUtils,
                roleRepository, passwordResetTokenRepository, mailService);
        ReflectionTestUtils.setField(authService, "refreshTokenDurationMs", 604800000L);
        ReflectionTestUtils.setField(authService, "passwordResetDurationMs", 1800000L);
    }

    @Test
    @DisplayName("Test 1: User tồn tại + password đúng -> 200, tokens exists, failed attempts reset")
    void test1_validLogin_success() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(3);

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));
        when(jwtUtils.generateAccessToken(eq("recruiter@company.com"), any(Set.class))).thenReturn("mock-access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LoginResponse response = authService.login(new LoginRequest("recruiter@company.com", rawPassword));

        assertNotNull(response);
        assertEquals("mock-access-token", response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertEquals("recruiter@company.com", response.getUser().getEmail());
        assertEquals("RECRUITER", response.getUser().getRole());
        assertEquals(0, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
        verify(userRepository, atLeastOnce()).saveAndFlush(user);
    }

    @Test
    @DisplayName("Test 2: Email tồn tại + password sai -> 401 generic message, failedAttempts = 1")
    void test2_invalidPassword_firstAttempt() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(0);

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));

        InvalidCredentialsException ex = assertThrows(InvalidCredentialsException.class, () ->
                authService.login(new LoginRequest("recruiter@company.com", "WrongPassword!")));

        assertEquals(AuthService.GENERIC_ERROR_MESSAGE, ex.getMessage());
        assertEquals(1, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
        verify(userRepository).saveAndFlush(user);
    }

    @Test
    @DisplayName("Test 3: Email không tồn tại -> 401 cùng generic message, không user enumeration")
    void test3_unknownEmail_genericMessage() {
        when(userRepository.findByEmail("ghost@company.com")).thenReturn(Optional.empty());

        InvalidCredentialsException ex = assertThrows(InvalidCredentialsException.class, () ->
                authService.login(new LoginRequest("ghost@company.com", "anyPassword")));

        assertEquals(AuthService.GENERIC_ERROR_MESSAGE, ex.getMessage());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("Test 4: Sai liên tiếp 5 lần -> khóa tài khoản 15 phút, ném AccountLockedException")
    void test4_fiveFailedAttempts_locksAccount() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(4); // Lần thứ 5 sẽ đạt 5

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));

        AccountLockedException ex = assertThrows(AccountLockedException.class, () ->
                authService.login(new LoginRequest("recruiter@company.com", "WrongFifthTime")));

        assertEquals(5, user.getFailedLoginAttempts());
        assertNotNull(user.getLockedUntil());
        assertTrue(user.getLockedUntil().isAfter(Instant.now().plus(Duration.ofMinutes(14))));
        verify(userRepository).saveAndFlush(user);
    }

    @Test
    @DisplayName("Test 5: Đang trong thời gian khóa -> chặn đăng nhập ngay cả khi nhập đúng password")
    void test5_duringLock_blocksLoginEvenIfPasswordCorrect() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(5);
        user.setLockedUntil(Instant.now().plus(Duration.ofMinutes(10)));

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));

        AccountLockedException ex = assertThrows(AccountLockedException.class, () ->
                authService.login(new LoginRequest("recruiter@company.com", rawPassword)));

        assertNotNull(ex.getLockedUntil());
        verify(jwtUtils, never()).generateAccessToken(any(), any(Set.class));
    }

    @Test
    @DisplayName("Test 6: Đang trong thời gian khóa -> chặn đăng nhập khi nhập sai password")
    void test6_duringLock_blocksLoginIfPasswordWrong() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(5);
        user.setLockedUntil(Instant.now().plus(Duration.ofMinutes(12)));

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));

        AccountLockedException ex = assertThrows(AccountLockedException.class, () ->
                authService.login(new LoginRequest("recruiter@company.com", "AnotherWrong")));

        assertNotNull(ex.getLockedUntil());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("Test 7: Lock hết hạn -> cho phép authenticate lại")
    void test7_lockExpired_allowedToLogin() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(5);
        user.setLockedUntil(Instant.now().minus(Duration.ofMinutes(1))); // Đã qua 15 phút

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));
        when(jwtUtils.generateAccessToken(eq("recruiter@company.com"), any(Set.class))).thenReturn("new-access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LoginResponse response = authService.login(new LoginRequest("recruiter@company.com", rawPassword));

        assertNotNull(response);
        assertEquals(0, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
    }

    @Test
    @DisplayName("Test 8: Login đúng sau các lần sai nhưng chưa đạt 5 -> reset failedLoginAttempts về 0")
    void test8_loginSuccessAfterFailures_resetsAttempts() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(2);

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));
        when(jwtUtils.generateAccessToken(eq("recruiter@company.com"), any(Set.class))).thenReturn("valid-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LoginResponse response = authService.login(new LoginRequest("recruiter@company.com", rawPassword));

        assertNotNull(response);
        assertEquals(0, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
        verify(userRepository, atLeastOnce()).saveAndFlush(user);
    }

    @Test
    @DisplayName("Test 9: Password lưu BCrypt, không plaintext, PasswordEncoder.matches = true")
    void test9_passwordStoredAsBCrypt() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");

        assertNotEquals(rawPassword, user.getPassword());
        assertTrue(user.getPassword().startsWith("$2a$") || user.getPassword().startsWith("$2b$"));
        assertTrue(passwordEncoder.matches(rawPassword, user.getPassword()));
        assertFalse(passwordEncoder.matches("WrongPassword", user.getPassword()));
    }

    @Test
    @DisplayName("Test 10: Forgot password luôn trả về thông báo chung bảo mật")
    void test10_forgotPassword_securityGenericMessage() {
        User user = new User("target@company.com", encodedPassword, "CANDIDATE");
        when(userRepository.findByEmail("target@company.com")).thenReturn(Optional.of(user));

        Map<String, String> response = authService.forgotPassword(new ForgotPasswordRequest("target@company.com"));

        assertNotNull(response.get("message"));
        verify(mailService, times(1)).sendPasswordResetEmail(eq("target@company.com"), anyString());
    }

    @Test
    @DisplayName("Test 11: Reset password thành công với token hợp lệ")
    void test11_resetPassword_success() {
        User user = new User("reset@company.com", encodedPassword, "CANDIDATE");
        PasswordResetToken token = new PasswordResetToken();
        token.setToken("valid-token");
        token.setUser(user);
        token.setExpiryDate(Instant.now().plus(Duration.ofMinutes(15)));
        token.setUsed(false);

        when(passwordResetTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(token));

        Map<String, String> response = authService.resetPassword(
                new ResetPasswordRequest("valid-token", "NewSecret123@", "NewSecret123@"));

        assertTrue(response.get("message").contains("thành công"));
        assertTrue(token.isUsed());
        assertTrue(passwordEncoder.matches("NewSecret123@", user.getPassword()));
    }

    @Test
    @DisplayName("Test 12: Đổi mật khẩu thành công khi nhập đúng mật khẩu cũ")
    void test12_changePassword_success() {
        User user = new User("user@company.com", encodedPassword, "RECRUITER");
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));

        Map<String, String> response = authService.changePassword("user@company.com",
                new ChangePasswordRequest(rawPassword, "BrandNewPassword123@", "BrandNewPassword123@"));

        assertTrue(response.get("message").contains("thành công"));
        assertTrue(passwordEncoder.matches("BrandNewPassword123@", user.getPassword()));
    }
}
