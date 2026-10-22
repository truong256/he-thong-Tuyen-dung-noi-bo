package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationHistoryItemDto {
    private Long applicationId;
    private Long requisitionId;
    private String positionTitle;
    private String requisitionCode;
    private String departmentName;
    private String stage;
    private Instant appliedAt;
    private String cvFileUrl;
    private String cvFileName;
    private boolean current;
    private boolean withdrawn;
}
