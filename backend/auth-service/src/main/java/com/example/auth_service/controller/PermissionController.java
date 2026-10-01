package com.example.auth_service.controller;

import com.example.auth_service.entity.RoleName;
import com.example.auth_service.security.Permission;
import com.example.auth_service.security.RolePermissions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.*;

@RestController
public class PermissionController {
    @GetMapping("/api/admin/roles")
    @PreAuthorize("hasAuthority('ROLE_READ')")
    public Map<RoleName, Set<Permission>> roles() { return RolePermissions.all(); }

    @GetMapping("/api/auth/permissions")
    @PreAuthorize("hasAuthority('PROFILE_READ')")
    public List<String> permissions(Authentication authentication) {
        return authentication.getAuthorities().stream().map(a -> a.getAuthority())
                .filter(name -> !name.startsWith("ROLE_")).sorted().toList();
    }
}
