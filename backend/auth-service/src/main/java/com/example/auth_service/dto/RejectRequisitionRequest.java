package com.example.auth_service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload khi từ chối yêu cầu tuyển dụng với lý do bắt buộc (S3-03).
 */
public record RejectRequisitionRequest(
        @NotBlank(message = "Lý do từ chối không được để trống")
        String rejectionReason,
        String comments
) {}
