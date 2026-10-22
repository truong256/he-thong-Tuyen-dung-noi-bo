package com.example.auth_service.controller;

import com.example.auth_service.dto.UpdateProfileRequest;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserProfileIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;

    private User recruiter;
    private User interviewer;

    @BeforeEach
    void setUp() {
        Role recruiterRole = roles.findByName(RoleName.RECRUITER)
                .orElseGet(() -> roles.save(new Role(RoleName.RECRUITER, "Recruiter")));
        Role interviewerRole = roles.findByName(RoleName.INTERVIEWER)
                .orElseGet(() -> roles.save(new Role(RoleName.INTERVIEWER, "Interviewer")));

        recruiter = new User("recruiter_profile_test@company.com", "$2a$10$hashedPassword123");
        recruiter.setFullName("Nguyễn Văn Recruiter");
        recruiter.setDepartment("Phòng Tuyển dụng");
        recruiter.setPhone("0901234567");
        recruiter.setDisplayName("Recruitment Specialist");
        recruiter.setRoles(Set.of(recruiterRole));
        recruiter.setStatus("ACTIVE");
        recruiter = users.saveAndFlush(recruiter);

        interviewer = new User("interviewer_profile_test@company.com", "$2a$10$hashedPassword123");
        interviewer.setFullName("Trần Văn Interviewer");
        interviewer.setDepartment("Khối Kỹ thuật");
        interviewer.setPhone("0912345678");
        interviewer.setDisplayName("Tech Lead");
        interviewer.setRoles(Set.of(interviewerRole));
        interviewer.setStatus("ACTIVE");
        interviewer = users.saveAndFlush(interviewer);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private String token(User user) {
        return "Bearer " + jwt.generateAccessToken(user.getEmail(), Set.of(user.getRole()), user.getTokenVersion());
    }

    @Test
    @DisplayName("PR-01: GET /api/auth/me trả về đúng thông tin hồ sơ của người dùng đang đăng nhập")
    void testGetProfile_success() throws Exception {
        mvc.perform(get("/api/auth/me")
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("recruiter_profile_test@company.com"))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn Recruiter"))
                .andExpect(jsonPath("$.department").value("Phòng Tuyển dụng"))
                .andExpect(jsonPath("$.phone").value("0901234567"))
                .andExpect(jsonPath("$.displayName").value("Recruitment Specialist"));
    }

    @Test
    @DisplayName("PR-02 & PR-03 & PR-05: Cập nhật hợp lệ họ tên, số điện thoại VN và chức danh hiển thị")
    void testUpdateProfile_success() throws Exception {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("Nguyễn Văn Mới");
        request.setPhone("0987654321");
        request.setDisplayName("Senior Recruiter");
        request.setRecoveryEmail("recovery.recruiter@gmail.com");

        mvc.perform(put("/api/auth/profile")
                        .header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn Mới"))
                .andExpect(jsonPath("$.phone").value("0987654321"))
                .andExpect(jsonPath("$.displayName").value("Senior Recruiter"))
                .andExpect(jsonPath("$.recoveryEmail").value("recovery.recruiter@gmail.com"))
                .andExpect(jsonPath("$.department").value("Phòng Tuyển dụng")); // Bất biến

        User reloaded = users.findById(recruiter.getId()).orElseThrow();
        assertThat(reloaded.getFullName()).isEqualTo("Nguyễn Văn Mới");
        assertThat(reloaded.getPhone()).isEqualTo("0987654321");
        assertThat(reloaded.getDisplayName()).isEqualTo("Senior Recruiter");
        assertThat(reloaded.getRecoveryEmail()).isEqualTo("recovery.recruiter@gmail.com");
        assertThat(reloaded.getDepartment()).isEqualTo("Phòng Tuyển dụng");
    }

    @Test
    @DisplayName("PR-04: Cập nhật số điện thoại sai định dạng bị chặn 400 Bad Request")
    void testUpdateProfile_invalidPhone_rejected() throws Exception {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("Nguyễn Văn Recruiter");
        request.setPhone("0123456789"); // Đầu 01 cũ không hợp lệ

        mvc.perform(put("/api/auth/profile")
                        .header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.phone").value("Số điện thoại không đúng định dạng"));
    }

    @Test
    @DisplayName("PR-07 & PR-08: Gửi email khác hoặc department khác qua API không làm thay đổi email/phòng ban thực tế")
    void testUpdateProfile_protectedFieldsNotModified() throws Exception {
        // Cố tình gửi department mới nhằm hack phòng ban
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("Nguyễn Văn Recruiter");
        request.setPhone("0901234567");
        request.setDepartment("Ban Giám Đốc Hacked");

        mvc.perform(put("/api/auth/profile")
                        .header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.department").value("Phòng Tuyển dụng")); // Vẫn giữ nguyên phòng ban cũ

        User reloaded = users.findById(recruiter.getId()).orElseThrow();
        assertThat(reloaded.getDepartment()).isEqualTo("Phòng Tuyển dụng");
        assertThat(reloaded.getEmail()).isEqualTo("recruiter_profile_test@company.com");
    }

    @Test
    @DisplayName("PR-11: User A gọi API không thể sửa hồ sơ User B vì backend lấy danh tính từ JWT Token")
    void testUpdateProfile_cannotEditOtherUser() throws Exception {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("Hacked By Recruiter");
        request.setPhone("0988888888");

        // Recruiter gọi API, chỉ hồ sơ của Recruiter được cập nhật, Interviewer không bị ảnh hưởng
        mvc.perform(put("/api/auth/profile")
                        .header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        User reloadedInterviewer = users.findById(interviewer.getId()).orElseThrow();
        assertThat(reloadedInterviewer.getFullName()).isEqualTo("Trần Văn Interviewer");
        assertThat(reloadedInterviewer.getPhone()).isEqualTo("0912345678");
    }
}
