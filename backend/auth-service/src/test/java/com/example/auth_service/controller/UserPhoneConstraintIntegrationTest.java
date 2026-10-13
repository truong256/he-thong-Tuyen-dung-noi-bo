package com.example.auth_service.controller;

import com.example.auth_service.dto.CreateUserRequest;
import com.example.auth_service.dto.UpdateProfileRequest;
import com.example.auth_service.dto.UpdateUserRequest;
import com.example.auth_service.dto.excel.ExcelImportPreviewResponse;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
import com.example.auth_service.service.AdminUserService;
import com.example.auth_service.service.AuthService;
import com.example.auth_service.service.UserExcelImportService;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import tools.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class UserPhoneConstraintIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AdminUserService adminUserService;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserExcelImportService excelImportService;

    private User adminUser;
    private User regularUser1;
    private User regularUser2;
    private String adminToken;
    private String user1Token;
    private String user2Token;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        Role adminRole = roleRepository.findByName(RoleName.ADMIN)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ADMIN, "Admin")));
        Role recruiterRole = roleRepository.findByName(RoleName.RECRUITER)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.RECRUITER, "Recruiter")));

        adminUser = new User("admin.test@company.com", passwordEncoder.encode("Password123!"));
        adminUser.setFullName("Admin Test");
        adminUser.setPhone("0900000001");
        adminUser.setStatus("ACTIVE");
        adminUser.setRoles(Set.of(adminRole));
        adminUser = userRepository.save(adminUser);

        regularUser1 = new User("user1@company.com", passwordEncoder.encode("Password123!"));
        regularUser1.setFullName("User One");
        regularUser1.setPhone("0912345678");
        regularUser1.setStatus("ACTIVE");
        regularUser1.setRoles(Set.of(recruiterRole));
        regularUser1 = userRepository.save(regularUser1);

        regularUser2 = new User("user2@company.com", passwordEncoder.encode("Password123!"));
        regularUser2.setFullName("User Two");
        regularUser2.setPhone("0988776655");
        regularUser2.setStatus("ACTIVE");
        regularUser2.setRoles(Set.of(recruiterRole));
        regularUser2 = userRepository.save(regularUser2);

        adminToken = jwtUtils.generateAccessToken(adminUser.getEmail(), Set.of("ADMIN", "USER_MANAGE", "ROLE_ADMIN"), adminUser.getTokenVersion());
        user1Token = jwtUtils.generateAccessToken(regularUser1.getEmail(), Set.of("RECRUITER"), regularUser1.getTokenVersion());
        user2Token = jwtUtils.generateAccessToken(regularUser2.getEmail(), Set.of("RECRUITER"), regularUser2.getTokenVersion());
    }

    @AfterEach
    void tearDown() {
        userRepository.deleteAll();
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("1. Hai tài khoản dùng cùng số điện thoại → Admin tạo tài khoản bị từ chối với HTTP 409")
    void testAdminCreateUser_ExistingPhone_Returns409() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("user.new@company.com");
        request.setFullName("User New");
        request.setPhone("0912345678"); // Đã thuộc về regularUser1
        request.setRoles(Set.of("RECRUITER"));
        request.setStatus("ACTIVE");

        mockMvc.perform(post("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Số điện thoại này đã được sử dụng bởi tài khoản khác."))
                .andExpect(jsonPath("$.validationErrors.phone").value("Số điện thoại này đã được sử dụng bởi tài khoản khác."));
    }

    @Test
    @DisplayName("2. Hai định dạng 0... và +84... của cùng số → từ chối với HTTP 409")
    void testTwoFormatsSamePhone_0And84_RejectedWith409() throws Exception {
        // regularUser1 đã có số 0912345678, thử tạo user mới bằng +84912345678
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("user.plus84@company.com");
        request.setFullName("User Plus 84");
        request.setPhone("+84912345678"); // Đồng nghĩa 0912345678
        request.setRoles(Set.of("RECRUITER"));
        request.setStatus("ACTIVE");

        mockMvc.perform(post("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Số điện thoại này đã được sử dụng bởi tài khoản khác."))
                .andExpect(jsonPath("$.validationErrors.phone").value("Số điện thoại này đã được sử dụng bởi tài khoản khác."));
    }

    @Test
    @DisplayName("3. Một tài khoản cập nhật hồ sơ và giữ nguyên số cũ (hoặc gửi +84 của chính mình) → thành công")
    void testUpdateProfile_KeepOwnPhone_Success() throws Exception {
        // regularUser1 cập nhật hồ sơ, giữ nguyên số của chính mình
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("User One Đã Đổi Tên");
        request.setPhone("0912345678"); // Số của chính mình
        request.setDisplayName("Chuyên viên");

        mockMvc.perform(put("/api/auth/profile")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("User One Đã Đổi Tên"))
                .andExpect(jsonPath("$.phone").value("0912345678"));

        // Thử cập nhật dạng +84 của chính mình
        request.setPhone("+84912345678");
        mockMvc.perform(put("/api/auth/profile")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("0912345678"));
    }

    @Test
    @DisplayName("4. Đổi sang số chưa ai sử dụng → thành công")
    void testUpdateProfile_ChangeToUnusedPhone_Success() throws Exception {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("User One Số Mới");
        request.setPhone("0933112233"); // Số hoàn toàn mới
        request.setDisplayName("Recruiter Pro");

        mockMvc.perform(put("/api/auth/profile")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("0933112233"));

        User reloaded = userRepository.findById(regularUser1.getId()).orElseThrow();
        assertThat(reloaded.getPhone()).isEqualTo("0933112233");
    }

    @Test
    @DisplayName("5. Người dùng sửa hồ sơ dùng số người khác → HTTP 409")
    void testUserProfile_ChangeToOtherUserPhone_Returns409() throws Exception {
        // regularUser2 cố tình cập nhật số của regularUser1 (0912345678)
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("User Two Cố Tình Trùng");
        request.setPhone("0912345678");

        mockMvc.perform(put("/api/auth/profile")
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Số điện thoại này đã được sử dụng bởi tài khoản khác."))
                .andExpect(jsonPath("$.validationErrors.phone").value("Số điện thoại này đã được sử dụng bởi tài khoản khác."));
    }

    @Test
    @DisplayName("6. Import Excel: Trùng số điện thoại giữa các dòng trong cùng file (cả 0... và +84...) → báo lỗi đúng dòng")
    void testExcelImport_DuplicatePhoneInFile_FailsExactRows() throws IOException {
        String[][] data = {
                {"Họ và tên", "Email", "Số điện thoại", "Phòng ban", "Vai trò"},
                {"Nhân Viên 1", "excel1@company.com", "0934567890", "IT", "RECRUITER"},
                {"Nhân Viên 2", "excel2@company.com", "+84934567890", "HR", "RECRUITER"}, // Trùng với dòng 1
                {"Nhân Viên 3", "excel3@company.com", "0977889900", "Sales", "RECRUITER"}  // Hợp lệ
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportPreviewResponse preview = excelImportService.previewImport(file);

        assertThat(preview.getTotalRows()).isEqualTo(3);
        assertThat(preview.getValidCount()).isEqualTo(1); // Chỉ dòng 3 hợp lệ
        assertThat(preview.getInvalidCount()).isEqualTo(2);

        // Dòng 1 bị lỗi trùng lặp
        assertThat(preview.getRows().get(0).isValid()).isFalse();
        assertThat(preview.getRows().get(0).getErrors()).anyMatch(e -> e.contains("Số điện thoại bị trùng lặp trong tệp Excel"));

        // Dòng 2 bị lỗi trùng lặp
        assertThat(preview.getRows().get(1).isValid()).isFalse();
        assertThat(preview.getRows().get(1).getErrors()).anyMatch(e -> e.contains("Số điện thoại bị trùng lặp trong tệp Excel"));

        // Dòng 3 hợp lệ
        assertThat(preview.getRows().get(2).isValid()).isTrue();
    }

    @Test
    @DisplayName("7. Import Excel: Trùng số điện thoại với database → từ chối dòng bị trùng")
    void testExcelImport_DuplicatePhoneWithDatabase_RejectsDuplicateRow() throws IOException {
        // regularUser1 đã có 0912345678
        String[][] data = {
                {"Họ và tên", "Email", "Số điện thoại", "Phòng ban", "Vai trò"},
                {"Trùng Số DB", "excel_dup_db@company.com", "+84912345678", "IT", "RECRUITER"}, // Trùng với User 1
                {"Số Hợp Lệ", "excel_ok@company.com", "0944556677", "HR", "RECRUITER"}
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportPreviewResponse preview = excelImportService.previewImport(file);

        assertThat(preview.getRows().get(0).isValid()).isFalse();
        assertThat(preview.getRows().get(0).getErrors()).anyMatch(e -> e.contains("Số điện thoại này đã được sử dụng bởi tài khoản khác"));

        assertThat(preview.getRows().get(1).isValid()).isTrue();
    }

    @Test
    @DisplayName("8. Hai request đồng thời tạo tài khoản cùng số điện thoại → tối đa một request thành công")
    void testConcurrentCreateUser_SamePhone_AtMostOneSucceeds() throws InterruptedException {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        String concurrentPhone = "0966778899";

        for (int i = 0; i < threads; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(new UsernamePasswordAuthenticationToken(
                            adminUser.getEmail(), null, List.of(new SimpleGrantedAuthority("USER_MANAGE"))));
                    SecurityContextHolder.setContext(context);

                    startLatch.await();
                    CreateUserRequest req = new CreateUserRequest();
                    req.setEmail("concurrent" + index + "@company.com");
                    req.setFullName("Concurrent User " + index);
                    req.setPhone(concurrentPhone);
                    req.setRoles(Set.of("RECRUITER"));
                    req.setStatus("ACTIVE");

                    adminUserService.createUser(req);
                    successCount.incrementAndGet();
                } catch (ConflictException e) {
                    conflictCount.incrementAndGet();
                } catch (Exception e) {
                    // Data integrity or other conflict
                    conflictCount.incrementAndGet();
                } finally {
                    SecurityContextHolder.clearContext();
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // Bắn đồng thời
        endLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("9. Các tài khoản cũ chưa có số điện thoại (phone == null) vẫn an toàn trong giai đoạn chuyển đổi")
    void testExistingUsersWithoutPhone_SafeInTransition() {
        // Tạo thêm 3 tài khoản cũ không có số điện thoại (phone = null)
        User oldUser1 = new User("old1@company.com", passwordEncoder.encode("pass"));
        oldUser1.setPhone(null);
        userRepository.save(oldUser1);

        User oldUser2 = new User("old2@company.com", passwordEncoder.encode("pass"));
        oldUser2.setPhone(null);
        userRepository.save(oldUser2);

        User oldUser3 = new User("old3@company.com", passwordEncoder.encode("pass"));
        oldUser3.setPhone(null);
        userRepository.save(oldUser3);

        // Kiểm tra tất cả 3 tài khoản tồn tại độc lập mà không vi phạm UNIQUE index
        List<User> nullPhoneUsers = userRepository.findAll().stream()
                .filter(u -> u.getPhone() == null)
                .toList();
        assertThat(nullPhoneUsers).hasSizeGreaterThanOrEqualTo(3);
    }

    private byte[] createExcelBytes(String[][] sheetData) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Users");
            for (int r = 0; r < sheetData.length; r++) {
                Row row = sheet.createRow(r);
                for (int c = 0; c < sheetData[r].length; c++) {
                    row.createCell(c).setCellValue(sheetData[r][c]);
                }
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
