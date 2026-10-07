package com.example.auth_service.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Profile("test | (dev & !smtp)")
public class DevMailService implements MailService {

    private static final Logger logger = LoggerFactory.getLogger(DevMailService.class);

    private final List<String> sentActivationRecipients = new CopyOnWriteArrayList<>();
    private final List<String> sentPasswordResetRecipients = new CopyOnWriteArrayList<>();
    private final Map<String, String> lastActivationTemporaryPasswords = new ConcurrentHashMap<>();

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        sendPasswordResetEmail(toEmail, resetToken, "Quý người dùng");
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken, String recipientName) {
        sentPasswordResetRecipients.add(toEmail);
        logger.info("==================================================================");
        logger.info("[DEV MAIL SERVICE] Password reset email simulated for: {} ({})", toEmail, recipientName);
        logger.info("[DEV MAIL SERVICE] Password reset token dispatched (masked for security)");
        logger.info("==================================================================");
    }

    @Override
    public void sendAccountActivationEmail(String toEmail, String temporaryPassword) {
        sentActivationRecipients.add(toEmail);
        if (temporaryPassword != null) {
            lastActivationTemporaryPasswords.put(toEmail, temporaryPassword);
        }
        logger.info("==================================================================");
        logger.info("[DEV MAIL SERVICE] Account activation email simulated for: {}", toEmail);
        logger.info("[DEV MAIL SERVICE] Temporary password for testing: {}", temporaryPassword);
        logger.info("[DEV MAIL SERVICE] Login URL: http://localhost:5173/login");
        logger.info("==================================================================");
    }

    public String getLatestTemporaryPassword(String email) {
        return lastActivationTemporaryPasswords.get(email);
    }

    public List<String> getSentActivationRecipients() {
        return sentActivationRecipients;
    }

    public List<String> getSentPasswordResetRecipients() {
        return sentPasswordResetRecipients;
    }

    public void clear() {
        sentActivationRecipients.clear();
        sentPasswordResetRecipients.clear();
    }
}
