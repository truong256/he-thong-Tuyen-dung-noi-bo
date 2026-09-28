package com.example.auth_service.config;

import com.example.auth_service.entity.User;
import com.example.auth_service.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initData(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.findByEmail("admin@company.com").isEmpty()) {
                userRepository.save(new User(
                        "admin@company.com",
                        passwordEncoder.encode("123456"),
                        "ADMIN"
                ));
            }

            if (userRepository.findByEmail("recruiter@company.com").isEmpty()) {
                userRepository.save(new User(
                        "recruiter@company.com",
                        passwordEncoder.encode("123456"),
                        "RECRUITER"
                ));
            }

            if (userRepository.findByEmail("hr_manager@company.com").isEmpty()) {
                userRepository.save(new User(
                        "hr_manager@company.com",
                        passwordEncoder.encode("123456"),
                        "HR_MANAGER"
                ));
            }
        };
    }
}
