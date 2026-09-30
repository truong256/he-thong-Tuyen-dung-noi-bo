package com.example.auth_service.service;

import com.example.auth_service.dto.*;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@PreAuthorize("hasAuthority('USER_MANAGE')")
public class AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserService(UserRepository userRepository,
                            RoleRepository roleRepository,
                            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('USER_READ')")
    public Page<UserSummaryDto> listUsers(String search, String status, Pageable pageable) {
        String querySearch = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : null;
        String queryStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) ? status.trim().toUpperCase() : null;

        org.springframework.data.jpa.domain.Specification<User> spec = (root, query, cb) -> {
            java.util.List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
            if (querySearch != null) {
                String pattern = "%" + querySearch + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("email")), pattern),
                    cb.like(cb.lower(root.get("fullName")), pattern)
                ));
            }
            if (queryStatus != null) {
                predicates.add(cb.equal(root.get("status"), queryStatus));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<User> users = userRepository.findAll(spec, pageable);
        return users.map(this::mapToSummary);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('USER_READ')")
    public UserSummaryDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));
        return mapToSummary(user);
    }

    @Transactional
    public UserSummaryDto createUser(CreateUserRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadRequestException("Email không được để trống.");
        }
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email này đã tồn tại trong hệ thống.");
        }

        User user = new User(email, passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName().trim());
        user.setStatus(request.getStatus() != null ? request.getStatus().toUpperCase() : "ACTIVE");

        Set<Role> roles = resolveRoles(request.getRoles());
        user.setRoles(roles);

        User saved = userRepository.save(user);
        return mapToSummary(saved);
    }

    @Transactional
    public UserSummaryDto updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new BadRequestException("Email này đã được sử dụng bởi người dùng khác.");
            }
            user.setEmail(newEmail);
            user.setUsername(newEmail);
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        user.setUpdatedAt(Instant.now());
        User updated = userRepository.save(user);
        return mapToSummary(updated);
    }

    @Transactional
    public UserSummaryDto updateStatus(Long id, UpdateStatusRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        String newStatus = request.getStatus().trim().toUpperCase();
        if (!Set.of("ACTIVE", "LOCKED", "INACTIVE").contains(newStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + newStatus);
        }

        user.setStatus(newStatus);
        if ("ACTIVE".equals(newStatus)) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
        } else if ("LOCKED".equals(newStatus)) {
            user.setLockedUntil(Instant.now().plusSeconds(86400 * 365)); // Admin lock
        }

        user.setUpdatedAt(Instant.now());
        User updated = userRepository.save(user);
        return mapToSummary(updated);
    }

    @Transactional
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    public UserSummaryDto updateRoles(Long id, UpdateRolesRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        Set<Role> roles = resolveRoles(request.getRoles());
        user.setRoles(roles);
        user.setUpdatedAt(Instant.now());

        User updated = userRepository.save(user);
        return mapToSummary(updated);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));
        userRepository.delete(user);
    }

    private Set<Role> resolveRoles(Set<String> roleNames) {
        Set<Role> roles = new HashSet<>();
        if (roleNames != null) {
            for (String rStr : roleNames) {
                try {
                    RoleName rn = RoleName.valueOf(rStr.trim().toUpperCase());
                    Role role = roleRepository.findByName(rn)
                            .orElseGet(() -> roleRepository.save(new Role(rn, "Vai trò " + rn.name())));
                    roles.add(role);
                } catch (IllegalArgumentException e) {
                    throw new BadRequestException("Vai trò không hợp lệ: " + rStr);
                }
            }
        }
        if (roles.isEmpty()) {
            throw new BadRequestException("Phải chọn ít nhất một vai trò hợp lệ.");
        }
        return roles;
    }

    private UserSummaryDto mapToSummary(User user) {
        Set<String> roleNames = user.getRoles() != null && !user.getRoles().isEmpty()
                ? user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toSet())
                : Set.of();

        return new UserSummaryDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                roleNames,
                user.getStatus()
        );
    }
}
