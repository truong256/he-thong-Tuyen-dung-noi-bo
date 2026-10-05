package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InterviewQuestionResponse {

    private Long id;
    private String questionText;
    private String category;
    private String difficultyLevel;
    private String suggestedAnswer;
    private Boolean active;
    private Long competencyCriterionId;
    private String criterionCode;
    private String criterionName;
    private Long competencyFrameworkId;
    private String competencyName;
    private Long jobTitleId;
    private String jobTitle;
    private Instant createdAt;
    private Instant updatedAt;
}
