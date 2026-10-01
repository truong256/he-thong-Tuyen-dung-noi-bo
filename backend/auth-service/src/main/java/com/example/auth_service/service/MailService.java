package com.example.auth_service.service;

public interface MailService {
    void sendPasswordResetEmail(String toEmail, String resetToken);
    void sendAccountActivationEmail(String toEmail, String temporaryPassword);
}
