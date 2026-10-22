package com.example.auth_service.dto;

public class LoginResponse {

    private String message;
    private String accessToken;
    private String refreshToken;
    private UserSummaryDto user;
    private boolean mustChangePassword;

    public LoginResponse() {}

    public LoginResponse(String message, String accessToken, String refreshToken, UserSummaryDto user) {
        this.message = message;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.user = user;
        if (user != null) {
            this.mustChangePassword = user.isMustChangePassword();
        }
    }

    public LoginResponse(String message, String accessToken, String refreshToken, UserSummaryDto user, boolean mustChangePassword) {
        this.message = message;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.user = user;
        this.mustChangePassword = mustChangePassword;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public UserSummaryDto getUser() {
        return user;
    }

    public void setUser(UserSummaryDto user) {
        this.user = user;
    }
}
