package com.example.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateInterviewQuestionRequest {

    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    private String questionText;

    @Size(max = 50, message = "Danh mục không được vượt quá 50 ký tự")
    private String category;

    @NotBlank(message = "Độ khó không được để trống")
    private String difficultyLevel;

    private String suggestedAnswer;

    @NotNull(message = "Tiêu chí năng lực không được để trống")
    private Long competencyCriterionId;
}
