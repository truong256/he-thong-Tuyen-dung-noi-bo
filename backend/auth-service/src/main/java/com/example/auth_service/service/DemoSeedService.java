package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.*;
import com.example.auth_service.dto.*;
import com.example.auth_service.dto.budget.CreateBudgetRequest;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.UserPrincipal;
import java.time.LocalDate;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Explicit one-off seed. A single transaction owns all demo data and its ledger. */
@Service
@Profile("demo-seed")
public class DemoSeedService {
    private static final Logger log = LoggerFactory.getLogger(DemoSeedService.class);
    private static final String SEED_KEY = "recruitment-demo-v1";
    private static final List<String> TABLES = List.of("users", "roles", "departments", "job_titles",
            "common_categories", "competency_frameworks", "competency_criteria", "headcount_budgets",
            "recruitment_requisitions", "requisition_approval_configurations",
            "requisition_approval_configuration_steps", "requisition_approval_snapshots",
            "requisition_approval_logs", "requisition_assignments", "requisition_assignment_histories",
            "job_postings", "job_posting_audit_logs", "budget_audit_logs");
    private final Environment env;
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwords;
    private final DepartmentRepository departments;
    private final JobTitleRepository jobTitles;
    private final CommonCategoryRepository categories;
    private final CompetencyFrameworkRepository frameworks;
    private final CompetencyCriterionRepository criteria;
    private final DepartmentService departmentService;
    private final RequisitionApprovalConfigurationService configurations;
    private final HeadcountBudgetService budgets;
    private final RecruitmentRequisitionService requisitions;
    private final RequisitionApprovalWorkflowService approvals;
    private final RequisitionAssignmentService assignments;
    private final JobPostingService postings;

    public DemoSeedService(Environment env, JdbcTemplate jdbc, UserRepository users, RoleRepository roles,
            PasswordEncoder passwords, DepartmentRepository departments, JobTitleRepository jobTitles,
            CommonCategoryRepository categories, CompetencyFrameworkRepository frameworks,
            CompetencyCriterionRepository criteria, DepartmentService departmentService,
            RequisitionApprovalConfigurationService configurations, HeadcountBudgetService budgets,
            RecruitmentRequisitionService requisitions, RequisitionApprovalWorkflowService approvals,
            RequisitionAssignmentService assignments, JobPostingService postings) {
        this.env = env; this.jdbc = jdbc; this.users = users; this.roles = roles; this.passwords = passwords;
        this.departments = departments; this.jobTitles = jobTitles; this.categories = categories;
        this.frameworks = frameworks; this.criteria = criteria; this.departmentService = departmentService;
        this.configurations = configurations; this.budgets = budgets; this.requisitions = requisitions;
        this.approvals = approvals; this.assignments = assignments; this.postings = postings;
    }

    @Transactional
    public void seed() {
        if (!env.getProperty("app.demo-seed.enabled", Boolean.class, false)) {
            throw new IllegalStateException("DEMO_SEED_ENABLED=true is required");
        }
        // Serialize all seed attempts, including concurrent first runs.
        departments.lockTree();
        var previous = jdbc.queryForList("SELECT record_counts FROM demo_seed_runs WHERE seed_key = ?", SEED_KEY);
        if (!previous.isEmpty()) {
            log.info("Demo seed already completed; created=0; original counts={}", previous.getFirst().get("record_counts"));
            return;
        }
        Map<RoleName, String> secrets = readSecrets();
        for (RoleName role : RoleName.values()) {
            if (users.findByEmail(email(role)).isPresent()) {
                throw new IllegalStateException("Demo email collision; existing accounts will not be modified");
            }
        }
        if (departments.findByCodeIgnoreCase("DEMO-ENG").isPresent()
                || jobTitles.findByCodeIgnoreCase("DEMO-JAVA").isPresent()) {
            throw new IllegalStateException("Demo catalogue collision; existing data will not be modified");
        }
        Map<String, Long> before = counts();
        Map<RoleName, User> accounts = new EnumMap<>(RoleName.class);
        for (RoleName role : RoleName.values()) {
            Role savedRole = roles.findByName(role).orElseGet(() -> roles.save(new Role(role, "Vai trò " + role)));
            User user = new User(email(role), passwords.encode(secrets.get(role)));
            user.setFullName("Demo " + role.name());
            user.setRoles(Set.of(savedRole));
            user.setStatus("ACTIVE");
            accounts.put(role, users.saveAndFlush(user));
        }
        User hr = accounts.get(RoleName.HR_MANAGER);
        User manager = accounts.get(RoleName.HIRING_MANAGER);
        User approver = accounts.get(RoleName.APPROVER);
        User recruiter = accounts.get(RoleName.RECRUITER);
        var priorAuthentication = SecurityContextHolder.getContext().getAuthentication();
        try {
            authenticate(hr, "ROLE_HR_MANAGER", "DEPARTMENT_MANAGE");
            Long departmentId = departmentService.create(new DepartmentRequest("Phòng Kỹ thuật Demo", "DEMO-ENG",
                    "Dữ liệu giả lập cho báo cáo thực tập", null, manager.getId())).id();
            manager.setDepartment("Phòng Kỹ thuật Demo");
            users.save(manager);
            JobTitle title = new JobTitle();
            title.setCode("DEMO-JAVA"); title.setTitle("Kỹ sư Java Demo");
            title.setDepartment(departments.findById(departmentId).orElseThrow());
            title.setLevel("MIDDLE"); title.setJobFamily("TECH"); title.setActive(true);
            title.setMinSalary(20_000_000L); title.setMaxSalary(30_000_000L);
            title.setStandardHeadcount(10); title.setCurrentHeadcount(0);
            title.setJobDescription("Phát triển API tuyển dụng bằng Java và PostgreSQL");
            title.setRequirements("Java, SQL, kiểm thử và làm việc nhóm");
            title = jobTitles.saveAndFlush(title);

            CompetencyFramework framework = new CompetencyFramework();
            framework.setCompetencyName("Khung năng lực Java Demo"); framework.setWeightPercent(100);
            framework.setCategory("TECH"); framework.setJobTitle(title);
            framework = frameworks.saveAndFlush(framework);
            title.setCompetencyFramework(framework); jobTitles.save(title);
            for (int i = 0; i < 2; i++) {
                CompetencyCriterion criterion = new CompetencyCriterion();
                criterion.setCompetencyFramework(framework); criterion.setCriterionCode("DEMO-" + (i + 1));
                criterion.setCriterionName(i == 0 ? "Java và API" : "SQL và kiểm thử");
                criterion.setWeightPercent(50); criterion.setActive(true); criteria.save(criterion);
            }
            categories.saveAll(List.of(
                    new CommonCategory(null, "CANDIDATE_SOURCE", "DEMO-REF", "Giới thiệu nội bộ Demo", 1, true),
                    new CommonCategory(null, "REJECTION_REASON", "DEMO-NOTFIT", "Chưa phù hợp vị trí Demo", 1, true),
                    new CommonCategory(null, "WORK_LOCATION", "DEMO-HN", "Hà Nội Demo", 1, true),
                    new CommonCategory(null, "EMPLOYMENT_TYPE", "DEMO-FT", "Toàn thời gian Demo", 1, true)));
            configurations.create(new ApprovalConfigurationRequest(departmentId,
                    List.of(new ApprovalConfigurationRequest.ApprovalStepRequest(0L, approver.getId()))));
            budgets.create(new CreateBudgetRequest(departmentId, LocalDate.now().getYear(), 10, 6_000_000_000L,
                    "Ngân sách giả lập phục vụ demo"), hr);
            // States are reached through the same services used by real requests.
            requisitions.create(request("DEMO-DRAFT", departmentId, title.getId()), manager);
            var pending = requisitions.create(request("DEMO-PENDING", departmentId, title.getId()), manager);
            requisitions.submit(pending.id(), manager);
            var approved = requisitions.create(request("DEMO-APPROVED", departmentId, title.getId()), manager);
            requisitions.submit(approved.id(), manager);
            authenticate(approver, "ROLE_APPROVER", "REQUISITION_APPROVE");
            approvals.processApprovalAction(approved.id(), approver.getId(), "APPROVE", "Duyệt dữ liệu demo").orElseThrow();
            authenticate(hr, "ROLE_HR_MANAGER");
            assignments.assignRecruiters(approved.id(), new AssignRecruiterPayload(recruiter.getId(), List.of(),
                    "Phân công dữ liệu demo", "Demo"));
            var posting = postings.createFromRequisition(approved.id(), recruiter.getId());
            postings.submitForApproval(posting.getId(), recruiter.getId());
            postings.approveJobPosting(posting.getId(), "Duyệt tin demo", hr.getId());
            postings.publishJobPosting(posting.getId(), "Xuất bản tin demo", hr.getId());
            users.flush();
            var after = counts();
            Map<String, Long> created = new LinkedHashMap<>();
            after.forEach((table, count) -> created.put(table, count - before.get(table)));
            jdbc.update("INSERT INTO demo_seed_runs(seed_key, record_counts) VALUES (?, ?)", SEED_KEY, created.toString());
            log.info("Demo seed created records: {}", created);
            log.info("Candidate submission and applicant management: NOT IMPLEMENTED; no fake applications seeded");
        } finally {
            SecurityContextHolder.getContext().setAuthentication(priorAuthentication);
        }
    }

    private Map<RoleName, String> readSecrets() {
        Map<RoleName, String> result = new EnumMap<>(RoleName.class);
        Set<String> unique = new HashSet<>();
        for (RoleName role : RoleName.values()) {
            String value = env.getProperty("DEMO_PASSWORD_" + role.name());
            if (value == null || value.length() < 20 || value.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
                    || !value.matches("(?s).*[a-z].*") || !value.matches("(?s).*[A-Z].*")
                    || !value.matches("(?s).*[0-9].*") || !value.matches("(?s).*[^a-zA-Z0-9].*")
                    || !unique.add(value)) {
                throw new IllegalStateException("Each DEMO_PASSWORD_<ROLE> must be distinct, 20-72 UTF-8 bytes, with upper/lowercase, digit and symbol");
            }
            result.put(role, value);
        }
        return result;
    }

    private Map<String, Long> counts() {
        Map<String, Long> result = new LinkedHashMap<>();
        TABLES.forEach(table -> result.put(table, jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class)));
        return result;
    }

    private static String email(RoleName role) { return "demo." + role.name().toLowerCase(Locale.ROOT) + "@example.invalid"; }

    private void authenticate(User user, String... authorities) {
        var principal = UserPrincipal.create(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private RequisitionRequest request(String code, Long departmentId, Long titleId) {
        return new RequisitionRequest(code, "Tuyển kỹ sư Java Demo", titleId, null, departmentId, null, 1, "NEW",
                "Mở rộng nhóm Demo", 20_000_000L, 25_000_000L, null, LocalDate.now().plusDays(30), null,
                "Phát triển API Spring Boot", "Java, PostgreSQL và kiểm thử", "DRAFT", true);
    }
}
