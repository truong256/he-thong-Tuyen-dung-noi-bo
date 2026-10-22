package com.example.auth_service.config;

import com.example.auth_service.service.DemoSeedService;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("demo-seed")
@ConditionalOnProperty(name = "app.demo-seed.enabled", havingValue = "true")
public class DemoSeedRunner {
    @Bean
    @ConditionalOnProperty(name = "app.demo-seed.run-and-exit", havingValue = "true")
    ApplicationRunner demoSeed(DemoSeedService service, ConfigurableApplicationContext context) {
        return args -> {
            if (!context.getEnvironment().getProperty("app.demo-seed.run-and-exit", Boolean.class, false)) {
                throw new IllegalStateException("Demo seed requires the explicit one-off seeder.sh command");
            }
            service.seed();
            SpringApplication.exit(context, () -> 0);
        };
    }
}
