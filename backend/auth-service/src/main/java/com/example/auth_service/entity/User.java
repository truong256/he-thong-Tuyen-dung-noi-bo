package com.example.auth_service.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "username")
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role = "RECRUITER";

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    public User() {}

    public User(String email, String password) {
        this(email, password, "RECRUITER");
    }

    public User(String email, String password, String role) {
        this.email = email;
        this.username = email;
        this.password = password;
        this.role = role != null ? role : "RECRUITER";
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(int failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }

    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
}