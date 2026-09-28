package com.example.auth_service.service;

import com.example.auth_service.entity.RefreshToken;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${jwt.refresh-expiration:604800000}")
    private long refreshTokenDurationMs;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository) {

        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    // =========================
    // 1. Xác thực đăng nhập
    // =========================
    public User authenticate(String username, String password) {

        User user = userRepository.findByUsername(username);

        // Không tìm thấy tài khoản
        if (user == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Tên đăng nhập hoặc mật khẩu không chính xác"
            );
        }

        // Kiểm tra mật khẩu
        String storedPassword = user.getPassword();

        boolean passwordMatches;

        if (storedPassword != null
                && storedPassword.startsWith("$2")) {

            // Mật khẩu đã được mã hóa BCrypt
            passwordMatches = passwordEncoder.matches(
                    password,
                    storedPassword
            );

        } else {

            // Hỗ trợ tài khoản cũ đang lưu mật khẩu dạng thường
            passwordMatches = storedPassword != null
                    && storedPassword.equals(password);

            // Nếu đúng mật khẩu thì mã hóa lại bằng BCrypt
            if (passwordMatches) {
                user.setPassword(
                        passwordEncoder.encode(password)
                );

                userRepository.save(user);
            }
        }

        if (!passwordMatches) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Tên đăng nhập hoặc mật khẩu không chính xác"
            );
        }

        // Kiểm tra trạng thái tài khoản
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản chưa được kích hoạt hoặc đã bị khóa"
            );
        }

        return user;
    }

    // =========================
    // 2. Tạo Refresh Token
    // =========================
    @Transactional
    public RefreshToken createRefreshToken(String username) {

        User user = userRepository.findByUsername(username);

        if (user == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy tài khoản"
            );
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản chưa được kích hoạt hoặc đã bị khóa"
            );
        }

        // Mỗi tài khoản chỉ giữ một Refresh Token
        refreshTokenRepository.deleteByUser(user);

        RefreshToken refreshToken = new RefreshToken();

        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(
                Instant.now().plusMillis(refreshTokenDurationMs)
        );

        return refreshTokenRepository.save(refreshToken);
    }

    // =========================
    // 3. Kiểm tra hạn Refresh Token
    // =========================
    public RefreshToken verifyExpiration(RefreshToken token) {

        if (token == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh Token không hợp lệ"
            );
        }

        if (token.getExpiryDate() == null
                || token.getExpiryDate().isBefore(Instant.now())) {

            refreshTokenRepository.delete(token);

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh Token đã hết hạn. Vui lòng đăng nhập lại"
            );
        }

        User user = token.getUser();

        if (user == null || !"ACTIVE".equals(user.getStatus())) {
            refreshTokenRepository.delete(token);

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản chưa được kích hoạt hoặc đã bị khóa"
            );
        }

        return token;
    }

    // =========================
    // 4. Đăng xuất
    // =========================
    public void logout(String token) {

        if (token == null || token.isBlank()) {
            return;
        }

       refreshTokenRepository.findByToken(token)
        .ifPresent(refreshToken ->
                refreshTokenRepository.delete(refreshToken));
    }
}