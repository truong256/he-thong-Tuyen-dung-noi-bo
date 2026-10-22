package com.example.auth_service.config;

import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.repository.RoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/** H2 test/dev has no Flyway; initialize role definitions only, never user accounts. */
@Configuration
@Profile("dev | test")
public class RoleInitializer {
    @Bean
    CommandLineRunner initializeLocalRoles(RoleRepository roles) {
        return args -> {
            for (RoleName name : RoleName.values()) {
                if (roles.findByName(name).isEmpty()) roles.save(new Role(name, "Vai trò " + name));
            }
        };
    }
}
