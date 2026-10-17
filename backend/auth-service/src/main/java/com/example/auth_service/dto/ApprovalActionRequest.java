package com.example.auth_service.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

public record ApprovalActionRequest(
        String action,
        String comment,
        @JsonAlias("rejectionReason")
        String reason,
        String note,
        String overrideReason
) {
    public ApprovalActionRequest(String action, String comment, String reason, String note) {
        this(action, comment, reason, note, null);
    }

    public String effectiveComment() {
        if (comment != null && !comment.isBlank()) {
            return comment.trim();
        }
        if (reason != null && !reason.isBlank()) {
            return reason.trim();
        }
        if (note != null && !note.isBlank()) {
            return note.trim();
        }
        return null;
    }

    public String normalizedAction() {
        if (action == null || action.isBlank()) {
            return "APPROVE";
        }
        String upper = action.trim().toUpperCase();
        return switch (upper) {
            case "APPROVE", "DUYET", "APPROVED" -> "APPROVE";
            case "REJECT", "TU_CHOI", "REJECTED" -> "REJECT";
            case "REQUEST_CHANGES", "REQUEST_INFO", "REQUEST_ADDITIONAL_INFO", "YEU_CAU_BO_SUNG", "BO_SUNG" -> "REQUEST_CHANGES";
            default -> upper;
        };
    }
}
