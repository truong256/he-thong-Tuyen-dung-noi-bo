package com.example.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCandidateTagRequest {
    @NotBlank(message = "Tên nhãn không được để trống")
    @Size(max = 50, message = "Tên nhãn tối đa 50 ký tự")
    private String tagName;
}
