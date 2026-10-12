package com.example.auth_service.dto;

/**
 * Payload tùy chọn ghi chú / ý kiến khi phê duyệt yêu cầu tuyển dụng (S3-03).
 */
public record ApproveRequisitionRequest(
        String comments
) {}
