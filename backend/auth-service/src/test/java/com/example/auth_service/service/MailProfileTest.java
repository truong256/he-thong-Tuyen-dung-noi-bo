package com.example.auth_service.service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class MailProfileTest {
    private void check(String profiles, Class<? extends MailService> expected) {
        new ApplicationContextRunner()
                .withInitializer(context -> context.getEnvironment().setActiveProfiles(profiles.split(",")))
                .withUserConfiguration(DevMailService.class, SmtpMailService.class)
                .run(context -> {
                    assertThat(context).hasSingleBean(MailService.class);
                    assertThat(context.getBean(MailService.class)).isInstanceOf(expected);
                });
    }

    @Test
    void defaultAndProductionUseSmtp() {
        new ApplicationContextRunner()
                .withUserConfiguration(DevMailService.class, SmtpMailService.class)
                .run(context -> {
                    assertThat(context).hasSingleBean(MailService.class);
                    assertThat(context.getBean(MailService.class)).isInstanceOf(SmtpMailService.class);
                });
        check("prod", SmtpMailService.class);
    }

    @Test
    void developmentOnlyUsesSmtpWhenExplicitlyEnabled() {
        check("dev", DevMailService.class);
        check("dev,smtp", SmtpMailService.class);
    }

    @Test
    void testProfileAlwaysSimulatesMail() {
        check("test", DevMailService.class);
        check("test,smtp", DevMailService.class);
        check("dev,test,smtp", DevMailService.class);
    }
}
