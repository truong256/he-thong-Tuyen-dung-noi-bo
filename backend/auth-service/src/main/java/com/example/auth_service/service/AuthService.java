package com.example.auth_service.service;

import com.example.auth_service.dto.LoginRequest;
import com.example.auth_service.dto.LoginResponse;
import com.example.auth_service.dto.UserSummaryDto;
import com.example.auth_service.entity.RefreshToken;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.AccountLockedException;
import com.example.auth_service.exception.InvalidCredentialsException;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final long LOCK_DURATION_MINUTES = 15;
    public static final String GENERIC_ERROR_MESSAGE = "Email hoặc mật khẩu không chính xác.";
    private static final String DUMMY_BCRYPT_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5gWkox.wT/x8yKq13.zF31uR/hI2e";

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @Value("${jwt.refresh-token-expiration-ms:604800000}")
    private Long refreshTokenDurationMs;

    public AuthService(RefreshTokenRepository refreshTokenRepository,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtils jwtUtils) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    @Transactional(noRollbackFor = { InvalidCredentialsException.class, AccountLockedException.class })
    public LoginResponse login(LoginRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new InvalidCredentialsException(GENERIC_ERROR_MESSAGE);
        }

        String email = request.getEmail().trim().toLowerCase();
        String password = request.getPassword();

        // Tìm user theo email hoặc username dự phòng
        Optional<User> userOptional = userRepository.findByEmail(email);
        if (userOptional.isEmpty()) {
            userOptional = userRepository.findByUsername(email);
        }

        if (userOptional.isEmpty()) {
            // Chạy hash giả lập để chống timing attack / user enumeration
            passwordEncoder.matches(password, DUMMY_BCRYPT_HASH);
            throw new InvalidCredentialsException(GENERIC_ERROR_MESSAGE);
        }

        User user = userOptional.get();

        // Kiểm tra xem tài khoản có đang bị khóa tạm thời hay không
        if (user.getLockedUntil() != null) {
            if (user.getLockedUntil().isAfter(Instant.now())) {
                throw new AccountLockedException("Tài khoản tạm thời bị khóa. Vui lòng thử lại sau.", user.getLockedUntil());
            } else {
                // Đã hết 15 phút khóa -> Cho phép đăng nhập lại, reset lock state
                user.setLockedUntil(null);
                user.setFailedLoginAttempts(0);
                userRepository.saveAndFlush(user);
            }
        }

        // Kiểm tra mật khẩu
        if (!passwordEncoder.matches(password, user.getPassword())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);

            if (attempts >= MAX_FAILED_ATTEMPTS) {
                Instant lockUntil = Instant.now().plus(Duration.ofMinutes(LOCK_DURATION_MINUTES));
                user.setLockedUntil(lockUntil);
                userRepository.saveAndFlush(user);
                throw new AccountLockedException("Tài khoản tạm thời bị khóa. Vui lòng thử lại sau.", lockUntil);
            }

            userRepository.saveAndFlush(user);
            throw new InvalidCredentialsException(GENERIC_ERROR_MESSAGE);
        }

        // Đăng nhập thành công -> Reset số lần thất bại và trạng thái khóa
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.saveAndFlush(user);


        // Tạo access token và refresh token
        String accessToken = jwtUtils.generateAccessToken(user.getEmail(), user.getRole());
        RefreshToken refreshToken = createRefreshToken(user);

        UserSummaryDto userSummary = new UserSummaryDto(user.getId(), user.getEmail(), user.getRole());

        return new LoginResponse(
                "Đăng nhập thành công!",
                accessToken,
                refreshToken.getToken(),
                userSummary
        );
    }

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        refreshTokenRepository.deleteByUser(user);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshTokenDurationMs));
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setRevoked(false);

        return refreshTokenRepository.save(refreshToken);
    }

    @Transactional
    public RefreshToken createRefreshToken(String identifier) {
        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        return createRefreshToken(user);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refresh token đã hết hạn!");
        }
        return token;
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken)
                .ifPresent(refreshTokenRepository::delete);
    }
}