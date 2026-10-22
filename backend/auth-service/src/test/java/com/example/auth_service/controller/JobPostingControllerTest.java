package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.exception.GlobalExceptionHandler;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.JobPostingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class JobPostingControllerTest {

    private MockMvc mockMvc;
    private MockMvc publicMockMvc;

    @Mock
    private JobPostingService jobPostingService;

    @InjectMocks
    private JobPostingController jobPostingController;

    @InjectMocks
    private PublicJobPostingController publicJobPostingController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(jobPostingController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        publicMockMvc = MockMvcBuilders.standaloneSetup(publicJobPostingController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        UserPrincipal principal = new UserPrincipal(10L, "hr_manager@company.com", "Nguyen HR", "pass", "ACTIVE",
                List.of(new SimpleGrantedAuthority("ROLE_HR_MANAGER")));
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("GET /api/job-postings - Trả về danh sách tin tuyển dụng")
    void testGetJobPostings() throws Exception {
        JobPostingResponse response = JobPostingResponse.builder()
                .id(1L)
                .jobCode("JP-2026-0001")
                .title("Kỹ sư phần mềm Java")
                .status("PUBLISHED")
                .build();

        when(jobPostingService.getJobPostings(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(response), org.springframework.data.domain.PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/job-postings")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].jobCode").value("JP-2026-0001"))
                .andExpect(jsonPath("$.content[0].title").value("Kỹ sư phần mềm Java"));
    }

    @Test
    @DisplayName("GET /api/job-postings/{id} - Trả về chi tiết tin tuyển dụng")
    void testGetJobPostingDetail() throws Exception {
        JobPostingResponse response = JobPostingResponse.builder()
                .id(1L)
                .jobCode("JP-2026-0001")
                .title("Kỹ sư phần mềm Java")
                .status("APPROVED")
                .build();

        when(jobPostingService.getJobPostingDetail(1L)).thenReturn(response);

        mockMvc.perform(get("/api/job-postings/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @DisplayName("POST /api/job-postings/{id}/approve - Phê duyệt tin tuyển dụng thành công")
    void testApproveJobPosting() throws Exception {
        JobPostingResponse response = JobPostingResponse.builder()
                .id(1L)
                .status("APPROVED")
                .approvedByUserName("Nguyen HR Manager")
                .build();

        when(jobPostingService.approveJobPosting(eq(1L), any(), eq(10L))).thenReturn(response);

        JobPostingApprovalRequest request = new JobPostingApprovalRequest("Nội dung đạt chuẩn");

        mockMvc.perform(post("/api/job-postings/1/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @DisplayName("POST /api/job-postings/{id}/publish - Xuất bản tin tuyển dụng công khai")
    void testPublishJobPosting() throws Exception {
        JobPostingResponse response = JobPostingResponse.builder()
                .id(1L)
                .status("PUBLISHED")
                .publishedByUserName("Nguyen HR Manager")
                .build();

        when(jobPostingService.publishJobPosting(eq(1L), any(), eq(10L))).thenReturn(response);

        mockMvc.perform(post("/api/job-postings/1/publish")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    @Test
    @DisplayName("POST /api/job-postings/{id}/unpublish - Gỡ tin tuyển dụng kèm lý do")
    void testUnpublishJobPosting() throws Exception {
        JobPostingResponse response = JobPostingResponse.builder()
                .id(1L)
                .status("UNPUBLISHED")
                .unpublishReason("Đã tuyển đủ nhân sự")
                .build();

        when(jobPostingService.unpublishJobPosting(eq(1L), eq("Đã tuyển đủ nhân sự"), eq(10L))).thenReturn(response);

        JobPostingUnpublishRequest req = new JobPostingUnpublishRequest("Đã tuyển đủ nhân sự");

        mockMvc.perform(post("/api/job-postings/1/unpublish")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNPUBLISHED"))
                .andExpect(jsonPath("$.unpublishReason").value("Đã tuyển đủ nhân sự"));
    }

    @Test
    @DisplayName("GET /api/job-postings/{id}/audit-logs - Lấy nhật ký duyệt và gỡ tin")
    void testGetAuditLogs() throws Exception {
        JobPostingAuditLogResponse log = JobPostingAuditLogResponse.builder()
                .id(100L)
                .jobPostingId(1L)
                .action("PUBLISH")
                .fromStatus("APPROVED")
                .toStatus("PUBLISHED")
                .userName("Nguyen HR Manager")
                .build();

        when(jobPostingService.getAuditLogs(1L)).thenReturn(List.of(log));

        mockMvc.perform(get("/api/job-postings/1/audit-logs")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("PUBLISH"))
                .andExpect(jsonPath("$[0].toStatus").value("PUBLISHED"));
    }

    @Test
    @DisplayName("GET /api/public/job-postings - Public API trả về tin đang tuyển")
    void testGetPublicJobPostings() throws Exception {
        JobPostingPublicResponse pub = JobPostingPublicResponse.builder()
                .id(1L)
                .jobCode("JP-2026-0001")
                .title("Kỹ sư phần mềm Java")
                .departmentName("Phòng Kỹ Thuật")
                .salaryDisplay("20,000,000 - 35,000,000 VND")
                .build();

        when(jobPostingService.getPublicJobPostings(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(pub), org.springframework.data.domain.PageRequest.of(0, 10), 1));

        publicMockMvc.perform(get("/api/public/job-postings")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].jobCode").value("JP-2026-0001"))
                .andExpect(jsonPath("$.content[0].salaryDisplay").value("20,000,000 - 35,000,000 VND"));
    }

    @Test
    @DisplayName("GET /api/public/job-postings/{id} - Public API trả về chi tiết tin tuyển dụng")
    void testGetPublicJobPostingDetail() throws Exception {
        JobPostingPublicResponse pub = JobPostingPublicResponse.builder()
                .id(1L)
                .jobCode("JP-2026-0001")
                .title("Kỹ sư phần mềm Java")
                .departmentName("Phòng Kỹ Thuật")
                .build();

        when(jobPostingService.getPublicJobPostingDetail(1L)).thenReturn(pub);

        publicMockMvc.perform(get("/api/public/job-postings/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Kỹ sư phần mềm Java"));
    }

    @Test
    @DisplayName("GET /api/public/job-postings/locations - Public API trả về danh sách địa điểm")
    void testGetPublicLocations() throws Exception {
        when(jobPostingService.getPublicLocations())
                .thenReturn(List.of("Hà Nội", "Đà Nẵng", "TP. Hồ Chí Minh"));

        publicMockMvc.perform(get("/api/public/job-postings/locations")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(3)))
                .andExpect(jsonPath("$[0]").value("Hà Nội"))
                .andExpect(jsonPath("$[1]").value("Đà Nẵng"))
                .andExpect(jsonPath("$[2]").value("TP. Hồ Chí Minh"));
    }

    @Test
    @DisplayName("POST /api/job-postings/auto-expire - Kích hoạt tự động hết hạn các tin quá hạn")
    void testTriggerAutoExpire() throws Exception {
        AutoExpireResult result = AutoExpireResult.builder()
                .expiredCount(2)
                .expiredPostingIds(List.of(10L, 20L))
                .expiredJobCodes(List.of("JP-2026-0010", "JP-2026-0020"))
                .checkedDate(LocalDate.now())
                .message("Đã tự động hết hạn và ẩn 2 tin tuyển dụng.")
                .build();

        when(jobPostingService.expireDueJobPostings(any(LocalDate.class))).thenReturn(result);

        mockMvc.perform(post("/api/job-postings/auto-expire")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiredCount").value(2))
                .andExpect(jsonPath("$.expiredJobCodes[0]").value("JP-2026-0010"))
                .andExpect(jsonPath("$.expiredJobCodes[1]").value("JP-2026-0020"));
    }
}
