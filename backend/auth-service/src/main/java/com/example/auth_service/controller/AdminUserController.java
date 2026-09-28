package com.example.auth_service.controller;

import com.example.auth_service.entity.User;
import com.example.auth_service.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestBody Map<String, String> request) {

        String username = request.get("username");
        String password = request.get("password");
        String fullName = request.get("fullName");
        String email = request.get("email");
        String department = request.get("department");
        String role = request.get("role");

        if (username == null || username.isBlank()
                || password == null || password.isBlank()
                || fullName == null || fullName.isBlank()
                || email == null || email.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Username, password, fullName và email là bắt buộc");
        }

        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username đã tồn tại");
        }

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email đã tồn tại");
        }

        if (role == null || role.isBlank()) {
            role = "INTERVIEWER";
        }

        if (!role.equals("ADMIN")
                && !role.equals("INTERVIEWER")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Role không hợp lệ");
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setEmail(email);
        user.setDepartment(department);
        user.setRole(role);
        user.setStatus("ACTIVE");
        user.setMustChangePassword(true);

        User savedUser = userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "message", "Tạo tài khoản thành công",
                        "id", savedUser.getId(),
                        "username", savedUser.getUsername(),
                        "fullName", savedUser.getFullName(),
                        "email", savedUser.getEmail(),
                        "department",
                        savedUser.getDepartment() == null
                                ? "" : savedUser.getDepartment(),
                        "role", savedUser.getRole(),
                        "status", savedUser.getStatus(),
                        "mustChangePassword",
                        savedUser.isMustChangePassword()
                ));
    }
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
        user.setPassword(passwordEncoder.encode(password));
        user.setMustChangePassword(true);
    }

    User savedUser = userRepository.save(user);

    return ResponseEntity.ok(toResponse(savedUser));
}
@GetMapping
public ResponseEntity<?> searchUsers(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String status) {

    List<User> users = userRepository.searchUsers(keyword, status);

    List<Map<String, Object>> result = users.stream()
            .map(this::toResponse)
            .toList();

    return ResponseEntity.ok(result);
}
private Map<String, Object> toResponse(User user) {
    Map<String, Object> result = new HashMap<>();

    result.put("id", user.getId());
    result.put("username", user.getUsername());
    result.put("fullName", user.getFullName());
    result.put("email", user.getEmail());
    result.put("department", user.getDepartment());
    result.put("role", user.getRole());
    result.put("status", user.getStatus());
    result.put(
            "mustChangePassword",
            user.isMustChangePassword()
    );

    return result;
}
}