package com.example.auth_service;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class TestDataGeneratorTest {

    private void writeExcel(File target, String[][] rows) throws IOException {
        target.getParentFile().mkdirs();
        try (Workbook wb = new XSSFWorkbook(); FileOutputStream fos = new FileOutputStream(target)) {
            Sheet sheet = wb.createSheet("Nhân sự");
            for (int r = 0; r < rows.length; r++) {
                Row row = sheet.createRow(r);
                for (int c = 0; c < rows[r].length; c++) {
                    row.createCell(c).setCellValue(rows[r][c]);
                }
            }
            wb.write(fos);
        }
    }

    @Test
    void generateTestCases() throws IOException {
        long ts = System.currentTimeMillis();
        File fixtureDir = new File("src/test/resources/fixtures");
        if (!fixtureDir.exists()) {
            fixtureDir = new File("../../frontend/test-fixtures");
        }

        // CASE 1: File toàn bộ hợp lệ (3 valid users)
        String[][] case1 = {
                {"Họ và tên", "Email", "Phòng ban", "Vai trò"},
                {"Nguyễn Văn Hợp Lệ 1", "nv_valid1_" + ts + "@company.local", "Kỹ thuật", "Chuyên viên tuyển dụng"},
                {"Trần Thị Hợp Lệ 2", "nv_valid2_" + ts + "@company.local", "Nhân sự", "Người phỏng vấn"},
                {"Lê Văn Hợp Lệ 3", "nv_valid3_" + ts + "@company.local", "Kinh doanh", "RECRUITER"}
        };
        writeExcel(new File("../../frontend/test-fixtures/case1_all_valid.xlsx"), case1);

        // CASE 2: File có cả dòng đúng và dòng lỗi (10 dòng: 7 valid, 3 invalid)
        String[][] case2 = {
                {"Họ và tên", "Email", "Phòng ban", "Vai trò"},
                {"Nhân sự Đúng 1", "case2_valid1_" + ts + "@company.local", "Kỹ thuật", "Người phỏng vấn"},
                {"Nhân sự Đúng 2", "case2_valid2_" + ts + "@company.local", "Kỹ thuật", "INTERVIEWER"},
                {"Nhân sự Lỗi 1 Email Sai", "invalid-email-format-case2", "Kỹ thuật", "INTERVIEWER"}, // Invalid 1
                {"Nhân sự Đúng 3", "case2_valid3_" + ts + "@company.local", "Nhân sự", "Chuyên viên tuyển dụng"},
                {"Nhân sự Đúng 4", "case2_valid4_" + ts + "@company.local", "Nhân sự", "RECRUITER"},
                {"", "case2_empty_name_" + ts + "@company.local", "Tài chính", "INTERVIEWER"}, // Invalid 2: Thiếu tên
                {"Nhân sự Đúng 5", "case2_valid5_" + ts + "@company.local", "Tài chính", "Người phỏng vấn"},
                {"Nhân sự Đúng 6", "case2_valid6_" + ts + "@company.local", "Vận hành", "Người phỏng vấn"},
                {"Nhân sự Lỗi 3 Role Sai", "case2_invalid_role_" + ts + "@company.local", "Vận hành", "INVALID_ROLE_XYZ"}, // Invalid 3
                {"Nhân sự Đúng 7", "case2_valid7_" + ts + "@company.local", "Vận hành", "Chuyên viên tuyển dụng"}
        };
        writeExcel(new File("../../frontend/test-fixtures/case2_partial_7valid_3invalid.xlsx"), case2);

        // CASE 3: Email đã tồn tại (admin@company.com)
        String[][] case3 = {
                {"Họ và tên", "Email", "Phòng ban", "Vai trò"},
                {"Trùng Admin", "admin@company.com", "Quản trị", "ADMIN"}
        };
        writeExcel(new File("../../frontend/test-fixtures/case3_existing_email.xlsx"), case3);

        // CASE 4: Role không hợp lệ
        String[][] case4 = {
                {"Họ và tên", "Email", "Phòng ban", "Vai trò"},
                {"Nhân sự Role Lạ", "role_invalid_" + ts + "@company.local", "Kỹ thuật", "SUPER_ADMIN_FAKE"}
        };
        writeExcel(new File("../../frontend/test-fixtures/case4_invalid_role.xlsx"), case4);

        // CASE 5: Thiếu header bắt buộc
        String[][] case5 = {
                {"Mã nhân sự", "Số điện thoại", "Ghi chú"},
                {"NV001", "0912345678", "Chỉ có thông tin liên lạc"}
        };
        writeExcel(new File("../../frontend/test-fixtures/case5_missing_headers.xlsx"), case5);

        System.out.println("All 5 test fixture Excel files generated successfully!");
    }
}
