package com.example.auth_service.exception;

public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}
