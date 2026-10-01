package com.example.auth_service.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Profile({"dev", "test"})
public class DevMailService implements MailService {

    private static final Logger logger = LoggerFactory.getLogger(DevMailService.class);

    private final List<String> sentActivationRecipients = new CopyOnWriteArrayList<>();
    private final List<String> sentPasswordResetRecipients = new CopyOnWriteArrayList<>();

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        sentPasswordResetRecipients.add(toEmail);
        logger.info("==================================================================");
        logger.info("[DEV MAIL SERVICE] Password reset email simulated for: {}", toEmail);
        logger.info("[DEV MAIL SERVICE] Password reset token dispatched (masked for security)");
        logger.info("==================================================================");
    }

    @Override
    public void sendAccountActivationEmail(String toEmail, String temporaryPassword) {
        sentActivationRecipients.add(toEmail);
        logger.info("==================================================================");
        logger.info("[DEV MAIL SERVICE] Account activation email simulated for: {}", toEmail);
        logger.info("[DEV MAIL SERVICE] Temporary password dispatched (masked for security)");
        logger.info("[DEV MAIL SERVICE] Login URL: http://localhost:5173/login");
        logger.info("==================================================================");
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
