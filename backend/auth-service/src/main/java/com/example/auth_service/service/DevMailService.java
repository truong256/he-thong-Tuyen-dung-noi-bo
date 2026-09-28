package com.example.auth_service.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class DevMailService implements MailService {

    private static final Logger logger = LoggerFactory.getLogger(DevMailService.class);

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        logger.info("==================================================================");
        logger.info("[DEV MAIL SERVICE] Password reset email simulated for: {}", toEmail);
        logger.info("[DEV MAIL SERVICE] Reset Token: {}", resetToken);
        logger.info("[DEV MAIL SERVICE] Reset Link: http://localhost:5173/reset-password?token={}", resetToken);
        logger.info("==================================================================");
    }
}
