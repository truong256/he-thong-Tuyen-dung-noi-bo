package com.example.auth_service.dto.excel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelImportSuccessRow {
    private int rowNumber;
    private Long userId;
    private String email;
    private String fullName;
    private String department;
    private String role;
    private String emailStatus; // "ACCOUNT_CREATED_EMAIL_SENT" or "ACCOUNT_CREATED_EMAIL_FAILED"
}
