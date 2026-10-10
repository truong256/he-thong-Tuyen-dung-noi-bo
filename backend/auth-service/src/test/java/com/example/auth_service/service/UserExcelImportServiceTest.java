package com.example.auth_service.service;

import com.example.auth_service.dto.excel.ExcelImportPreviewResponse;
import com.example.auth_service.dto.excel.ExcelImportResultResponse;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserExcelImportServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private MailService mailService;

    @InjectMocks
    private UserExcelImportService importService;

    private Role interviewerRole;
    private Role recruiterRole;
    private Role adminRole;
    private Role hrManagerRole;

    @BeforeEach
    void setUp() {
        interviewerRole = new Role(RoleName.INTERVIEWER, "Người phỏng vấn");
        interviewerRole.setId(1L);

        recruiterRole = new Role(RoleName.RECRUITER, "Chuyên viên tuyển dụng");
        recruiterRole.setId(2L);

        adminRole = new Role(RoleName.ADMIN, "Quản trị viên");
        adminRole.setId(3L);

        hrManagerRole = new Role(RoleName.HR_MANAGER, "Quản lý nhân sự");
        hrManagerRole.setId(4L);

        lenient().when(roleRepository.findByName(RoleName.INTERVIEWER)).thenReturn(Optional.of(interviewerRole));
        lenient().when(roleRepository.findByName(RoleName.RECRUITER)).thenReturn(Optional.of(recruiterRole));
        lenient().when(roleRepository.findByName(RoleName.ADMIN)).thenReturn(Optional.of(adminRole));
        lenient().when(roleRepository.findByName(RoleName.HR_MANAGER)).thenReturn(Optional.of(hrManagerRole));
        lenient().when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$hashedPassword123");
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
    @DisplayName("1. Tạo file Excel mẫu thành công và mở được cấu trúc POI với đầy đủ cột")
    void generateTemplate_Success() throws IOException {
        byte[] templateBytes = importService.generateTemplate();
        assertThat(templateBytes).isNotEmpty();

        try (Workbook wb = new XSSFWorkbook(new java.io.ByteArrayInputStream(templateBytes))) {
            assertThat(wb.getNumberOfSheets()).isGreaterThanOrEqualTo(1);
            Sheet sheet = wb.getSheetAt(0);
            Row header = sheet.getRow(0);
            assertThat(header.getCell(0).getStringCellValue()).contains("Mã nhân sự");
            assertThat(header.getCell(1).getStringCellValue()).contains("Họ và tên");
            assertThat(header.getCell(2).getStringCellValue()).contains("Email");
            assertThat(header.getCell(3).getStringCellValue()).contains("Số điện thoại");
            assertThat(header.getCell(4).getStringCellValue()).contains("Phòng ban");
            assertThat(header.getCell(5).getStringCellValue()).contains("Vai trò");
        }
    }

    @Test
    @DisplayName("2. Parse thất bại khi file null hoặc rỗng")
    void parse_EmptyFile_ThrowsException() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", new byte[0]);
        assertThatThrownBy(() -> importService.parseWorkbook(emptyFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File Excel không được để trống");
    }

    @Test
    @DisplayName("3. Parse thất bại khi file sai định dạng đuôi không phải xlsx/xls")
    void parse_InvalidExtension_ThrowsException() {
        MockMultipartFile txtFile = new MockMultipartFile("file", "test.txt", "text/plain", "hello".getBytes());
        assertThatThrownBy(() -> importService.parseWorkbook(txtFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Định dạng file không hợp lệ");
    }

    @Test
    @DisplayName("4. Parse thất bại khi file thiếu cột bắt buộc Họ và tên hoặc Email")
    void parse_MissingRequiredHeader_ThrowsException() throws IOException {
        String[][] data = {
                {"Số điện thoại", "Địa chỉ"},
                {"0901234567", "Hà Nội"}
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        assertThatThrownBy(() -> importService.parseWorkbook(file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File Excel thiếu cột bắt buộc");
    }

    @Test
    @DisplayName("5. Parse thất bại khi dung lượng file vượt quá 10MB")
    void parse_FileSizeExceeds10MB_ThrowsException() {
        byte[] largeBytes = new byte[10];
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.xlsx", "application/vnd.ms-excel", largeBytes) {
            @Override
            public long getSize() {
                return 11 * 1024 * 1024L; // 11MB
            }
        };
        assertThatThrownBy(() -> importService.parseWorkbook(largeFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Dung lượng file vượt quá giới hạn tối đa 10 MB");
    }

    @Test
    @DisplayName("6. Parse thất bại khi file hỏng (corrupt file)")
    void parse_CorruptFile_ThrowsException() {
        byte[] corrupted = new byte[]{0x50, 0x4B, 0x03, 0x04, 0x00, 0x00, 0x00}; // Invalid ZIP header
        MockMultipartFile corruptFile = new MockMultipartFile("file", "corrupt.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", corrupted);
        assertThatThrownBy(() -> importService.parseWorkbook(corruptFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể đọc cấu trúc file Excel");
    }

    @Test
    @DisplayName("7. Validation phát hiện thiếu Họ tên và Họ tên dài hơn 150 ký tự")
    void preview_ValidateFullName() throws IOException {
        String longName = "A".repeat(151);
        String[][] data = {
                {"Họ và tên", "Email"},
                {"", "missing_name@company.com"},
                {longName, "long_name@company.com"}
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportPreviewResponse preview = importService.previewImport(file);

        assertThat(preview.getValidCount()).isEqualTo(0);
        assertThat(preview.getRows().get(0).getErrors()).anyMatch(e -> e.contains("Họ và tên không được để trống"));
        assertThat(preview.getRows().get(1).getErrors()).anyMatch(e -> e.contains("Họ và tên không được vượt quá 150 ký tự"));
    }

    @Test
    @DisplayName("8. Validation phát hiện thiếu Email, sai định dạng Email, và Email trùng DB")
    void preview_ValidateEmail() throws IOException {
        when(userRepository.existsByEmailIgnoreCase("exist@company.com")).thenReturn(true);

        String[][] data = {
                {"Họ và tên", "Email"},
                {"Nguyễn Văn A", ""},
                {"Trần Thị B", "invalid-email-format"},
                {"Lê Văn C", "exist@company.com"}
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportPreviewResponse preview = importService.previewImport(file);

        assertThat(preview.getValidCount()).isEqualTo(0);
        assertThat(preview.getRows().get(0).getErrors()).anyMatch(e -> e.contains("Email không được để trống"));
        assertThat(preview.getRows().get(1).getErrors()).anyMatch(e -> e.contains("Email không đúng định dạng"));
        assertThat(preview.getRows().get(2).getErrors()).anyMatch(e -> e.contains("Email đã tồn tại trong hệ thống"));
    }

    @Test
    @DisplayName("9. Email trùng lặp trong cùng file: TẤT CẢ các dòng có email đó đều bị đánh dấu lỗi")
    void preview_DuplicateEmailInSameExcel_AllOccurrencesInvalid() throws IOException {
        String[][] data = {
                {"Họ và tên", "Email", "Phòng ban", "Vai trò"},
                {"Vũ Email Trùng 1", "s2s1.duplicate@company.com", "Phòng Công nghệ", "RECRUITER"},
                {"Đỗ Email Trùng 2", "s2s1.duplicate@company.com", "Phòng Công nghệ", "INTERVIEWER"}
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportPreviewResponse preview = importService.previewImport(file);

        assertThat(preview.getValidCount()).isEqualTo(0);
        assertThat(preview.getInvalidCount()).isEqualTo(2);

        // Cả 2 dòng đều phải nhận lỗi trùng lặp
        assertThat(preview.getRows().get(0).isValid()).isFalse();
        assertThat(preview.getRows().get(0).getErrors()).anyMatch(e -> e.contains("Email bị trùng lặp trong tệp Excel"));

        assertThat(preview.getRows().get(1).isValid()).isFalse();
        assertThat(preview.getRows().get(1).getErrors()).anyMatch(e -> e.contains("Email bị trùng lặp trong tệp Excel"));
    }

    @Test
    @DisplayName("10. Validation số điện thoại: từ chối ký tự sai, chấp nhận hợp lệ 9-15 số và + đầu số")
    void preview_ValidatePhone() throws IOException {
        String[][] data = {
                {"Họ và tên", "Email", "Số điện thoại"},
                {"Lê Sai ĐT", "phone_bad@company.com", "abc123"},
                {"Nguyễn ĐT Chuẩn", "phone_ok1@company.com", "0901234567"},
                {"Trần ĐT Quốc Tế", "phone_ok2@company.com", "+84987654321"}
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportPreviewResponse preview = importService.previewImport(file);

        assertThat(preview.getRows().get(0).isValid()).isFalse();
        assertThat(preview.getRows().get(0).getErrors()).anyMatch(e -> e.contains("Số điện thoại không đúng định dạng"));

        assertThat(preview.getRows().get(1).isValid()).isTrue();
        assertThat(preview.getRows().get(2).isValid()).isTrue();
    }

    @Test
    @DisplayName("11. Validation phòng ban: từ chối phòng ban > 100 ký tự")
    void preview_ValidateDepartment() throws IOException {
        String longDept = "P".repeat(101);
        String[][] data = {
                {"Họ và tên", "Email", "Phòng ban"},
                {"Hoàng Phòng Ban Dài", "dept_long@company.com", longDept}
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportPreviewResponse preview = importService.previewImport(file);

        assertThat(preview.getRows().get(0).isValid()).isFalse();
        assertThat(preview.getRows().get(0).getErrors()).anyMatch(e -> e.contains("Tên phòng ban không được vượt quá 100 ký tự"));
    }

    @Test
    @DisplayName("12. Vai trò: Hỗ trợ phân cách bằng ',' hoặc ';', nhiều role, và mặc định RECRUITER khi trống")
    void preview_ValidateRoles_MultiAndDefault() throws IOException {
        String[][] data = {
                {"Họ và tên", "Email", "Vai trò"},
                {"User Một Role", "r1@company.com", "INTERVIEWER"},
                {"User Hai Role Chấm Phẩy", "r2@company.com", "RECRUITER;INTERVIEWER"},
                {"User Hai Role Phẩy", "r3@company.com", "ADMIN, HR_MANAGER"},
                {"User Trống Role", "r4@company.com", ""},
                {"User Sai Role", "r5@company.com", "INVALID_ROLE"}
        };
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportPreviewResponse preview = importService.previewImport(file);

        assertThat(preview.getRows().get(0).isValid()).isTrue();
        assertThat(preview.getRows().get(1).isValid()).isTrue();
        assertThat(preview.getRows().get(2).isValid()).isTrue();
        assertThat(preview.getRows().get(3).isValid()).isTrue(); // Trống role vẫn hợp lệ vì default RECRUITER
        assertThat(preview.getRows().get(4).isValid()).isFalse();
        assertThat(preview.getRows().get(4).getErrors()).anyMatch(e -> e.contains("Vai trò không hợp lệ: 'INVALID_ROLE'"));
    }

    @Test
    @DisplayName("13. resolveRoles giải quyết chính xác nhiều vai trò và default RECRUITER")
    void resolveRoles_Accuracy() {
        Set<Role> roles1 = importService.resolveRoles("RECRUITER;INTERVIEWER");
        assertThat(roles1).extracting(Role::getName).containsExactlyInAnyOrder(RoleName.RECRUITER, RoleName.INTERVIEWER);

        Set<Role> roles2 = importService.resolveRoles("ADMIN, HR_MANAGER");
        assertThat(roles2).extracting(Role::getName).containsExactlyInAnyOrder(RoleName.ADMIN, RoleName.HR_MANAGER);

        Set<Role> rolesEmpty = importService.resolveRoles("");
        assertThat(rolesEmpty).extracting(Role::getName).containsExactly(RoleName.RECRUITER);

        assertThat(importService.resolveRole("").getName()).isEqualTo(RoleName.RECRUITER);
    }

    @Test
    @DisplayName("14. Partial Success: Import đúng các dòng hợp lệ và bỏ qua các dòng lỗi")
    void executeImport_PartialSuccess() throws IOException {
        when(userRepository.existsByEmailIgnoreCase("user1@company.com")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("user2@company.com")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("bad@company.com")).thenReturn(true);

        User savedUser1 = new User("user1@company.com", "hash1");
        savedUser1.setId(101L);
        savedUser1.setFullName("User One");
        savedUser1.setDepartment("Tech");

        User savedUser2 = new User("user2@company.com", "hash2");
        savedUser2.setId(102L);
        savedUser2.setFullName("User Two");
        savedUser2.setDepartment("HR");

        when(userRepository.save(any(User.class)))
                .thenReturn(savedUser1)
                .thenReturn(savedUser2);

        String[][] data = {
                {"Họ và tên", "Email", "Phòng ban", "Vai trò"},
                {"User One", "user1@company.com", "Tech", "RECRUITER;INTERVIEWER"},
                {"User Bad", "bad@company.com", "Marketing", "INTERVIEWER"}, // Duplicate DB error
                {"User Two", "user2@company.com", "HR", "Chuyên viên tuyển dụng"} // Valid Vietnamese role
        };

        MockMultipartFile file = new MockMultipartFile("file", "import.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportResultResponse result = importService.executeImport(file);

        assertThat(result.getTotalRows()).isEqualTo(3);
        assertThat(result.getSuccessCount()).isEqualTo(2);
        assertThat(result.getFailedCount()).isEqualTo(1);

        assertThat(result.getSuccessRows()).hasSize(2);
        assertThat(result.getSuccessRows().get(0).getEmail()).isEqualTo("user1@company.com");
        assertThat(result.getSuccessRows().get(1).getEmail()).isEqualTo("user2@company.com");

        assertThat(result.getFailedRows()).hasSize(1);
        assertThat(result.getFailedRows().get(0).getData().getEmail()).isEqualTo("bad@company.com");
        assertThat(result.getFailedRows().get(0).getErrors()).anyMatch(e -> e.contains("đã tồn tại"));

        verify(mailService, times(2)).sendAccountActivationEmail(anyString(), anyString());
    }

    @Test
    @DisplayName("15. Email failure không rollback tài khoản và ghi nhận status EMAIL_FAILED")
    void executeImport_MailFailure_DoesNotRollbackAccount() throws IOException {
        when(userRepository.existsByEmailIgnoreCase("user1@company.com")).thenReturn(false);

        User savedUser = new User("user1@company.com", "hash");
        savedUser.setId(101L);
        savedUser.setFullName("User One");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        doThrow(new RuntimeException("SMTP Connection Refused"))
                .when(mailService).sendAccountActivationEmail(eq("user1@company.com"), anyString());

        String[][] data = {
                {"Họ và tên", "Email", "Phòng ban", "Vai trò"},
                {"User One", "user1@company.com", "Tech", "INTERVIEWER"}
        };

        MockMultipartFile file = new MockMultipartFile("file", "import.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportResultResponse result = importService.executeImport(file);

        assertThat(result.getSuccessCount()).isEqualTo(1);
        assertThat(result.getSuccessRows().get(0).getEmailStatus()).isEqualTo("ACCOUNT_CREATED_EMAIL_FAILED");
    }
}
