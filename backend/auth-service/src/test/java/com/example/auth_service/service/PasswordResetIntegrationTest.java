package com.example.auth_service.service;

import com.example.auth_service.entity.PasswordResetToken;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.PasswordResetTokenRepository;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real Spring controllers, database, password encoder and SMTP socket, with a local mail sink. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"dev", "smtp"})
@TestPropertySource(locations = "classpath:application-test.properties", properties = {
        "spring.datasource.url=jdbc:h2:mem:password-reset;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.frontend-url=https://ats.example.test",
        "spring.mail.host=127.0.0.1",
        "spring.mail.properties.mail.smtp.starttls.enable=false",
        "spring.mail.properties.mail.smtp.auth=false",
        "spring.mail.properties.mail.smtp.timeout=1000"
})
class PasswordResetIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PasswordResetTokenRepository resetTokens;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired PasswordEncoder encoder;
    @Autowired MailService mailService;
    private User user;

    @BeforeEach
    void fixtures() {
        assertThat(mailService).isInstanceOf(SmtpMailService.class);
        user = users.saveAndFlush(new User("s1-reset-" + UUID.randomUUID() + "@company.com",
                encoder.encode("OldSecret123@")));
    }

    private String forgot(String email) throws Exception {
        return mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private String issueToken() throws Exception {
        try (SmtpMailServiceTest.FakeSmtpServer server = new SmtpMailServiceTest.FakeSmtpServer()) {
            ReflectionTestUtils.setField(mailService, "port", server.getPort());
            Instant before = Instant.now();
            String knownResponse = forgot(user.getEmail());
            Instant after = Instant.now();
            String payload = server.getReceivedDataPayload(3000);
            assertThat(payload).contains("https://ats.example.test/reset-password?token=");
            assertThat(payload).contains("30 phút");
            assertThat(server.getReceivedCommands()).contains("RCPT TO:<" + user.getEmail() + ">");

            var matcher = Pattern.compile("[?]token=([a-zA-Z0-9-]+)").matcher(payload);
            assertThat(matcher.find()).isTrue();
            String rawToken = matcher.group(1);
            assertThat(knownResponse).isEqualTo(forgot("missing-" + UUID.randomUUID() + "@company.com"));
            assertThat(knownResponse).doesNotContain(rawToken);
            PasswordResetToken stored = resetTokens.findByUser(user).orElseThrow();
            assertThat(stored.getToken()).isEqualTo(AuthService.hashToken(rawToken)).isNotEqualTo(rawToken);
            assertThat(stored.getExpiryDate()).isBetween(before.plus(Duration.ofMinutes(30)), after.plus(Duration.ofMinutes(30)));
            return rawToken;
        }
    }

    private String resetBody(String token, String password) {
        return "{\"token\":\"" + token + "\",\"newPassword\":\"" + password
                + "\",\"confirmPassword\":\"" + password + "\"}";
    }

    private String login(String password) throws Exception {
        String response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.refreshToken");
    }

    @Test
    void emailedTokenWorksOnceAndRevokesExistingRefreshSessions() throws Exception {
        String refreshToken = login("OldSecret123@");
        String secondRefreshToken = login("OldSecret123@");
        String rawToken = issueToken();

        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody(rawToken, "NewSecret123@")))
                .andExpect(status().isOk());
        assertThat(resetTokens.findByUser(user).orElseThrow().isUsed()).isTrue();
        assertThat(refreshTokens.findByToken(refreshToken).orElseThrow().isRevoked()).isTrue();
        assertThat(refreshTokens.findByToken(secondRefreshToken).orElseThrow().isRevoked()).isTrue();

        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody(rawToken, "OtherSecret123@")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng."));
        assertThat(encoder.matches("NewSecret123@", users.findById(user.getId()).orElseThrow().getPassword())).isTrue();
        for (String oldSession : java.util.List.of(refreshToken, secondRefreshToken)) {
            mvc.perform(post("/api/auth/refresh-token").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + oldSession + "\"}"))
                    .andExpect(status().isBadRequest());
        }
        login("NewSecret123@");
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"OldSecret123@\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredThirtyMinuteTokenIsRejectedByAnonymousResetEndpoint() throws Exception {
        String rawToken = issueToken();
        PasswordResetToken stored = resetTokens.findByUser(user).orElseThrow();
        // Advance the stored deadline instead of sleeping for 30 minutes.
        stored.setExpiryDate(Instant.now().minusSeconds(1));
        resetTokens.saveAndFlush(stored);

        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody(rawToken, "NewSecret123@")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng."));
        assertThat(resetTokens.findByUser(user).orElseThrow().isUsed()).isFalse();
        assertThat(encoder.matches("OldSecret123@", users.findById(user.getId()).orElseThrow().getPassword())).isTrue();
    }

    @Test
    void unreachableSmtpStillReturnsSamePublicResponse() throws Exception {
        int closedPort;
        try (ServerSocket socket = new ServerSocket(0)) {
            closedPort = socket.getLocalPort();
        }
        ReflectionTestUtils.setField(mailService, "port", closedPort);
        assertThat(forgot(user.getEmail())).isEqualTo(forgot("missing-" + UUID.randomUUID() + "@company.com"));
    }

    @Test
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
            assertThat(java.util.List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 400);
            assertThat(resetTokens.findByUser(user).orElseThrow().isUsed()).isTrue();
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }
}
