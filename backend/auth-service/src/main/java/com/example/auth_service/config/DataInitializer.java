package com.example.auth_service.config;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.core.env.Environment;

import java.time.Instant;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initData(RoleRepository roleRepository,
                                      UserRepository userRepository,
                                      DepartmentRepository departmentRepository,
                                      JobTitleRepository jobTitleRepository,
                                      PasswordEncoder passwordEncoder,
                                      Environment env) {
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
            String defaultSeedPassword = System.getenv().getOrDefault("SEED_ACCOUNT_PASSWORD", "Password123@");

            User adminUser = createUserIfMissing(userRepository, passwordEncoder, "admin@company.com", defaultSeedPassword,
                    "Quản trị viên Hệ thống", Set.of(roleMap.get(RoleName.ADMIN), roleMap.get(RoleName.HR_MANAGER)));

            createUserIfMissing(userRepository, passwordEncoder, "recruiter@company.com", defaultSeedPassword,
                    "Chuyên viên Tuyển dụng", Set.of(roleMap.get(RoleName.RECRUITER)));

            User hrManagerUser = createUserIfMissing(userRepository, passwordEncoder, "hr_manager@company.com", defaultSeedPassword,
                    "Trưởng phòng Nhân sự", Set.of(roleMap.get(RoleName.HR_MANAGER)));

            createUserIfMissing(userRepository, passwordEncoder, "interviewer@company.com", defaultSeedPassword,
                    "Người Phỏng vấn Kỹ thuật", Set.of(roleMap.get(RoleName.INTERVIEWER)));

            createUserIfMissing(userRepository, passwordEncoder, "hiring_manager@company.com", defaultSeedPassword,
                    "Quản lý Bộ phận Tuyển dụng", Set.of(roleMap.get(RoleName.HIRING_MANAGER)));

            createUserIfMissing(userRepository, passwordEncoder, "approver@company.com", defaultSeedPassword,
                    "Người Phê duyệt Tuyển dụng", Set.of(roleMap.get(RoleName.APPROVER)));

            createUserIfMissing(userRepository, passwordEncoder, "candidate@company.com", defaultSeedPassword,
                    "Ứng viên Nguyễn Văn A", Set.of(roleMap.get(RoleName.CANDIDATE)));

            createUserIfMissing(userRepository, passwordEncoder, "truong256@company.com", "#r7GDs^QRbhF",
                    "Kiểm thử viên Tự động", Set.of(roleMap.get(RoleName.CANDIDATE)));

            // 3. Seed default enterprise departments if none exist (only in non-test profiles)
            boolean isTestProfile = Arrays.asList(env.getActiveProfiles()).contains("test");
            if (!isTestProfile && departmentRepository.count() == 0 && adminUser != null) {
                Department bod = new Department(null, "Ban Tổng Giám Đốc (BOD)", "BOD",
                        "Điều hành chiến lược tổng thể doanh nghiệp", null, adminUser.getId(), true, Instant.now());
                bod = departmentRepository.save(bod);

                Department tech = new Department(null, "Khối Công nghệ & Kỹ thuật", "TECH",
                        "Nghiên cứu và phát triển toàn bộ hệ thống giải pháp phần mềm ATS", bod.getId(), adminUser.getId(), true, Instant.now());
                tech = departmentRepository.save(tech);

                Department devBe = new Department(null, "Phòng Phát triển Phần mềm Backend", "DEV-BE",
                        "Phát triển các dịch vụ backend, CSDL và API", tech.getId(), adminUser.getId(), true, Instant.now());
                devBe = departmentRepository.save(devBe);

                Department devFe = new Department(null, "Phòng Phát triển Giao diện Frontend", "DEV-FE",
                        "Xây dựng giao diện web ứng dụng ATS", tech.getId(), adminUser.getId(), true, Instant.now());
                devFe = departmentRepository.save(devFe);

                Department hrDept = new Department(null, "Phòng Tuyển dụng & Thu hút Nhân tài", "TA-REC",
                        "Tìm kiếm, tuyển chọn và điều phối phỏng vấn ứng viên", bod.getId(),
                        hrManagerUser != null ? hrManagerUser.getId() : adminUser.getId(), true, Instant.now());
                hrDept = departmentRepository.save(hrDept);

                // 4. Seed default job titles linked to departments if none exist
                if (jobTitleRepository.count() == 0) {
                    JobTitle beSenior = new JobTitle();
                    beSenior.setTitle("Kỹ sư Phần mềm Backend Cao cấp (Senior Backend Engineer)");
                    beSenior.setCode("BE-SR-01");
                    beSenior.setDepartment(devBe);
                    beSenior.setLevel("SENIOR");
                    beSenior.setJobFamily("TECH");
                    beSenior.setMinSalary(35000000L);
                    beSenior.setMaxSalary(55000000L);
                    beSenior.setJobDescription("Chịu trách nhiệm thiết kế, tối ưu hóa các dịch vụ backend vi mô (Microservices).");
                    beSenior.setKeyResponsibilities("Thiết kế RESTful APIs; Tối ưu truy vấn PostgreSQL; Bảo mật hệ thống");
                    beSenior.setRequirements("Tối thiểu 4+ năm kinh nghiệm Java/Spring Boot; Hiểu sâu transaction, concurrency");
                    beSenior.setCompetencies("Kiến trúc phần mềm; Tối ưu hiệu năng CSDL; Bảo mật hệ thống");
                    beSenior.setStandardHeadcount(15);
                    beSenior.setCurrentHeadcount(12);
                    beSenior.setActive(true);
                    jobTitleRepository.save(beSenior);

                    JobTitle feMid = new JobTitle();
                    feMid.setTitle("Kỹ sư Phát triển Giao diện (Middle Frontend Developer)");
                    feMid.setCode("FE-MID-02");
                    feMid.setDepartment(devFe);
                    feMid.setLevel("MIDDLE");
                    feMid.setJobFamily("TECH");
                    feMid.setMinSalary(22000000L);
                    feMid.setMaxSalary(35000000L);
                    feMid.setJobDescription("Xây dựng giao diện người dùng trực quan, responsive cho hệ thống ATS.");
                    feMid.setKeyResponsibilities("Phát triển component React 18 & TypeScript; Tối ưu Core Web Vitals");
                    feMid.setRequirements("2-4 năm kinh nghiệm React, TypeScript, CSS hiện đại");
                    feMid.setCompetencies("React & TypeScript; Tối ưu UI/UX; Kiểm thử Frontend");
                    feMid.setStandardHeadcount(16);
                    feMid.setCurrentHeadcount(14);
                    feMid.setActive(true);
                    jobTitleRepository.save(feMid);

                    JobTitle recSpecialist = new JobTitle();
                    recSpecialist.setTitle("Chuyên viên Tuyển dụng Nhân tài (Recruitment Specialist)");
                    recSpecialist.setCode("REC-SPEC-03");
                    recSpecialist.setDepartment(hrDept);
                    recSpecialist.setLevel("MIDDLE");
                    recSpecialist.setJobFamily("HR");
                    recSpecialist.setMinSalary(18000000L);
                    recSpecialist.setMaxSalary(28000000L);
                    recSpecialist.setJobDescription("Tìm kiếm, tiếp cận nguồn ứng viên tiềm năng và điều phối phỏng vấn.");
                    recSpecialist.setKeyResponsibilities("Sàng lọc CV; Lên lịch phỏng vấn; Chăm sóc ứng viên");
                    recSpecialist.setRequirements("2+ năm kinh nghiệm tuyển dụng ngành CNTT; Kỹ năng giao tiếp xuất sắc");
                    recSpecialist.setCompetencies("Tìm kiếm ứng viên; Phỏng vấn đánh giá; Đàm phán đãi ngộ");
                    recSpecialist.setStandardHeadcount(6);
                    recSpecialist.setCurrentHeadcount(5);
                    recSpecialist.setActive(true);
                    jobTitleRepository.save(recSpecialist);
                }
            }
        };
    }

    private User createUserIfMissing(UserRepository userRepository,
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
            return userRepository.save(user);
        }
        return existing.get();
    }
}
