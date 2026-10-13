package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelImportRowDto {
    private int rowNumber;
    private String email;
    private String fullName;
    private String department;
    private String phone;
    private String displayName;
    @Builder.Default
    private Set<String> roles = new HashSet<>();
    @Builder.Default
    private String status = "ACTIVE";
    private boolean valid;
    @Builder.Default
    private List<String> errors = new ArrayList<>();
}
