package com.example.auth_service.service;

import com.example.auth_service.dto.CvParseResultDto;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class CvParsingServiceTest {

    private CvParsingService cvParsingService;

    @BeforeEach
    void setUp() {
        cvParsingService = new CvParsingService();
    }

    private byte[] createPdfWithAscii(String content) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(50, 700);
                String[] lines = content.split("\n");
                for (String line : lines) {
                    cs.showText(line);
                    cs.newLineAtOffset(0, -15);
                }
                cs.endText();
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        }
    }

    private byte[] createBlankPdf() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        }
    }

    @Test
    @DisplayName("S4-04: Parse PDF with text containing full name, email and phone successfully")
    void testParsePdfSuccess() throws IOException {
        String cvText = "Nguyen Van A\nSoftware Engineer\nEmail: nguyen.vana@example-ats.com\nPhone: 0987654321\nHanoi, Vietnam";
        byte[] pdfBytes = createPdfWithAscii(cvText);

        CvParseResultDto result = cvParsingService.parseCv(pdfBytes);

        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo("SUCCESS");
        assertThat(result.fullName()).isEqualTo("Nguyen Van A");
        assertThat(result.email()).isEqualTo("nguyen.vana@example-ats.com");
        assertThat(result.phone()).isEqualTo("0987654321");
        assertThat(result.pageCount()).isEqualTo(1);
        assertThat(result.hasText()).isTrue();
    }

    @Test
    @DisplayName("S4-04: Parse PDF with Vietnamese diacritics and explicit labels")
    void testExtractCandidateInfoWithVietnameseDiacritics() {
        String fullText = """
                CURRICULUM VITAE
                Họ và tên: Nguyễn Văn An
                Vị trí ứng tuyển: Senior Java Backend Developer
                Email liên hệ: nguyen.an@congtytech.vn
                Số điện thoại: +84 912 345 678
                Địa chỉ: Quận Cầu Giấy, Hà Nội
                Kinh nghiệm làm việc: 5 năm Spring Boot
                """;

        CvParseResultDto result = cvParsingService.extractCandidateInfo(fullText, 2);

        assertThat(result.status()).isEqualTo("SUCCESS");
        assertThat(result.fullName()).isEqualTo("Nguyễn Văn An");
        assertThat(result.email()).isEqualTo("nguyen.an@congtytech.vn");
        assertThat(result.phone()).isEqualTo("0912345678");
        assertThat(result.pageCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("S4-04: Parse Vietnamese CV without explicit labels, starting with family name Tran")
    void testExtractCandidateInfoWithoutLabels() {
        String fullText = """
                Trần Thị Mai
                Chuyên viên Tuyển dụng & Đào tạo
                tran.mai@tuyendung.com.vn
                ĐT: 038.567.8901
                Kinh nghiệm: 3 năm Recruiter
                """;

        CvParseResultDto result = cvParsingService.extractCandidateInfo(fullText, 1);

        assertThat(result.status()).isEqualTo("SUCCESS");
        assertThat(result.fullName()).isEqualTo("Trần Thị Mai");
        assertThat(result.email()).isEqualTo("tran.mai@tuyendung.com.vn");
        assertThat(result.phone()).isEqualTo("0385678901");
    }

    @Test
    @DisplayName("S4-04: Parse CV with missing phone returns PARTIAL status")
    void testParsePartialMissingPhone() throws IOException {
        String cvText = "Le Van B\nBackend Developer\nEmail: le.vanb@ats-test.com\nHanoi, Vietnam";
        byte[] pdfBytes = createPdfWithAscii(cvText);

        CvParseResultDto result = cvParsingService.parseCv(pdfBytes);

        assertThat(result.status()).isEqualTo("PARTIAL");
        assertThat(result.fullName()).isEqualTo("Le Van B");
        assertThat(result.email()).isEqualTo("le.vanb@ats-test.com");
        assertThat(result.phone()).isNull();
        assertThat(result.message()).contains("thiếu: số điện thoại");
    }

    @Test
    @DisplayName("S4-04: Scanned or blank PDF without text layer returns UNREADABLE_OR_EMPTY safely")
    void testParseBlankScannedPdf() throws IOException {
        byte[] blankPdf = createBlankPdf();

        CvParseResultDto result = cvParsingService.parseCv(blankPdf);

        assertThat(result.status()).isEqualTo("UNREADABLE_OR_EMPTY");
        assertThat(result.fullName()).isNull();
        assertThat(result.email()).isNull();
        assertThat(result.phone()).isNull();
        assertThat(result.hasText()).isFalse();
        assertThat(result.message()).contains("không có lớp văn bản");
    }

    @Test
    @DisplayName("S4-04: Corrupted or invalid PDF bytes returns FAILED safely without crashing")
    void testParseCorruptedPdf() {
        byte[] invalidPdf = new byte[]{1, 2, 3, 4, 5, 6, 7, 8};

        CvParseResultDto result = cvParsingService.parseCv(invalidPdf);

        assertThat(result.status()).isEqualTo("FAILED");
        assertThat(result.message()).contains("bị lỗi định dạng hoặc không thể mở");
    }

    @Test
    @DisplayName("S4-04: Empty or null byte array returns FAILED safely")
    void testParseEmptyBytes() {
        CvParseResultDto nullResult = cvParsingService.parseCv((byte[]) null);
        assertThat(nullResult.status()).isEqualTo("FAILED");

        CvParseResultDto emptyResult = cvParsingService.parseCv(new byte[0]);
        assertThat(emptyResult.status()).isEqualTo("FAILED");
    }

    @Test
    @DisplayName("S4-04: Non-PDF multipart file rejected with friendly error")
    void testNonPdfMultipartFile() {
        MockMultipartFile txtFile = new MockMultipartFile(
                "file", "cv.txt", "text/plain", "Hello world".getBytes()
        );

        CvParseResultDto result = cvParsingService.parseCv(txtFile);

        assertThat(result.status()).isEqualTo("FAILED");
        assertThat(result.message()).contains("chỉ hỗ trợ định dạng PDF");
    }

    @Test
    @DisplayName("S4-04: Normalizes Vietnamese phone formats starting with 84 or +84")
    void testPhoneNormalization() {
        String text1 = "Full Name: Pham Quoc Hung\nEmail: hung@test.com\nPhone: +84 903 123 456";
        CvParseResultDto r1 = cvParsingService.extractCandidateInfo(text1, 1);
        assertThat(r1.phone()).isEqualTo("0903123456");

        String text2 = "Ho ten: Vo Van Cuong\nEmail: cuong@test.com\nPhone: 84978111222";
        CvParseResultDto r2 = cvParsingService.extractCandidateInfo(text2, 1);
        assertThat(r2.phone()).isEqualTo("0978111222");
    }
}
