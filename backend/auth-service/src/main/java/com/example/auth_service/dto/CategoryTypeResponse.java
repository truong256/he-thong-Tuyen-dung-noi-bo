package com.example.auth_service.dto;

public record CategoryTypeResponse(
    String type,
    String label,
    long count
) {
    public static String resolveLabel(String type) {
        if (type == null) return "Khác";
        return switch (type.toUpperCase()) {
            case "EMPLOYMENT_TYPE" -> "Hình thức làm việc";
            case "WORK_LOCATION" -> "Địa điểm làm việc";
            case "EDUCATION_LEVEL" -> "Trình độ học vấn";
            case "CANDIDATE_SOURCE" -> "Nguồn ứng viên";
            case "REJECTION_REASON" -> "Lý do từ chối";
            case "INTERVIEW_TYPE" -> "Hình thức phỏng vấn";
            case "SKILL_TAG" -> "Kỹ năng & Chuyên môn";
            default -> type;
        };
    }
}
