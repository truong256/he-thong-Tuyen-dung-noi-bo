package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import com.example.auth_service.service.AvatarService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AvatarService avatarService;

    public AuthController(AuthService authService, AvatarService avatarService) {
        this.authService = authService;
        this.avatarService = avatarService;
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> registerUser(@Valid @RequestBody RegisterRequest request) {
        LoginResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> loginUser(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<LoginResponse> refreshToken(@RequestBody Map<String, String> request) {
        String token = request.get("refreshToken");
        LoginResponse response = authService.refreshToken(new RefreshTokenRequest(token));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(@RequestBody(required = false) Map<String, String> request,
                                       Authentication authentication) {
        String refreshToken = request != null ? request.get("refreshToken") : null;
        String authenticatedEmail = (authentication != null && authentication.isAuthenticated())
                ? authentication.getName()
                : null;

        authService.logout(refreshToken, authenticatedEmail);
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công!"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        Map<String, String> response = authService.forgotPassword(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        Map<String, String> response = authService.resetPassword(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Yêu cầu đăng nhập"));
        }
        Map<String, String> response = authService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserSummaryDto> getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        UserSummaryDto user = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserSummaryDto> updateProfile(@Valid @RequestBody UpdateProfileRequest request,
                                                        Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        UserSummaryDto updated = authService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping(value = {"/avatar", "/profile/avatar"}, consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, "multipart/*"})
    public ResponseEntity<AvatarUploadResponse> uploadAvatar(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar,
            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        MultipartFile uploadFile = file != null ? file : avatar;
        AvatarUploadResponse response = avatarService.uploadAvatar(authentication.getName(), uploadFile);
        return ResponseEntity.ok(response);
    }

    @GetMapping({"/avatar/{filename:.+}", "/avatars/{filename:.+}"})
    public ResponseEntity<Resource> getAvatarFile(@PathVariable String filename) {
        Resource resource = avatarService.loadAvatarResource(filename);
        MediaType mediaType = avatarService.determineMediaType(filename);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CACHE_CONTROL, "max-age=86400, public")
                .body(resource);
    }

    @GetMapping({"/avatar", "/profile/avatar"})
    public ResponseEntity<Resource> getCurrentUserAvatar(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        Resource resource = avatarService.loadCurrentUserAvatar(authentication.getName(), false);
        MediaType mediaType = avatarService.determineMediaType(resource.getFilename());
        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(resource);
    }

    @GetMapping({"/avatar/thumbnail", "/profile/avatar/thumbnail"})
    public ResponseEntity<Resource> getCurrentUserThumbnail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        Resource resource = avatarService.loadCurrentUserAvatar(authentication.getName(), true);
        MediaType mediaType = avatarService.determineMediaType(resource.getFilename());
        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(resource);
    }

    @DeleteMapping({"/avatar", "/profile/avatar"})
    public ResponseEntity<Map<String, String>> deleteAvatar(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        avatarService.deleteAvatar(authentication.getName());
        return ResponseEntity.ok(Map.of("message", "Đã xóa ảnh đại diện thành công!"));
    }
}
