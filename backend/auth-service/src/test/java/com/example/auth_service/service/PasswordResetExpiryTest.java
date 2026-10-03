package com.example.auth_service.service;

import com.example.auth_service.entity.PasswordResetToken;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mockStatic;

class PasswordResetExpiryTest {
    @Test
    void tokenExpiresExactlyAtTheThirtyMinuteDeadline() {
        Instant issuedAt = Instant.parse("2026-10-02T00:00:00Z");
        Instant deadline = issuedAt.plus(Duration.ofMinutes(30));
        Instant beforeDeadline = deadline.minusNanos(1);
        Instant afterDeadline = deadline.plusNanos(1);
        PasswordResetToken token = new PasswordResetToken();
        token.setExpiryDate(deadline);
        try (var clock = mockStatic(Instant.class, CALLS_REAL_METHODS)) {
            clock.when(Instant::now).thenReturn(beforeDeadline);
            assertThat(token.isExpired()).isFalse();
            clock.when(Instant::now).thenReturn(deadline);
            assertThat(token.isExpired()).isTrue();
            clock.when(Instant::now).thenReturn(afterDeadline);
            assertThat(token.isExpired()).isTrue();
        }
    }
}
