package com.example.auth_service.exception;

public class InvalidCredentialsException extends RuntimeException {

    private final Integer remainingAttempts;

    public InvalidCredentialsException(String message) {
        super(message);
        this.remainingAttempts = null;
    }

    public InvalidCredentialsException(String message, Integer remainingAttempts) {
        super(message);
        this.remainingAttempts = remainingAttempts;
    }

    public Integer getRemainingAttempts() {
        return remainingAttempts;
    }
}
