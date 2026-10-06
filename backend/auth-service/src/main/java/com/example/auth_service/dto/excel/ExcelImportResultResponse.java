package com.example.auth_service.dto.excel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelImportResultResponse {
    private int totalRows;
    private int successCount;
    private int failedCount;
    @Builder.Default
    private List<ExcelImportSuccessRow> successRows = new ArrayList<>();
    @Builder.Default
    private List<ExcelImportFailedRow> failedRows = new ArrayList<>();
}
