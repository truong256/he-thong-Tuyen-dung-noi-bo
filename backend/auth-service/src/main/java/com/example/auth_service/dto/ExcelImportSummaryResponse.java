package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelImportSummaryResponse {
    private int totalRows;
    private int successCount;
    private int failedCount;
    private int success;
    private int skipped;
    private String message;
    @Builder.Default
    private List<UserSummaryDto> importedUsers = new ArrayList<>();
    @Builder.Default
    private List<ExcelImportRowDto> failedRows = new ArrayList<>();
}
