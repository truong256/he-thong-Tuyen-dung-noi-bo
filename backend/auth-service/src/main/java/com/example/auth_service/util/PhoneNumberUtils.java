package com.example.auth_service.util;

import java.util.regex.Pattern;

/**
 * Utility chuẩn hóa và kiểm tra tính hợp lệ của số điện thoại Việt Nam.
 * 
 * Quy tắc:
 * - Chuẩn hóa tất cả các biến thể (+84, 84, dấu cách, gạch nối, dấu chấm, ngoặc đơn) về định dạng 10 chữ số nội địa: 0xxxxxxxxx.
 * - Đầu số di động hợp lệ tại Việt Nam: 03x, 05x, 07x, 08x, 09x.
 */
public final class PhoneNumberUtils {

    private PhoneNumberUtils() {
        // Private constructor for utility class
    }

    /**
     * Regex kiểm tra số điện thoại di động Việt Nam đã chuẩn hóa (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).
     */
    public static final Pattern VN_PHONE_PATTERN = Pattern.compile("^0[35789]\\d{8}$");

    /**
     * Regex mở rộng cho dữ liệu đầu vào người dùng (cho phép 0..., +84..., 84... kèm định dạng tự do).
     */
    public static final Pattern VN_RAW_PHONE_REGEX = Pattern.compile("^(\\+?84|0)[35789]\\d{8}$");

    /**
     * Chuẩn hóa số điện thoại về định dạng thống nhất 0xxxxxxxxx (10 chữ số).
     * Trả về null nếu rawPhone là null hoặc rỗng sau khi trim.
     *
     * @param rawPhone Chuỗi số điện thoại đầu vào
     * @return Số điện thoại đã chuẩn hóa hoặc null
     */
    public static String normalize(String rawPhone) {
        if (rawPhone == null) {
            return null;
        }
        String clean = rawPhone.trim();
        if (clean.isEmpty()) {
            return null;
        }

        // Loại bỏ các ký tự định dạng: khoảng trắng, dấu gạch nối, dấu chấm, dấu ngoặc đơn
        clean = clean.replaceAll("[\\s\\-\\.\\(\\)]+", "");

        // Xử lý tiền tố quốc tế
        if (clean.startsWith("+84")) {
            clean = "0" + clean.substring(3);
        } else if (clean.startsWith("0084")) {
            clean = "0" + clean.substring(4);
        } else if (clean.startsWith("84") && clean.length() == 11) {
            clean = "0" + clean.substring(2);
        }

        return clean;
    }

    /**
     * Kiểm tra số điện thoại có hợp lệ theo chuẩn di động Việt Nam không.
     *
     * @param rawPhone Chuỗi số điện thoại cần kiểm tra
     * @return true nếu hợp lệ, false nếu không hợp lệ
     */
    public static boolean isValidVietnamesePhone(String rawPhone) {
        String normalized = normalize(rawPhone);
        if (normalized == null) {
            return false;
        }
        return VN_PHONE_PATTERN.matcher(normalized).matches();
    }

    /**
     * Định dạng số điện thoại đẹp để hiển thị (ví dụ: 0912 345 678).
     *
     * @param normalizedPhone Số điện thoại đã chuẩn hóa
     * @return Chuỗi định dạng hiển thị hoặc chuỗi ban đầu nếu không khớp chuẩn 10 số
     */
    public static String formatDisplay(String normalizedPhone) {
        if (normalizedPhone == null || normalizedPhone.length() != 10) {
            return normalizedPhone;
        }
        return normalizedPhone.substring(0, 4) + " " + normalizedPhone.substring(4, 7) + " " + normalizedPhone.substring(7);
    }
}
