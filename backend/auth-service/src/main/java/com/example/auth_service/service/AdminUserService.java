package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.RequisitionAssignment;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.UserPrincipal;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@PreAuthorize("hasAuthority('USER_MANAGE')")
public class AdminUserService {

    private static final Logger logger = LoggerFactory.getLogger(AdminUserService.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RequisitionAssignmentRepository requisitionAssignmentRepository;
    private final RecruitmentRequisitionRepository recruitmentRequisitionRepository;

    public AdminUserService(UserRepository userRepository,
                            RoleRepository roleRepository,
                            PasswordEncoder passwordEncoder,
                            MailService mailService,
                            RefreshTokenRepository refreshTokenRepository,
                            RequisitionAssignmentRepository requisitionAssignmentRepository,
                            RecruitmentRequisitionRepository recruitmentRequisitionRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.requisitionAssignmentRepository = requisitionAssignmentRepository;
        this.recruitmentRequisitionRepository = recruitmentRequisitionRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('USER_READ')")
    public Page<UserSummaryDto> listUsers(String search, String status, Pageable pageable) {
        return listUsers(search, status, null, pageable);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('USER_READ')")
    public Page<UserSummaryDto> listUsers(String search, String status, String role, Pageable pageable) {
        String querySearch = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : null;
        String queryStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) ? status.trim().toUpperCase() : null;
        String queryRole = (role != null && !role.isBlank() && !"ALL".equalsIgnoreCase(role)) ? role.trim().toUpperCase() : null;

        Specification<User> spec = (root, query, cb) -> {
            query.distinct(true);
            List<Predicate> predicates = new ArrayList<>();

            if (querySearch != null) {
                String pattern = "%" + querySearch + "%";
                Predicate searchPred = cb.or(
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("department"), "")), pattern)
                );
                predicates.add(searchPred);
            }

            if (queryStatus != null) {
                predicates.add(cb.equal(root.get("status"), queryStatus));
            }

            if (queryRole != null) {
                try {
                    RoleName rName = RoleName.valueOf(queryRole);
                    Join<User, Role> roleJoin = root.join("roles", JoinType.INNER);
                    predicates.add(cb.equal(roleJoin.get("name"), rName));
                } catch (IllegalArgumentException e) {
                    predicates.add(cb.disjunction());
                }
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
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
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("Email này đã tồn tại trong hệ thống.");
        }

        // S1-08 Hardening: Client cannot supply or override password. Server strictly generates a 12-char temporary password.
        String rawPassword = generateTemporaryPassword();

        User user = new User(email, passwordEncoder.encode(rawPassword));
        user.setFullName(request.getFullName() != null ? request.getFullName().trim() : "");
        user.setDepartment(request.getDepartment() != null ? request.getDepartment().trim() : null);
        user.setStatus(request.getStatus() != null ? request.getStatus().toUpperCase() : "ACTIVE");

        Set<Role> roles = resolveRoles(request.getRoles());
        user.setRoles(roles);

        User saved = userRepository.save(user);

        // Dispatch activation email with temporary credentials
        try {
            mailService.sendAccountActivationEmail(saved.getEmail(), rawPassword);
        } catch (Exception e) {
            logger.error("Gửi email kích hoạt tài khoản cho {} thất bại: {}", saved.getEmail(), e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể kết nối đến máy chủ email để gửi thông tin kích hoạt.", e);
        }

        return mapToSummary(saved);
    }

    @Transactional
    public UserSummaryDto updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmailIgnoreCaseAndIdNot(newEmail, id)) {
                throw new BadRequestException("Email này đã được sử dụng bởi người dùng khác.");
            }
            user.setEmail(newEmail);
            user.setUsername(newEmail);
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getDepartment() != null) {
            user.setDepartment(request.getDepartment().trim().isEmpty() ? null : request.getDepartment().trim());
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

        List<String> handoverWarnings = new ArrayList<>();

        if ("LOCKED".equals(newStatus)) {
            if (request.getReason() == null || request.getReason().trim().isBlank()) {
                throw new BadRequestException("Bắt buộc ghi lý do khóa tài khoản.");
            }

            user.setStatus("LOCKED");
            user.setLockReason(request.getReason().trim());
            user.setLockNote(request.getNote() != null ? request.getNote().trim() : null);
            user.setLockedAt(Instant.now());

            String actor = getAuthenticatedUsername();
            user.setLockedBy(actor);
            user.setLockedUntil(Instant.now().plusSeconds(86400 * 365));

            // Revoke all refresh tokens / active sessions
            user.setTokenVersion(user.getTokenVersion() + 1);
            refreshTokenRepository.revokeAllByUser(user);

            // Requisition assignments handover warning
            List<RequisitionAssignment> assignments = requisitionAssignmentRepository.findByUserId(user.getId());
            if (assignments != null && !assignments.isEmpty()) {
                for (RequisitionAssignment assignment : assignments) {
                    assignment.setHandoverRequired(true);
                    requisitionAssignmentRepository.save(assignment);

                    Optional<RecruitmentRequisition> reqOpt = recruitmentRequisitionRepository.findById(assignment.getRequisitionId());
                    reqOpt.ifPresent(req -> handoverWarnings.add(req.getRequisitionCode() + " - " + req.getTitle()));
                }
            }
        } else if ("ACTIVE".equals(newStatus)) {
            user.setStatus("ACTIVE");
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            // S1-10 Rule: Unlock does not clear handover warnings
        } else if ("INACTIVE".equals(newStatus)) {
            user.setStatus("INACTIVE");
            user.setTokenVersion(user.getTokenVersion() + 1);
            refreshTokenRepository.revokeAllByUser(user);
        }

        user.setUpdatedAt(Instant.now());
        User updated = userRepository.save(user);

        UserSummaryDto dto = mapToSummary(updated);
        dto.setHandoverWarnings(handoverWarnings);
        return dto;
    }

    @Transactional
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    public UserSummaryDto updateRoles(Long id, UpdateRolesRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        Set<Role> roles = resolveRoles(request.getRoles());

        // Self-protection: Admin cannot revoke their own ADMIN role
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            String currentUsername = auth.getName();
            boolean isSelf = (user.getEmail() != null && user.getEmail().equalsIgnoreCase(currentUsername))
                    || (user.getUsername() != null && user.getUsername().equalsIgnoreCase(currentUsername));

            if (auth.getPrincipal() instanceof UserPrincipal principal) {
                if (principal.getId() != null && principal.getId().equals(user.getId())) {
                    isSelf = true;
                }
            }

            boolean hadAdmin = user.getRoles() != null && user.getRoles().stream()
                    .anyMatch(r -> r.getName() == RoleName.ADMIN);
            boolean retainsAdmin = roles.stream()
                    .anyMatch(r -> r.getName() == RoleName.ADMIN);

            if (isSelf && hadAdmin && !retainsAdmin) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Quản trị viên không thể tự thu hồi vai trò ADMIN của chính mình.");
            }
        }

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

    private String getAuthenticatedUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null) ? auth.getName() : "admin";
    }

    public static String generateTemporaryPassword() {
        String upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower = "abcdefghijkmnopqrstuvwxyz";
        String digits = "23456789";
        String special = "!@#$%^&*";
        SecureRandom random = new SecureRandom();

        StringBuilder sb = new StringBuilder();
        sb.append(upper.charAt(random.nextInt(upper.length())));
        sb.append(lower.charAt(random.nextInt(lower.length())));
        sb.append(digits.charAt(random.nextInt(digits.length())));
        sb.append(special.charAt(random.nextInt(special.length())));

        String allChars = upper + lower + digits + special;
        for (int i = 0; i < 8; i++) {
            sb.append(allChars.charAt(random.nextInt(allChars.length())));
        }

        char[] chars = sb.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = chars[i];
            chars[i] = chars[j];
            chars[j] = temp;
        }
        return new String(chars);
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

        UserSummaryDto dto = new UserSummaryDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getDepartment(),
                roleNames,
                user.getStatus()
        );
        dto.setLockReason(user.getLockReason());
        dto.setLockNote(user.getLockNote());
        dto.setLockedAt(user.getLockedAt());
        dto.setLockedBy(user.getLockedBy());
        return dto;
    }
}
