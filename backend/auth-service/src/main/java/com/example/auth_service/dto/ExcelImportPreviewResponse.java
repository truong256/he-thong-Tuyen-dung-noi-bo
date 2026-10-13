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
public class ExcelImportPreviewResponse {
    private int totalRows;
    private int validRows;
    private int invalidRows;
    @Builder.Default
    private List<ExcelImportRowDto> rows = new ArrayList<>();
}
