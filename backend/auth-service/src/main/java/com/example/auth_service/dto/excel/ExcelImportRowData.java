package com.example.auth_service.dto.excel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelImportRowData {
    private int rowNumber;
    private String fullName;
    private String email;
    private String department;
    private String role;
}
