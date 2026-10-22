package com.example.auth_service.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OutputCaptureExtension.class)
class DevMailServiceTest {

    private DevMailService devMailService;

    @BeforeEach
    void setUp() {
        devMailService = new DevMailService();
    }

    @Test
    @DisplayName("DevMailService masks raw password reset token and never logs it to console")
    void sendPasswordResetEmail_doesNotLogRawToken(CapturedOutput output) {
        String sensitiveToken = "super-sensitive-raw-token-uuid-12345";
        devMailService.sendPasswordResetEmail("admin@company.com", sensitiveToken);

        assertThat(devMailService.getSentPasswordResetRecipients()).contains("admin@company.com");
        assertThat(output.getAll()).doesNotContain(sensitiveToken);
        assertThat(output.getAll()).contains("masked for security");
    }

    @Test
    @DisplayName("DevMailService records sent recipients and temporary activation passwords")
    void sendAccountActivationEmail_recordsRecipientAndTemporaryPassword() {
        devMailService.sendAccountActivationEmail("recruiter@company.com", "TempPass123@");

        assertThat(devMailService.getSentActivationRecipients()).contains("recruiter@company.com");
        assertThat(devMailService.getLatestTemporaryPassword("recruiter@company.com")).isEqualTo("TempPass123@");
    }

    @Test
    @DisplayName("DevMailService clear() empties all simulated queues")
    void clear_emptiesSimulatedQueues() {
        devMailService.sendPasswordResetEmail("admin@company.com", "token-1");
        devMailService.sendAccountActivationEmail("user@company.com", "pass-1");

        assertThat(devMailService.getSentPasswordResetRecipients()).isNotEmpty();
        assertThat(devMailService.getSentActivationRecipients()).isNotEmpty();

        devMailService.clear();

        assertThat(devMailService.getSentPasswordResetRecipients()).isEmpty();
        assertThat(devMailService.getSentActivationRecipients()).isEmpty();
    }
}
