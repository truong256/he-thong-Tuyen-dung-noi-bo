package com.example.auth_service.dto;

import java.time.Instant;

public class AuthErrorResponse {

    private String message;
    private Instant lockedUntil;

    public AuthErrorResponse() {}

    public AuthErrorResponse(String message) {
        this.message = message;
    }

    public AuthErrorResponse(String message, Instant lockedUntil) {
        this.message = message;
        this.lockedUntil = lockedUntil;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }

    public void setLockedUntil(Instant lockedUntil) {
        this.lockedUntil = lockedUntil;
    }
}
