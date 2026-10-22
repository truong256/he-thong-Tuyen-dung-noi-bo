package com.example.auth_service.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import static org.assertj.core.api.Assertions.assertThat;

class DeploymentSafetyTest {
    @Test
    void legacyInitializerIsDisabledByDefault() {
        new ApplicationContextRunner().withUserConfiguration(DataInitializer.class)
                .run(context -> assertThat(context).hasNotFailed().doesNotHaveBean("initData"));
    }

    @Test
    void flywayVersionsAreUnique() throws Exception {
        var versions = new HashSet<String>();
        try (var paths = Files.list(Path.of("src/main/resources/db/migration"))) {
            for (var path : paths.filter(p -> p.getFileName().toString().startsWith("V")).toList()) {
                String version = path.getFileName().toString().split("__")[0];
                assertThat(versions.add(version)).as("Duplicate migration %s", version).isTrue();
            }
        }
    }
}
