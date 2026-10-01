package com.example.auth_service.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SmtpMailServiceTest {

    private SmtpMailService smtpMailService;

    @BeforeEach
    void setUp() {
        smtpMailService = new SmtpMailService();
        ReflectionTestUtils.setField(smtpMailService, "host", "127.0.0.1");
        ReflectionTestUtils.setField(smtpMailService, "port", 65534); // Unused port to test network failure gracefully
        ReflectionTestUtils.setField(smtpMailService, "fromEmail", "noreply@recruitment-system.com");
        ReflectionTestUtils.setField(smtpMailService, "timeout", 1000);
        ReflectionTestUtils.setField(smtpMailService, "auth", false);
        ReflectionTestUtils.setField(smtpMailService, "starttls", false);
    }

    @Test
    @DisplayName("S1-08: SmtpMailService ném RuntimeException rõ ràng khi máy chủ SMTP không khả dụng")
    void testSendAccountActivationEmail_ThrowsWhenHostUnreachable() {
        assertThatThrownBy(() -> smtpMailService.sendAccountActivationEmail("newuser@example.com", "TempPass!1234"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageStartingWith("Gửi email qua SMTP thất bại");
    }

    @Test
    @DisplayName("S1-03: SmtpMailService ném RuntimeException rõ ràng khi gửi password reset email thất bại")
    void testSendPasswordResetEmail_ThrowsWhenHostUnreachable() {
        assertThatThrownBy(() -> smtpMailService.sendPasswordResetEmail("newuser@example.com", "reset-token-abc"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageStartingWith("Gửi email qua SMTP thất bại");
    }

    @Test
    @DisplayName("Profile check: SmtpMailService có cấu hình getters/setters đúng chuẩn")
    void testConfigurationProperties() {
        smtpMailService.setHost("smtp.example.com");
        smtpMailService.setPort(587);
        smtpMailService.setFromEmail("test@example.com");
        smtpMailService.setTimeout(5000);

        assertThat(smtpMailService.getHost()).isEqualTo("smtp.example.com");
        assertThat(smtpMailService.getPort()).isEqualTo(587);
    }
}
