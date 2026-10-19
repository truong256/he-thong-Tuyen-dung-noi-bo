package com.example.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReferralStatusUpdateRequest {

    @NotBlank(message = "Trạng thái mới không được để trống")
    private String generalStatus;

    private String notes;
}
