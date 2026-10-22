package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateTagDto {
    private Long id;
    private Long applicationId;
    private String tagName;
    private Long createdByUserId;
    private String createdByName;
    private Instant createdAt;
}
