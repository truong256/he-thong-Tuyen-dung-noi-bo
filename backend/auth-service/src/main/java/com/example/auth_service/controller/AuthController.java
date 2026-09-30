package com.example.auth_service.controller;

import com.example.auth_service.entity.RefreshToken;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import com.example.auth_service.service.AuthService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtils jwtUtils;
    private final AuthService authService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public AuthController(
            JwtUtils jwtUtils,
            AuthService authService,
            RefreshTokenRepository refreshTokenRepository,
            UserRepository userRepository) {

        this.jwtUtils = jwtUtils;
        this.authService = authService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
    }

    // ==================================================
    // REGISTER
    // ==================================================

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(
            @RequestBody Map<String, String> request) {

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Đăng ký thành công!"
                )
        );
    }

    // ==================================================
    // LOGIN
    // ==================================================

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(
            @RequestBody Map<String, String> request) {

        String username = request.get("username");
        String password = request.get("password");

        if (username == null || username.isBlank()
                || password == null || password.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Username và password không được để trống"
            );
        }

        // Kiểm tra thông tin đăng nhập
        User user = authService.authenticate(
                username,
                password
        );

        String accessToken =
                jwtUtils.generateAccessToken(
                        user.getUsername()
                );

        RefreshToken refreshToken =
                authService.createRefreshToken(
                        user.getUsername()
                );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Đăng nhập thành công!",

                        "accessToken",
                        accessToken,

                        "refreshToken",
                        refreshToken.getToken()
                )
        );
    }

    // ==================================================
    // REFRESH TOKEN
    // ==================================================

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(
            @RequestBody Map<String, String> request) {

        String requestRefreshToken =
                request.get("refreshToken");

        if (requestRefreshToken == null
                || requestRefreshToken.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "RefreshToken không được trống!"
            );
        }

        return refreshTokenRepository
                .findByToken(requestRefreshToken)

                .map(authService::verifyExpiration)

                .map(RefreshToken::getUser)

                .map(user -> {

                    String newAccessToken =
                            jwtUtils.generateAccessToken(
                                    user.getUsername()
                            );

                    return ResponseEntity.ok(
                            Map.of(
                                    "accessToken",
                                    newAccessToken,

                                    "refreshToken",
                                    requestRefreshToken
                            )
                    );
                })

                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "Refresh token không tồn tại!"
                        )
                );
    }

    // ==================================================
    // LOGOUT
    // ==================================================

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(
            @RequestBody Map<String, String> request) {

        String refreshToken =
                request.get("refreshToken");

        if (refreshToken != null) {
            authService.logout(refreshToken);
        }

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Đăng xuất thành công!"
                )
        );
    }

    // ==================================================
    // ACTIVATE ACCOUNT
    // ==================================================

    @GetMapping("/activate")
    public ResponseEntity<?> activateAccount(
            @RequestParam String token) {

        // 1. Tìm tài khoản bằng activation token
        User user =
                userRepository.findByActivationToken(token);

        if (user == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Token kích hoạt không hợp lệ"
            );
        }

        // 2. Kiểm tra thời hạn token
        if (user.getActivationTokenExpiry() == null
                || user.getActivationTokenExpiry()
                        .isBefore(LocalDateTime.now())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Link kích hoạt đã hết hạn"
            );
        }

        // 3. Nếu tài khoản đã ACTIVE
        if ("ACTIVE".equals(user.getStatus())) {

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Tài khoản đã được kích hoạt trước đó"
                    )
            );
        }

        // 4. Chuyển tài khoản sang ACTIVE
        user.setStatus("ACTIVE");

        // 5. Xóa token để token chỉ được sử dụng một lần
        user.setActivationToken(null);

        user.setActivationTokenExpiry(null);

        // 6. Lưu thay đổi vào database
        userRepository.save(user);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Kích hoạt tài khoản thành công!"
                )
        );
    }
}