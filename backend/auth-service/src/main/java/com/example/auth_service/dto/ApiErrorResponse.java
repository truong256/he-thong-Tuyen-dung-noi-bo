package com.example.auth_service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiErrorResponse {
    private String timestamp = Instant.now().toString();
    private int status;
    private String code;
    private String message;
    private String path;
    private Map<String, String> validationErrors;
    private Instant lockedUntil;
    private Integer failedAttempts;
    private Integer remainingAttempts;

    public ApiErrorResponse(int status, String code, String message, String path) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.path = path;
        this.timestamp = Instant.now().toString();
    }

    public ApiErrorResponse(int status, String code, String message, String path, Instant lockedUntil) {
        this(status, code, message, path);
        this.lockedUntil = lockedUntil;
    }

    public ApiErrorResponse(int status, String code, String message, String path, Integer remainingAttempts) {
        this(status, code, message, path);
        this.remainingAttempts = remainingAttempts;
    }

    public ApiErrorResponse(int status, String code, String message, String path, Integer failedAttempts, Integer remainingAttempts) {
        this(status, code, message, path);
        this.failedAttempts = failedAttempts;
        this.remainingAttempts = remainingAttempts;
    }
}
