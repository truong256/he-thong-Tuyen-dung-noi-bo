package com.example.auth_service.controller;

import com.example.auth_service.dto.AuthErrorResponse;
import com.example.auth_service.dto.LoginRequest;
import com.example.auth_service.dto.LoginResponse;
import com.example.auth_service.entity.RefreshToken;
import com.example.auth_service.exception.AccountLockedException;
import com.example.auth_service.exception.InvalidCredentialsException;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.security.JwtUtils;
import com.example.auth_service.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtils jwtUtils;
    private final AuthService authService;
    private final RefreshTokenRepository refreshTokenRepository;

    public AuthController(JwtUtils jwtUtils, AuthService authService, RefreshTokenRepository refreshTokenRepository) {
        this.jwtUtils = jwtUtils;
        this.authService = authService;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(Map.of("message", "Đăng ký thành công!"));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> loginUser(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        String requestRefreshToken = request.get("refreshToken");
        if (requestRefreshToken == null || requestRefreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RefreshToken không được trống!");
        }

        return refreshTokenRepository.findByToken(requestRefreshToken)
                .map(authService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String newAccessToken = jwtUtils.generateAccessToken(user.getEmail(), user.getRole());
                    return ResponseEntity.ok(Map.of(
                        "accessToken", newAccessToken,
                        "refreshToken", requestRefreshToken
                    ));
                })
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refresh token không tồn tại!"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken != null) {
            authService.logout(refreshToken);
        }
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công!"));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<AuthErrorResponse> handleInvalidCredentials(InvalidCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new AuthErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<AuthErrorResponse> handleAccountLocked(AccountLockedException ex) {
        return ResponseEntity.status(HttpStatus.LOCKED)
                .body(new AuthErrorResponse(ex.getMessage(), ex.getLockedUntil()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<AuthErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new AuthErrorResponse(ex.getMessage()));
    }
}