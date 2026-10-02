package com.example.auth_service.service;

import com.example.auth_service.dto.*;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.AccountLockedException;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.InvalidCredentialsException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.PasswordResetTokenRepository;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final long LOCK_DURATION_MINUTES = 15;
    public static final String GENERIC_ERROR_MESSAGE = "Email hoặc mật khẩu không chính xác.";
    private static final String DUMMY_BCRYPT_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5gWkox.wT/x8yKq13.zF31uR/hI2e";

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private RoleRepository roleRepository;
    private PasswordResetTokenRepository passwordResetTokenRepository;
    private MailService mailService;

    @Value("${jwt.refresh-token-expiration-ms:604800000}")
    private Long refreshTokenDurationMs = 604800000L;

    @Value("${jwt.password-reset-expiration-ms:1800000}")
    private Long passwordResetDurationMs = 1800000L;

    @Autowired
    public AuthService(RefreshTokenRepository refreshTokenRepository,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtils jwtUtils,
                       RoleRepository roleRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       MailService mailService) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
        this.roleRepository = roleRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.mailService = mailService;
    }

    public AuthService(RefreshTokenRepository refreshTokenRepository,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtils jwtUtils) {
        this(refreshTokenRepository, userRepository, passwordEncoder, jwtUtils, null, null, null);
    }

    @Transactional(noRollbackFor = { InvalidCredentialsException.class, AccountLockedException.class })
    public LoginResponse login(LoginRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new InvalidCredentialsException(GENERIC_ERROR_MESSAGE);
        }

        String email = request.getEmail().trim().toLowerCase();
        String password = request.getPassword();

        Optional<User> userOptional = userRepository.findByEmail(email)
                .or(() -> userRepository.findByUsername(email));

        if (userOptional.isEmpty()) {
            passwordEncoder.matches(password, DUMMY_BCRYPT_HASH);
            throw new InvalidCredentialsException(GENERIC_ERROR_MESSAGE);
        }

        User user = userOptional.get();

        if (user.getLockedUntil() != null) {
            if (Instant.now().isBefore(user.getLockedUntil())) {
                throw new AccountLockedException(user.getLockedUntil());
            } else {
                user.setLockedUntil(null);
                user.setFailedLoginAttempts(0);
                userRepository.saveAndFlush(user);
            }
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);

            if (attempts >= MAX_FAILED_ATTEMPTS) {
                Instant lockUntil = Instant.now().plus(Duration.ofMinutes(LOCK_DURATION_MINUTES));
                user.setLockedUntil(lockUntil);
                userRepository.saveAndFlush(user);
                throw new AccountLockedException(lockUntil);
            }

            userRepository.saveAndFlush(user);
            throw new InvalidCredentialsException(GENERIC_ERROR_MESSAGE);
        }

        if (user.getFailedLoginAttempts() > 0 || user.getLockedUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.saveAndFlush(user);
        }

        if ("LOCKED".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Tài khoản đã bị khóa bởi quản trị viên.");
        }
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản chưa được kích hoạt hoặc đã ngừng hoạt động.");
        }

        Set<String> roleNames = extractRoleNames(user);
        String accessToken = jwtUtils.generateAccessToken(user.getEmail(), roleNames);
        RefreshToken refreshToken = createRefreshToken(user);

        UserSummaryDto userSummary = new UserSummaryDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                roleNames,
                user.getStatus()
        );

        return new LoginResponse(
                "Đăng nhập thành công!",
                accessToken,
                refreshToken.getToken(),
                userSummary
        );
    }

    public User authenticate(String username, String password) {
        User user = userRepository.findByEmail(username)
                .or(() -> userRepository.findByUsername(username))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Tên đăng nhập hoặc mật khẩu không chính xác"
                ));

        String storedPassword = user.getPassword();
        boolean passwordMatches = storedPassword != null && passwordEncoder.matches(password, storedPassword);

        if (!passwordMatches) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Tên đăng nhập hoặc mật khẩu không chính xác"
            );
        }

        if ("LOCKED".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.LOCKED,
                    "Tài khoản đã bị khóa"
            );
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản chưa được kích hoạt hoặc đã bị khóa"
            );
        }

        return user;
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadRequestException("Email không được để trống.");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new BadRequestException("Mật khẩu phải có ít nhất 6 ký tự.");
        }

        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email đã được sử dụng.");
        }

        User user = new User(email, passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName() != null && !request.getFullName().isBlank() ? request.getFullName().trim() : email.split("@")[0]);
        user.setStatus("ACTIVE");

        RoleName assignedRole = RoleName.CANDIDATE;
        if (request.getRole() != null && !"CANDIDATE".equalsIgnoreCase(request.getRole().trim())) {
            throw new BadRequestException("Đăng ký công khai chỉ được tạo tài khoản ứng viên.");
        }

        if (roleRepository != null) {
            Role role = roleRepository.findByName(assignedRole)
                    .orElseGet(() -> roleRepository.save(new Role(RoleName.CANDIDATE, "Ứng viên")));
            user.setRoles(Set.of(role));
        } else {
            user.setRole(assignedRole.name());
        }

        userRepository.save(user);

        Set<String> roleNames = extractRoleNames(user);
        String accessToken = jwtUtils.generateAccessToken(user.getEmail(), roleNames);
        RefreshToken refreshToken = createRefreshToken(user);

        UserSummaryDto userSummary = new UserSummaryDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                roleNames,
                user.getStatus()
        );

        return new LoginResponse("Đăng ký thành công!", accessToken, refreshToken.getToken(), userSummary);
    }

    @Transactional
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        if (request == null || request.getRefreshToken() == null || request.getRefreshToken().isBlank()) {
            throw new BadRequestException("Refresh token không hợp lệ.");
        }

        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new BadRequestException("Refresh token không tồn tại."));

        if (refreshToken.isRevoked() || refreshToken.getExpiryDate().isBefore(Instant.now())) {
            throw new BadRequestException("Refresh token đã hết hạn hoặc bị thu hồi.");
        }

        User user = refreshToken.getUser();
        if (user == null || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản chưa được kích hoạt hoặc đã bị khóa.");
        }

        if (user.getLockedUntil() != null && Instant.now().isBefore(user.getLockedUntil())) {
            throw new AccountLockedException(user.getLockedUntil());
        }

        // Token rotation: revoke used refresh token to prevent replay
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        // Issue new token pair
        Set<String> roleNames = extractRoleNames(user);
        String newAccessToken = jwtUtils.generateAccessToken(user.getEmail(), roleNames);
        RefreshToken newRefreshToken = createRefreshToken(user);

        UserSummaryDto userSummary = new UserSummaryDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                roleNames,
                user.getStatus()
        );

        return new LoginResponse("Làm mới token thành công!", newAccessToken, newRefreshToken.getToken(), userSummary);
    }

    @Transactional
    public void logout(String refreshToken, String authenticatedEmail) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenRepository.findByToken(refreshToken).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            });
        }

        if (authenticatedEmail != null && !authenticatedEmail.isBlank()) {
            userRepository.findByEmail(authenticatedEmail)
                    .or(() -> userRepository.findByUsername(authenticatedEmail))
                    .ifPresent(user -> {
                        refreshTokenRepository.revokeAllByUser(user);
                    });
        }
    }

    @Transactional
    public void logout(String userEmail) {
        logout(null, userEmail);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh Token không hợp lệ"
            );
        }

        if (token.getExpiryDate() == null || token.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(token);
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh Token đã hết hạn. Vui lòng đăng nhập lại"
            );
        }

        User user = token.getUser();
        if (user == null || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            refreshTokenRepository.delete(token);
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản chưa được kích hoạt hoặc đã bị khóa"
            );
        }

        return token;
    }

    @Transactional
    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        String genericMessage = "Nếu email tồn tại, hướng dẫn khôi phục mật khẩu đã được gửi.";
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()) {
            return Map.of("message", genericMessage);
        }

        String email = request.getEmail().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String rawToken = UUID.randomUUID().toString();
            String tokenHash = hashToken(rawToken);

            if (passwordResetTokenRepository != null) {
                PasswordResetToken resetToken = passwordResetTokenRepository.findByUser(user)
                        .orElseGet(PasswordResetToken::new);
                resetToken.setUser(user);
                resetToken.setToken(tokenHash);
                resetToken.setExpiryDate(Instant.now().plusMillis(passwordResetDurationMs));
                resetToken.setUsed(false);
                passwordResetTokenRepository.save(resetToken);
            }

            if (mailService != null) {
                try {
                    mailService.sendPasswordResetEmail(user.getEmail(), rawToken);
                } catch (Exception ex) {
                    logger.warn("Could not deliver password reset email ({})", ex.getClass().getSimpleName());
                }
            }
        }

        return Map.of("message", genericMessage);
    }

    @Transactional
    public Map<String, String> resetPassword(ResetPasswordRequest request) {
        if (request == null || request.getToken() == null || request.getToken().isBlank()) {
            throw new BadRequestException("Mã token đặt lại mật khẩu không hợp lệ.");
        }
        if (!isValidPassword(request.getNewPassword())) {
            throw new BadRequestException("Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ cái và 1 chữ số.");
        }
        if (request.getConfirmPassword() != null && !request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp.");
        }

        if (passwordResetTokenRepository == null) {
            throw new BadRequestException("Dịch vụ đặt lại mật khẩu chưa khả dụng.");
        }

        String rawToken = request.getToken().trim();
        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(tokenHash)
                .or(() -> passwordResetTokenRepository.findByToken(rawToken))
                .orElseThrow(() -> new BadRequestException("Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng."));

        if (resetToken.isUsed() || resetToken.isExpired()) {
            throw new BadRequestException("Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        // Revoke all existing refresh sessions for this user on password reset
        refreshTokenRepository.revokeAllByUser(user);

        return Map.of("message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.");
    }

    @Transactional
    public Map<String, String> changePassword(String email, ChangePasswordRequest request) {
        if (request == null || request.getCurrentPassword() == null || request.getNewPassword() == null) {
            throw new BadRequestException("Thông tin đổi mật khẩu không hợp lệ.");
        }
        if (!isValidPassword(request.getNewPassword())) {
            throw new BadRequestException("Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ cái và 1 chữ số.");
        }
        if (request.getConfirmPassword() != null && !request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp.");
        }

        User user = userRepository.findByEmail(email)
                .or(() -> userRepository.findByUsername(email))
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại."));

        if ("LOCKED".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Tài khoản đã bị khóa.");
        }
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản chưa được kích hoạt hoặc đã bị khóa.");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Revoke all existing refresh sessions for this user on password change
        refreshTokenRepository.revokeAllByUser(user);

        return Map.of("message", "Đổi mật khẩu thành công.");
    }

    public static boolean isValidPassword(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        return hasLetter && hasDigit;
    }

    public static String hashToken(String rawToken) {
        if (rawToken == null) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    @Transactional(readOnly = true)
    public UserSummaryDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .or(() -> userRepository.findByUsername(email))
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại."));

        return new UserSummaryDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                extractRoleNames(user),
                user.getStatus()
        );
    }

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshTokenDurationMs));
        refreshToken.setRevoked(false);

        return refreshTokenRepository.save(refreshToken);
    }

    @Transactional
    public RefreshToken createRefreshToken(String identifier) {
        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + identifier));
        return createRefreshToken(user);
    }

    private Set<String> extractRoleNames(User user) {
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            return user.getRoles().stream()
                    .map(role -> role.getName().name())
                    .collect(Collectors.toSet());
        }
        return Set.of();
    }
}
