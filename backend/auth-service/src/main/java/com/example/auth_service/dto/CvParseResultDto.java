package com.example.auth_service.dto;

public record CvParseResultDto(
    String fullName,
    String email,
    String phone,
    String status, // "SUCCESS", "PARTIAL", "UNREADABLE_OR_EMPTY", "FAILED"
    String message,
    int pageCount,
    boolean hasText
) {
    public static CvParseResultDto unreadable(String message) {
        return new CvParseResultDto(null, null, null, "UNREADABLE_OR_EMPTY", message, 0, false);
    }

    public static CvParseResultDto failed(String message) {
        return new CvParseResultDto(null, null, null, "FAILED", message, 0, false);
    }

    public static CvParseResultDto success(String fullName, String email, String phone, int pages) {
        boolean hasName = fullName != null && !fullName.isBlank();
        boolean hasEmail = email != null && !email.isBlank();
        boolean hasPhone = phone != null && !phone.isBlank();

        if (!hasName && !hasEmail && !hasPhone) {
            return new CvParseResultDto(null, null, null, "UNREADABLE_OR_EMPTY",
                    "Không tìm thấy thông tin cơ bản trong nội dung tệp CV.", pages, true);
        }

        boolean full = hasName && hasEmail && hasPhone;
        String status = full ? "SUCCESS" : "PARTIAL";
        String message = full
                ? "Bóc tách thông tin từ CV thành công."
                : "Bóc tách được một phần thông tin từ CV (thiếu: "
                + (!hasName ? "họ tên, " : "")
                + (!hasEmail ? "email, " : "")
                + (!hasPhone ? "số điện thoại, " : "");
        if (message.endsWith(", ")) {
            message = message.substring(0, message.length() - 2) + ").";
        }

        return new CvParseResultDto(
                hasName ? fullName.trim() : null,
                hasEmail ? email.trim() : null,
                hasPhone ? phone.trim() : null,
                status,
                message,
                pages,
                true
        );
    }
}
