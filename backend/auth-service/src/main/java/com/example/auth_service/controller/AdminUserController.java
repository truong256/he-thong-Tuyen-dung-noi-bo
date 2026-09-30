package com.example.auth_service.controller;

import com.example.auth_service.entity.User;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.service.EmailService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    public AdminUserController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestBody Map<String, String> request) {

        String username = request.get("username");
        String fullName = request.get("fullName");
        String email = request.get("email");
        String department = request.get("department");
        String role = request.get("role");

        // ==============================
        // 1. Kiểm tra dữ liệu bắt buộc
        // ==============================

        if (username == null || username.isBlank()
                || fullName == null || fullName.isBlank()
                || email == null || email.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Username, fullName và email là bắt buộc");
        }

        // ==============================
        // 2. Kiểm tra username trùng
        // ==============================

        if (userRepository.existsByUsername(username)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username đã tồn tại");
        }

        // ==============================
        // 3. Kiểm tra email trùng
        // ==============================

        if (userRepository.existsByEmail(email)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email đã tồn tại");
        }

        // ==============================
        // 4. Xử lý role
        // ==============================

        if (role == null || role.isBlank()) {
            role = "INTERVIEWER";
        }

        if (!role.equals("ADMIN")
                && !role.equals("INTERVIEWER")) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Role không hợp lệ");
        }

        // ==============================
        // 5. Tự sinh mật khẩu tạm
        // ==============================

        String temporaryPassword = generateTemporaryPassword();

        // ==============================
        // 6. Tạo activation token
        // ==============================

        String activationToken =
                UUID.randomUUID().toString();

        LocalDateTime activationTokenExpiry =
                LocalDateTime.now().plusHours(24);

        // ==============================
        // 7. Tạo User
        // ==============================

        User user = new User();

        user.setUsername(username);

        user.setPassword(
                passwordEncoder.encode(temporaryPassword)
        );

        user.setFullName(fullName);

        user.setEmail(email);

        user.setDepartment(department);

        user.setRole(role);

        // Tài khoản mới chưa được kích hoạt
        user.setStatus("INACTIVE");

        // Sau khi đăng nhập lần đầu phải đổi mật khẩu
        user.setMustChangePassword(true);

        // Token kích hoạt
        user.setActivationToken(activationToken);

        // Token hết hạn sau 24 giờ
        user.setActivationTokenExpiry(
                activationTokenExpiry
        );

        // ==============================
        // 8. Lưu User vào database
        // ==============================

        User savedUser = userRepository.save(user);

        // ==============================
        // 9. Gửi email kích hoạt
        // ==============================

        emailService.sendActivationEmail(
                savedUser.getEmail(),
                savedUser.getUsername(),
                temporaryPassword,
                savedUser.getActivationToken()
        );

        // ==============================
        // 10. Trả response
        // ==============================

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "message",
                        "Tạo tài khoản thành công. Email kích hoạt đã được gửi.",

                        "id",
                        savedUser.getId(),

                        "username",
                        savedUser.getUsername(),

                        "fullName",
                        savedUser.getFullName(),

                        "email",
                        savedUser.getEmail(),

                        "department",
                        savedUser.getDepartment() == null
                                ? ""
                                : savedUser.getDepartment(),

                        "role",
                        savedUser.getRole(),

                        "status",
                        savedUser.getStatus(),

                        "mustChangePassword",
                        savedUser.isMustChangePassword()
                ));
    }

    // ==================================================
    // Tạo mật khẩu tạm thời
    // ==================================================

    private String generateTemporaryPassword() {

        String characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                + "abcdefghijklmnopqrstuvwxyz"
                + "0123456789"
                + "@#$%";

        StringBuilder password = new StringBuilder();

        for (int i = 0; i < 10; i++) {

            int index =
                    secureRandom.nextInt(characters.length());

            password.append(characters.charAt(index));
        }

        return password.toString();
    }

    // ==================================================
    // UPDATE USER
    // ==================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy tài khoản"));

        String fullName = request.get("fullName");
        String email = request.get("email");
        String department = request.get("department");
        String role = request.get("role");
        String status = request.get("status");
        String password = request.get("password");

        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName);
        }

        if (email != null && !email.isBlank()) {

            if (userRepository.existsByEmailAndIdNot(
                    email, id)) {

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Email đã được tài khoản khác sử dụng");
            }

            user.setEmail(email);
        }

        if (department != null) {
            user.setDepartment(department);
        }

        if (role != null && !role.isBlank()) {

            if (!role.equals("ADMIN")
                    && !role.equals("INTERVIEWER")) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Role không hợp lệ");
            }

            user.setRole(role);
        }

        if (status != null && !status.isBlank()) {

            if (!status.equals("ACTIVE")
                    && !status.equals("INACTIVE")) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Status không hợp lệ");
            }

            user.setStatus(status);
        }

        if (password != null && !password.isBlank()) {

            user.setPassword(
                    passwordEncoder.encode(password)
            );

            user.setMustChangePassword(true);
        }

        User savedUser = userRepository.save(user);

        return ResponseEntity.ok(toResponse(savedUser));
    }

    // ==================================================
    // SEARCH + FILTER + PAGINATION
    // ==================================================

    @GetMapping
    public ResponseEntity<?> searchUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (page < 0 || size < 1 || size > 100) {

            return ResponseEntity.badRequest()
                    .body("page phải >= 0, size phải từ 1 đến 100");
        }

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Direction.ASC,
                        "id"
                )
        );

        Page<User> users =
                userRepository.searchUsers(
                        keyword,
                        role,
                        status,
                        pageable
                );

        Page<Map<String, Object>> result =
                users.map(this::toResponse);

        Map<String, Object> response =
                new HashMap<>();

        response.put(
                "content",
                result.getContent()
        );

        response.put(
                "currentPage",
                result.getNumber()
        );

        response.put(
                "pageSize",
                result.getSize()
        );

        response.put(
                "totalElements",
                result.getTotalElements()
        );

        response.put(
                "totalPages",
                result.getTotalPages()
        );

        response.put(
                "first",
                result.isFirst()
        );

        response.put(
                "last",
                result.isLast()
        );

        return ResponseEntity.ok(response);
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    private Map<String, Object> toResponse(User user) {

        Map<String, Object> result =
                new HashMap<>();

        result.put(
                "id",
                user.getId()
        );

        result.put(
                "username",
                user.getUsername()
        );

        result.put(
                "fullName",
                user.getFullName()
        );

        result.put(
                "email",
                user.getEmail()
        );

        result.put(
                "department",
                user.getDepartment()
        );

        result.put(
                "role",
                user.getRole()
        );

        result.put(
                "status",
                user.getStatus()
        );

        result.put(
                "mustChangePassword",
                user.isMustChangePassword()
        );

        return result;
    }
}