package com.example.auth_service.exception;

public class ConflictException extends RuntimeException {
    private String field;

    public ConflictException(String message) {
        super(message);
    }

    public ConflictException(String message, String field) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
