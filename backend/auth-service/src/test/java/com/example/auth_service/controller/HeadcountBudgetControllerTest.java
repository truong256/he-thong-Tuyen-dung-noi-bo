package com.example.auth_service.controller;

import com.example.auth_service.dto.budget.*;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.GlobalExceptionHandler;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.HeadcountBudgetService;
import com.example.auth_service.service.RequisitionApprovalService;
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
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class HeadcountBudgetControllerTest {

    private MockMvc mockMvc;

    @Mock
    private HeadcountBudgetService budgetService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RequisitionApprovalService approvalService;

    @InjectMocks
    private HeadcountBudgetController controller;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private User hrUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        hrUser = new User("hr@company.com", "pass");
        hrUser.setId(10L);
        hrUser.setFullName("HR Manager");
        hrUser.setRoles(Set.of(new Role(RoleName.HR_MANAGER, "HR Manager")));
        hrUser.setRole("HR_MANAGER");

        UserPrincipal principal = new UserPrincipal(
                10L,
                "hr@company.com",
                "HR Manager",
                "pass",
                "ACTIVE",
                List.of(new SimpleGrantedAuthority("ROLE_HR_MANAGER"))
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
    }

    @Test
    @DisplayName("GET /api/headcount-budgets - returns paged budgets")
    void testSearchBudgets() throws Exception {
        BudgetSummaryResponse item = new BudgetSummaryResponse(
                1L, 1L, "IT", "IT", 2026, 10, 3, 7, 30.0,
                1_000_000_000L, 300_000_000L, 700_000_000L, 30.0,
                BudgetStatus.NORMAL, "Note", 10L, "HR", 10L, "HR", 1, Instant.now(), Instant.now()
        );
        when(budgetService.search(any(), any(), any(), any())).thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(item), org.springframework.data.domain.PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/headcount-budgets")
                        .param("year", "2026")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].departmentName").value("IT"))
                .andExpect(jsonPath("$.content[0].headcountQuota").value(10))
                .andExpect(jsonPath("$.content[0].headcountRemaining").value(7));
    }

    @Test
    @DisplayName("GET /api/headcount-budgets/stats - returns 4 KPI cards")
    void testGetStats() throws Exception {
        BudgetDashboardStats stats = new BudgetDashboardStats(
                2026, 5, 50, 20, 30, 40.0,
                5_000_000_000L, 2_000_000_000L, 3_000_000_000L, 40.0
        );
        when(budgetService.getDashboardStats(2026)).thenReturn(stats);

        mockMvc.perform(get("/api/headcount-budgets/stats")
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalHeadcountQuota").value(50))
                .andExpect(jsonPath("$.totalHeadcountUsed").value(20))
                .andExpect(jsonPath("$.totalHeadcountRemaining").value(30))
                .andExpect(jsonPath("$.totalSalaryBudgetRemainingVnd").value(3_000_000_000L));
    }

    @Test
    @DisplayName("POST /api/headcount-budgets - creates budget successfully")
    void testCreateBudget() throws Exception {
        CreateBudgetRequest request = new CreateBudgetRequest(1L, 2026, 15, 1_500_000_000L, "Khai báo");
        BudgetSummaryResponse response = new BudgetSummaryResponse(
                2L, 1L, "IT", "IT", 2026, 15, 0, 15, 0.0,
                1_500_000_000L, 0L, 1_500_000_000L, 0.0,
                BudgetStatus.NORMAL, "Khai báo", 10L, "HR", 10L, "HR", 1, Instant.now(), Instant.now()
        );

        when(userRepository.findById(10L)).thenReturn(Optional.of(hrUser));
        when(budgetService.create(any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/headcount-budgets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(2))
                .andExpect(jsonPath("$.headcountQuota").value(15));
    }

    @Test
    @DisplayName("POST /api/headcount-budgets/evaluate - evaluates requisition against budget")
    void testEvaluate() throws Exception {
        BudgetEvaluationRequest request = new BudgetEvaluationRequest(1L, 2026, 3, 20_000_000L, null);
        BudgetEvaluationResponse response = new BudgetEvaluationResponse(
                true, 1L, "IT", 2026, 10, 8, 2, 1_000_000_000L, 800_000_000L, 200_000_000L,
                3, 20_000_000L, 720_000_000L, true, 1, true, 520_000_000L, true, "Vượt chỉ tiêu 1 headcount"
        );
        when(budgetService.evaluate(any())).thenReturn(response);

        mockMvc.perform(post("/api/headcount-budgets/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exceedsHeadcount").value(true))
                .andExpect(jsonPath("$.excessHeadcount").value(1))
                .andExpect(jsonPath("$.requiresOverride").value(true));
    }
}
