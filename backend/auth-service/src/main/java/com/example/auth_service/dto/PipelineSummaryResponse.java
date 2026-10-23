package com.example.auth_service.dto;

import java.util.Map;

/**
 * DTO phản hồi cảnh báo pipeline ứng viên trước khi đóng hoặc hủy yêu cầu (SCRUM-135 / S3-07).
 */
public record PipelineSummaryResponse(
        Long requisitionId,
        long totalCount,
        long activeCount,
        Map<String, Long> countByStage
) {
}
