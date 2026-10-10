package com.example.auth_service.service;

import com.example.auth_service.entity.PasswordResetToken;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.PasswordResetTokenRepository;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.net.ServerSocket;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end integration tests verifying password reset flow via SMTP sandbox.
 * Exercises real Spring controllers, repository layers, BCrypt password encoder,
 * and RFC 5321 SMTP socket transport.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"dev", "smtp"})
@ExtendWith(OutputCaptureExtension.class)
@TestPropertySource(locations = "classpath:application-test.properties", properties = {
        "spring.datasource.url=jdbc:h2:mem:password-reset;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.frontend-url=https://ats.example.test",
        "spring.mail.host=127.0.0.1",
        "spring.mail.properties.mail.smtp.starttls.enable=false",
        "spring.mail.properties.mail.smtp.auth=false",
        "spring.mail.properties.mail.smtp.timeout=1000"
})
class PasswordResetIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private PasswordResetTokenRepository resetTokens;
    @Autowired private RefreshTokenRepository refreshTokens;
    @Autowired private PasswordEncoder encoder;
    @Autowired private MailService mailService;

    private User user;
    private final String genericExpectedMessage = "Nếu tài khoản tồn tại và đã cấu hình email khôi phục, liên kết đặt lại mật khẩu sẽ được gửi đến email đã đăng ký.";

    @BeforeEach
    void fixtures() {
        assertThat(mailService).isInstanceOf(SmtpMailService.class);
        User newUser = new User("s1-reset-" + UUID.randomUUID() + "@company.com",
                encoder.encode("OldSecret123@"));
        newUser.setRecoveryEmail("recovery-" + UUID.randomUUID() + "@personal.test");
        user = users.saveAndFlush(newUser);
    }

    private String forgot(String email) throws Exception {
        return mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private String issueToken(User targetUser) throws Exception {
        try (SmtpMailServiceTest.FakeSmtpServer server = new SmtpMailServiceTest.FakeSmtpServer()) {
            ReflectionTestUtils.setField(mailService, "port", server.getPort());
            Instant before = Instant.now();
            String knownResponse = forgot(targetUser.getEmail());
            Instant after = Instant.now();
            String payload = server.getReceivedDataPayload(3000);

            assertThat(payload).contains("https://ats.example.test/reset-password?token=");
            assertThat(payload).contains("30 phút");
            assertThat(server.getReceivedCommands()).contains("RCPT TO:<" + targetUser.getRecoveryEmail() + ">");
            assertThat(server.getReceivedCommands()).doesNotContain("RCPT TO:<" + targetUser.getEmail() + ">");

            var matcher = Pattern.compile("[?]token=([a-zA-Z0-9-]+)").matcher(payload);
            assertThat(matcher.find()).isTrue();
            String rawToken = matcher.group(1);

            assertThat(knownResponse).doesNotContain(rawToken);
            PasswordResetToken stored = resetTokens.findByUser(targetUser).orElseThrow();
            assertThat(stored.getToken()).isEqualTo(AuthService.hashToken(rawToken)).isNotEqualTo(rawToken);
            assertThat(stored.getExpiryDate()).isBetween(before.plus(Duration.ofMinutes(29)), after.plus(Duration.ofMinutes(31)));
            return rawToken;
        }
    }

    private String issueToken() throws Exception {
        return issueToken(user);
    }

    private String resetBody(String token, String password) {
        return "{\"token\":\"" + token + "\",\"newPassword\":\"" + password
                + "\",\"confirmPassword\":\"" + password + "\"}";
    }

    private String login(String email, String password) throws Exception {
        String response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.refreshToken");
    }

    private String login(String password) throws Exception {
        return login(user.getEmail(), password);
    }

    @Test
    @DisplayName("Seed Accounts: admin@company.com và 6 tài khoản nội bộ tồn tại, ACTIVE, đúng role và login thành công")
    void testSeedAccounts_Verification() throws Exception {
        // 1. Verify admin@company.com
        User admin = users.findByEmail("admin@company.com").orElse(null);
        assertThat(admin).isNotNull();
        assertThat(admin.getStatus()).isEqualTo("ACTIVE");
        assertThat(admin.getRoles().stream().map(r -> r.getName().name())).contains("ADMIN");

        // Verify admin can login with default seed password
        String defaultSeedPassword = System.getenv().getOrDefault("SEED_ACCOUNT_PASSWORD", "Password123@");
        String refreshToken = login("admin@company.com", defaultSeedPassword);
        assertThat(refreshToken).isNotBlank();

        // 2. Verify all other 6 demo accounts
        List<String> demoEmails = List.of(
                "recruiter@company.com",
                "hr_manager@company.com",
                "interviewer@company.com",
                "hiring_manager@company.com",
                "approver@company.com",
                "candidate@company.com"
        );
        for (String demoEmail : demoEmails) {
            User demo = users.findByEmail(demoEmail).orElse(null);
            assertThat(demo).as("Account %s must exist in seed DB", demoEmail).isNotNull();
            assertThat(demo.getStatus()).isEqualTo("ACTIVE");
        }
    }

    @Test
    @DisplayName("CASE 1 — Email tồn tại: POST /api/auth/forgot-password admin@company.com trả HTTP 200, generic message, lưu token hash, expiry ~30 phút, gửi tới recovery_email")
    void case1_existingEmail_adminCompanyCom_generatesHashedTokenAndDispatchesMail() throws Exception {
        User admin = users.findByEmail("admin@company.com").orElseThrow();
        admin.setRecoveryEmail("admin-recovery@personal.test");
        users.saveAndFlush(admin);

        try (SmtpMailServiceTest.FakeSmtpServer server = new SmtpMailServiceTest.FakeSmtpServer()) {
            ReflectionTestUtils.setField(mailService, "port", server.getPort());
            Instant before = Instant.now();

            String response = forgot("admin@company.com");
            Instant after = Instant.now();

            assertThat(response).contains(genericExpectedMessage);

            // Verify email was received by FakeSmtpServer at recovery_email, NOT company email
            String payload = server.getReceivedDataPayload(3000);
            assertThat(server.getReceivedCommands()).contains("RCPT TO:<admin-recovery@personal.test>");
            assertThat(server.getReceivedCommands()).doesNotContain("RCPT TO:<admin@company.com>");

            // Extract raw token from reset link
            var matcher = Pattern.compile("[?]token=([a-zA-Z0-9-]+)").matcher(payload);
            assertThat(matcher.find()).isTrue();
            String rawToken = matcher.group(1);

            // Raw token NEVER in API response
            assertThat(response).doesNotContain(rawToken);

            // Verify token in DB is hashed and expiry is ~30 minutes
            PasswordResetToken stored = resetTokens.findByUser(admin).orElseThrow();
            assertThat(stored.getToken()).isEqualTo(AuthService.hashToken(rawToken));
            assertThat(stored.getToken()).isNotEqualTo(rawToken);
            assertThat(stored.isUsed()).isFalse();
            assertThat(stored.getExpiryDate()).isBetween(before.plus(Duration.ofMinutes(29)), after.plus(Duration.ofMinutes(31)));
        }
    }

    @Test
    @DisplayName("CASE 2 — Email không tồn tại: trả HTTP 200 generic message, không lộ email tồn tại, không gửi mail")
    void case2_nonExistingEmail_returnsSameGenericResponseWithoutEnumeration() throws Exception {
        try (SmtpMailServiceTest.FakeSmtpServer server = new SmtpMailServiceTest.FakeSmtpServer()) {
            ReflectionTestUtils.setField(mailService, "port", server.getPort());

            String response = forgot("not-exist-123@company.com");
            assertThat(response).contains(genericExpectedMessage);

            // Verify FakeSmtpServer did not receive any RCPT TO command
            assertThat(server.getReceivedCommands()).noneMatch(c -> c.startsWith("RCPT TO:"));
        }
    }

    @Test
    @DisplayName("CASE 2b — User không có recovery_email: trả generic response, không crash, không gửi vào company email")
    void case2b_userWithoutRecoveryEmail_returnsGenericResponseAndSendsNoMail() throws Exception {
        User noRecoveryUser = users.saveAndFlush(new User("norecovery-" + UUID.randomUUID() + "@company.com",
                encoder.encode("Secret123@")));

        try (SmtpMailServiceTest.FakeSmtpServer server = new SmtpMailServiceTest.FakeSmtpServer()) {
            ReflectionTestUtils.setField(mailService, "port", server.getPort());

            String response = forgot(noRecoveryUser.getEmail());
            assertThat(response).contains(genericExpectedMessage);

            // Verify FakeSmtpServer did not receive any email
            assertThat(server.getReceivedCommands()).noneMatch(c -> c.startsWith("RCPT TO:"));
        }
    }

    @Test
    @DisplayName("CASE 3 — Email được gửi qua SMTP: RCPT TO tới recovery_email, KHÔNG tới company email")
    void case3_emailSentViaSmtp_verifiesProtocolAndBodyStructure() throws Exception {
        try (SmtpMailServiceTest.FakeSmtpServer server = new SmtpMailServiceTest.FakeSmtpServer()) {
            ReflectionTestUtils.setField(mailService, "port", server.getPort());

            String response = forgot(user.getEmail());
            String payload = server.getReceivedDataPayload(3000);
            List<String> commands = server.getReceivedCommands();

            assertThat(commands).contains("RCPT TO:<" + user.getRecoveryEmail() + ">");
            assertThat(commands).doesNotContain("RCPT TO:<" + user.getEmail() + ">");
            assertThat(payload).contains("https://ats.example.test/reset-password?token=");
            assertThat(payload).contains("30 phút");
            assertThat(payload).contains("Hệ thống Tuyển dụng Nội bộ");
            assertThat(payload).contains("Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.");

            var matcher = Pattern.compile("[?]token=([a-zA-Z0-9-]+)").matcher(payload);
            assertThat(matcher.find()).isTrue();
            String rawToken = matcher.group(1);
            assertThat(response).doesNotContain(rawToken);
        }
    }

    @Test
    @DisplayName("CASE 3b — Regression: recovery_email KHÔNG được dùng để đăng nhập (chỉ company email)")
    void case3b_recoveryEmailCannotBeUsedAsLoginIdentifier() throws Exception {
        // Login with recovery email must fail (HTTP 401)
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getRecoveryEmail() + "\",\"password\":\"OldSecret123@\"}"))
                .andExpect(status().isUnauthorized());

        // Login with company email must succeed (HTTP 200)
        String refreshToken = login(user.getEmail(), "OldSecret123@");
        assertThat(refreshToken).isNotBlank();
    }

    @Test
    @DisplayName("CASE 4 — Reset thành công: đổi mật khẩu thành công, hash trong DB, token đánh dấu used, login pass mới thành công, login pass cũ thất bại")
    void case4_resetPassword_successFlow() throws Exception {
        String rawToken = issueToken();

        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody(rawToken, "NewSecret123@")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."));

        // 1. Password in DB is BCrypt hashed and matches new password
        User updated = users.findById(user.getId()).orElseThrow();
        assertThat(encoder.matches("NewSecret123@", updated.getPassword())).isTrue();
        assertThat(updated.getPassword()).isNotEqualTo("NewSecret123@");

        // 2. Token marked as used
        PasswordResetToken storedToken = resetTokens.findByUser(user).orElseThrow();
        assertThat(storedToken.isUsed()).isTrue();

        // 3. Login with new password succeeds
        login("NewSecret123@");

        // 4. Login with old password fails
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"OldSecret123@\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CASE 4b — Invalid token: token không tồn tại trả lỗi 400 rõ ràng")
    void case4b_invalidToken_rejected() throws Exception {
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody("invalid-token-" + UUID.randomUUID(), "NewSecret123@")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng."));
    }

    @Test
    @DisplayName("CASE 5 — Token dùng lần thứ hai: trả lỗi HTTP 400 rõ ràng bằng tiếng Việt")
    void case5_tokenUsedSecondTime_rejected() throws Exception {
        String rawToken = issueToken();

        // First use: success
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody(rawToken, "NewSecret123@")))
                .andExpect(status().isOk());

        // Second use: must fail
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody(rawToken, "OtherSecret123@")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng."));
    }

    @Test
    @DisplayName("CASE 6 — Token quá 30 phút: trả lỗi HTTP 400 rõ ràng bằng tiếng Việt")
    void case6_tokenOlderThanThirtyMinutes_rejected() throws Exception {
        String rawToken = issueToken();
        PasswordResetToken stored = resetTokens.findByUser(user).orElseThrow();
        // Artificially expire the token to simulate 30 minutes passing
        stored.setExpiryDate(Instant.now().minusSeconds(5));
        resetTokens.saveAndFlush(stored);

        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody(rawToken, "NewSecret123@")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng."));

        assertThat(resetTokens.findByUser(user).orElseThrow().isUsed()).isFalse();
        assertThat(encoder.matches("OldSecret123@", users.findById(user.getId()).orElseThrow().getPassword())).isTrue();
    }

    @Test
    @DisplayName("CASE 7 — Reset password revoke session cũ: các refresh token cũ không thể dùng để refresh")
    void case7_resetPassword_revokesOldRefreshSessions() throws Exception {
        String refreshToken1 = login("OldSecret123@");
        String refreshToken2 = login("OldSecret123@");
        String rawToken = issueToken();

        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody(rawToken, "NewSecret123@")))
                .andExpect(status().isOk());

        assertThat(refreshTokens.findByToken(refreshToken1).orElseThrow().isRevoked()).isTrue();
        assertThat(refreshTokens.findByToken(refreshToken2).orElseThrow().isRevoked()).isTrue();

        for (String oldSession : List.of(refreshToken1, refreshToken2)) {
            mvc.perform(post("/api/auth/refresh-token").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"refreshToken\":\"" + oldSession + "\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    @DisplayName("CASE 8 — SMTP lỗi: endpoint forgot-password vẫn trả generic response, không lộ stack trace hay credentials")
    void case8_smtpFailure_stillReturnsGenericResponseWithoutLeakingDetails(CapturedOutput output) throws Exception {
        int closedPort;
        try (ServerSocket socket = new ServerSocket(0)) {
            closedPort = socket.getLocalPort();
        }
        ReflectionTestUtils.setField(mailService, "port", closedPort);

        String response = forgot(user.getEmail());
        assertThat(response).contains(genericExpectedMessage);

        // Verify response does not leak stack trace or internal exception
        assertThat(response).doesNotContain("Exception");
        assertThat(response).doesNotContain("ConnectException");
        assertThat(response).doesNotContain("at com.example");

        // Safe logging
        assertThat(output.getAll()).contains("Could not deliver password reset email");
    }

    @Test
    @DisplayName("Concurrency: Hai request đồng thời không thể tiêu thụ cùng một token hai lần")
    void simultaneousRequestsCannotConsumeTheSameTokenTwice() throws Exception {
        String rawToken = issueToken();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> {
                ready.countDown();
                assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
                return mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody(rawToken, "FirstSecret123@"))).andReturn().getResponse().getStatus();
            });
            var second = executor.submit(() -> {
                ready.countDown();
                assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
                return mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody(rawToken, "SecondSecret123@"))).andReturn().getResponse().getStatus();
            });
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 400);
            assertThat(resetTokens.findByUser(user).orElseThrow().isUsed()).isTrue();
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }
}
