package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.domain.sprint3.JobPosting;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobPostingRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PublicJobDetailS402IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JobPostingRepository postings;
    @Autowired DepartmentRepository departments;
    @Autowired RecruitmentRequisitionRepository requisitions;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired JwtUtils jwt;

    private Department dept;
    private RecruitmentRequisition req;
    private JobPosting activeJob;
    private JobPosting expiredJob;
    private JobPosting draftJob;
    private JobPosting unpublishedJob;

    @BeforeEach
    void setUp() {
        dept = new Department();
        dept.setName("Khối Công nghệ & Sản phẩm");
        dept.setCode("TECH-PROD");
        dept.setDescription("Nội bộ");
        dept = departments.saveAndFlush(dept);

        req = new RecruitmentRequisition();
        req.setRequisitionCode("REQ-2026-TEST");
        req.setTitle("Kỹ sư Phần mềm");
        req.setDepartmentId(dept.getId());
        req.setStatus("APPROVED");
        req = requisitions.saveAndFlush(req);

        // 1. Active Published Job
        activeJob = new JobPosting();
        activeJob.setTitle("Lập trình viên Backend Java Senior");
        activeJob.setJobCode("JP-2026-ACTIVE");
        activeJob.setDepartmentId(dept.getId());
        activeJob.setRequisitionId(req.getId());
        activeJob.setStatus("PUBLISHED");
        activeJob.setWorkLocation("Hà Nội");
        activeJob.setWorkingModel("HYBRID");
        activeJob.setQuantity(2);
        activeJob.setJobDescription("Thiết kế và xây dựng microservices hiệu năng cao.");
        activeJob.setRequirements("Tối thiểu 3 năm kinh nghiệm với Java & Spring Boot.");
        activeJob.setBenefits("Lương tháng 13, bảo hiểm sức khỏe cao cấp, 15 ngày phép.");
        activeJob.setSalaryVisible(true);
        activeJob.setSalaryMin(25_000_000L);
        activeJob.setSalaryMax(40_000_000L);
        activeJob.setCurrency("VND");
        activeJob.setApplicationDeadline(LocalDate.now().plusMonths(1));
        activeJob.setPublishedAt(Instant.now());
        activeJob = postings.saveAndFlush(activeJob);

        // 2. Expired Job (deadline is 5 days ago)
        expiredJob = new JobPosting();
        expiredJob.setTitle("Chuyên viên Tuyển dụng (Hết hạn)");
        expiredJob.setJobCode("JP-2026-EXPIRED");
        expiredJob.setDepartmentId(dept.getId());
        expiredJob.setStatus("PUBLISHED");
        expiredJob.setWorkLocation("TP. HCM");
        expiredJob.setWorkingModel("ONSITE");
        expiredJob.setQuantity(1);
        expiredJob.setJobDescription("Sàng lọc hồ sơ ứng viên và đặt lịch phỏng vấn.");
        expiredJob.setRequirements("Kinh nghiệm tuyển dụng 1 năm trở lên.");
        expiredJob.setBenefits("Môi trường làm việc năng động.");
        activeJob.setSalaryVisible(false);
        expiredJob.setApplicationDeadline(LocalDate.now().minusDays(5));
        expiredJob.setPublishedAt(Instant.now().minusSeconds(86400 * 20));
        expiredJob = postings.saveAndFlush(expiredJob);

        // 3. Draft Job
        draftJob = new JobPosting();
        draftJob.setTitle("Tin nháp nội bộ");
        draftJob.setJobCode("JP-2026-DRAFT");
        draftJob.setStatus("DRAFT");
        draftJob = postings.saveAndFlush(draftJob);

        // 4. Unpublished Job
        unpublishedJob = new JobPosting();
        unpublishedJob.setTitle("Tin đã gỡ bỏ");
        unpublishedJob.setJobCode("JP-2026-UNPUB");
        unpublishedJob.setStatus("UNPUBLISHED");
        unpublishedJob = postings.saveAndFlush(unpublishedJob);
    }

    @Test
    @DisplayName("S4-02 AC1 & AC2: Xem chi tiết tin đang mở trả đầy đủ 4 nhóm thông tin, canApply=true, expired=false và không lộ dữ liệu nội bộ")
    void testGetPublicJobDetail_ActiveJob_ReturnsFullDetailsWithoutInternalLeaks() throws Exception {
        mvc.perform(get("/api/public/job-postings/" + activeJob.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(activeJob.getId()))
                .andExpect(jsonPath("$.jobCode").value(activeJob.getJobCode()))
                .andExpect(jsonPath("$.title").value(activeJob.getTitle()))
                .andExpect(jsonPath("$.jobDescription").value(activeJob.getJobDescription()))
                .andExpect(jsonPath("$.requirements").value(activeJob.getRequirements()))
                .andExpect(jsonPath("$.benefits").value(activeJob.getBenefits()))
                .andExpect(jsonPath("$.applicationDeadline").value(activeJob.getApplicationDeadline().toString()))
                .andExpect(jsonPath("$.expired").value(false))
                .andExpect(jsonPath("$.canApply").value(true))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                // Kiểm tra bảo mật không lộ thông tin nội bộ
                .andExpect(jsonPath("$.requisitionId").doesNotExist())
                .andExpect(jsonPath("$.approvalNotes").doesNotExist())
                .andExpect(jsonPath("$.auditLogs").doesNotExist())
                .andExpect(jsonPath("$.publishedByUserId").doesNotExist());
    }

    @Test
    @DisplayName("S4-02 AC3: Xem chi tiết tin đã hết hạn vẫn trả 4 nhóm thông tin nhưng expired=true, canApply=false và status=EXPIRED")
    void testGetPublicJobDetail_ExpiredJob_ReturnsDetailsWithExpiredStatus() throws Exception {
        mvc.perform(get("/api/public/job-postings/" + expiredJob.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(expiredJob.getId()))
                .andExpect(jsonPath("$.jobDescription").value(expiredJob.getJobDescription()))
                .andExpect(jsonPath("$.requirements").value(expiredJob.getRequirements()))
                .andExpect(jsonPath("$.benefits").value(expiredJob.getBenefits()))
                .andExpect(jsonPath("$.applicationDeadline").value(expiredJob.getApplicationDeadline().toString()))
                .andExpect(jsonPath("$.expired").value(true))
                .andExpect(jsonPath("$.canApply").value(false))
                .andExpect(jsonPath("$.status").value("EXPIRED"))
                .andExpect(jsonPath("$.expiredMessage").isNotEmpty());
    }

    @Test
    @DisplayName("S4-02: Tin không tồn tại, tin DRAFT hoặc tin UNPUBLISHED trả về 404 rõ ràng không lộ thông tin nội bộ")
    void testGetPublicJobDetail_HiddenOrMissing_Returns404() throws Exception {
        mvc.perform(get("/api/public/job-postings/999999"))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/public/job-postings/" + draftJob.getId()))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/public/job-postings/" + unpublishedJob.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("S4-02 / SCRUM-166: Nộp hồ sơ ứng tuyển công khai thành công cho tin còn hạn")
    void testApplyPublic_Success_ForActiveJob() throws Exception {
        String payload = """
            {
                "fullName": "Nguyễn Văn Ứng Viên",
                "email": "ungvien.moi@example.com",
                "phone": "0987654321",
                "coverLetter": "Tôi rất hào hứng với cơ hội việc làm này.",
                "cvFileUrl": "https://storage.local/cv/nguyenvanungvien.pdf"
            }
        """;

        mvc.perform(post("/api/public/job-postings/" + activeJob.getId() + "/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationId").isNumber())
                .andExpect(jsonPath("$.jobPostingId").value(activeJob.getId()))
                .andExpect(jsonPath("$.status").value("APPLIED"))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn Ứng Viên"))
                .andExpect(jsonPath("$.email").value("ungvien.moi@example.com"));
    }

    @Test
    @DisplayName("S4-02 / SCRUM-166: Server chặn nộp hồ sơ khi tin tuyển dụng đã hết hạn (400 Bad Request)")
    void testApplyPublic_BlockedByServer_WhenJobExpired() throws Exception {
        String payload = """
            {
                "fullName": "Trần Thị Trễ Hạn",
                "email": "trehan@example.com",
                "phone": "0912345678"
            }
        """;

        mvc.perform(post("/api/public/job-postings/" + expiredJob.getId() + "/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("hết hạn")));
    }

    @Test
    @DisplayName("S4-02: Server trả 404 khi cố tình nộp hồ sơ vào tin không tồn tại hoặc chưa xuất bản")
    void testApplyPublic_NotFound_ForDraftOrNonExistentJob() throws Exception {
        String payload = """
            {
                "fullName": "Lê Văn Thử",
                "email": "le.van.thu@example.com",
                "phone": "0900000000"
            }
        """;

        mvc.perform(post("/api/public/job-postings/999999/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound());

        mvc.perform(post("/api/public/job-postings/" + draftJob.getId() + "/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("S4-02: Kiểm tra validation khi nộp hồ sơ (thiếu họ tên hoặc email không hợp lệ)")
    void testApplyPublic_ValidationErrors() throws Exception {
        String invalidPayload = """
            {
                "fullName": "",
                "email": "invalid-email-format",
                "phone": "0912345678"
            }
        """;

        mvc.perform(post("/api/public/job-postings/" + activeJob.getId() + "/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());
    }
}
