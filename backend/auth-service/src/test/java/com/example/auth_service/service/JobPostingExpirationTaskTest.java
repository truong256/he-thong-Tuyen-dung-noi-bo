package com.example.auth_service.service;

import com.example.auth_service.dto.AutoExpireResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JobPostingExpirationTaskTest {

    private JobPostingService service;
    private JobPostingExpirationTask task;

    @BeforeEach
    void setUp() {
        service = mock(JobPostingService.class);
        task = new JobPostingExpirationTask(service);
    }

    @Test
    void usesVietnamDateEvenWhenUtcIsStillPreviousDay() {
        ZonedDateTime instant =
                ZonedDateTime.parse("2026-10-21T17:00:00Z");

        ZoneId vietnam = ZoneId.of("Asia/Ho_Chi_Minh");

        LocalDate vietnamDate = instant
                .withZoneSameInstant(vietnam)
                .toLocalDate();

        assertEquals(LocalDate.of(2026, 10, 22), vietnamDate);

        AutoExpireResult result = mock(AutoExpireResult.class);
        when(result.getMessage()).thenReturn("OK");

        when(service.expireDueJobPostings(vietnamDate))
                .thenReturn(result);

        try (MockedStatic<LocalDate> dates =
                     mockStatic(LocalDate.class, CALLS_REAL_METHODS)) {
            dates.when(() -> LocalDate.now(vietnam))
                    .thenReturn(vietnamDate);

            dates.clearInvocations();

            task.runDailyExpirationTask();

            dates.verify(() -> LocalDate.now(vietnam));
            verify(service).expireDueJobPostings(vietnamDate);
        }
    }

    @Test
    void defaultScheduleRunsAtNextVietnamMidnight() throws Exception {
        Scheduled scheduled = JobPostingExpirationTask.class
                .getMethod("runDailyExpirationTask")
                .getAnnotation(Scheduled.class);

        assertNotNull(scheduled);
        assertEquals("Asia/Ho_Chi_Minh", scheduled.zone());
        assertEquals(
                "${app.job-posting.expiry-cron:0 0 0 * * ?}",
                scheduled.cron()
        );

        String expression = scheduled.cron();
        String defaultCron = expression.substring(
                expression.indexOf(':') + 1,
                expression.length() - 1
        );

        CronExpression cron = CronExpression.parse(defaultCron);

        ZonedDateTime beforeMidnight = ZonedDateTime.of(
                2026, 10, 21,
                23, 59, 59, 0,
                ZoneId.of(scheduled.zone())
        );

        ZonedDateTime nextRun = cron.next(beforeMidnight);

        assertNotNull(nextRun);
        assertEquals(beforeMidnight.plusSeconds(1), nextRun);
        assertEquals(nextRun.plusDays(1), cron.next(nextRun));
    }

    @Test
    void handlesServiceFailureAndCanRunAgain() {
        AutoExpireResult result = mock(AutoExpireResult.class);
        when(result.getMessage()).thenReturn("OK");

        when(service.expireDueJobPostings(any(LocalDate.class)))
                .thenThrow(new RuntimeException("Temporary failure"))
                .thenReturn(result);

        assertDoesNotThrow(() -> task.runDailyExpirationTask());
        assertDoesNotThrow(() -> task.runDailyExpirationTask());

        verify(service, times(2))
                .expireDueJobPostings(any(LocalDate.class));
    }
}