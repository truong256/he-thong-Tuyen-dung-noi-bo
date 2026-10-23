package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutoExpireResult {
    private int expiredCount;
    private List<Long> expiredPostingIds;
    private List<String> expiredJobCodes;
    private LocalDate checkedDate;
    private String message;
}
