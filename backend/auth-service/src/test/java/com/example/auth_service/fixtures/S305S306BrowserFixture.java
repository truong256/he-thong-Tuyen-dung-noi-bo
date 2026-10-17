package com.example.auth_service.fixtures;

import com.example.auth_service.AuthServiceApplication;
import com.example.auth_service.domain.sprint2.*;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.*;
import java.util.*;

/** Real HTTP server for browser tests. Only an isolated in-memory DB is supported. */
public class S305S306BrowserFixture {
    public static void main(String[] args) throws Exception {
        String fixtureFile = System.getenv("S306_E2E_FIXTURE_FILE");
        if (fixtureFile == null || fixtureFile.isBlank()) throw new IllegalArgumentException("Set S306_E2E_FIXTURE_FILE outside the repository");
        // Command-line properties override any DB_URL/dev settings. No existing database is touched.
        var app = new SpringApplicationBuilder(AuthServiceApplication.class).profiles("test").run(
                "--spring.profiles.active=test",
                "--spring.datasource.url=jdbc:h2:mem:s305s306_browser;MODE=PostgreSQL;DB_CLOSE_DELAY=0",
                "--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.datasource.username=sa", "--spring.datasource.password=",
                "--spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
                "--spring.flyway.enabled=false", "--server.port=8080");
        var users = app.getBean(UserRepository.class);
        var roles = app.getBean(RoleRepository.class);
        var encoder = app.getBean(PasswordEncoder.class);
        String runId = UUID.randomUUID().toString().substring(0, 8);
        String password = UUID.randomUUID() + "aA9!";
        var tx = new TransactionTemplate(app.getBean(PlatformTransactionManager.class));
        Map<String, Object> fixture = tx.execute(status -> {
            List<User> accounts = new ArrayList<>();
            for (int i = 0; i < 5; i++) {
                RoleName role = i == 0 ? RoleName.HR_MANAGER : i < 4 ? RoleName.RECRUITER : RoleName.CANDIDATE;
                User user = new User("s306-" + runId + "-" + i + "@test.invalid", encoder.encode(password));
                user.setFullName("S306 " + (i == 0 ? "HR Manager" : "Recruiter " + i));
                user.setRoles(Set.of(roles.findByName(role).orElseThrow()));
                user.setStatus("ACTIVE");
                accounts.add(users.saveAndFlush(user));
            }
            Department dept = new Department();
            dept.setCode("S306-" + runId); dept.setName("Phòng kiểm thử S3-05 và S3-06");
            dept.setActive(true); dept.setManagerUserId(accounts.getFirst().getId());
            dept = app.getBean(DepartmentRepository.class).saveAndFlush(dept);
            JobTitle job = new JobTitle();
            job.setCode("S306-JOB-" + runId); job.setTitle("Kỹ sư kiểm thử tiếng Việt");
            job.setDepartment(dept); job.setActive(true); job.setMinSalary(10_000_000L); job.setMaxSalary(30_000_000L);
            job = app.getBean(JobTitleRepository.class).saveAndFlush(job);
            RecruitmentRequisition req = new RecruitmentRequisition();
            req.setRequisitionCode("S306-SOURCE-" + runId); req.setTitle("Yêu cầu kiểm thử sao chép và phân công");
            req.setDepartmentId(dept.getId()); req.setJobTitleId(job.getId()); req.setCreatedByUserId(accounts.getFirst().getId());
            req.setQuantity(2); req.setStatus("APPROVED"); req.setSalaryMin(12_000_000L); req.setSalaryMax(20_000_000L);
            req.setNeededDate(java.time.LocalDate.now().plusMonths(2)); req.setTargetDate(req.getNeededDate());
            req.setJobDescription("Mô tả công việc dùng cho regression S3-05"); req.setCandidateRequirements("Yêu cầu ứng viên có kinh nghiệm Java và React");
            req.setReason("Kiểm thử riêng biệt"); req.setRecruitmentType("NEW");
            req = app.getBean(RecruitmentRequisitionRepository.class).saveAndFlush(req);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("password", password); result.put("sourceId", req.getId()); result.put("sourceCode", req.getRequisitionCode());
            result.put("managerEmail", accounts.getFirst().getEmail());
            result.put("recruiters", accounts.subList(1, 4).stream().map(u -> Map.of("id", u.getId(), "email", u.getEmail(), "name", u.getFullName())).toList());
            result.put("unauthorizedEmail", accounts.getLast().getEmail());
            return result;
        });
        Path output = Path.of(fixtureFile).toAbsolutePath();
        Files.writeString(output, app.getBean(ObjectMapper.class).writeValueAsString(fixture));
        try { Files.setPosixFilePermissions(output, java.nio.file.attribute.PosixFilePermissions.fromString("rw-------")); }
        catch (UnsupportedOperationException ignored) { /* Windows */ }
        System.out.println("S305_S306_BROWSER_FIXTURE_READY");
    }
}
