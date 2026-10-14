package com.example.auth_service.controller;

import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.JwtUtils;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminUserImportIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private User adminUser;
    private User recruiterUser;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleName.ADMIN)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ADMIN, "Admin")));
        Role recruiterRole = roleRepository.findByName(RoleName.RECRUITER)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.RECRUITER, "Recruiter")));
        roleRepository.findByName(RoleName.INTERVIEWER)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.INTERVIEWER, "Interviewer")));

        adminUser = new User("admin_import_test@company.com", "$2a$10$hashedPassword123");
        adminUser.setFullName("Admin Import Tester");
        adminUser.setRoles(Set.of(adminRole));
        adminUser = userRepository.saveAndFlush(adminUser);

        recruiterUser = new User("recruiter_import_test@company.com", "$2a$10$hashedPassword123");
        recruiterUser.setFullName("Recruiter Import Tester");
        recruiterUser.setRoles(Set.of(recruiterRole));
        recruiterUser = userRepository.saveAndFlush(recruiterUser);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private String token(User user) {
        return "Bearer " + jwtUtils.generateAccessToken(user.getEmail(), Set.of(user.getRole()), user.getTokenVersion());
    }

    private byte[] createExcelBytes(String[][] rows) throws IOException {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Nhân sự");
            for (int r = 0; r < rows.length; r++) {
                Row row = sheet.createRow(r);
                for (int c = 0; c < rows[r].length; c++) {
                    row.createCell(c).setCellValue(rows[r][c]);
                }
            }
            wb.write(bos);
            return bos.toByteArray();
        }
    }

    @Test
    @DisplayName("RBAC: Anonymous truy cập API import bị 401 Unauthorized")
    void anonymous_AccessDenied() throws Exception {
        mvc.perform(get("/api/admin/users/import/template"))
                .andExpect(status().isUnauthorized());

        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[]{1, 2, 3});

        mvc.perform(multipart("/api/admin/users/import/preview").file(file))
                .andExpect(status().isUnauthorized());

        mvc.perform(multipart("/api/admin/users/import").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("RBAC: Role không có USER_MANAGE (Recruiter) bị 403 Forbidden")
    void nonAdmin_AccessForbidden() throws Exception {
        mvc.perform(get("/api/admin/users/import/template")
                        .header("Authorization", token(recruiterUser)))
                .andExpect(status().isForbidden());

        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[]{1, 2, 3});

        mvc.perform(multipart("/api/admin/users/import/preview").file(file)
                        .header("Authorization", token(recruiterUser)))
                .andExpect(status().isForbidden());

        mvc.perform(multipart("/api/admin/users/import").file(file)
                        .header("Authorization", token(recruiterUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Template: Admin tải template thành công với header attachment")
    void admin_DownloadTemplate_Success() throws Exception {
        mvc.perform(get("/api/admin/users/import/template")
                        .header("Authorization", token(adminUser)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("Mau_nhap_nhan_su.xlsx")))
                .andExpect(result -> assertThat(result.getResponse().getContentAsByteArray().length).isGreaterThan(100));
    }

    @Test
    @DisplayName("Preview & Import: Admin xem trước và import thành công theo cơ chế partial success")
    void admin_PreviewAndImport_PartialSuccess() throws Exception {
        String[][] fileData = {
                {"Họ và tên", "Email", "Phòng ban", "Vai trò"},
                {"Nhân viên Hợp lệ 1", "nv1_integration@company.com", "Kỹ thuật", "Người phỏng vấn"},
                {"Nhân viên Lỗi Email", "invalid-email-format", "Kỹ thuật", "INTERVIEWER"},
                {"Nhân viên Hợp lệ 2", "nv2_integration@company.com", "Nhân sự", "Chuyên viên tuyển dụng"}
        };

        byte[] content = createExcelBytes(fileData);
        MockMultipartFile file = new MockMultipartFile("file", "employees.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content);

        // 1. Preview
        mvc.perform(multipart("/api/admin/users/import/preview").file(file)
                        .header("Authorization", token(adminUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRows").value(3))
                .andExpect(jsonPath("$.validCount").value(2))
                .andExpect(jsonPath("$.invalidCount").value(1))
                .andExpect(jsonPath("$.rows[1].valid").value(false))
                .andExpect(jsonPath("$.rows[1].errors[0]").value("Email không đúng định dạng."));

        // Verify no user was inserted during preview
        assertThat(userRepository.existsByEmailIgnoreCase("nv1_integration@company.com")).isFalse();
        assertThat(userRepository.existsByEmailIgnoreCase("nv2_integration@company.com")).isFalse();

        // 2. Execute Import
        mvc.perform(multipart("/api/admin/users/import").file(file)
                        .header("Authorization", token(adminUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRows").value(3))
                .andExpect(jsonPath("$.successCount").value(2))
                .andExpect(jsonPath("$.failedCount").value(1))
                .andExpect(jsonPath("$.failedRows[0].rowNumber").value(3));

        // Verify valid users were actually persisted in database
        assertThat(userRepository.existsByEmailIgnoreCase("nv1_integration@company.com")).isTrue();
        assertThat(userRepository.existsByEmailIgnoreCase("nv2_integration@company.com")).isTrue();
        assertThat(userRepository.existsByEmailIgnoreCase("invalid-email-format")).isFalse();
    }
}
