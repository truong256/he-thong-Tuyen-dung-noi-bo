package com.example.auth_service.service;

public interface MailService {
    void sendPasswordResetEmail(String toEmail, String resetToken);
    default void sendPasswordResetEmail(String toEmail, String resetToken, String recipientName) {
        sendPasswordResetEmail(toEmail, resetToken);
    }
    void sendAccountActivationEmail(String toEmail, String temporaryPassword);

    default void sendApplicationConfirmationEmail(String toEmail, String candidateName, String jobTitle, String withdrawToken) {}

    default void sendCandidateWithdrawnNotification(String recruiterEmail, String candidateName, String jobTitle, Long applicationId) {}
}
