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
public class CandidateNoteDto {
    private Long id;
    private Long applicationId;
    private Long authorId;
    private String authorName;
    private String content;
    private Instant createdAt;
    private Instant updatedAt;
    private boolean canEdit;
    private boolean canDelete;
}
