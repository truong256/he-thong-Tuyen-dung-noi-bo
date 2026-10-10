package com.example.auth_service.controller;

import com.example.auth_service.entity.RoleName;
import com.example.auth_service.security.Permission;
import com.example.auth_service.security.RolePermissions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.*;
import java.util.stream.Collectors;

@RestController
public class PermissionController {

    /** Pre-compute the set of valid permission names for fast lookup */
    private static final Set<String> PERMISSION_NAMES = Arrays.stream(Permission.values())
            .map(Enum::name)
            .collect(Collectors.toUnmodifiableSet());

    @GetMapping("/api/admin/roles")
    @PreAuthorize("hasAuthority('ROLE_READ')")
    public Map<RoleName, Set<Permission>> roles() { return RolePermissions.all(); }

    /**
     * Returns the server-authoritative list of permissions for the current user.
     *
     * Filters authorities to only include those that match a known Permission enum value.
     * This correctly handles permissions named "ROLE_*" (e.g. ROLE_READ, ROLE_MANAGE)
     * while excluding Spring Security's own ROLE_ grant authorities (ROLE_ADMIN, ROLE_HR_MANAGER, etc.)
     *
     * S1-05: Frontend uses this list for permission-based UI rendering.
     */
    @GetMapping("/api/auth/permissions")
    @PreAuthorize("hasAuthority('PROFILE_READ')")
    public List<String> permissions(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(PERMISSION_NAMES::contains)  // Only return known Permission enum values
                .sorted()
                .toList();
    }
}
