package com.example.auth_service.security;

import com.example.auth_service.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String fullName;
    private final String password;
    private final String status;
    private final int tokenVersion;
    private boolean accountNonLocked = true;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(Long id, String email, String fullName, String password, String status,
                         int tokenVersion, Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.password = password;
        this.status = status;
        this.tokenVersion = tokenVersion;
        this.authorities = authorities;
    }

    public UserPrincipal(Long id, String email, String fullName, String password, String status,
                         Collection<? extends GrantedAuthority> authorities) {
        this(id, email, fullName, password, status, 1, authorities);
    }

    public static UserPrincipal create(User user) {
        List<GrantedAuthority> authorities;
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            authorities = user.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName().name()))
                    .collect(Collectors.toList());
            user.getRoles().stream()
                    .flatMap(role -> RolePermissions.forRole(role.getName()).stream())
                    .distinct()
                    .map(permission -> new SimpleGrantedAuthority(permission.name()))
                    .forEach(authorities::add);
        } else {
            // user_roles is authoritative. A stale legacy role must not restore revoked access.
            authorities = List.of();
        }

        UserPrincipal principal = new UserPrincipal(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPassword(),
                user.getStatus(),
                user.getTokenVersion(),
                authorities
        );
        principal.accountNonLocked = user.isAccountNonLocked();
        return principal;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getStatus() { return status; }
    public int getTokenVersion() { return tokenVersion; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked && !"LOCKED".equalsIgnoreCase(status);
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return "ACTIVE".equalsIgnoreCase(status);
    }
}
