package com.example.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStatusRequest {
    @NotBlank(message = "Trạng thái không được để trống")
    private String status;

    private String reason;
    private String note;

    public UpdateStatusRequest(String status) {
        this.status = status;
    }
}
