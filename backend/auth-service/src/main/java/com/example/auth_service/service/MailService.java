package com.example.auth_service.service;

public interface MailService {
    void sendPasswordResetEmail(String toEmail, String resetToken);
    default void sendPasswordResetEmail(String toEmail, String resetToken, String recipientName) {
        sendPasswordResetEmail(toEmail, resetToken);
    }
    void sendAccountActivationEmail(String toEmail, String temporaryPassword);
}
