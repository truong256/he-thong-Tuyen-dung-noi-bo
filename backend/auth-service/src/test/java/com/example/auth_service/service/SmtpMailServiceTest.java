package com.example.auth_service.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(OutputCaptureExtension.class)
class SmtpMailServiceTest {

    private SmtpMailService smtpMailService;

    @BeforeEach
    void setUp() {
        smtpMailService = new SmtpMailService();
        ReflectionTestUtils.setField(smtpMailService, "host", "127.0.0.1");
        ReflectionTestUtils.setField(smtpMailService, "port", 65534); // Unused port to test network failure gracefully
        ReflectionTestUtils.setField(smtpMailService, "fromEmail", "noreply@recruitment-system.com");
        ReflectionTestUtils.setField(smtpMailService, "timeout", 2000);
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

    @Test
    @DisplayName("S1-08 SMTP Happy-Path: SmtpMailService hoàn tất kết nối, EHLO, MAIL FROM, RCPT TO, DATA với email kích hoạt và mật khẩu tạm 12 ký tự")
    void testSendAccountActivationEmail_HappyPathWithRealSmtpProtocol() throws Exception {
        try (FakeSmtpServer fakeServer = new FakeSmtpServer()) {
            ReflectionTestUtils.setField(smtpMailService, "host", "127.0.0.1");
            ReflectionTestUtils.setField(smtpMailService, "port", fakeServer.getPort());
            ReflectionTestUtils.setField(smtpMailService, "fromEmail", "noreply@recruitment-system.com");
            ReflectionTestUtils.setField(smtpMailService, "auth", false);
            ReflectionTestUtils.setField(smtpMailService, "starttls", false);
            ReflectionTestUtils.setField(smtpMailService, "timeout", 5000);

            String targetEmail = "staff-activation@company.com";
            String tempPassword12Char = "Secret!2026Aa";

            // Execute real SMTP transmission
            smtpMailService.sendAccountActivationEmail(targetEmail, tempPassword12Char);

            // Wait for mock SMTP server to capture transmission
            String payload = fakeServer.getReceivedDataPayload(3000);
            List<String> commands = fakeServer.getReceivedCommands();

            // Verify full SMTP protocol handshake & command sequence
            assertThat(commands).anyMatch(c -> c.startsWith("EHLO"));
            assertThat(commands).contains("MAIL FROM:<noreply@recruitment-system.com>");
            assertThat(commands).contains("RCPT TO:<staff-activation@company.com>");
            assertThat(commands).contains("DATA");
            assertThat(commands).contains("QUIT");

            // Verify content of activation email
            assertThat(payload).contains(targetEmail);
            assertThat(payload).contains(tempPassword12Char);
            assertThat(payload).contains("http://localhost:5173/login");
        }
    }

    @Test
    @DisplayName("S1-03 SMTP Happy-Path: SmtpMailService gửi email đặt lại mật khẩu với liên kết reset token")
    void testSendPasswordResetEmail_HappyPathWithRealSmtpProtocol() throws Exception {
        try (FakeSmtpServer fakeServer = new FakeSmtpServer()) {
            ReflectionTestUtils.setField(smtpMailService, "host", "127.0.0.1");
            ReflectionTestUtils.setField(smtpMailService, "port", fakeServer.getPort());
            ReflectionTestUtils.setField(smtpMailService, "fromEmail", "noreply@recruitment-system.com");
            ReflectionTestUtils.setField(smtpMailService, "auth", false);
            ReflectionTestUtils.setField(smtpMailService, "starttls", false);
            ReflectionTestUtils.setField(smtpMailService, "timeout", 5000);

            String targetEmail = "reset-candidate@company.com";
            String resetToken = "token-reset-xyz-987654";

            // Execute real SMTP transmission
            smtpMailService.sendPasswordResetEmail(targetEmail, resetToken);

            String payload = fakeServer.getReceivedDataPayload(3000);
            List<String> commands = fakeServer.getReceivedCommands();

            assertThat(commands).contains("MAIL FROM:<noreply@recruitment-system.com>");
            assertThat(commands).contains("RCPT TO:<reset-candidate@company.com>");
            assertThat(payload).contains(targetEmail);
            assertThat(payload).contains("http://localhost:5173/reset-password?token=" + resetToken);
        }
    }

    @Test
    void passwordResetEmailUsesConfiguredFrontendUrl() throws Exception {
        try (FakeSmtpServer fakeServer = new FakeSmtpServer()) {
            smtpMailService.setPort(fakeServer.getPort());
            ReflectionTestUtils.setField(smtpMailService, "frontendUrl", "https://ats.example.com/");
            smtpMailService.sendPasswordResetEmail("reset@company.com", "test-only-reset-token");

            String payload = fakeServer.getReceivedDataPayload(3000);
            assertThat(payload).contains("https://ats.example.com/reset-password?token=test-only-reset-token");
            assertThat(payload).contains("30 phút");
            assertThat(payload).doesNotContain("localhost:5173");
        }
    }

    @Test
    void smtpResponseCannotLeakResetTokenToLogsOrException(CapturedOutput output) throws Exception {
        String secret = "test-only-sensitive-reset-token";
        try (FakeSmtpServer fakeServer = new FakeSmtpServer("550 Delivery rejected for " + secret)) {
            smtpMailService.setPort(fakeServer.getPort());
            assertThatThrownBy(() -> smtpMailService.sendPasswordResetEmail("reset@company.com", secret))
                    .hasMessage("Gửi email qua SMTP thất bại.")
                    .hasNoCause();
            assertThat(output.getAll()).doesNotContain(secret);
        }
    }

    @Test
    @DisplayName("S1-03 SMTP Auth: SmtpMailService xác thực AUTH LOGIN thành công và không rò rỉ credential vào log")
    void testSendPasswordResetEmail_WithSmtpAuth(CapturedOutput output) throws Exception {
        try (FakeSmtpServer fakeServer = new FakeSmtpServer()) {
            ReflectionTestUtils.setField(smtpMailService, "host", "127.0.0.1");
            ReflectionTestUtils.setField(smtpMailService, "port", fakeServer.getPort());
            ReflectionTestUtils.setField(smtpMailService, "fromEmail", "noreply@company.test");
            ReflectionTestUtils.setField(smtpMailService, "auth", true);
            ReflectionTestUtils.setField(smtpMailService, "username", "sandbox_test_user");
            ReflectionTestUtils.setField(smtpMailService, "password", "sandbox_test_password");
            ReflectionTestUtils.setField(smtpMailService, "starttls", false);
            ReflectionTestUtils.setField(smtpMailService, "timeout", 5000);

            smtpMailService.sendPasswordResetEmail("admin@company.com", "reset-token-sample");

            List<String> commands = fakeServer.getReceivedCommands();
            assertThat(commands).contains("AUTH LOGIN");
            String expectedUserB64 = java.util.Base64.getEncoder().encodeToString("sandbox_test_user".getBytes(StandardCharsets.UTF_8));
            String expectedPassB64 = java.util.Base64.getEncoder().encodeToString("sandbox_test_password".getBytes(StandardCharsets.UTF_8));
            assertThat(commands).contains(expectedUserB64);
            assertThat(commands).contains(expectedPassB64);
            assertThat(commands).contains("RCPT TO:<admin@company.com>");

            // Assert credentials and tokens are NEVER logged
            assertThat(output.getAll()).doesNotContain("sandbox_test_password");
            assertThat(output.getAll()).doesNotContain("reset-token-sample");
        }
    }


    /**
     * In-process RFC 5321 compliant SMTP test server.
     */
    static class FakeSmtpServer implements AutoCloseable {
        private final ServerSocket serverSocket;
        private final List<String> receivedCommands = Collections.synchronizedList(new ArrayList<>());
        private final CompletableFuture<String> dataPayloadFuture = new CompletableFuture<>();
        private final Thread listenerThread;
        private final String dataResponse;
        private volatile boolean running = true;

        public FakeSmtpServer() throws IOException {
            this("250 2.0.0 OK message accepted for delivery");
        }

        public FakeSmtpServer(String dataResponse) throws IOException {
            this.dataResponse = dataResponse;
            this.serverSocket = new ServerSocket(0); // auto-assigned available port
            this.listenerThread = new Thread(this::listen);
            this.listenerThread.setDaemon(true);
            this.listenerThread.start();
        }

        public int getPort() {
            return serverSocket.getLocalPort();
        }

        public List<String> getReceivedCommands() {
            long start = System.currentTimeMillis();
            while (System.currentTimeMillis() - start < 1000 && !receivedCommands.contains("QUIT")) {
                try {
                    Thread.sleep(10);
                } catch (InterruptedException ignored) {}
            }
            return new ArrayList<>(receivedCommands);
        }

        public String getReceivedDataPayload(long timeoutMs) throws Exception {
            return dataPayloadFuture.get(timeoutMs, TimeUnit.MILLISECONDS);
        }

        private void listen() {
            try (Socket socket = serverSocket.accept();
                 BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                 BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8))) {

                writer.write("220 127.0.0.1 Simple Fake SMTP Server Ready\r\n");
                writer.flush();

                String line;
                boolean inData = false;
                StringBuilder dataBuffer = new StringBuilder();

                while (running && (line = reader.readLine()) != null) {
                    receivedCommands.add(line);
                    if (inData) {
                        if (".".equals(line)) {
                            inData = false;
                            dataPayloadFuture.complete(dataBuffer.toString());
                            writer.write(dataResponse + "\r\n");
                            writer.flush();
                        } else {
                            dataBuffer.append(line).append("\n");
                        }
                    } else {
                        String upper = line.trim().toUpperCase();
                        if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                            writer.write("250-127.0.0.1 Hello\r\n250 HELP\r\n");
                            writer.flush();
                        } else if (upper.equals("AUTH LOGIN")) {
                            writer.write("334 VXNlcm5hbWU6\r\n");
                            writer.flush();
                            String userLine = reader.readLine();
                            if (userLine != null) receivedCommands.add(userLine);
                            writer.write("334 UGFzc3dvcmQ6\r\n");
                            writer.flush();
                            String passLine = reader.readLine();
                            if (passLine != null) receivedCommands.add(passLine);
                            writer.write("235 2.0.0 Authentication successful\r\n");
                            writer.flush();
                        } else if (upper.startsWith("MAIL FROM:")) {
                            writer.write("250 2.1.0 Sender OK\r\n");
                            writer.flush();
                        } else if (upper.startsWith("RCPT TO:")) {
                            writer.write("250 2.1.5 Recipient OK\r\n");
                            writer.flush();
                        } else if (upper.equals("DATA")) {
                            inData = true;
                            writer.write("354 Start mail input; end with <CRLF>.<CRLF>\r\n");
                            writer.flush();
                        } else if (upper.equals("QUIT")) {
                            writer.write("221 2.0.0 Service closing transmission channel\r\n");
                            writer.flush();
                            break;
                        } else {
                            writer.write("250 OK\r\n");
                            writer.flush();
                        }
                    }
                }
            } catch (IOException ignored) {
            }
        }

        @Override
        public void close() throws IOException {
            running = false;
            if (!serverSocket.isClosed()) {
                serverSocket.close();
            }
        }
    }
}
