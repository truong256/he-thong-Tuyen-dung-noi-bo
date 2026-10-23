package com.example.auth_service.controller;

import com.example.auth_service.dto.*;
import com.example.auth_service.exception.GlobalExceptionHandler;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.CandidateReferralService;
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

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CandidateReferralControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CandidateReferralService referralService;

    @InjectMocks
    private CandidateReferralController controller;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private UserPrincipal testPrincipal;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver())
                .build();

        testPrincipal = new UserPrincipal(
                100L,
                "interviewer@company.com",
                "Nguyễn Kỹ Thuật",
                "pass",
                "ACTIVE",
                1,
                false,
                List.of(new SimpleGrantedAuthority("ROLE_INTERVIEWER"))
        );

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(testPrincipal, null, testPrincipal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("POST /api/referrals - Thành công trả về 201 Created")
    void submitReferral_Success() throws Exception {
        ReferralCreateRequest req = ReferralCreateRequest.builder()
                .jobPostingId(10L)
                .candidateName("Trần Ứng Viên")
                .candidateEmail("tranungvien@gmail.com")
                .candidatePhone("0987654321")
                .relationship("Bạn đại học")
                .referralNotes("Kinh nghiệm 4 năm React và Java.")
                .build();

        ReferralResponse response = ReferralResponse.builder()
                .id(1L)
                .candidateName("Trần Ứng Viên")
                .candidateEmail("tranungvien@gmail.com")
                .referrerUserId(100L)
                .referrerName("Nguyễn Kỹ Thuật")
                .source("INTERNAL_REFERRAL")
                .generalStatus("SUBMITTED")
                .generalStatusLabel("Đã tiếp nhận hồ sơ")
                .createdAt(Instant.now())
                .build();

        when(referralService.submitReferral(any(ReferralCreateRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/referrals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.candidateName").value("Trần Ứng Viên"))
                .andExpect(jsonPath("$.source").value("INTERNAL_REFERRAL"))
                .andExpect(jsonPath("$.generalStatus").value("SUBMITTED"));
    }

    @Test
    @DisplayName("POST /api/referrals - Lỗi 400 khi thiếu họ tên ứng viên")
    void submitReferral_ValidationFailure_MissingName() throws Exception {
        ReferralCreateRequest req = ReferralCreateRequest.builder()
                .jobPostingId(10L)
                .candidateName("") // blank
                .candidateEmail("email@gmail.com")
                .referralNotes("Notes")
                .build();

        mockMvc.perform(post("/api/referrals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/referrals/my-referrals - Trả danh sách hồ sơ của tôi 200 OK")
    void getMyReferrals_Success() throws Exception {
        ReferralResponse r = ReferralResponse.builder()
                .id(1L)
                .candidateName("Ứng viên 1")
                .referrerUserId(100L)
                .generalStatus("SUBMITTED")
                .build();

        when(referralService.getMyReferrals(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(r), org.springframework.data.domain.PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/referrals/my-referrals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].candidateName").value("Ứng viên 1"));
    }

    @Test
    @DisplayName("GET /api/referrals/{id} - Trả chi tiết hồ sơ 200 OK")
    void getReferralDetail_Success() throws Exception {
        ReferralResponse r = ReferralResponse.builder()
                .id(5L)
                .candidateName("Chi Tiết Ứng Viên")
                .generalStatus("SCREENING")
                .build();

        when(referralService.getReferralDetail(eq(5L), any())).thenReturn(r);

        mockMvc.perform(get("/api/referrals/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.candidateName").value("Chi Tiết Ứng Viên"));
    }

    @Test
    @DisplayName("PATCH /api/referrals/{id}/status - Cập nhật trạng thái tổng quát 200 OK")
    void updateGeneralStatus_Success() throws Exception {
        ReferralStatusUpdateRequest req = new ReferralStatusUpdateRequest("INTERVIEW", "Qua vòng CV");

        ReferralResponse r = ReferralResponse.builder()
                .id(5L)
                .generalStatus("INTERVIEW")
                .generalStatusLabel("Đang phỏng vấn")
                .build();

        when(referralService.updateGeneralStatus(eq(5L), any(), any())).thenReturn(r);

        mockMvc.perform(patch("/api/referrals/5/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generalStatus").value("INTERVIEW"));
    }

    @Test
    @DisplayName("GET /api/referrals/active-positions - Trả danh sách vị trí đang tuyển 200 OK")
    void getActivePositions_Success() throws Exception {
        ReferralActivePositionResponse pos = ReferralActivePositionResponse.builder()
                .jobPostingId(10L)
                .title("Kỹ sư Frontend React")
                .build();

        when(referralService.getActivePositions()).thenReturn(List.of(pos));

        mockMvc.perform(get("/api/referrals/active-positions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Kỹ sư Frontend React"));
    }
}
