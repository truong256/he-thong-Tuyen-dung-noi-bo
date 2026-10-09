package com.example.auth_service.config;

import com.example.auth_service.domain.sprint2.CommonCategory;
import com.example.auth_service.domain.sprint2.CompetencyCriterion;
import com.example.auth_service.domain.sprint2.CompetencyFramework;
import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.InterviewQuestion;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.CommonCategoryRepository;
import com.example.auth_service.repository.CompetencyCriterionRepository;
import com.example.auth_service.repository.CompetencyFrameworkRepository;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.InterviewQuestionRepository;
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
                                      CompetencyFrameworkRepository competencyFrameworkRepository,
                                      CompetencyCriterionRepository competencyCriterionRepository,
                                      InterviewQuestionRepository interviewQuestionRepository,
                                      CommonCategoryRepository commonCategoryRepository,
                                      PasswordEncoder passwordEncoder,
                                      Environment env,
                                      org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        return args -> {
            // 0. Ensure department_tree_lock table exists for hierarchy transactions
            try {
                jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS department_tree_lock (id INTEGER PRIMARY KEY CHECK (id = 1))");
                jdbcTemplate.update("INSERT INTO department_tree_lock(id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM department_tree_lock WHERE id=1)");
            } catch (Exception ex) {
                // Ignore if managed by Flyway or already exists
            }

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
                    "Quản trị viên Hệ thống", "Ban Tổng Giám Đốc (BOD)", Set.of(roleMap.get(RoleName.ADMIN)));

            createUserIfMissing(userRepository, passwordEncoder, "recruiter@company.com", defaultSeedPassword,
                    "Chuyên viên Tuyển dụng", "Phòng Tuyển dụng & Thu hút Nhân tài", Set.of(roleMap.get(RoleName.RECRUITER)));

            User hrManagerUser = createUserIfMissing(userRepository, passwordEncoder, "hr_manager@company.com", defaultSeedPassword,
                    "Trưởng phòng Nhân sự", "Phòng Tuyển dụng & Thu hút Nhân tài", Set.of(roleMap.get(RoleName.HR_MANAGER)));

            createUserIfMissing(userRepository, passwordEncoder, "interviewer@company.com", defaultSeedPassword,
                    "Người Phỏng vấn Kỹ thuật", "Khối Công nghệ & Kỹ thuật", Set.of(roleMap.get(RoleName.INTERVIEWER)));

            createUserIfMissing(userRepository, passwordEncoder, "hiring_manager@company.com", defaultSeedPassword,
                    "Quản lý Bộ phận Tuyển dụng", "Phòng Phát triển Phần mềm Backend", Set.of(roleMap.get(RoleName.HIRING_MANAGER)));

            createUserIfMissing(userRepository, passwordEncoder, "approver@company.com", defaultSeedPassword,
                    "Người Phê duyệt Tuyển dụng", "Ban Tổng Giám Đốc (BOD)", Set.of(roleMap.get(RoleName.APPROVER)));

            createUserIfMissing(userRepository, passwordEncoder, "candidate@company.com", defaultSeedPassword,
                    "Ứng viên Nguyễn Văn A", null, Set.of(roleMap.get(RoleName.CANDIDATE)));

            createUserIfMissing(userRepository, passwordEncoder, "truong256@company.com", "#r7GDs^QRbhF",
                    "Kiểm thử viên Tự động", null, Set.of(roleMap.get(RoleName.CANDIDATE)));

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
            }

            if (!isTestProfile) {
                User hmUser = userRepository.findByEmail("hiring_manager@company.com").orElse(null);
                if (hmUser != null) {
                    departmentRepository.findAll().stream()
                            .filter(d -> "DEV-BE".equalsIgnoreCase(d.getCode()))
                            .findFirst()
                            .ifPresent(d -> {
                                if (d.getManagerUserId() == null || !d.getManagerUserId().equals(hmUser.getId())) {
                                    d.setManagerUserId(hmUser.getId());
                                    departmentRepository.save(d);
                                }
                            });
                }
            }

            // 4. Seed default job titles linked to departments if none exist
            if (!isTestProfile && jobTitleRepository.count() == 0) {
                Department devBe = departmentRepository.findAll().stream()
                        .filter(d -> "DEV-BE".equalsIgnoreCase(d.getCode()))
                        .findFirst().orElse(null);
                Department devFe = departmentRepository.findAll().stream()
                        .filter(d -> "DEV-FE".equalsIgnoreCase(d.getCode()))
                        .findFirst().orElse(null);
                Department hrDept = departmentRepository.findAll().stream()
                        .filter(d -> "TA-REC".equalsIgnoreCase(d.getCode()))
                        .findFirst().orElse(null);

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

            // 5. Seed default competency frameworks, criteria, and interview questions if none exist
            if (!isTestProfile && competencyFrameworkRepository.count() == 0) {
                JobTitle beSenior = jobTitleRepository.findByCodeIgnoreCase("BE-SR-01").orElse(null);
                JobTitle feMid = jobTitleRepository.findByCodeIgnoreCase("FE-MID-02").orElse(null);
                JobTitle recSpecialist = jobTitleRepository.findByCodeIgnoreCase("REC-SPEC-03").orElse(null);

                    // Framework 1: Backend Architecture & Development
                    CompetencyFramework fwBe = new CompetencyFramework();
                    fwBe.setCompetencyName("Năng lực Lập trình & Kiến trúc Backend");
                    fwBe.setDescription("Khung năng lực đánh giá chuyên môn backend, cơ sở dữ liệu, kiến trúc phân tán và tối ưu hiệu năng.");
                    fwBe.setCategory("KỸ THUẬT");
                    fwBe.setWeightPercent(100);
                    fwBe.setJobTitle(beSenior);
                    fwBe = competencyFrameworkRepository.save(fwBe);
                    if (beSenior != null) {
                        beSenior.setCompetencyFramework(fwBe);
                        jobTitleRepository.save(beSenior);
                    }

                    CompetencyCriterion critBe01 = new CompetencyCriterion();
                    critBe01.setCompetencyFramework(fwBe);
                    critBe01.setCriterionCode("CRIT-BE-01");
                    critBe01.setCriterionName("Kiến thức Chuyên sâu Java & Spring Boot");
                    critBe01.setDescription("Khả năng làm chủ Spring Boot, JPA/Hibernate, Transaction Management và Dependency Injection.");
                    critBe01.setWeightPercent(40);
                    critBe01.setActive(true);
                    critBe01 = competencyCriterionRepository.save(critBe01);

                    CompetencyCriterion critBe02 = new CompetencyCriterion();
                    critBe02.setCompetencyFramework(fwBe);
                    critBe02.setCriterionCode("CRIT-BE-02");
                    critBe02.setCriterionName("Thiết kế Hệ thống & Concurrency");
                    critBe02.setDescription("Khả năng phân tích Race Condition, Deadlock, Thread Pool và kiến trúc phi tập trung.");
                    critBe02.setWeightPercent(30);
                    critBe02.setActive(true);
                    critBe02 = competencyCriterionRepository.save(critBe02);

                    CompetencyCriterion critBe03 = new CompetencyCriterion();
                    critBe03.setCompetencyFramework(fwBe);
                    critBe03.setCriterionCode("CRIT-BE-03");
                    critBe03.setCriterionName("Tối ưu Hóa CSDL & PostgreSQL");
                    critBe03.setDescription("Phân tích kế hoạch thực thi EXPLAIN, đánh index tối ưu, giải quyết N+1 query.");
                    critBe03.setWeightPercent(30);
                    critBe03.setActive(true);
                    critBe03 = competencyCriterionRepository.save(critBe03);

                    // Framework 2: Frontend Engineering
                    CompetencyFramework fwFe = new CompetencyFramework();
                    fwFe.setCompetencyName("Năng lực Lập trình Giao diện Web (Frontend)");
                    fwFe.setDescription("Khung đánh giá năng lực phát triển giao diện React, TypeScript, Responsive và State Management.");
                    fwFe.setCategory("KỸ THUẬT");
                    fwFe.setWeightPercent(100);
                    fwFe.setJobTitle(feMid);
                    fwFe = competencyFrameworkRepository.save(fwFe);
                    if (feMid != null) {
                        feMid.setCompetencyFramework(fwFe);
                        jobTitleRepository.save(feMid);
                    }

                    CompetencyCriterion critFe01 = new CompetencyCriterion();
                    critFe01.setCompetencyFramework(fwFe);
                    critFe01.setCriterionCode("CRIT-FE-01");
                    critFe01.setCriterionName("Lập trình React & TypeScript");
                    critFe01.setDescription("Thành thạo React Hooks, Custom Hooks, Type Safety, Component Lifecycle.");
                    critFe01.setWeightPercent(50);
                    critFe01.setActive(true);
                    critFe01 = competencyCriterionRepository.save(critFe01);

                    CompetencyCriterion critFe02 = new CompetencyCriterion();
                    critFe02.setCompetencyFramework(fwFe);
                    critFe02.setCriterionCode("CRIT-FE-02");
                    critFe02.setCriterionName("Responsive UI & Web Vitals");
                    critFe02.setDescription("Khả năng responsive đa thiết bị, CSS Variables, tối ưu LCP, FID, CLS.");
                    critFe02.setWeightPercent(50);
                    critFe02.setActive(true);
                    critFe02 = competencyCriterionRepository.save(critFe02);

                    // Framework 3: Recruitment & Talent Acquisition
                    CompetencyFramework fwHr = new CompetencyFramework();
                    fwHr.setCompetencyName("Năng lực Tuyển dụng & Đánh giá Nhân tài");
                    fwHr.setDescription("Khung đánh giá năng lực sàng lọc, phỏng vấn hành vi và đàm phán đãi ngộ với ứng viên.");
                    fwHr.setCategory("NHÂN SỰ");
                    fwHr.setWeightPercent(100);
                    fwHr.setJobTitle(recSpecialist);
                    fwHr = competencyFrameworkRepository.save(fwHr);
                    if (recSpecialist != null) {
                        recSpecialist.setCompetencyFramework(fwHr);
                        jobTitleRepository.save(recSpecialist);
                    }

                    CompetencyCriterion critHr01 = new CompetencyCriterion();
                    critHr01.setCompetencyFramework(fwHr);
                    critHr01.setCriterionCode("CRIT-HR-01");
                    critHr01.setCriterionName("Kỹ năng Phỏng vấn Hành vi");
                    critHr01.setDescription("Kỹ thuật phỏng vấn STAR, đánh giá văn hóa tổ chức và sàng lọc năng lực ứng viên.");
                    critHr01.setWeightPercent(50);
                    critHr01.setActive(true);
                    critHr01 = competencyCriterionRepository.save(critHr01);

                    CompetencyCriterion critHr02 = new CompetencyCriterion();
                    critHr02.setCompetencyFramework(fwHr);
                    critHr02.setCriterionCode("CRIT-HR-02");
                    critHr02.setCriterionName("Đàm phán Đãi ngộ & Offer");
                    critHr02.setDescription("Năng lực nắm bắt kỳ vọng, giải thích gói đãi ngộ và chốt offer hiệu quả.");
                    critHr02.setWeightPercent(50);
                    critHr02.setActive(true);
                    critHr02 = competencyCriterionRepository.save(critHr02);

                    // Seed initial interview questions
                    if (interviewQuestionRepository.count() == 0) {
                        InterviewQuestion q1 = new InterviewQuestion();
                        q1.setQuestionText("Giải thích cơ chế hoạt động của Garbage Collection trong JVM và các cách nhận biết, phòng tránh Memory Leak trong ứng dụng Java?");
                        q1.setCategory("Java Core");
                        q1.setDifficultyLevel("HARD");
                        q1.setSuggestedAnswer("Nêu các thế hệ Young Gen (Eden, Survivor), Old Gen, Metaspace; Các thuật toán GC (G1, ZGC); Dùng heap dump, VisualVM, tránh static references và unclosed resources.");
                        q1.setCompetencyCriterion(critBe01);
                        q1.setActive(true);
                        interviewQuestionRepository.save(q1);

                        InterviewQuestion q2 = new InterviewQuestion();
                        q2.setQuestionText("Trình bày cách xử lý Race Condition khi cập nhật số lượng tuyển dụng đồng thời giữa nhiều thread trong Spring Boot?");
                        q2.setCategory("Concurrency");
                        q2.setDifficultyLevel("HARD");
                        q2.setSuggestedAnswer("Áp dụng Optimistic Locking (@Version) hoặc Pessimistic Locking (PESSIMISTIC_WRITE); Sử dụng Distributed Lock qua Redis/Redisson nếu phân tán nhiều instance.");
                        q2.setCompetencyCriterion(critBe02);
                        q2.setActive(true);
                        interviewQuestionRepository.save(q2);

                        InterviewQuestion q3 = new InterviewQuestion();
                        q3.setQuestionText("Khi một API tìm kiếm ứng viên bị chậm, các bước bạn thực hiện để chẩn đoán và tối ưu câu lệnh PostgreSQL là gì?");
                        q3.setCategory("Database");
                        q3.setDifficultyLevel("MEDIUM");
                        q3.setSuggestedAnswer("Sử dụng EXPLAIN ANALYZE kiểm tra Seq Scan vs Index Scan; Đánh B-tree hoặc GIN index phù hợp; Tránh SELECT *; Đặt fetch size và phân trang đúng.");
                        q3.setCompetencyCriterion(critBe03);
                        q3.setActive(true);
                        interviewQuestionRepository.save(q3);

                        InterviewQuestion q4 = new InterviewQuestion();
                        q4.setQuestionText("Giải thích vòng đời component trong React Hooks và so sánh sự khác biệt giữa useEffect và useLayoutEffect?");
                        q4.setCategory("React");
                        q4.setDifficultyLevel("MEDIUM");
                        q4.setSuggestedAnswer("useEffect chạy bất đồng bộ sau khi browser vẽ UI; useLayoutEffect chạy đồng bộ ngay sau khi DOM cập nhật trước khi browser vẽ, thích hợp khi cần đo kích thước DOM để tránh giật hình.");
                        q4.setCompetencyCriterion(critFe01);
                        q4.setActive(true);
                        interviewQuestionRepository.save(q4);

                        InterviewQuestion q5 = new InterviewQuestion();
                        q5.setQuestionText("Làm thế nào để phòng chống hiện tượng giật layout (Cumulative Layout Shift - CLS) và tối ưu điểm số Core Web Vitals trên giao diện web đa thiết bị?");
                        q5.setCategory("Web Performance");
                        q5.setDifficultyLevel("MEDIUM");
                        q5.setSuggestedAnswer("Đặt trước kích thước width/height hoặc aspect-ratio cho ảnh và video; Dành sẵn khoảng trống cho banner động; Dùng font-display: optional hoặc swap kèm preload.");
                        q5.setCompetencyCriterion(critFe02);
                        q5.setActive(true);
                        interviewQuestionRepository.save(q5);

                        InterviewQuestion q6 = new InterviewQuestion();
                        q6.setQuestionText("Bạn xử lý tình huống như thế nào khi một ứng viên xuất sắc nhận được 2 offer cạnh tranh khác có mức lương cao hơn 15% so với khung của công ty?");
                        q6.setCategory("Negotiation");
                        q6.setDifficultyLevel("MEDIUM");
                        q6.setSuggestedAnswer("Tìm hiểu động lực sâu xa của ứng viên (cơ hội thăng tiến, môi trường, công nghệ); Nhấn mạnh tổng đãi ngộ Total Rewards (thưởng quý, đào tạo, văn hóa); Thảo luận với Hiring Manager về lộ trình xem xét lương sớm sau thử việc.");
                        q6.setCompetencyCriterion(critHr02);
                        q6.setActive(true);
                        interviewQuestionRepository.save(q6);
                    }
                }

            // 6. Seed Common Categories if empty
            if (commonCategoryRepository.count() == 0) {
                seedCategories(commonCategoryRepository);
            }
        };
    }

    private User createUserIfMissing(UserRepository userRepository,
                                     PasswordEncoder passwordEncoder,
                                     String email,
                                     String rawPassword,
                                     String fullName,
                                     String department,
                                     Set<Role> roles) {
        var existing = userRepository.findByEmail(email);
        if (existing.isEmpty()) {
            User user = new User(email, passwordEncoder.encode(rawPassword));
            user.setFullName(fullName);
            user.setDepartment(department);
            user.setRoles(roles);
            user.setStatus("ACTIVE");
            return userRepository.save(user);
        } else {
            User user = existing.get();
            boolean changed = false;
            if (!user.getRoles().equals(roles)) {
                user.setRoles(roles);
                changed = true;
            }
            if (department != null && (user.getDepartment() == null || !department.equals(user.getDepartment()))) {
                user.setDepartment(department);
                changed = true;
            }
            return changed ? userRepository.save(user) : user;
        }
    }

    private void seedCategories(CommonCategoryRepository repo) {
        // 1. Employment Types
        repo.save(new CommonCategory(null, "EMPLOYMENT_TYPE", "FULL_TIME", "Toàn thời gian (Full-time)", 1, true));
        repo.save(new CommonCategory(null, "EMPLOYMENT_TYPE", "PART_TIME", "Bán thời gian (Part-time)", 2, true));
        repo.save(new CommonCategory(null, "EMPLOYMENT_TYPE", "INTERN", "Thực tập sinh (Internship)", 3, true));
        repo.save(new CommonCategory(null, "EMPLOYMENT_TYPE", "CONTRACTOR", "Hợp đồng thời vụ (Contract)", 4, true));
        repo.save(new CommonCategory(null, "EMPLOYMENT_TYPE", "FREELANCE", "Cộng tác viên (Freelancer)", 5, true));

        // 2. Work Locations
        repo.save(new CommonCategory(null, "WORK_LOCATION", "HN_HQ", "Hà Nội - Trụ sở chính (Cầu Giấy)", 1, true));
        repo.save(new CommonCategory(null, "WORK_LOCATION", "HCM_BRANCH", "TP. Hồ Chí Minh - Chi nhánh Quận 1", 2, true));
        repo.save(new CommonCategory(null, "WORK_LOCATION", "DN_BRANCH", "Đà Nẵng - Trung tâm R&D", 3, true));
        repo.save(new CommonCategory(null, "WORK_LOCATION", "REMOTE", "Làm việc từ xa (Remote 100%)", 4, true));
        repo.save(new CommonCategory(null, "WORK_LOCATION", "HYBRID", "Linh hoạt kết hợp (Hybrid 3+2)", 5, true));

        // 3. Education Levels
        repo.save(new CommonCategory(null, "EDUCATION_LEVEL", "HIGH_SCHOOL", "Trung học phổ thông", 1, true));
        repo.save(new CommonCategory(null, "EDUCATION_LEVEL", "VOCATIONAL", "Trung cấp nghề", 2, true));
        repo.save(new CommonCategory(null, "EDUCATION_LEVEL", "COLLEGE", "Cao đẳng chuyên nghiệp", 3, true));
        repo.save(new CommonCategory(null, "EDUCATION_LEVEL", "BACHELOR", "Cử nhân / Kỹ sư Đại học", 4, true));
        repo.save(new CommonCategory(null, "EDUCATION_LEVEL", "MASTER", "Thạc sĩ", 5, true));
        repo.save(new CommonCategory(null, "EDUCATION_LEVEL", "DOCTORATE", "Tiến sĩ", 6, true));

        // 4. Candidate Sources
        repo.save(new CommonCategory(null, "CANDIDATE_SOURCE", "CAREER_SITE", "Cổng tuyển dụng nội bộ (Career Portal)", 1, true));
        repo.save(new CommonCategory(null, "CANDIDATE_SOURCE", "LINKEDIN", "Mạng xã hội nghề nghiệp LinkedIn", 2, true));
        repo.save(new CommonCategory(null, "CANDIDATE_SOURCE", "TOPCV", "Nền tảng tuyển dụng TopCV", 3, true));
        repo.save(new CommonCategory(null, "CANDIDATE_SOURCE", "VIETNAMWORKS", "Nền tảng việc làm VietnamWorks", 4, true));
        repo.save(new CommonCategory(null, "CANDIDATE_SOURCE", "REFERRAL", "Giới thiệu nội bộ (Employee Referral)", 5, true));
        repo.save(new CommonCategory(null, "CANDIDATE_SOURCE", "HEADHUNTER", "Đối tác Headhunter", 6, true));

        // 5. Rejection Reasons
        repo.save(new CommonCategory(null, "REJECTION_REASON", "SKILLS_MISMATCH", "Chưa phù hợp yêu cầu kỹ thuật", 1, true));
        repo.save(new CommonCategory(null, "REJECTION_REASON", "EXPERIENCE_LACK", "Chưa đủ số năm kinh nghiệm yêu cầu", 2, true));
        repo.save(new CommonCategory(null, "REJECTION_REASON", "SALARY_MISMATCH", "Mức lương kỳ vọng vượt khung ngân sách", 3, true));
        repo.save(new CommonCategory(null, "REJECTION_REASON", "CANDIDATE_DECLINED", "Ứng viên chủ động từ chối offer", 4, true));
        repo.save(new CommonCategory(null, "REJECTION_REASON", "FAILED_INTERVIEW", "Không đạt phỏng vấn chuyên môn", 5, true));

        // 6. Interview Types
        repo.save(new CommonCategory(null, "INTERVIEW_TYPE", "DIRECT_OFFICE", "Phỏng vấn trực tiếp tại văn phòng", 1, true));
        repo.save(new CommonCategory(null, "INTERVIEW_TYPE", "ONLINE_MEET", "Phỏng vấn trực tuyến (Google Meet / Teams)", 2, true));
        repo.save(new CommonCategory(null, "INTERVIEW_TYPE", "TECHNICAL_TEST", "Bài kiểm tra kỹ thuật (Coding / Test)", 3, true));
        repo.save(new CommonCategory(null, "INTERVIEW_TYPE", "HR_SCREENING", "Sàng lọc sơ bộ qua điện thoại (Phone Screening)", 4, true));

        // 7. Skill Tags
        repo.save(new CommonCategory(null, "SKILL_TAG", "JAVA_SPRING", "Java & Spring Boot Framework", 1, true));
        repo.save(new CommonCategory(null, "SKILL_TAG", "REACT_TS", "React, TypeScript & Frontend Modern", 2, true));
        repo.save(new CommonCategory(null, "SKILL_TAG", "PYTHON_AI", "Python, Machine Learning & AI", 3, true));
        repo.save(new CommonCategory(null, "SKILL_TAG", "DEVOPS_CLOUD", "DevOps, Docker, CI/CD & Cloud", 4, true));
        repo.save(new CommonCategory(null, "SKILL_TAG", "QA_AUTOMATION", "Kiểm thử tự động & QA/QC", 5, true));
        repo.save(new CommonCategory(null, "SKILL_TAG", "PRODUCT_MGMT", "Quản lý sản phẩm & Business Analysis", 6, true));
    }
}
