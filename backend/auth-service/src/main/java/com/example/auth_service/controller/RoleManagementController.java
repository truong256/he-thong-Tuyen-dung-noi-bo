package com.example.auth_service.controller;

import com.example.auth_service.entity.User;
import com.example.auth_service.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
public class RoleManagementController {

    private final UserRepository userRepository;

    // Các role được phép sử dụng trong hệ thống
    private static final Set<String> ALLOWED_ROLES = Set.of(
            "ADMIN",
            "RECRUITER",
            "HIRING_MANAGER",
            "INTERVIEWER",
            "HR_MANAGER",
            "APPROVER",
            "CANDIDATE"
    );

    public RoleManagementController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /*
     * Xem toàn bộ role của một User
     *
     * GET /api/admin/users/{userId}/roles
     */
    @GetMapping("/{userId}/roles")
    public Map<String, Object> getRoles(@PathVariable Long userId) {

        User user = findUser(userId);

        return Map.of(
                "userId", user.getId(),
                "username", user.getUsername(),
                "roles", user.getRoles()
        );
    }

    /*
     * Gán thêm một hoặc nhiều role
     *
     * PUT /api/admin/users/{userId}/roles
     *
     * Body:
     * {
     *   "roles": [
     *      "HIRING_MANAGER",
     *      "INTERVIEWER"
     *   ]
     * }
     */
    @PutMapping("/{userId}/roles")
    public Map<String, Object> addRoles(
            @PathVariable Long userId,
            @RequestBody RolesRequest request) {

        User user = findUser(userId);

        Set<String> roles = normalizeRoles(request.roles());

        validateRoles(roles);

        roles.forEach(user::addRole);

        userRepository.save(user);

        return Map.of(
                "message", "Gán role thành công",
                "userId", user.getId(),
                "username", user.getUsername(),
                "roles", user.getRoles()
        );
    }

    /*
     * Thay thế toàn bộ role của User
     *
     * PUT /api/admin/users/{userId}/roles/replace
     */
    @PutMapping("/{userId}/roles/replace")
    public Map<String, Object> replaceRoles(
            @PathVariable Long userId,
            @RequestBody RolesRequest request,
            Authentication authentication) {

        User user = findUser(userId);

        Set<String> roles = normalizeRoles(request.roles());

        validateRoles(roles);

        /*
         * Không cho Admin tự loại bỏ ADMIN của chính mình.
         */
        if (isSelf(user, authentication)
                && user.hasRole("ADMIN")
                && !roles.contains("ADMIN")) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Không thể tự thu hồi vai trò ADMIN của chính mình"
            );
        }

        user.setRoles(roles);

        userRepository.save(user);

        return Map.of(
                "message", "Cập nhật role thành công",
                "userId", user.getId(),
                "username", user.getUsername(),
                "roles", user.getRoles()
        );
    }

    /*
     * Thu hồi một role
     *
     * DELETE /api/admin/users/{userId}/roles/{role}
     */
    @DeleteMapping("/{userId}/roles/{role}")
    public Map<String, Object> removeRole(
            @PathVariable Long userId,
            @PathVariable String role,
            Authentication authentication) {

        User user = findUser(userId);

        String normalizedRole = normalizeRole(role);

        if (!ALLOWED_ROLES.contains(normalizedRole)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Role không hợp lệ: " + normalizedRole
            );
        }

        /*
         * Không cho Admin tự thu hồi ADMIN của chính mình.
         */
        if (isSelf(user, authentication)
                && "ADMIN".equals(normalizedRole)) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Không thể tự thu hồi vai trò ADMIN của chính mình"
            );
        }

        boolean removed = user.removeRole(normalizedRole);

        if (!removed) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "User không có role: " + normalizedRole
            );
        }

        userRepository.save(user);

        return Map.of(
                "message", "Thu hồi role thành công",
                "userId", user.getId(),
                "username", user.getUsername(),
                "roles", user.getRoles()
        );
    }

    /*
     * Tìm User theo ID
     */
    private User findUser(Long userId) {

        return userRepository.findById(userId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Không tìm thấy User với ID: " + userId
                        )
                );
    }

    /*
     * Chuẩn hóa danh sách role.
     */
    private Set<String> normalizeRoles(Set<String> roles) {

        if (roles == null) {
            return new LinkedHashSet<>();
        }

        return roles.stream()
                .filter(role -> role != null && !role.isBlank())
                .map(this::normalizeRole)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    /*
     * Chuẩn hóa một role.
     */
    private String normalizeRole(String role) {

        return role.trim().toUpperCase();
    }

    /*
     * Kiểm tra role có hợp lệ không.
     */
    private void validateRoles(Set<String> roles) {

        for (String role : roles) {

            if (!ALLOWED_ROLES.contains(role)) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Role không hợp lệ: " + role
                );
            }
        }
    }

    /*
     * Kiểm tra User đang thao tác có phải chính mình không.
     */
    private boolean isSelf(
            User user,
            Authentication authentication) {

        return authentication != null
                && user.getUsername().equals(authentication.getName());
    }

    /*
     * DTO nhận request.
     */
    public record RolesRequest(Set<String> roles) {
    }
}