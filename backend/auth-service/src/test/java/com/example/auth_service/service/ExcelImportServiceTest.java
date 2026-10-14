package com.example.auth_service.service;

import com.example.auth_service.dto.*;
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

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExcelImportServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private MailService mailService;

    @InjectMocks
    private ExcelImportService excelImportService;

    @BeforeEach
    void setUp() {
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword123");
        lenient().when(roleRepository.findByName(any(RoleName.class)))
                .thenAnswer(invocation -> {
                    RoleName rName = invocation.getArgument(0);
                    return Optional.of(new Role(rName, "Vai trò " + rName.name()));
                });
        lenient().when(roleRepository.save(any(Role.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private byte[] createExcelBytes(String[] headers, List<String[]> dataRows) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Sheet1");
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }
            for (int r = 0; r < dataRows.size(); r++) {
                Row row = sheet.createRow(r + 1);
                String[] values = dataRows.get(r);
                for (int c = 0; c < values.length; c++) {
                    row.createCell(c).setCellValue(values[c]);
                }
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }

    @Test
    @DisplayName("AC1: Tải tệp Excel mẫu thành công và đúng cấu trúc cột")
    void testGenerateTemplate() throws Exception {
        byte[] templateBytes = excelImportService.generateTemplate();
        assertThat(templateBytes).isNotEmpty();

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(templateBytes))) {
            Sheet sheet = workbook.getSheet("Nhân sự");
            assertThat(sheet).isNotNull();
            Row headerRow = sheet.getRow(0);
            assertThat(headerRow.getCell(0).getStringCellValue()).isEqualTo("Mã nhân sự");
            assertThat(headerRow.getCell(1).getStringCellValue()).isEqualTo("Họ tên");
            assertThat(headerRow.getCell(2).getStringCellValue()).isEqualTo("Email");
            assertThat(headerRow.getCell(3).getStringCellValue()).isEqualTo("Số điện thoại");
            assertThat(headerRow.getCell(4).getStringCellValue()).isEqualTo("Phòng ban");
            assertThat(headerRow.getCell(5).getStringCellValue()).isEqualTo("Vai trò");
            assertThat(sheet.getLastRowNum()).isGreaterThanOrEqualTo(1);
        }
    }

    @Test
    @DisplayName("Kiểm tra file upload rỗng hoặc không đúng định dạng")
    void testValidateFile_EmptyOrInvalidFormat() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.xlsx", "text/plain", new byte[0]);
        assertThatThrownBy(() -> excelImportService.previewExcel(emptyFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Vui lòng chọn tệp Excel để tải lên");

        MockMultipartFile invalidExt = new MockMultipartFile("file", "test.txt", "text/plain", "abc".getBytes());
        assertThatThrownBy(() -> excelImportService.previewExcel(invalidExt))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Định dạng tệp không hợp lệ");

        byte[] bigData = new byte[11 * 1024 * 1024];
        MockMultipartFile tooBig = new MockMultipartFile("file", "big.xlsx", "application/octet-stream", bigData);
        assertThatThrownBy(() -> excelImportService.previewExcel(tooBig))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Dung lượng tệp vượt quá giới hạn");
    }

    @Test
    @DisplayName("Kiểm tra tệp Excel thiếu cột bắt buộc (Họ tên hoặc Email)")
    void testPreviewExcel_MissingRequiredColumns() throws Exception {
        String[] headers = {"Số điện thoại", "Phòng ban"};
        List<String[]> rows = java.util.Collections.singletonList(new String[]{"0901234567", "IT"});
        byte[] bytes = createExcelBytes(headers, rows);
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/octet-stream", bytes);

        assertThatThrownBy(() -> excelImportService.previewExcel(file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("thiếu cột bắt buộc");
    }

    @Test
    @DisplayName("AC2 & AC3: Xem trước dữ liệu và báo lỗi chi tiết theo từng dòng")
    void testPreviewExcel_RowLevelErrors() throws Exception {
        when(userRepository.existsByEmailIgnoreCase("exist@company.com")).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("valid@company.com")).thenReturn(false);

        String[] headers = {"Mã nhân sự", "Họ tên", "Email", "Số điện thoại", "Phòng ban", "Vai trò"};
        List<String[]> dataRows = List.of(
                // Row 2: Valid row
                new String[]{"NS001", "Nguyễn Văn A", "valid@company.com", "0901234567", "Phòng Kỹ thuật", "RECRUITER"},
                // Row 3: Missing full name & invalid email format
                new String[]{"NS002", "", "not-an-email", "0901234568", "Phòng Kế toán", "INTERVIEWER"},
                // Row 4: Duplicate email in system
                new String[]{"NS003", "Trần Văn B", "exist@company.com", "0901234569", "Phòng Kế toán", "APPROVER"},
                // Row 5: Duplicate email in file (using valid@company.com again)
                new String[]{"NS004", "Lê Văn C", "valid@company.com", "0901234570", "Phòng Kỹ thuật", "HIRING_MANAGER"},
                // Row 6: Invalid phone and invalid role
                new String[]{"NS005", "Phạm Văn D", "d@company.com", "abc", "Phòng Nhân sự", "INVALID_ROLE"}
        );

        byte[] bytes = createExcelBytes(headers, dataRows);
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/octet-stream", bytes);

        ExcelImportPreviewResponse preview = excelImportService.previewExcel(file);

        assertThat(preview.getTotalRows()).isEqualTo(5);
        assertThat(preview.getValidRows()).isEqualTo(1);
        assertThat(preview.getInvalidRows()).isEqualTo(4);

        List<ExcelImportRowDto> rows = preview.getRows();
        // Row 2
        assertThat(rows.get(0).isValid()).isTrue();
        assertThat(rows.get(0).getErrors()).isEmpty();
        assertThat(rows.get(0).getEmail()).isEqualTo("valid@company.com");

        // Row 3
        assertThat(rows.get(1).isValid()).isFalse();
        assertThat(rows.get(1).getErrors()).contains("Thiếu họ tên", "Email không đúng định dạng");

        // Row 4
        assertThat(rows.get(2).isValid()).isFalse();
        assertThat(rows.get(2).getErrors()).contains("Email đã tồn tại trong hệ thống");

        // Row 5
        assertThat(rows.get(3).isValid()).isFalse();
        assertThat(rows.get(3).getErrors()).contains("Email bị trùng lặp trong tệp Excel");

        // Row 6
        assertThat(rows.get(4).isValid()).isFalse();
        assertThat(rows.get(4).getErrors()).anyMatch(err -> err.contains("Số điện thoại không hợp lệ"));
        assertThat(rows.get(4).getErrors()).anyMatch(err -> err.contains("Vai trò không hợp lệ"));
    }

    @Test
    @DisplayName("AC4 & AC5: Bỏ qua dòng lỗi, nhập dòng hợp lệ và trả báo cáo tổng kết")
    void testImportExcel_SkipsErrorsAndImportsValid() throws Exception {
        when(userRepository.existsByEmailIgnoreCase("valid1@company.com")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("valid2@company.com")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("duplicate@company.com")).thenReturn(true);

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(100L);
            return u;
        });

        String[] headers = {"Mã NV", "Họ và tên", "Email", "SĐT", "Bộ phận", "Vai trò"};
        List<String[]> dataRows = List.of(
                new String[]{"NS101", "Nguyễn An", "valid1@company.com", "0911223344", "Phòng CNTT", "RECRUITER"},
                new String[]{"NS102", "Trần Lỗi", "duplicate@company.com", "0922334455", "Phòng CNTT", "INTERVIEWER"},
                new String[]{"NS103", "Lê Bình", "valid2@company.com", "0933445566", "Phòng Marketing", "HR_MANAGER"}
        );

        byte[] bytes = createExcelBytes(headers, dataRows);
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/octet-stream", bytes);

        ExcelImportSummaryResponse summary = excelImportService.importExcel(file);

        assertThat(summary.getTotalRows()).isEqualTo(3);
        assertThat(summary.getSuccessCount()).isEqualTo(2);
        assertThat(summary.getFailedCount()).isEqualTo(1);
        assertThat(summary.getSuccess()).isEqualTo(2);
        assertThat(summary.getSkipped()).isEqualTo(1);
        assertThat(summary.getMessage()).contains("Nhập thành công 2/3 nhân sự. Bỏ qua 1 dòng không hợp lệ.");
        assertThat(summary.getImportedUsers()).hasSize(2);
        assertThat(summary.getFailedRows()).hasSize(1);
        assertThat(summary.getFailedRows().get(0).getEmail()).isEqualTo("duplicate@company.com");

        verify(userRepository, times(2)).save(any(User.class));
        verify(mailService, times(2)).sendAccountActivationEmail(anyString(), anyString());
    }

    @Test
    @DisplayName("Nhập khẩu vẫn tiếp tục lưu các dòng khác nếu 1 dòng gặp lỗi lưu DB hoặc gửi mail")
    void testImportExcel_ResilientOnSaveOrMailFailure() throws Exception {
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);

        // Giả lập user 1 lưu thành công, user 2 gặp lỗi ném RuntimeException khi save, user 3 lưu thành công nhưng lỗi gửi mail
        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> {
                    User u = invocation.getArgument(0);
                    u.setId(1L);
                    return u;
                })
                .thenThrow(new RuntimeException("Lỗi kết nối cơ sở dữ liệu tạm thời"))
                .thenAnswer(invocation -> {
                    User u = invocation.getArgument(0);
                    u.setId(3L);
                    return u;
                });

        doNothing()
                .doThrow(new RuntimeException("Mail server down"))
                .when(mailService).sendAccountActivationEmail(anyString(), anyString());

        String[] headers = {"Họ tên", "Email"};
        List<String[]> dataRows = List.of(
                new String[]{"User Một", "user1@company.com"},
                new String[]{"User Hai", "user2@company.com"},
                new String[]{"User Ba", "user3@company.com"}
        );

        byte[] bytes = createExcelBytes(headers, dataRows);
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/octet-stream", bytes);

        ExcelImportSummaryResponse summary = excelImportService.importExcel(file);

        assertThat(summary.getTotalRows()).isEqualTo(3);
        assertThat(summary.getSuccessCount()).isEqualTo(2);
        assertThat(summary.getFailedCount()).isEqualTo(1);
        assertThat(summary.getImportedUsers()).extracting(UserSummaryDto::getEmail)
                .containsExactly("user1@company.com", "user3@company.com");
    }

    @Test
    @DisplayName("importRows: Xử lý danh sách rỗng ném BadRequestException")
    void testImportRows_EmptyList() {
        assertThatThrownBy(() -> excelImportService.importRows(null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không được để trống");

        assertThatThrownBy(() -> excelImportService.importRows(new ArrayList<>()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không được để trống");
    }

    @Test
    @DisplayName("importRows: Nhập dữ liệu thành công từ danh sách DTO")
    void testImportRows_Success() {
        when(userRepository.existsByEmailIgnoreCase("row@company.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(200L);
            return u;
        });

        List<ExcelImportRowDto> rows = List.of(
                ExcelImportRowDto.builder()
                        .rowNumber(2)
                        .email("row@company.com")
                        .fullName("Row User")
                        .department("IT")
                        .roles(Set.of("RECRUITER"))
                        .valid(true)
                        .build(),
                ExcelImportRowDto.builder()
                        .rowNumber(3)
                        .email("invalid@company.com")
                        .valid(false)
                        .errors(List.of("Thiếu họ tên"))
                        .build()
        );

        ExcelImportSummaryResponse summary = excelImportService.importRows(rows);

        assertThat(summary.getTotalRows()).isEqualTo(2);
        assertThat(summary.getSuccessCount()).isEqualTo(1);
        assertThat(summary.getFailedCount()).isEqualTo(1);
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Kiểm tra các biên độ dài: Họ tên > 150, SĐT > 20, Phòng ban > 100")
    void testPreviewExcel_LengthBoundaries() throws Exception {
        String longName = "A".repeat(151);
        String longPhone = "09" + "1".repeat(19);
        String longDept = "D".repeat(101);

        String[] headers = {"Họ tên", "Email", "Số điện thoại", "Phòng ban"};
        List<String[]> rows = java.util.Collections.singletonList(
                new String[]{longName, "boundary@company.com", longPhone, longDept}
        );

        byte[] bytes = createExcelBytes(headers, rows);
        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/octet-stream", bytes);

        ExcelImportPreviewResponse preview = excelImportService.previewExcel(file);
        assertThat(preview.getValidRows()).isEqualTo(0);
        List<String> errors = preview.getRows().get(0).getErrors();
        assertThat(errors).anyMatch(e -> e.contains("150 ký tự"));
        assertThat(errors).anyMatch(e -> e.contains("Số điện thoại không hợp lệ"));
        assertThat(errors).anyMatch(e -> e.contains("100 ký tự"));
    }

    @Test
    @DisplayName("Xử lý tệp Excel có dòng trắng trước header và các dòng rỗng xen kẽ")
    void testPreviewExcel_WithBlankRows() throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Sheet1");
            // Blank row 0 & 1
            sheet.createRow(0);
            sheet.createRow(1);
            // Header at row 2
            Row header = sheet.createRow(2);
            header.createCell(0).setCellValue("Họ tên");
            header.createCell(1).setCellValue("Email");
            header.createCell(2).setCellValue("Vai trò");

            // Empty row 3
            sheet.createRow(3);

            // Data row 4
            Row dataRow = sheet.createRow(4);
            dataRow.createCell(0).setCellValue("Trần Văn E");
            dataRow.createCell(1).setCellValue("e@company.com");
            dataRow.createCell(2).setCellValue("INTERVIEWER, RECRUITER");

            workbook.write(out);
            byte[] bytes = out.toByteArray();

            MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/octet-stream", bytes);
            ExcelImportPreviewResponse preview = excelImportService.previewExcel(file);
            assertThat(preview.getTotalRows()).isEqualTo(1);
            assertThat(preview.getValidRows()).isEqualTo(1);
            assertThat(preview.getRows().get(0).getRoles()).contains("INTERVIEWER", "RECRUITER");
        }
    }

    @Test
    @DisplayName("Kiểm tra tệp Excel không có sheet nào ném BadRequestException")
    void testPreviewExcel_NoSheets() throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // No sheets created in workbook
            workbook.write(out);
            byte[] bytes = out.toByteArray();

            MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/octet-stream", bytes);
            assertThatThrownBy(() -> excelImportService.previewExcel(file))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("không chứa sheet dữ liệu");
        }
    }

    @Test
    @DisplayName("Kiểm tra tệp Excel bị hỏng ném BadRequestException")
    void testPreviewExcel_CorruptFile() {
        MockMultipartFile corruptFile = new MockMultipartFile("file", "corrupt.xlsx", "application/octet-stream", "not-a-valid-excel".getBytes());
        assertThatThrownBy(() -> excelImportService.previewExcel(corruptFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể đọc tệp Excel");
    }
}
