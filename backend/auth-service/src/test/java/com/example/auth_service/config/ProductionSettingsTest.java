package com.example.auth_service.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.assertj.core.api.Assertions.assertThat;

class ProductionSettingsTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withInitializer(context -> context.getEnvironment().setActiveProfiles("prod"))
            .withUserConfiguration(ProductionSettings.class);

    @Test void missingSecretsFailBeforeDatabaseStartup() {
        runner.run(context -> assertThat(context).hasFailed());
    }

    @Test void h2IsRejected() {
        runner.withPropertyValues("DB_URL=jdbc:h2:mem:test").run(context ->
                assertThat(context.getStartupFailure()).hasMessageContaining("PostgreSQL"));
    }

    @Test void completeConfigurationStartsAndWildcardCorsFails() {
        var configured = runner.withPropertyValues("DB_URL=jdbc:postgresql://localhost/test",
                "DB_USERNAME=test", "DB_PASSWORD=test-only", "JWT_SECRET=" + "A7!b".repeat(20),
                "APP_FRONTEND_URL=https://demo.example.test", "CORS_ALLOWED_ORIGINS=https://demo.example.test");
        configured.run(context -> assertThat(context).hasNotFailed());
        configured.withPropertyValues("CORS_ALLOWED_ORIGINS=*")
                .run(context -> assertThat(context).hasFailed());
    }
}
