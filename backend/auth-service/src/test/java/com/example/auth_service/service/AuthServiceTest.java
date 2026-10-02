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
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

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
        when(jwtUtils.generateAccessToken(eq("recruiter@company.com"), any(Set.class), anyInt())).thenReturn("mock-access-token");
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
        assertEquals(4, ex.getRemainingAttempts());
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
        verify(jwtUtils, never()).generateAccessToken(any(), any(Set.class), anyInt());
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
        when(jwtUtils.generateAccessToken(eq("recruiter@company.com"), any(Set.class), anyInt())).thenReturn("new-access-token");
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
        when(jwtUtils.generateAccessToken(eq("recruiter@company.com"), any(Set.class), anyInt())).thenReturn("valid-token");
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
        when(userRepository.findByEmail("missing@company.com")).thenReturn(Optional.empty());

        Instant before = Instant.now();
        Map<String, String> response = authService.forgotPassword(new ForgotPasswordRequest("target@company.com"));
        Instant after = Instant.now();
        Map<String, String> missingResponse = authService.forgotPassword(new ForgotPasswordRequest("missing@company.com"));

        assertEquals(Map.of("message", "Nếu email tồn tại, hướng dẫn khôi phục mật khẩu đã được gửi."), response);
        assertEquals(response, missingResponse);
        ArgumentCaptor<String> rawToken = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<PasswordResetToken> storedToken = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(mailService).sendPasswordResetEmail(eq("target@company.com"), rawToken.capture());
        verify(passwordResetTokenRepository).save(storedToken.capture());
        assertEquals(AuthService.hashToken(rawToken.getValue()), storedToken.getValue().getToken());
        assertNotEquals(rawToken.getValue(), storedToken.getValue().getToken());
        assertFalse(storedToken.getValue().isUsed());
        assertFalse(storedToken.getValue().getExpiryDate().isBefore(before.plus(Duration.ofMinutes(30))));
        assertFalse(storedToken.getValue().getExpiryDate().isAfter(after.plus(Duration.ofMinutes(30))));
        verify(passwordResetTokenRepository, never()).findByUser(argThat(candidate -> candidate != user));
        verifyNoMoreInteractions(mailService);
    }

    @Test
    @DisplayName("Test 11: Reset password thành công với token hợp lệ và password policy")
    void test11_resetPassword_success() {
        User user = new User("reset@company.com", encodedPassword, "CANDIDATE");
        String rawToken = "valid-token-xyz";
        String hashedToken = AuthService.hashToken(rawToken);
        PasswordResetToken token = new PasswordResetToken();
        token.setToken(hashedToken);
        token.setUser(user);
        token.setExpiryDate(Instant.now().plus(Duration.ofMinutes(15)));
        token.setUsed(false);

        when(passwordResetTokenRepository.findByToken(hashedToken)).thenReturn(Optional.of(token));

        Map<String, String> response = authService.resetPassword(
                new ResetPasswordRequest(rawToken, "NewSecret123@", "NewSecret123@"));

        assertTrue(response.get("message").contains("thành công"));
        assertTrue(token.isUsed());
        assertTrue(passwordEncoder.matches("NewSecret123@", user.getPassword()));
        verify(refreshTokenRepository).revokeAllByUser(user);

        String passwordAfterReset = user.getPassword();
        BadRequestException replay = assertThrows(BadRequestException.class, () ->
                authService.resetPassword(new ResetPasswordRequest(rawToken, "OtherSecret123@", "OtherSecret123@")));
        assertTrue(replay.getMessage().contains("hết hạn hoặc đã được sử dụng"));
        assertEquals(passwordAfterReset, user.getPassword());
        verify(userRepository, times(1)).save(user);
        verify(passwordResetTokenRepository, times(1)).save(token);
        verify(refreshTokenRepository, times(1)).revokeAllByUser(user);
    }

    @Test
    @DisplayName("S1-03: Token hết hạn sau 30 phút không đổi mật khẩu hay thu hồi phiên")
    void resetPassword_expiredAfterThirtyMinutes_rejectedWithoutSideEffects() {
        User user = new User("expired@company.com", encodedPassword, "CANDIDATE");
        String rawToken = "expired-reset-token";
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setToken(AuthService.hashToken(rawToken));
        Instant issuedAt = Instant.now().minus(Duration.ofMinutes(30)).minusSeconds(1);
        token.setExpiryDate(issuedAt.plus(Duration.ofMinutes(30)));
        token.setUsed(false);
        when(passwordResetTokenRepository.findByToken(token.getToken())).thenReturn(Optional.of(token));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                authService.resetPassword(new ResetPasswordRequest(rawToken, "NewSecret123@", "NewSecret123@")));

        assertTrue(ex.getMessage().contains("hết hạn hoặc đã được sử dụng"));
        assertEquals(encodedPassword, user.getPassword());
        assertFalse(token.isUsed());
        verify(userRepository, never()).save(any(User.class));
        verify(passwordResetTokenRepository, never()).save(any(PasswordResetToken.class));
        verifyNoInteractions(refreshTokenRepository, mailService, jwtUtils);
    }

    @Test
    @DisplayName("S1-03: SMTP lỗi vẫn trả cùng thông báo với email không tồn tại, không lộ token")
    void forgotPassword_mailFailure_keepsGenericResponse() {
        User user = new User("mail-failure@company.com", encodedPassword, "CANDIDATE");
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(userRepository.findByEmail("missing@company.com")).thenReturn(Optional.empty());
        doThrow(new RuntimeException("SMTP unavailable"))
                .when(mailService).sendPasswordResetEmail(eq(user.getEmail()), anyString());

        Map<String, String> failedDelivery = authService.forgotPassword(new ForgotPasswordRequest(user.getEmail()));
        Map<String, String> missingEmail = authService.forgotPassword(new ForgotPasswordRequest("missing@company.com"));

        assertEquals(missingEmail, failedDelivery);
        assertEquals(Set.of("message"), failedDelivery.keySet());
        verify(mailService, times(1)).sendPasswordResetEmail(eq(user.getEmail()), anyString());
        verify(passwordResetTokenRepository, times(1)).save(any(PasswordResetToken.class));
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
        verify(refreshTokenRepository).revokeAllByUser(user);
    }

    @Test
    @DisplayName("Test 13: Login chặn tài khoản INACTIVE ngay cả khi đúng password")
    void test13_login_inactiveAccount_rejected() {
        User user = new User("inactive@company.com", encodedPassword, "RECRUITER");
        user.setStatus("INACTIVE");
        when(userRepository.findByEmail("inactive@company.com")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                authService.login(new LoginRequest("inactive@company.com", rawPassword)));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verifyNoInteractions(jwtUtils);
    }

    @Test
    @DisplayName("Test 14: Login chặn tài khoản LOCKED bởi quản trị viên")
    void test14_login_lockedAccount_rejected() {
        User user = new User("locked@company.com", encodedPassword, "RECRUITER");
        user.setStatus("LOCKED");
        when(userRepository.findByEmail("locked@company.com")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                authService.login(new LoginRequest("locked@company.com", rawPassword)));

        assertEquals(HttpStatus.LOCKED, ex.getStatusCode());
        verifyNoInteractions(jwtUtils);
    }

    @Test
    @DisplayName("Test 15: Authenticate không cho phép fallback plaintext password")
    void test15_authenticate_noPlaintextFallback() {
        User user = new User("legacy@company.com", "PlaintextPassword123", "RECRUITER");
        when(userRepository.findByEmail("legacy@company.com")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                authService.authenticate("legacy@company.com", "PlaintextPassword123"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    @DisplayName("Test 16: Refresh token hợp lệ trả về token mới và thu hồi token cũ (rotation)")
    void test16_refreshToken_valid_rotatesToken() {
        User user = new User("refresh@company.com", encodedPassword, "RECRUITER");
        RefreshToken oldToken = new RefreshToken();
        oldToken.setToken("old-refresh-token");
        oldToken.setUser(user);
        oldToken.setExpiryDate(Instant.now().plus(Duration.ofDays(7)));
        oldToken.setRevoked(false);

        when(refreshTokenRepository.findByToken("old-refresh-token")).thenReturn(Optional.of(oldToken));
        when(jwtUtils.generateAccessToken(eq("refresh@company.com"), any(Set.class), anyInt())).thenReturn("brand-new-access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LoginResponse response = authService.refreshToken(new RefreshTokenRequest("old-refresh-token"));

        assertNotNull(response);
        assertEquals("brand-new-access-token", response.getAccessToken());
        assertNotEquals("old-refresh-token", response.getRefreshToken());
        assertTrue(oldToken.isRevoked());
    }

    @Test
    @DisplayName("Test 17: Refresh token hết hạn bị từ chối")
    void test17_refreshToken_expired_rejected() {
        User user = new User("refresh@company.com", encodedPassword, "RECRUITER");
        RefreshToken expiredToken = new RefreshToken();
        expiredToken.setToken("expired-token");
        expiredToken.setUser(user);
        expiredToken.setExpiryDate(Instant.now().minus(Duration.ofMinutes(1)));
        expiredToken.setRevoked(false);

        when(refreshTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(expiredToken));

        assertThrows(BadRequestException.class, () ->
                authService.refreshToken(new RefreshTokenRequest("expired-token")));
    }

    @Test
    @DisplayName("Test 18: Refresh token đã bị thu hồi bị từ chối")
    void test18_refreshToken_revoked_rejected() {
        User user = new User("refresh@company.com", encodedPassword, "RECRUITER");
        RefreshToken revokedToken = new RefreshToken();
        revokedToken.setToken("revoked-token");
        revokedToken.setUser(user);
        revokedToken.setExpiryDate(Instant.now().plus(Duration.ofDays(7)));
        revokedToken.setRevoked(true);

        when(refreshTokenRepository.findByToken("revoked-token")).thenReturn(Optional.of(revokedToken));

        assertThrows(BadRequestException.class, () ->
                authService.refreshToken(new RefreshTokenRequest("revoked-token")));
    }

    @Test
    @DisplayName("Test 19: Refresh token cho user LOCKED/INACTIVE bị thu hồi và từ chối")
    void test19_refreshToken_lockedUser_rejected() {
        User user = new User("locked@company.com", encodedPassword, "RECRUITER");
        user.setStatus("LOCKED");
        RefreshToken token = new RefreshToken();
        token.setToken("token-for-locked");
        token.setUser(user);
        token.setExpiryDate(Instant.now().plus(Duration.ofDays(7)));
        token.setRevoked(false);

        when(refreshTokenRepository.findByToken("token-for-locked")).thenReturn(Optional.of(token));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                authService.refreshToken(new RefreshTokenRequest("token-for-locked")));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(token.isRevoked());
    }

    @Test
    @DisplayName("Test 20: Logout bằng refreshToken thu hồi đúng session đó và tăng token version")
    void test20_logout_byRefreshToken_revokesSession() {
        User user = new User("logout@company.com", encodedPassword, "RECRUITER");
        user.setTokenVersion(1);
        RefreshToken token = new RefreshToken();
        token.setToken("logout-session-token");
        token.setUser(user);
        token.setRevoked(false);

        when(refreshTokenRepository.findByToken("logout-session-token")).thenReturn(Optional.of(token));

        authService.logout("logout-session-token", null);

        assertTrue(token.isRevoked());
        verify(refreshTokenRepository).save(token);
        assertEquals(2, user.getTokenVersion());
        verify(userRepository).save(user);
        verify(refreshTokenRepository).revokeAllByUser(user);
    }

    @Test
    @DisplayName("Test 21: Logout tài khoản đã xác thực thu hồi tất cả phiên của tài khoản đó và tăng token version")
    void test21_logout_authenticatedUser_revokesAllSessions() {
        User user = new User("auth@company.com", encodedPassword, "RECRUITER");
        user.setTokenVersion(1);
        when(userRepository.findByEmail("auth@company.com")).thenReturn(Optional.of(user));

        authService.logout(null, "auth@company.com");

        assertEquals(2, user.getTokenVersion());
        verify(userRepository).save(user);
        verify(refreshTokenRepository).revokeAllByUser(user);
    }

    @Test
    @DisplayName("Test 22: Reset password từ chối mật khẩu không tuân thủ policy >= 8, chữ và số")
    void test22_resetPassword_policyViolation_rejected() {
        // 12345678 -> FAIL (không có chữ)
        BadRequestException ex1 = assertThrows(BadRequestException.class, () ->
                authService.resetPassword(new ResetPasswordRequest("token", "12345678", "12345678")));
        assertTrue(ex1.getMessage().contains("tối thiểu 8 ký tự"));

        // abcdefgh -> FAIL (không có số)
        BadRequestException ex2 = assertThrows(BadRequestException.class, () ->
                authService.resetPassword(new ResetPasswordRequest("token", "abcdefgh", "abcdefgh")));
        assertTrue(ex2.getMessage().contains("tối thiểu 8 ký tự"));

        // abc12 -> FAIL (ngắn hơn 8)
        BadRequestException ex3 = assertThrows(BadRequestException.class, () ->
                authService.resetPassword(new ResetPasswordRequest("token", "abc12", "abc12")));
        assertTrue(ex3.getMessage().contains("tối thiểu 8 ký tự"));
    }

    @Test
    @DisplayName("Test 23: Reset password từ chối token đã qua sử dụng")
    void test23_resetPassword_alreadyUsedToken_rejected() {
        User user = new User("used@company.com", encodedPassword, "CANDIDATE");
        String rawToken = "already-used-token";
        String hashedToken = AuthService.hashToken(rawToken);

        PasswordResetToken token = new PasswordResetToken();
        token.setToken(hashedToken);
        token.setUser(user);
        token.setExpiryDate(Instant.now().plus(Duration.ofMinutes(15)));
        token.setUsed(true); // Đã sử dụng

        when(passwordResetTokenRepository.findByToken(hashedToken)).thenReturn(Optional.of(token));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                authService.resetPassword(new ResetPasswordRequest(rawToken, "ValidPassword1@", "ValidPassword1@")));

        assertTrue(ex.getMessage().contains("hết hạn hoặc đã được sử dụng"));
    }

    @Test
    @DisplayName("Test 24: Change password từ chối mật khẩu không tuân thủ policy >= 8, chữ và số")
    void test24_changePassword_policyViolation_rejected() {
        // 12345678 -> FAIL
        BadRequestException ex1 = assertThrows(BadRequestException.class, () ->
                authService.changePassword("user@company.com",
                        new ChangePasswordRequest(rawPassword, "12345678", "12345678")));
        assertTrue(ex1.getMessage().contains("tối thiểu 8 ký tự"));

        // abcdefgh -> FAIL
        BadRequestException ex2 = assertThrows(BadRequestException.class, () ->
                authService.changePassword("user@company.com",
                        new ChangePasswordRequest(rawPassword, "abcdefgh", "abcdefgh")));
        assertTrue(ex2.getMessage().contains("tối thiểu 8 ký tự"));
    }

    @Test
    @DisplayName("Test 25: Change password từ chối khi nhập sai mật khẩu hiện tại")
    void test25_changePassword_wrongCurrentPassword_rejected() {
        User user = new User("user@company.com", encodedPassword, "RECRUITER");
        when(userRepository.findByEmail("user@company.com")).thenReturn(Optional.of(user));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                authService.changePassword("user@company.com",
                        new ChangePasswordRequest("WrongCurrent123", "ValidNewPass123@", "ValidNewPass123@")));

        assertTrue(ex.getMessage().contains("Mật khẩu hiện tại không chính xác"));
    }

    @Test
    @DisplayName("Test 26: Change password từ chối tài khoản LOCKED hoặc INACTIVE")
    void test26_changePassword_lockedOrInactive_rejected() {
        User lockedUser = new User("locked@company.com", encodedPassword, "RECRUITER");
        lockedUser.setStatus("LOCKED");
        when(userRepository.findByEmail("locked@company.com")).thenReturn(Optional.of(lockedUser));

        ResponseStatusException ex1 = assertThrows(ResponseStatusException.class, () ->
                authService.changePassword("locked@company.com",
                        new ChangePasswordRequest(rawPassword, "ValidNewPass123@", "ValidNewPass123@")));
        assertEquals(HttpStatus.LOCKED, ex1.getStatusCode());

        User inactiveUser = new User("inactive@company.com", encodedPassword, "RECRUITER");
        inactiveUser.setStatus("INACTIVE");
        when(userRepository.findByEmail("inactive@company.com")).thenReturn(Optional.of(inactiveUser));

        ResponseStatusException ex2 = assertThrows(ResponseStatusException.class, () ->
                authService.changePassword("inactive@company.com",
                        new ChangePasswordRequest(rawPassword, "ValidNewPass123@", "ValidNewPass123@")));
        assertEquals(HttpStatus.FORBIDDEN, ex2.getStatusCode());
    }

    @Test
    @DisplayName("Test 27: Password policy validator xác minh chính xác ví dụ đề bài")
    void test27_passwordPolicy_examples() {
        assertFalse(AuthService.isValidPassword("12345678")); // FAIL
        assertFalse(AuthService.isValidPassword("abcdefgh")); // FAIL
        assertTrue(AuthService.isValidPassword("abc12345"));  // PASS
    }
}
