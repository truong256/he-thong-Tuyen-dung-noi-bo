package com.example.auth_service.config;

import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initData(RoleRepository roleRepository,
                                      UserRepository userRepository,
                                      PasswordEncoder passwordEncoder) {
        return args -> {
            // 1. Seed 7 roles if not present
            Map<RoleName, Role> roleMap = new HashMap<>();
            for (RoleName rn : RoleName.values()) {
                Role role = roleRepository.findByName(rn).orElseGet(() -> {
                    Role newRole = new Role(rn, "Vai trò " + rn.name());
                    return roleRepository.save(newRole);
                });
                roleMap.put(rn, role);
            }

            // 2. Helper to create user if not exists
            createUserIfMissing(userRepository, passwordEncoder, "admin@company.com", "123456",
                    "Quản trị viên Hệ thống", Set.of(roleMap.get(RoleName.ADMIN), roleMap.get(RoleName.HR_MANAGER)));

            createUserIfMissing(userRepository, passwordEncoder, "recruiter@company.com", "123456",
                    "Chuyên viên Tuyển dụng", Set.of(roleMap.get(RoleName.RECRUITER)));

            createUserIfMissing(userRepository, passwordEncoder, "hr_manager@company.com", "123456",
                    "Trưởng phòng Nhân sự", Set.of(roleMap.get(RoleName.HR_MANAGER)));

            createUserIfMissing(userRepository, passwordEncoder, "interviewer@company.com", "123456",
                    "Người Phỏng vấn Kỹ thuật", Set.of(roleMap.get(RoleName.INTERVIEWER)));

            createUserIfMissing(userRepository, passwordEncoder, "hiring_manager@company.com", "123456",
                    "Quản lý Bộ phận Tuyển dụng", Set.of(roleMap.get(RoleName.HIRING_MANAGER)));

            createUserIfMissing(userRepository, passwordEncoder, "approver@company.com", "123456",
                    "Người Phê duyệt Tuyển dụng", Set.of(roleMap.get(RoleName.APPROVER)));

            createUserIfMissing(userRepository, passwordEncoder, "candidate@company.com", "123456",
                    "Ứng viên Nguyễn Văn A", Set.of(roleMap.get(RoleName.CANDIDATE)));
        };
    }

    private void createUserIfMissing(UserRepository userRepository,
                                     PasswordEncoder passwordEncoder,
                                     String email,
                                     String rawPassword,
                                     String fullName,
                                     Set<Role> roles) {
        var existing = userRepository.findByEmail(email);
        if (existing.isEmpty()) {
            User user = new User(email, passwordEncoder.encode(rawPassword));
            user.setFullName(fullName);
            user.setRoles(roles);
            user.setStatus("ACTIVE");
            userRepository.save(user);
        } else {
            User u = existing.get();
            if (u.getRoles() == null || u.getRoles().isEmpty()) {
                u.setRoles(roles);
                userRepository.save(u);
            }
        }
    }
}
