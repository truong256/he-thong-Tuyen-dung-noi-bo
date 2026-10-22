package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompetencyCriterionResponse {

    private Long id;
    private String criterionCode;
    private String criterionName;
    private String description;
    private Integer weightPercent;
    private Boolean active;
    private Long competencyFrameworkId;
    private String competencyName;
    private Long jobTitleId;
    private String jobTitle;
}
