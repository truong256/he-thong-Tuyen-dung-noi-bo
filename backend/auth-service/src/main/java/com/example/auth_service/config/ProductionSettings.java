package com.example.auth_service.config;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

@Configuration
@Profile("prod")
public class ProductionSettings {
    @Bean
    static BeanFactoryPostProcessor validateProductionSettings(Environment env) {
        return beanFactory -> {
            if (Arrays.asList(env.getActiveProfiles()).contains("dev")) {
                throw new IllegalStateException("prod and dev profiles cannot be combined");
            }
            String databaseUrl = required(env, "DB_URL");
            if (!databaseUrl.startsWith("jdbc:postgresql://") || databaseUrl.matches("(?i).*[?&](password|user)=.*")
                    || databaseUrl.contains("@")) {
                throw new IllegalStateException("Production requires a PostgreSQL JDBC URL");
            }
            required(env, "DB_USERNAME");
            required(env, "DB_PASSWORD");
            String jwt = required(env, "JWT_SECRET");
            if (jwt.getBytes(StandardCharsets.UTF_8).length < 64 || jwt.contains("DevSecret") || jwt.contains("TestSecret")) {
                throw new IllegalStateException("JWT_SECRET must be an independent secret of at least 64 bytes");
            }
            String frontend = required(env, "APP_FRONTEND_URL");
            validateOrigin(frontend);
            var origins = Arrays.stream(required(env, "CORS_ALLOWED_ORIGINS").split(","))
                    .map(String::trim).toList();
            origins.forEach(ProductionSettings::validateOrigin);
            if (!origins.contains(frontend)) {
                throw new IllegalStateException("CORS_ALLOWED_ORIGINS must include APP_FRONTEND_URL");
            }
        };
    }

    private static String required(Environment env, String key) {
        String value = env.getProperty(key);
        if (value == null || value.isBlank()) throw new IllegalStateException("Missing required setting: " + key);
        return value;
    }

    private static void validateOrigin(String value) {
        URI uri = URI.create(value);
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getQuery() != null || uri.getFragment() != null || !uri.getPath().isEmpty()) {
            throw new IllegalStateException("Frontend and CORS origins must be exact HTTPS origins without paths");
        }
    }
}
