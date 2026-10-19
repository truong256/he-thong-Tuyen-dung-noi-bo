package com.example.auth_service.service;

import com.example.auth_service.dto.CvParseResultDto;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * S4-04: Bóc tách thông tin họ tên, email, số điện thoại từ CV PDF.
 * Xử lý an toàn khi PDF lỗi hoặc không có lớp văn bản (scan/ảnh).
 */
@Service
public class CvParsingService {
    private static final Logger log = LoggerFactory.getLogger(CvParsingService.class);

    // Regex for Email
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b"
    );

    // Regex for Vietnamese Phone Numbers (handles +84, 84, 03, 05, 07, 08, 09 with optional spaces, dots, hyphens)
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?:(?:\\+84|84|0)(?:3|5|7|8|9)[0-9]{8}|(?:\\+84|84|0)[\\s.-]?(?:3|5|7|8|9)(?:[\\s.-]?[0-9]){8}|(?:\\(?\\+84\\)?|0)[\\s.-]?(?:3|5|7|8|9)(?:[\\s.-]?[0-9]{2,4}){2,3})"
    );

    // Explicit label patterns for Name
    private static final Pattern NAME_LABEL_PATTERN = Pattern.compile(
            "(?i)(?:họ\\s*và\\s*tên|họ\\s*tên|họ\\s*tên\\s*ứng\\s*viên|full\\s*name|candidate\\s*name|name)\\s*[:：\\-–]\\s*([^\\n\\r,;]+)"
    );

    // Common Vietnamese family names (with diacritics and non-diacritics)
    private static final Set<String> VN_SURNAMES = Set.of(
            "nguyễn", "nguyen", "trần", "tran", "lê", "le", "phạm", "pham",
            "hoàng", "hoang", "huỳnh", "huynh", "phan", "vũ", "vu", "võ", "vo",
            "đặng", "dang", "bùi", "bui", "đỗ", "do", "hồ", "ho", "ngô", "ngo",
            "dương", "duong", "lý", "ly", "đào", "dao", "đoàn", "doan", "vương", "vuong",
            "trịnh", "trinh", "trương", "truong", "đinh", "dinh", "lâm", "lam",
            "phùng", "phung", "mai", "tô", "to", "hà", "ha", "chu", "tạ", "ta"
    );

    // Blacklist words in CV headers to skip when identifying candidate name
    private static final Set<String> CV_HEADER_IGNORE = Set.of(
            "curriculum vitae", "cv", "sơ yếu lý lịch", "thông tin cá nhân", "thông tin ứng viên",
            "hồ sơ xin việc", "resume", "personal profile", "objective", "mục tiêu nghề nghiệp",
            "kinh nghiệm làm việc", "work experience", "học vấn", "education", "kỹ năng", "skills",
            "chứng chỉ", "certifications", "liên hệ", "contact", "thông tin liên hệ"
    );

    /**
     * Parse CV directly from MultipartFile
     */
    public CvParseResultDto parseCv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return CvParseResultDto.failed("Không tìm thấy tệp CV hoặc tệp rỗng.");
        }
        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null && !originalFilename.toLowerCase().endsWith(".pdf")) {
            return CvParseResultDto.failed("Hệ thống chỉ hỗ trợ định dạng PDF.");
        }

        try {
            byte[] bytes = file.getBytes();
            return parseCv(bytes);
        } catch (IOException e) {
            log.warn("Lỗi khi đọc tệp CV tải lên: {}", e.getMessage());
            return CvParseResultDto.failed("Không thể đọc tệp PDF tải lên: " + e.getMessage());
        }
    }

    /**
     * Parse CV directly from byte array
     */
    public CvParseResultDto parseCv(byte[] pdfBytes) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return CvParseResultDto.failed("Dữ liệu tệp CV rỗng.");
        }

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            int pageCount = document.getNumberOfPages();
            if (pageCount == 0) {
                return CvParseResultDto.unreadable("Tệp PDF không có trang nào.");
            }

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String fullText = stripper.getText(document);

            if (fullText == null || fullText.trim().isEmpty()) {
                // PDF has no extractable text layer (e.g. scanned image PDF)
                return CvParseResultDto.unreadable(
                        "Tệp PDF không có lớp văn bản (dạng scan/ảnh) hoặc nội dung rỗng. Recruiter có thể nhập tay thông tin."
                );
            }

            return extractCandidateInfo(fullText, pageCount);
        } catch (Exception e) {
            log.warn("Lỗi khi xử lý bóc tách PDFBox: {}", e.getMessage());
            return CvParseResultDto.failed(
                    "Tệp PDF bị lỗi định dạng hoặc không thể mở: " + (e.getMessage() != null ? e.getMessage() : "Lỗi không xác định")
            );
        }
    }

    /**
     * Extract fields from plain text
     */
    public CvParseResultDto extractCandidateInfo(String fullText, int pageCount) {
        if (fullText == null || fullText.trim().isEmpty()) {
            return CvParseResultDto.unreadable("Nội dung văn bản CV rỗng.");
        }

        String email = extractEmail(fullText);
        String phone = extractPhone(fullText);
        String fullName = extractFullName(fullText);

        return CvParseResultDto.success(fullName, email, phone, pageCount);
    }

    /**
     * Extract primary candidate email
     */
    private String extractEmail(String text) {
        Matcher matcher = EMAIL_PATTERN.matcher(text);
        while (matcher.find()) {
            String email = matcher.group().trim();
            // Ignore generic template emails
            if (!email.toLowerCase().contains("example.com") && !email.toLowerCase().contains("yourname@")) {
                return email;
            }
        }
        return null;
    }

    /**
     * Extract and normalize Vietnamese phone number
     */
    private String extractPhone(String text) {
        Matcher matcher = PHONE_PATTERN.matcher(text);
        while (matcher.find()) {
            String raw = matcher.group();
            String cleaned = raw.replaceAll("[^0-9+]", "");
            if (cleaned.startsWith("+84")) {
                cleaned = "0" + cleaned.substring(3);
            } else if (cleaned.startsWith("84") && cleaned.length() == 11) {
                cleaned = "0" + cleaned.substring(2);
            }

            // Valid VN phone is 10 digits starting with 03, 05, 07, 08, 09
            if (cleaned.matches("^0[35789]\\d{8}$")) {
                return cleaned;
            }
        }
        return null;
    }

    /**
     * Extract candidate full name from CV text
     */
    private String extractFullName(String text) {
        // Step 1: Look for explicit labels ("Họ và tên:", "Full Name:", etc.)
        Matcher labelMatcher = NAME_LABEL_PATTERN.matcher(text);
        if (labelMatcher.find()) {
            String candidate = cleanName(labelMatcher.group(1));
            if (isValidName(candidate)) {
                return candidate;
            }
        }

        // Step 2: Scan the first 25 non-empty lines for candidate name patterns
        String[] lines = text.split("\\r?\\n");
        int linesChecked = 0;
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            linesChecked++;
            if (linesChecked > 30) break;

            String lower = trimmed.toLowerCase();
            if (isIgnoredHeader(lower)) {
                continue;
            }

            // Skip lines with email or phone or URLs
            if (trimmed.contains("@") || trimmed.contains("http") || trimmed.contains("www.")
                    || trimmed.matches(".*\\d{4,}.*")) {
                continue;
            }

            // Check if line looks like a valid name: 2-5 words, mostly alphabetic characters
            String candidate = cleanName(trimmed);
            if (isValidName(candidate)) {
                String firstWord = candidate.split("\\s+")[0].toLowerCase();
                if (VN_SURNAMES.contains(firstWord)) {
                    return candidate;
                }
            }
        }

        // Step 3: Fallback - look for any line in top 15 lines that has 2 to 4 words
        linesChecked = 0;
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            linesChecked++;
            if (linesChecked > 15) break;

            if (isIgnoredHeader(trimmed.toLowerCase())) continue;
            if (trimmed.contains("@") || trimmed.matches(".*\\d+.*")) continue;

            String candidate = cleanName(trimmed);
            if (isValidName(candidate)) {
                return candidate;
            }
        }

        return null;
    }

    private boolean isIgnoredHeader(String lower) {
        for (String header : CV_HEADER_IGNORE) {
            if (lower.equals(header) || lower.startsWith(header + ":") || lower.startsWith(header + " -")) {
                return true;
            }
        }
        return false;
    }

    private String cleanName(String raw) {
        if (raw == null) return null;
        // Strip trailing punctuation, pipes, colons
        String cleaned = raw.replaceAll("[|•\\-–—:;,()\\[\\]{}]", " ").trim();
        cleaned = cleaned.replaceAll("\\s+", " ");
        return cleaned;
    }

    private boolean isValidName(String name) {
        if (name == null || name.length() < 3 || name.length() > 60) {
            return false;
        }
        String[] words = name.split("\\s+");
        if (words.length < 2 || words.length > 6) {
            return false;
        }
        // Name should not contain digits
        if (name.matches(".*\\d.*")) {
            return false;
        }
        // Check reasonable word lengths
        for (String w : words) {
            if (w.length() > 20) return false;
        }
        return true;
    }
}
