package com.example.auth_service.exception;

public class InvalidCredentialsException extends RuntimeException {

    private final Integer failedAttempts;
    private final Integer remainingAttempts;

    public InvalidCredentialsException(String message) {
        super(message);
        this.failedAttempts = null;
        this.remainingAttempts = null;
    }

    public InvalidCredentialsException(String message, Integer remainingAttempts) {
        super(message);
        this.failedAttempts = null;
        this.remainingAttempts = remainingAttempts;
    }

    public InvalidCredentialsException(String message, Integer failedAttempts, Integer remainingAttempts) {
        super(message);
        this.failedAttempts = failedAttempts;
        this.remainingAttempts = remainingAttempts;
    }

    public Integer getFailedAttempts() {
        return failedAttempts;
    }

    public Integer getRemainingAttempts() {
        return remainingAttempts;
    }
}
