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

    @BeforeEach
    void setUp() {
        interviewerRole = new Role(RoleName.INTERVIEWER, "Người phỏng vấn");
        interviewerRole.setId(1L);

        recruiterRole = new Role(RoleName.RECRUITER, "Chuyên viên tuyển dụng");
        recruiterRole.setId(2L);

        lenient().when(roleRepository.findByName(RoleName.INTERVIEWER)).thenReturn(Optional.of(interviewerRole));
        lenient().when(roleRepository.findByName(RoleName.RECRUITER)).thenReturn(Optional.of(recruiterRole));
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
    @DisplayName("Tạo file Excel mẫu thành công và mở được cấu trúc POI")
    void generateTemplate_Success() throws IOException {
        byte[] templateBytes = importService.generateTemplate();
        assertThat(templateBytes).isNotEmpty();

        // Verify with POI that workbook opens cleanly
        try (Workbook wb = new XSSFWorkbook(new java.io.ByteArrayInputStream(templateBytes))) {
            assertThat(wb.getNumberOfSheets()).isGreaterThanOrEqualTo(1);
            Sheet sheet = wb.getSheetAt(0);
            Row header = sheet.getRow(0);
            assertThat(header.getCell(0).getStringCellValue()).contains("Họ và tên");
            assertThat(header.getCell(1).getStringCellValue()).contains("Email");
        }
    }

    @Test
    @DisplayName("Parse thất bại khi file null hoặc rỗng")
    void parse_EmptyFile_ThrowsException() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.xlsx", "application/vnd.ms-excel", new byte[0]);
        assertThatThrownBy(() -> importService.parseWorkbook(emptyFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File Excel không được để trống");
    }

    @Test
    @DisplayName("Parse thất bại khi file sai định dạng đuôi không phải xlsx/xls")
    void parse_InvalidExtension_ThrowsException() {
        MockMultipartFile txtFile = new MockMultipartFile("file", "test.txt", "text/plain", "hello".getBytes());
        assertThatThrownBy(() -> importService.parseWorkbook(txtFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Định dạng file không hợp lệ");
    }

    @Test
    @DisplayName("Parse thất bại khi file thiếu cột bắt buộc Họ và tên hoặc Email")
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
    @DisplayName("Preview phát hiện dòng lỗi và dòng hợp lệ chính xác")
    void preview_MixedValidAndInvalidRows() throws IOException {
        when(userRepository.existsByEmailIgnoreCase("exist@company.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("valid@company.com")).thenReturn(false);

        String[][] data = {
                {"Họ và tên", "Email", "Phòng ban", "Vai trò"},
                {"Nguyễn Văn Hợp Lệ", "valid@company.com", "IT", "INTERVIEWER"},
                {"Trần Đã Tồn Tại", "exist@company.com", "HR", "RECRUITER"},
                {"", "no-name@company.com", "HR", "INTERVIEWER"}, // thiếu tên
                {"Lê Sai Email", "invalid-email-format", "Sales", "INTERVIEWER"}, // sai email
                {"Phạm Trùng 1", "dup@company.com", "Legal", "INTERVIEWER"}, // trùng 1
                {"Phạm Trùng 2", "dup@company.com", "Legal", "INTERVIEWER"}  // trùng 2
        };

        MockMultipartFile file = new MockMultipartFile("file", "import.xlsx", "application/vnd.ms-excel", createExcelBytes(data));
        ExcelImportPreviewResponse preview = importService.previewImport(file);

        assertThat(preview.getTotalRows()).isEqualTo(6);
        assertThat(preview.getValidCount()).isEqualTo(1);
        assertThat(preview.getInvalidCount()).isEqualTo(5);

        // Row 1 is valid
        assertThat(preview.getRows().get(0).isValid()).isTrue();
        assertThat(preview.getRows().get(0).getErrors()).isEmpty();

        // Row 2 has duplicate in DB
        assertThat(preview.getRows().get(1).isValid()).isFalse();
        assertThat(preview.getRows().get(1).getErrors()).anyMatch(e -> e.contains("đã tồn tại"));

        // Row 3 has missing name
        assertThat(preview.getRows().get(2).isValid()).isFalse();
        assertThat(preview.getRows().get(2).getErrors()).anyMatch(e -> e.contains("Họ và tên không được để trống"));

        // Row 4 has invalid email format
        assertThat(preview.getRows().get(3).isValid()).isFalse();
        assertThat(preview.getRows().get(3).getErrors()).anyMatch(e -> e.contains("Email không đúng định dạng"));

        // Rows 5 and 6 have duplicate in file
        assertThat(preview.getRows().get(4).isValid()).isFalse();
        assertThat(preview.getRows().get(4).getErrors()).anyMatch(e -> e.contains("trùng lặp trong chính file"));
        assertThat(preview.getRows().get(5).isValid()).isFalse();
        assertThat(preview.getRows().get(5).getErrors()).anyMatch(e -> e.contains("trùng lặp trong chính file"));
    }

    @Test
    @DisplayName("Partial Success: Import 2 dòng hợp lệ và bỏ qua 1 dòng lỗi")
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
                {"User One", "user1@company.com", "Tech", "INTERVIEWER"},
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

        // Verify activation email dispatched
        verify(mailService, times(2)).sendAccountActivationEmail(anyString(), anyString());
    }

    @Test
    @DisplayName("Email failure không rollback tài khoản và ghi nhận status EMAIL_FAILED")
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

    @Test
    @DisplayName("ResolveRole hỗ trợ đầy đủ các vai trò tiếng Việt và mã hệ thống")
    void resolveRole_VietnameseAndCodes() {
        assertThat(importService.resolveRole("ADMIN").getName()).isEqualTo(RoleName.ADMIN);
        assertThat(importService.resolveRole("Quản trị viên").getName()).isEqualTo(RoleName.ADMIN);
        assertThat(importService.resolveRole("HR_MANAGER").getName()).isEqualTo(RoleName.HR_MANAGER);
        assertThat(importService.resolveRole("Trưởng phòng nhân sự").getName()).isEqualTo(RoleName.HR_MANAGER);
        assertThat(importService.resolveRole("Người phỏng vấn").getName()).isEqualTo(RoleName.INTERVIEWER);
        assertThat(importService.resolveRole("").getName()).isEqualTo(RoleName.INTERVIEWER);

        assertThatThrownBy(() -> importService.resolveRole("INVALID_ROLE_XYZ"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Vai trò không hợp lệ");
    }
}
