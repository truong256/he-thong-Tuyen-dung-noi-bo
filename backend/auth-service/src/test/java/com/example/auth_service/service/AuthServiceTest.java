package com.example.auth_service.service;

import com.example.auth_service.dto.LoginRequest;
import com.example.auth_service.dto.LoginResponse;
import com.example.auth_service.entity.RefreshToken;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.AccountLockedException;
import com.example.auth_service.exception.InvalidCredentialsException;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

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
    private JwtUtils jwtUtils;

    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    private final String rawPassword = "SecurePassword123@";
    private String encodedPassword;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        encodedPassword = passwordEncoder.encode(rawPassword);

        authService = new AuthService(refreshTokenRepository, userRepository, passwordEncoder, jwtUtils);
        ReflectionTestUtils.setField(authService, "refreshTokenDurationMs", 604800000L);
    }

    @Test
    @DisplayName("Test 1: User tồn tại + password đúng -> 200, tokens exists, failed attempts reset")
    void test1_validLogin_success() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(3);

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));
        when(jwtUtils.generateAccessToken("recruiter@company.com", "RECRUITER")).thenReturn("mock-access-token");
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
        when(userRepository.findByEmail("nonexistent@company.com")).thenReturn(Optional.empty());

        InvalidCredentialsException ex = assertThrows(InvalidCredentialsException.class, () ->
                authService.login(new LoginRequest("nonexistent@company.com", rawPassword)));

        assertEquals(AuthService.GENERIC_ERROR_MESSAGE, ex.getMessage());
        verify(userRepository, never()).save(any());
        verify(jwtUtils, never()).generateAccessToken(any(), any());
    }

    @Test
    @DisplayName("Test 4: Sai lần thứ 4 -> chưa lock")
    void test4_fourthFailure_notLocked() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(3);

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));

        InvalidCredentialsException ex = assertThrows(InvalidCredentialsException.class, () ->
                authService.login(new LoginRequest("recruiter@company.com", "WrongPassword!")));

        assertEquals(AuthService.GENERIC_ERROR_MESSAGE, ex.getMessage());
        assertEquals(4, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
        verify(userRepository).saveAndFlush(user);
    }

    @Test
    @DisplayName("Test 5: Sai lần thứ 5 -> account temporarily locked ≈ now + 15 min")
    void test5_fifthFailure_accountLockedFor15Minutes() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(4);

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));

        AccountLockedException ex = assertThrows(AccountLockedException.class, () ->
                authService.login(new LoginRequest("recruiter@company.com", "WrongPassword!")));

        assertNotNull(ex.getLockedUntil());
        assertTrue(ex.getLockedUntil().isAfter(Instant.now().plus(Duration.ofMinutes(14))));
        assertEquals(5, user.getFailedLoginAttempts());
        assertNotNull(user.getLockedUntil());
        verify(userRepository).saveAndFlush(user);
    }

    @Test
    @DisplayName("Test 6: Đăng nhập khi đang lock -> reject không generate token")
    void test6_loginWhileLocked_rejected() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(5);
        user.setLockedUntil(Instant.now().plus(Duration.ofMinutes(10)));

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));

        AccountLockedException ex = assertThrows(AccountLockedException.class, () ->
                authService.login(new LoginRequest("recruiter@company.com", rawPassword)));

        assertNotNull(ex.getLockedUntil());
        verify(jwtUtils, never()).generateAccessToken(any(), any());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("Test 7: Lock hết hạn -> cho phép authenticate lại")
    void test7_lockExpired_allowedToLogin() {
        User user = new User("recruiter@company.com", encodedPassword, "RECRUITER");
        user.setFailedLoginAttempts(5);
        user.setLockedUntil(Instant.now().minus(Duration.ofMinutes(1))); // Đã qua 15 phút

        when(userRepository.findByEmail("recruiter@company.com")).thenReturn(Optional.of(user));
        when(jwtUtils.generateAccessToken("recruiter@company.com", "RECRUITER")).thenReturn("new-access-token");
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
        when(jwtUtils.generateAccessToken("recruiter@company.com", "RECRUITER")).thenReturn("valid-token");
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
}
