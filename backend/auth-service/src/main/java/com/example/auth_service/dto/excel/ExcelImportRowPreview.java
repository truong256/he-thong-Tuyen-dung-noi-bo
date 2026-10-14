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
public class ExcelImportRowPreview {
    private int rowNumber;
    private ExcelImportRowData data;
    private boolean valid;
    @Builder.Default
    private List<String> errors = new ArrayList<>();
}
