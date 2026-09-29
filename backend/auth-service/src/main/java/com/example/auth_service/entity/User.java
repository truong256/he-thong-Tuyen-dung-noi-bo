package com.example.auth_service.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "username")
    private String username;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(nullable = false)
    private String password;

    @Transient
    private String department;

    @Transient
    private boolean mustChangePassword = false;

    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "role", length = 50)
    private String role = "RECRUITER";

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    public User() {}

    public User(String email, String password) {
        this.email = email;
        this.username = email;
        this.password = password;
        this.status = "ACTIVE";
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
    }

    public User(String email, String password, String singleRole) {
        this(email, password);
        if (singleRole != null) {
            try {
                RoleName rName = RoleName.valueOf(singleRole.trim().toUpperCase());
                this.roles.add(new Role(rName, rName.name()));
            } catch (Exception ignored) {}
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) {
        this.email = email;
        if (this.username == null) {
            this.username = email;
        }
    }

    public String getUsername() {
        return username != null ? username : email;
    }
    public void setUsername(String username) {
        this.username = username;
        if (this.email == null) {
            this.email = username;
        }
    }

    public String getFullName() {
        return fullName != null ? fullName : (email != null ? email.split("@")[0] : "");
    }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(int failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }

    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }

    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) {
        this.roles = roles != null ? roles : new HashSet<>();
        if (!this.roles.isEmpty()) {
            this.role = this.roles.iterator().next().getName().name();
        }
    }

    public void addRole(Role role) {
        if (this.roles == null) this.roles = new HashSet<>();
        if (role != null) {
            this.roles.add(role);
            this.role = role.getName().name();
        }
    }

    /**
     * Primary role for simple string compatibility
     */
    public String getRole() {
        if (roles != null && !roles.isEmpty()) {
            return roles.iterator().next().getName().name();
        }
        return role != null ? role : "RECRUITER";
    }

    public void setRole(String roleNameStr) {
        if (roleNameStr != null) {
            try {
                RoleName rn = RoleName.valueOf(roleNameStr.trim().toUpperCase());
                if (this.roles == null) this.roles = new HashSet<>();
                this.roles.clear();
                this.roles.add(new Role(rn, rn.name()));
                this.role = rn.name();
            } catch (Exception ignored) {
                this.role = roleNameStr;
            }
        }
    }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public boolean isAccountNonLocked() {
        if (lockedUntil == null) return true;
        return Instant.now().isAfter(lockedUntil);
    }
}