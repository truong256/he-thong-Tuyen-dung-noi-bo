package com.example.auth_service.service;

import com.example.auth_service.dto.*;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@PreAuthorize("hasAuthority('USER_MANAGE')")
public class ExcelImportService {

    private static final Logger logger = LoggerFactory.getLogger(ExcelImportService.class);
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?\\d{9,15}$");
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public ExcelImportService(UserRepository userRepository,
                              RoleRepository roleRepository,
                              PasswordEncoder passwordEncoder,
                              MailService mailService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
    }

    /**
     * Tạo tệp Excel mẫu để người dùng tải về.
     */
    @PreAuthorize("hasAnyAuthority('USER_READ', 'USER_MANAGE')")
    public byte[] generateTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Nhân sự");

            // Tạo Header Style
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            CellStyle headerCellStyle = workbook.createCellStyle();
            headerCellStyle.setFont(headerFont);
            headerCellStyle.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
            headerCellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerCellStyle.setAlignment(HorizontalAlignment.CENTER);
            headerCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerCellStyle.setBorderTop(BorderStyle.THIN);
            headerCellStyle.setBorderBottom(BorderStyle.THIN);
            headerCellStyle.setBorderLeft(BorderStyle.THIN);
            headerCellStyle.setBorderRight(BorderStyle.THIN);

            // Cell Data Style
            CellStyle dataCellStyle = workbook.createCellStyle();
            dataCellStyle.setBorderTop(BorderStyle.THIN);
            dataCellStyle.setBorderBottom(BorderStyle.THIN);
            dataCellStyle.setBorderLeft(BorderStyle.THIN);
            dataCellStyle.setBorderRight(BorderStyle.THIN);

            String[] columns = {"Mã nhân sự", "Họ tên", "Email", "Số điện thoại", "Phòng ban", "Vai trò"};

            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(24);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerCellStyle);
            }

            // Dữ liệu mẫu minh họa
            String[][] sampleData = {
                    {"NS001", "Nguyễn Văn An", "an.nguyen@example.com", "0901234567", "Phòng Công nghệ", "RECRUITER"},
                    {"NS002", "Trần Thị Bình", "binh.tran@example.com", "0912345678", "Phòng Nhân sự", "INTERVIEWER"},
                    {"NS003", "Lê Văn Cường", "cuong.le@example.com", "0987654321", "Phòng Kinh doanh", "HIRING_MANAGER"}
            };

            for (int rowIdx = 0; rowIdx < sampleData.length; rowIdx++) {
                Row row = sheet.createRow(rowIdx + 1);
                for (int colIdx = 0; colIdx < sampleData[rowIdx].length; colIdx++) {
                    Cell cell = row.createCell(colIdx);
                    cell.setCellValue(sampleData[rowIdx][colIdx]);
                    cell.setCellStyle(dataCellStyle);
                }
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
                if (sheet.getColumnWidth(i) < 4500) {
                    sheet.setColumnWidth(i, 4500);
                }
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            logger.error("Lỗi khi tạo tệp Excel mẫu: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể tạo tệp Excel mẫu.", e);
        }
    }

    /**
     * Đọc tệp Excel và trả về kết quả xem trước kèm thông báo lỗi từng dòng.
     */
    @Transactional(readOnly = true)
    public ExcelImportPreviewResponse previewExcel(MultipartFile file) {
        validateFile(file);

        List<ExcelImportRowDto> rows = parseAndValidateRows(file);
        int validCount = (int) rows.stream().filter(ExcelImportRowDto::isValid).count();
        int invalidCount = rows.size() - validCount;

        return ExcelImportPreviewResponse.builder()
                .totalRows(rows.size())
                .validRows(validCount)
                .invalidRows(invalidCount)
                .rows(rows)
                .build();
    }

    /**
     * Nhập dữ liệu từ tệp Excel: bỏ qua dòng lỗi, nhập các dòng hợp lệ và trả báo cáo tổng kết.
     */
    @Transactional
    public ExcelImportSummaryResponse importExcel(MultipartFile file) {
        validateFile(file);

        List<ExcelImportRowDto> parsedRows = parseAndValidateRows(file);
        return processImport(parsedRows);
    }

    /**
     * Nhập dữ liệu từ danh sách dòng đã xác thực.
     */
    @Transactional
    public ExcelImportSummaryResponse importRows(List<ExcelImportRowDto> inputRows) {
        if (inputRows == null || inputRows.isEmpty()) {
            throw new BadRequestException("Danh sách dữ liệu nhập không được để trống.");
        }
        return processImport(inputRows);
    }

    private ExcelImportSummaryResponse processImport(List<ExcelImportRowDto> rows) {
        List<UserSummaryDto> importedUsers = new ArrayList<>();
        List<ExcelImportRowDto> failedRows = new ArrayList<>();
        int successCount = 0;

        for (ExcelImportRowDto row : rows) {
            if (!row.isValid()) {
                failedRows.add(row);
                continue;
            }

            // Kiểm tra lại tính duy nhất của email trước khi ghi DB phòng trường hợp trùng
            String email = row.getEmail().trim().toLowerCase();
            if (userRepository.existsByEmailIgnoreCase(email)) {
                row.setValid(false);
                row.getErrors().add("Email đã tồn tại trong hệ thống");
                failedRows.add(row);
                continue;
            }

            try {
                String rawPassword = AdminUserService.generateTemporaryPassword();
                User user = new User(email, passwordEncoder.encode(rawPassword));
                user.setFullName(row.getFullName() != null ? row.getFullName().trim() : "");
                user.setPhone(row.getPhone() != null && !row.getPhone().isBlank() ? row.getPhone().trim() : null);
                user.setDepartment(row.getDepartment() != null && !row.getDepartment().isBlank() ? row.getDepartment().trim() : null);
                user.setDisplayName(row.getDisplayName() != null && !row.getDisplayName().isBlank() ? row.getDisplayName().trim() : null);
                user.setStatus(row.getStatus() != null && !row.getStatus().isBlank() ? row.getStatus().toUpperCase() : "ACTIVE");
                user.setMustChangePassword(true);

                Set<Role> roles = resolveRoles(row.getRoles());
                user.setRoles(roles);

                User saved = userRepository.save(user);

                // Gửi email kích hoạt tài khoản bất đồng bộ/thử gửi
                try {
                    mailService.sendAccountActivationEmail(saved.getEmail(), rawPassword);
                } catch (Exception e) {
                    logger.warn("Không gửi được email kích hoạt cho tài khoản {}: {}", saved.getEmail(), e.getMessage());
                }

                UserSummaryDto userDto = mapToSummary(saved, rawPassword);
                importedUsers.add(userDto);
                successCount++;
            } catch (Exception e) {
                logger.error("Lỗi khi nhập dòng {}: {}", row.getRowNumber(), e.getMessage(), e);
                row.setValid(false);
                row.getErrors().add("Lỗi hệ thống khi lưu: " + e.getMessage());
                failedRows.add(row);
            }
        }

        int failedCount = failedRows.size();
        String summaryMessage = String.format("Nhập thành công %d/%d nhân sự. Bỏ qua %d dòng không hợp lệ.",
                successCount, rows.size(), failedCount);

        return ExcelImportSummaryResponse.builder()
                .totalRows(rows.size())
                .successCount(successCount)
                .failedCount(failedCount)
                .success(successCount)
                .skipped(failedCount)
                .message(summaryMessage)
                .importedUsers(importedUsers)
                .failedRows(failedRows)
                .build();
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn tệp Excel để tải lên.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null ||
                (!originalFilename.toLowerCase().endsWith(".xlsx") && !originalFilename.toLowerCase().endsWith(".xls"))) {
            throw new BadRequestException("Định dạng tệp không hợp lệ. Vui lòng tải lên tệp .xlsx hoặc .xls.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("Dung lượng tệp vượt quá giới hạn cho phép (tối đa 10 MB).");
        }
    }

    private List<ExcelImportRowDto> parseAndValidateRows(MultipartFile file) {
        List<ExcelImportRowDto> resultRows = new ArrayList<>();
        Set<String> seenEmailsInFile = new HashSet<>();
        DataFormatter dataFormatter = new DataFormatter();

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {

            if (workbook.getNumberOfSheets() == 0) {
                throw new BadRequestException("Tệp Excel không chứa sheet dữ liệu nào.");
            }

            Sheet sheet = workbook.getSheetAt(0);
            int lastRowNum = sheet.getLastRowNum();

            // Tìm dòng tiêu đề
            int headerRowIndex = -1;
            Map<String, Integer> columnMapping = null;

            for (int r = 0; r <= Math.min(lastRowNum, 25); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                Map<String, Integer> mapping = mapHeaders(row, dataFormatter);
                if (mapping.containsKey("email") && mapping.containsKey("fullName")) {
                    headerRowIndex = r;
                    columnMapping = mapping;
                    break;
                }
            }

            if (headerRowIndex == -1 || columnMapping == null) {
                throw new BadRequestException("Tệp Excel không đúng cấu trúc hoặc thiếu cột bắt buộc. Cần có ít nhất cột 'Họ tên' và 'Email'.");
            }

            // Đọc và kiểm tra từng dòng dữ liệu sau dòng tiêu đề
            for (int r = headerRowIndex + 1; r <= lastRowNum; r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row, dataFormatter)) {
                    continue;
                }

                int displayRowNumber = r + 1;
                String email = getCellValue(row, columnMapping.get("email"), dataFormatter);
                String fullName = getCellValue(row, columnMapping.get("fullName"), dataFormatter);
                String phone = getCellValue(row, columnMapping.get("phone"), dataFormatter);
                String staffCode = getCellValue(row, columnMapping.get("staffCode"), dataFormatter);
                String department = getCellValue(row, columnMapping.get("department"), dataFormatter);
                String rolesStr = getCellValue(row, columnMapping.get("roles"), dataFormatter);
                String displayName = getCellValue(row, columnMapping.get("displayName"), dataFormatter);

                // Nếu có mã nhân sự mà chưa có phòng ban hoặc tên hiển thị
                if ((department == null || department.isBlank()) && (staffCode != null && !staffCode.isBlank())) {
                    department = staffCode;
                }
                if ((displayName == null || displayName.isBlank()) && (staffCode != null && !staffCode.isBlank())) {
                    displayName = staffCode;
                }

                List<String> errors = new ArrayList<>();

                // 1. Kiểm tra Email
                if (email == null || email.isBlank()) {
                    errors.add("Thiếu email");
                } else {
                    String trimmedEmail = email.trim().toLowerCase();
                    if (!EMAIL_PATTERN.matcher(trimmedEmail).matches()) {
                        errors.add("Email không đúng định dạng");
                    } else if (seenEmailsInFile.contains(trimmedEmail)) {
                        errors.add("Email bị trùng lặp trong tệp Excel");
                    } else {
                        seenEmailsInFile.add(trimmedEmail);
                        if (userRepository.existsByEmailIgnoreCase(trimmedEmail)) {
                            errors.add("Email đã tồn tại trong hệ thống");
                        }
                    }
                }

                // 2. Kiểm tra Họ tên
                if (fullName == null || fullName.isBlank()) {
                    errors.add("Thiếu họ tên");
                } else if (fullName.trim().length() > 150) {
                    errors.add("Họ tên không được vượt quá 150 ký tự");
                }

                // 3. Kiểm tra Số điện thoại
                if (phone != null && !phone.isBlank()) {
                    String cleanPhone = phone.trim().replaceAll("\\s+", "");
                    if (!PHONE_PATTERN.matcher(cleanPhone).matches()) {
                        errors.add("Số điện thoại không hợp lệ");
                    } else if (cleanPhone.length() > 20) {
                        errors.add("Số điện thoại không được vượt quá 20 ký tự");
                    }
                    phone = cleanPhone;
                }

                // 4. Kiểm tra Phòng ban
                if (department != null && department.trim().length() > 100) {
                    errors.add("Phòng ban không được vượt quá 100 ký tự");
                }

                // 5. Kiểm tra Vai trò
                Set<String> parsedRoles = new HashSet<>();
                if (rolesStr != null && !rolesStr.isBlank()) {
                    String[] roleParts = rolesStr.split("[,;]");
                    for (String rp : roleParts) {
                        String rName = rp.trim().toUpperCase();
                        if (!rName.isEmpty()) {
                            try {
                                RoleName.valueOf(rName);
                                parsedRoles.add(rName);
                            } catch (IllegalArgumentException e) {
                                errors.add("Vai trò không hợp lệ: " + rp.trim());
                            }
                        }
                    }
                }
                if (parsedRoles.isEmpty()) {
                    parsedRoles.add("RECRUITER");
                }

                boolean isValid = errors.isEmpty();

                ExcelImportRowDto rowDto = ExcelImportRowDto.builder()
                        .rowNumber(displayRowNumber)
                        .email(email != null ? email.trim() : "")
                        .fullName(fullName != null ? fullName.trim() : "")
                        .phone(phone != null ? phone.trim() : null)
                        .department(department != null ? department.trim() : null)
                        .displayName(displayName != null ? displayName.trim() : null)
                        .roles(parsedRoles)
                        .status("ACTIVE")
                        .valid(isValid)
                        .errors(errors)
                        .build();

                resultRows.add(rowDto);
            }

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Không thể đọc tệp Excel: {}", e.getMessage(), e);
            throw new BadRequestException("Không thể đọc tệp Excel. Vui lòng kiểm tra định dạng và cấu trúc tệp.");
        }

        return resultRows;
    }

    private Map<String, Integer> mapHeaders(Row row, DataFormatter formatter) {
        Map<String, Integer> mapping = new HashMap<>();

        for (int c = 0; c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell == null) continue;

            String val = formatter.formatCellValue(cell).trim();
            if (val.isEmpty()) continue;

            String normalized = normalize(val);

            if (matches(normalized, "ma nhan su", "ma nv", "staff code", "employee code", "code")) {
                mapping.putIfAbsent("staffCode", c);
            } else if (matches(normalized, "ho va ten", "ho ten", "full name", "fullname", "name")) {
                mapping.putIfAbsent("fullName", c);
            } else if (matches(normalized, "email", "e-mail")) {
                mapping.putIfAbsent("email", c);
            } else if (matches(normalized, "so dien thoai", "sdt", "phone", "phone number", "dien thoai")) {
                mapping.putIfAbsent("phone", c);
            } else if (matches(normalized, "phong ban", "bo phan", "department", "dept")) {
                mapping.putIfAbsent("department", c);
            } else if (matches(normalized, "vai tro", "roles", "role", "quyen")) {
                mapping.putIfAbsent("roles", c);
            } else if (matches(normalized, "ten hien thi", "display name", "displayname")) {
                mapping.putIfAbsent("displayName", c);
            }
        }

        return mapping;
    }

    private boolean matches(String target, String... candidates) {
        for (String candidate : candidates) {
            if (target.equals(candidate) || target.contains(candidate)) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String input) {
        if (input == null) return "";
        String s = Normalizer.normalize(input.toLowerCase().trim(), Normalizer.Form.NFD);
        s = s.replaceAll("\\p{M}", "");
        return s.replace("đ", "d");
    }

    private boolean isRowEmpty(Row row, DataFormatter formatter) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && !formatter.formatCellValue(cell).trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private String getCellValue(Row row, Integer colIdx, DataFormatter formatter) {
        if (colIdx == null) return null;
        Cell cell = row.getCell(colIdx);
        if (cell == null) return null;
        String val = formatter.formatCellValue(cell);
        return val != null && !val.trim().isEmpty() ? val.trim() : null;
    }

    private Set<Role> resolveRoles(Set<String> roleNames) {
        Set<Role> roles = new HashSet<>();
        if (roleNames != null) {
            for (String rStr : roleNames) {
                try {
                    RoleName rn = RoleName.valueOf(rStr.trim().toUpperCase());
                    Role role = roleRepository.findByName(rn)
                            .orElseGet(() -> roleRepository.save(new Role(rn, "Vai trò " + rn.name())));
                    roles.add(role);
                } catch (IllegalArgumentException e) {
                    throw new BadRequestException("Vai trò không hợp lệ: " + rStr);
                }
            }
        }
        if (roles.isEmpty()) {
            Role defaultRole = roleRepository.findByName(RoleName.RECRUITER)
                    .orElseGet(() -> roleRepository.save(new Role(RoleName.RECRUITER, "Vai trò RECRUITER")));
            roles.add(defaultRole);
        }
        return roles;
    }

    private UserSummaryDto mapToSummary(User user, String temporaryPassword) {
        Set<String> roleNames = user.getRoles() != null && !user.getRoles().isEmpty()
                ? user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toSet())
                : Set.of();

        UserSummaryDto dto = new UserSummaryDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getDisplayName(),
                user.getDepartment(),
                roleNames,
                user.getStatus()
        );
        dto.setMustChangePassword(user.isMustChangePassword());
        dto.setTemporaryPassword(temporaryPassword);
        return dto;
    }
}
