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
public class ExcelImportPreviewResponse {
    private int totalRows;
    private int validCount;
    private int invalidCount;
    @Builder.Default
    private List<ExcelImportRowPreview> rows = new ArrayList<>();
}
