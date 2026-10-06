package com.example.auth_service.service;

import com.example.auth_service.dto.excel.*;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.SecureRandom;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class UserExcelImportService {

    private static final Logger logger = LoggerFactory.getLogger(UserExcelImportService.class);

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public UserExcelImportService(UserRepository userRepository,
                                  RoleRepository roleRepository,
                                  PasswordEncoder passwordEncoder,
                                  MailService mailService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
    }

    /**
     * Sinh file Excel mẫu (.xlsx) chuẩn doanh nghiệp với header tiếng Việt và ví dụ minh họa
     */
    public byte[] generateTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Danh sách nhân sự");

            // Header Style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Create Header Row
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Họ và tên *", "Email *", "Phòng ban", "Vai trò"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Add realistic enterprise sample rows
            Row sample1 = sheet.createRow(1);
            sample1.createCell(0).setCellValue("Nguyễn Văn An");
            sample1.createCell(1).setCellValue("an.nguyen@company.com");
            sample1.createCell(2).setCellValue("Khối Công nghệ & Kỹ thuật");
            sample1.createCell(3).setCellValue("INTERVIEWER");

            Row sample2 = sheet.createRow(2);
            sample2.createCell(0).setCellValue("Trần Thị Bình");
            sample2.createCell(1).setCellValue("binh.tran@company.com");
            sample2.createCell(2).setCellValue("Phòng Tuyển dụng & Thu hút Nhân tài");
            sample2.createCell(3).setCellValue("RECRUITER");

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, Math.max(sheet.getColumnWidth(i), 5000));
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            logger.error("Lỗi khi tạo file Excel mẫu: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể tạo file Excel mẫu: " + e.getMessage(), e);
        }
    }

    /**
     * Xem trước (Preview) dữ liệu từ file Excel mà không ghi vào database
     */
    @Transactional(readOnly = true)
    public ExcelImportPreviewResponse previewImport(MultipartFile file) {
        List<ExcelImportRowData> rawRows = parseWorkbook(file);
        List<ExcelImportRowPreview> previewRows = validateRows(rawRows);

        int validCount = (int) previewRows.stream().filter(ExcelImportRowPreview::isValid).count();
        int invalidCount = previewRows.size() - validCount;

        return ExcelImportPreviewResponse.builder()
                .totalRows(previewRows.size())
                .validCount(validCount)
                .invalidCount(invalidCount)
                .rows(previewRows)
                .build();
    }

    /**
     * Thực hiện Import nhân sự theo cơ chế Partial Success:
     * Dòng hợp lệ được tạo tài khoản atomic, dòng lỗi được ghi nhận chi tiết, không rollback dòng đúng.
     */
    public ExcelImportResultResponse executeImport(MultipartFile file) {
        String adminActor = getCurrentUsername();
        logger.info("[EXCEL_IMPORT] Bắt đầu import nhân sự bởi admin: {}", adminActor);

        List<ExcelImportRowData> rawRows = parseWorkbook(file);
        List<ExcelImportRowPreview> validatedRows = validateRows(rawRows);

        List<ExcelImportSuccessRow> successRows = new ArrayList<>();
        List<ExcelImportFailedRow> failedRows = new ArrayList<>();

        for (ExcelImportRowPreview preview : validatedRows) {
            if (!preview.isValid()) {
                failedRows.add(ExcelImportFailedRow.builder()
                        .rowNumber(preview.getRowNumber())
                        .data(preview.getData())
                        .errors(new ArrayList<>(preview.getErrors()))
                        .build());
                continue;
            }

            // Process valid row atomically
            try {
                ExcelImportSuccessRow successRow = createSingleUserFromImport(preview.getData());
                successRows.add(successRow);
            } catch (Exception e) {
                logger.error("[EXCEL_IMPORT] Tạo tài khoản dòng {} thất bại: {}", preview.getRowNumber(), e.getMessage());
                failedRows.add(ExcelImportFailedRow.builder()
                        .rowNumber(preview.getRowNumber())
                        .data(preview.getData())
                        .errors(List.of("Lỗi khi lưu vào cơ sở dữ liệu: " + e.getMessage()))
                        .build());
            }
        }

        logger.info("[EXCEL_IMPORT] Hoàn thành import bởi {}: Tổng số = {}, Thành công = {}, Thất bại = {}",
                adminActor, rawRows.size(), successRows.size(), failedRows.size());

        return ExcelImportResultResponse.builder()
                .totalRows(rawRows.size())
                .successCount(successRows.size())
                .failedCount(failedRows.size())
                .successRows(successRows)
                .failedRows(failedRows)
                .build();
    }

    /**
     * Tạo đơn lẻ một user từ dòng import (Isolated Transaction để đảm bảo tính atomic per-row)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ExcelImportSuccessRow createSingleUserFromImport(ExcelImportRowData data) {
        String email = data.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("Email đã tồn tại trong hệ thống: " + email);
        }

        String rawPassword = generateTemporaryPassword();
        User user = new User(email, passwordEncoder.encode(rawPassword));
        user.setFullName(data.getFullName() != null ? data.getFullName().trim() : "");
        user.setDepartment(data.getDepartment() != null && !data.getDepartment().trim().isBlank() ? data.getDepartment().trim() : null);
        user.setStatus("ACTIVE");
        user.setMustChangePassword(true);

        Role role = resolveRole(data.getRole());
        user.setRoles(Set.of(role));

        User savedUser = userRepository.save(user);

        // Gửi email kích hoạt tài khoản
        String emailStatus = "ACCOUNT_CREATED_EMAIL_SENT";
        try {
            mailService.sendAccountActivationEmail(savedUser.getEmail(), rawPassword);
        } catch (Exception e) {
            logger.warn("[EXCEL_IMPORT] Không thể gửi email kích hoạt cho {}: {}", savedUser.getEmail(), e.getMessage());
            emailStatus = "ACCOUNT_CREATED_EMAIL_FAILED";
        }

        return ExcelImportSuccessRow.builder()
                .rowNumber(data.getRowNumber())
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .department(savedUser.getDepartment())
                .role(role.getName().name())
                .emailStatus(emailStatus)
                .build();
    }

    /**
     * Đọc và parse dữ liệu từ file Excel
     */
    public List<ExcelImportRowData> parseWorkbook(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File Excel không được để trống.");
        }

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (!filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
            throw new BadRequestException("Định dạng file không hợp lệ. Vui lòng tải lên file .xlsx hoặc .xls.");
        }

        List<ExcelImportRowData> rows = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            if (workbook.getNumberOfSheets() == 0) {
                throw new BadRequestException("File Excel không chứa bất kỳ trang dữ liệu (sheet) nào.");
            }

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet.getPhysicalNumberOfRows() == 0) {
                throw new BadRequestException("Trang dữ liệu đầu tiên trong file Excel hoàn toàn trống.");
            }

            // Identify Header row
            int headerRowIdx = -1;
            int nameCol = -1;
            int emailCol = -1;
            int deptCol = -1;
            int roleCol = -1;

            DataFormatter formatter = new DataFormatter();

            for (Row row : sheet) {
                for (Cell cell : row) {
                    String val = formatter.formatCellValue(cell).trim().toLowerCase();
                    if (val.contains("họ và tên") || val.contains("họ tên") || val.equals("tên") || val.equals("fullname") || val.equals("name")) {
                        nameCol = cell.getColumnIndex();
                    }
                    if (val.contains("email") || val.contains("thư điện tử")) {
                        emailCol = cell.getColumnIndex();
                    }
                    if (val.contains("phòng ban") || val.contains("bộ phận") || val.equals("department")) {
                        deptCol = cell.getColumnIndex();
                    }
                    if (val.contains("vai trò") || val.contains("role") || val.contains("chức danh")) {
                        roleCol = cell.getColumnIndex();
                    }
                }
                if (nameCol != -1 && emailCol != -1) {
                    headerRowIdx = row.getRowNum();
                    break;
                }
            }

            if (headerRowIdx == -1 || nameCol == -1 || emailCol == -1) {
                throw new BadRequestException("File Excel thiếu cột bắt buộc: 'Họ và tên' hoặc 'Email'. Vui lòng tải file mẫu để xem định dạng.");
            }

            // Parse data rows
            for (int r = headerRowIdx + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String fullName = getCellValue(row, nameCol, formatter);
                String email = getCellValue(row, emailCol, formatter);
                String department = getCellValue(row, deptCol, formatter);
                String role = getCellValue(row, roleCol, formatter);

                // Skip purely blank rows
                if (fullName.isBlank() && email.isBlank() && department.isBlank() && role.isBlank()) {
                    continue;
                }

                rows.add(ExcelImportRowData.builder()
                        .rowNumber(r + 1) // 1-indexed for Excel line numbering
                        .fullName(fullName)
                        .email(email)
                        .department(department)
                        .role(role)
                        .build());
            }

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Lỗi khi đọc file Excel: {}", e.getMessage(), e);
            throw new BadRequestException("Không thể đọc cấu trúc file Excel: " + e.getMessage());
        }

        if (rows.isEmpty()) {
            throw new BadRequestException("File Excel không có dòng dữ liệu hợp lệ nào dưới dòng tiêu đề.");
        }

        return rows;
    }

    /**
     * Xác thực toàn bộ các dòng theo từng quy tắc:
     * - Field bắt buộc
     * - Định dạng email
     * - Trùng lặp trong cùng file
     * - Trùng lặp với DB
     * - Độ dài trường
     * - Vai trò hợp lệ
     */
    public List<ExcelImportRowPreview> validateRows(List<ExcelImportRowData> rows) {
        // Build frequency map to detect duplicate emails within the same uploaded Excel
        Map<String, Integer> emailCountsInFile = new HashMap<>();
        for (ExcelImportRowData row : rows) {
            if (row.getEmail() != null && !row.getEmail().trim().isBlank()) {
                String cleanEmail = row.getEmail().trim().toLowerCase();
                emailCountsInFile.put(cleanEmail, emailCountsInFile.getOrDefault(cleanEmail, 0) + 1);
            }
        }

        List<ExcelImportRowPreview> previews = new ArrayList<>();

        for (ExcelImportRowData row : rows) {
            List<String> errors = new ArrayList<>();
            String fullName = row.getFullName() != null ? row.getFullName().trim() : "";
            String email = row.getEmail() != null ? row.getEmail().trim() : "";
            String dept = row.getDepartment() != null ? row.getDepartment().trim() : "";
            String roleStr = row.getRole() != null ? row.getRole().trim() : "";

            // 1. Họ và tên validation
            if (fullName.isBlank()) {
                errors.add("Họ và tên không được để trống.");
            } else if (fullName.length() < 2) {
                errors.add("Họ và tên phải có tối thiểu 2 ký tự.");
            } else if (fullName.length() > 100) {
                errors.add("Họ và tên không được vượt quá 100 ký tự.");
            }

            // 2. Email validation
            if (email.isBlank()) {
                errors.add("Email không được để trống.");
            } else if (!EMAIL_PATTERN.matcher(email).matches()) {
                errors.add("Email không đúng định dạng.");
            } else if (email.length() > 100) {
                errors.add("Email không được vượt quá 100 ký tự.");
            } else {
                String cleanEmail = email.toLowerCase();
                if (emailCountsInFile.getOrDefault(cleanEmail, 0) > 1) {
                    errors.add("Email bị trùng lặp trong chính file Excel.");
                } else if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
                    errors.add("Email đã tồn tại trong hệ thống.");
                }
            }

            // 3. Department validation
            if (dept.length() > 100) {
                errors.add("Tên phòng ban không được vượt quá 100 ký tự.");
            }

            // 4. Role validation
            if (!roleStr.isBlank()) {
                try {
                    resolveRole(roleStr);
                } catch (BadRequestException e) {
                    errors.add(e.getMessage());
                }
            }

            previews.add(ExcelImportRowPreview.builder()
                    .rowNumber(row.getRowNumber())
                    .data(row)
                    .valid(errors.isEmpty())
                    .errors(errors)
                    .build());
        }

        return previews;
    }

    /**
     * Phân giải chuỗi vai trò từ tiếng Việt hoặc mã code sang Role entity
     */
    public Role resolveRole(String roleStr) {
        if (roleStr == null || roleStr.trim().isBlank()) {
            return roleRepository.findByName(RoleName.INTERVIEWER)
                    .orElseGet(() -> roleRepository.save(new Role(RoleName.INTERVIEWER, "Người phỏng vấn")));
        }

        String normalized = roleStr.trim().toUpperCase();

        RoleName roleName;
        switch (normalized) {
            case "ADMIN":
            case "QUẢN TRỊ VIÊN":
            case "QUẢN TRỊ":
                roleName = RoleName.ADMIN;
                break;
            case "HR_MANAGER":
            case "TRƯỞNG PHÒNG NHÂN SỰ":
            case "QUẢN LÝ NHÂN SỰ":
                roleName = RoleName.HR_MANAGER;
                break;
            case "RECRUITER":
            case "CHUYÊN VIÊN TUYỂN DỤNG":
            case "TUYỂN DỤNG":
                roleName = RoleName.RECRUITER;
                break;
            case "INTERVIEWER":
            case "NGƯỜI PHỎNG VẤN":
            case "PHỎNG VẤN VIÊN":
                roleName = RoleName.INTERVIEWER;
                break;
            case "HIRING_MANAGER":
            case "QUẢN LÝ BỘ PHẬN TUYỂN DỤNG":
            case "QUẢN LÝ TUYỂN DỤNG":
                roleName = RoleName.HIRING_MANAGER;
                break;
            case "APPROVER":
            case "NGƯỜI PHÊ DUYỆT":
            case "PHÊ DUYỆT":
                roleName = RoleName.APPROVER;
                break;
            case "CANDIDATE":
            case "ỨNG VIÊN":
                roleName = RoleName.CANDIDATE;
                break;
            default:
                try {
                    roleName = RoleName.valueOf(normalized);
                } catch (IllegalArgumentException e) {
                    throw new BadRequestException("Vai trò không hợp lệ: '" + roleStr + "'. Hỗ trợ: ADMIN, HR_MANAGER, RECRUITER, INTERVIEWER, HIRING_MANAGER, APPROVER, CANDIDATE.");
                }
        }

        final RoleName finalRoleName = roleName;
        return roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(finalRoleName, "Vai trò " + finalRoleName.name())));
    }

    private String getCellValue(Row row, int colIdx, DataFormatter formatter) {
        if (colIdx < 0) return "";
        Cell cell = row.getCell(colIdx);
        if (cell == null) return "";
        return formatter.formatCellValue(cell).trim();
    }

    private String generateTemporaryPassword() {
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(TEMP_PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null) ? auth.getName() : "system_admin";
    }
}
