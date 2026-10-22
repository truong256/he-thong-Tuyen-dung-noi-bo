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
public class CreateCandidateNoteRequest {
    @NotBlank(message = "Nội dung ghi chú không được để trống")
    @Size(max = 2000, message = "Nội dung ghi chú tối đa 2000 ký tự")
    private String content;
}
