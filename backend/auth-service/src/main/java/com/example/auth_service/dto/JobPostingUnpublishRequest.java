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
public class JobPostingUnpublishRequest {
    @NotBlank(message = "Lý do gỡ tin không được để trống")
    @jakarta.validation.constraints.Size(max = 2000, message = "Lý do gỡ tin tối đa 2000 ký tự")
    private String reason;
}
