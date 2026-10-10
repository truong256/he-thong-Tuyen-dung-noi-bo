package com.example.auth_service.service;

import com.example.auth_service.dto.ChangePasswordRequest;
import com.example.auth_service.dto.CreateUserRequest;
import com.example.auth_service.dto.LoginRequest;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class FirstLoginPasswordChangeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String adminToken;

    @BeforeEach
    void setUp() {
        for (RoleName rn : RoleName.values()) {
            if (roleRepository.findByName(rn).isEmpty()) {
                roleRepository.save(new Role(rn, "Vai trò " + rn.name()));
            }
        }

        Role adminRole = roleRepository.findByName(RoleName.ADMIN).orElseThrow();
        Role hrRole = roleRepository.findByName(RoleName.HR_MANAGER).orElseThrow();

        User admin = userRepository.findByEmail("admin-test@company.com").orElseGet(() -> {
            User u = new User("admin-test@company.com", passwordEncoder.encode("AdminPass123@"));
            u.setRoles(Set.of(adminRole, hrRole));
            u.setStatus("ACTIVE");
            u.setMustChangePassword(false);
            return userRepository.save(u);
        });

        adminToken = jwtUtils.generateAccessToken(admin.getEmail(), Set.of("ADMIN", "HR_MANAGER"), admin.getTokenVersion(), false);
    }

    @Test
    @DisplayName("Complete First-Login Password Change Flow: Cases 1 through 7")
    void testCompleteFirstLoginPasswordChangeFlow() throws Exception {
        String newStaffEmail = "firstlogin-staff-" + System.currentTimeMillis() + "@company.com";
        String chosenNewPassword = "NewStrongPass2026@";

        // =========================================================================
        // CASE 1: Admin tạo user -> Expected: mustChangePassword = true
        // =========================================================================
        CreateUserRequest createReq = new CreateUserRequest();
        createReq.setEmail(newStaffEmail);
        createReq.setFullName("Nhân sự Mới First Login");
        createReq.setDepartment("TECH");
        createReq.setRoles(Set.of("RECRUITER"));
        createReq.setStatus("ACTIVE");

        mockMvc.perform(post("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        User persistedUser = userRepository.findByEmail(newStaffEmail).orElseThrow();
        assertThat(persistedUser.isMustChangePassword()).isTrue();

        // Note: For testing the login step with the temporary password,
        // we can set a known temporary password on the user entity
        String tempPassword = "TempPassword123@";
        persistedUser.setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(persistedUser);

        // =========================================================================
        // CASE 2: User login bằng temporary password
        // Expected: login success, mustChangePassword = true in response and token
        // =========================================================================
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail(newStaffEmail);
        loginReq.setPassword(tempPassword);

        String loginResponseContent = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.mustChangePassword").value(true))
                .andExpect(jsonPath("$.mustChangePassword").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String tempAccessToken = JsonPath.read(loginResponseContent, "$.accessToken");
        assertThat(jwtUtils.getMustChangePasswordFromJwtToken(tempAccessToken)).isTrue();

        // =========================================================================
        // CASE 3: User cố gọi business API (vd: /api/departments hoặc /api/job-titles)
        // Expected: 403 Forbidden
        // =========================================================================
        mockMvc.perform(get("/api/departments")
                        .header("Authorization", "Bearer " + tempAccessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        mockMvc.perform(get("/api/job-titles")
                        .header("Authorization", "Bearer " + tempAccessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        // But allowed endpoints work:
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + tempAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        // =========================================================================
        // CASE 7: Relogin trước khi đổi password -> Expected: vẫn bị bắt đổi password
        // =========================================================================
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true))
                .andExpect(jsonPath("$.user.mustChangePassword").value(true));

        // =========================================================================
        // CASE 4: User đổi password
        // Expected: password hash changed, mustChangePassword = false, sessions revoked
        // =========================================================================
        ChangePasswordRequest changeReq = new ChangePasswordRequest();
        changeReq.setCurrentPassword(tempPassword);
        changeReq.setNewPassword(chosenNewPassword);
        changeReq.setConfirmPassword(chosenNewPassword);

        mockMvc.perform(post("/api/auth/change-password")
                        .header("Authorization", "Bearer " + tempAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(changeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đổi mật khẩu thành công."));

        User afterChangeUser = userRepository.findByEmail(newStaffEmail).orElseThrow();
        assertThat(afterChangeUser.isMustChangePassword()).isFalse();
        assertThat(passwordEncoder.matches(chosenNewPassword, afterChangeUser.getPassword())).isTrue();
        assertThat(passwordEncoder.matches(tempPassword, afterChangeUser.getPassword())).isFalse();

        // Old token should now be rejected because tokenVersion incremented (session revoked)
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + tempAccessToken))
                .andExpect(status().isUnauthorized());

        // =========================================================================
        // CASE 5: Login bằng temporary password cũ -> Expected: FAIL (401)
        // =========================================================================
        LoginRequest oldLoginReq = new LoginRequest();
        oldLoginReq.setEmail(newStaffEmail);
        oldLoginReq.setPassword(tempPassword);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(oldLoginReq)))
                .andExpect(status().isUnauthorized());

        // =========================================================================
        // CASE 6: Login bằng password mới
        // Expected: PASS, mustChangePassword = false, business API accessible
        // =========================================================================
        LoginRequest newLoginReq = new LoginRequest();
        newLoginReq.setEmail(newStaffEmail);
        newLoginReq.setPassword(chosenNewPassword);

        String newLoginContent = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLoginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(false))
                .andExpect(jsonPath("$.user.mustChangePassword").value(false))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String newAccessToken = JsonPath.read(newLoginContent, "$.accessToken");
        assertThat(jwtUtils.getMustChangePasswordFromJwtToken(newAccessToken)).isFalse();

        // Now business API is accessible (since user has RECRUITER role and CATALOG_READ authority)
        mockMvc.perform(get("/api/departments")
                        .header("Authorization", "Bearer " + newAccessToken))
                .andExpect(status().isOk());
    }
}
