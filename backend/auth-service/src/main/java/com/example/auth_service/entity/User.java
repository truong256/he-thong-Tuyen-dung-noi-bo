package com.example.auth_service.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(length = 150)
    private String fullName;

    @Column(unique = true, length = 255)
    private String email;

    @Column(length = 100)
    private String department;

    /*
     * Role cũ - giữ lại để tương thích với dữ liệu hiện tại.
     * Hệ thống mới sử dụng roles để hỗ trợ nhiều vai trò.
     */
    @Column(length = 50)
    private String role = "INTERVIEWER";

    /*
     * Một User có thể có nhiều Role.
     *
     * Ví dụ:
     * ADMIN
     * INTERVIEWER
     * HIRING_MANAGER
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id")
    )
    @Column(name = "role", nullable = false, length = 50)
    private Set<String> roles = new HashSet<>();

    @Column(length = 30)
    private String status = "INACTIVE";

    @Column(nullable = false)
    private boolean mustChangePassword = true;

    @Column(length = 255)
    private String activationToken;

    private LocalDateTime activationTokenExpiry;

    public User() {
    }

    public User(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    /*
     * Getter role cũ để code hiện tại không bị lỗi.
     */
    public String getRole() {
        if (roles != null && !roles.isEmpty()) {
            return roles.iterator().next();
        }

        return role;
    }

    /*
     * Setter role cũ.
     */
    public void setRole(String role) {
        this.role = role;

        if (this.roles == null) {
            this.roles = new HashSet<>();
        }

        if (role != null && !role.isBlank()) {
            this.roles.add(role.toUpperCase());
        }
    }

    /*
     * Lấy toàn bộ role của User.
     */
    public Set<String> getRoles() {

        if (roles == null) {
            roles = new HashSet<>();
        }

        /*
         * Chuyển role cũ sang hệ thống nhiều role.
         */
        if (roles.isEmpty()
                && role != null
                && !role.isBlank()) {

            roles.add(role.toUpperCase());
        }

        return roles;
    }

    /*
     * Gán nhiều role cùng lúc.
     */
    public void setRoles(Set<String> roles) {

        this.roles = roles != null
                ? new HashSet<>(roles)
                : new HashSet<>();

        /*
         * Đồng bộ role cũ.
         */
        if (!this.roles.isEmpty()) {
            this.role = this.roles.iterator().next();
        }
    }

    /*
     * Kiểm tra User có role hay không.
     */
    public boolean hasRole(String roleName) {

        if (roleName == null || roleName.isBlank()) {
            return false;
        }

        return getRoles()
                .contains(roleName.toUpperCase());
    }

    /*
     * Thêm một role.
     */
    public void addRole(String roleName) {

        if (roleName == null || roleName.isBlank()) {
            return;
        }

        String normalizedRole =
                roleName.trim().toUpperCase();

        getRoles().add(normalizedRole);

        if (this.role == null || this.role.isBlank()) {
            this.role = normalizedRole;
        }
    }

    /*
     * Thu hồi một role.
     */
    public boolean removeRole(String roleName) {

        if (roleName == null || roleName.isBlank()) {
            return false;
        }

        String normalizedRole =
                roleName.trim().toUpperCase();

        boolean removed =
                getRoles().remove(normalizedRole);

        /*
         * Đồng bộ role cũ.
         */
        if (removed) {

            if (!getRoles().isEmpty()) {

                this.role =
                        getRoles().iterator().next();

            } else {

                this.role = null;
            }
        }

        return removed;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(
            boolean mustChangePassword) {

        this.mustChangePassword =
                mustChangePassword;
    }

    public String getActivationToken() {
        return activationToken;
    }

    public void setActivationToken(String activationToken) {
        this.activationToken = activationToken;
    }

    public LocalDateTime getActivationTokenExpiry() {
        return activationTokenExpiry;
    }

    public void setActivationTokenExpiry(
            LocalDateTime activationTokenExpiry) {

        this.activationTokenExpiry =
                activationTokenExpiry;
    }
}