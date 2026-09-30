package com.example.auth_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.activation-url}")
    private String activationUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendActivationEmail(
            String to,
            String username,
            String temporaryPassword,
            String activationToken) {

        String activationLink = activationUrl + activationToken;

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(to);

        message.setSubject(
                "Kích hoạt tài khoản - Hệ thống Tuyển dụng Nội bộ"
        );

        message.setText("""
                Xin chào,

                Bạn đã được tạo tài khoản trên Hệ thống Tuyển dụng Nội bộ.

                ===== THÔNG TIN TÀI KHOẢN =====

                Username: %s
                Mật khẩu tạm thời: %s

                ===== KÍCH HOẠT TÀI KHOẢN =====

                Vui lòng truy cập đường dẫn sau để kích hoạt tài khoản:

                %s

                Link kích hoạt có thời hạn 24 giờ.

                Sau khi kích hoạt, bạn có thể đăng nhập bằng
                username và mật khẩu tạm thời ở trên.

                Vì lý do bảo mật, vui lòng đổi mật khẩu sau
                lần đăng nhập đầu tiên.

                Nếu bạn không yêu cầu tạo tài khoản này,
                vui lòng liên hệ quản trị viên.

                Trân trọng,
                Hệ thống Tuyển dụng Nội bộ
                """.formatted(
                username,
                temporaryPassword,
                activationLink
        ));

        mailSender.send(message);
    }
}