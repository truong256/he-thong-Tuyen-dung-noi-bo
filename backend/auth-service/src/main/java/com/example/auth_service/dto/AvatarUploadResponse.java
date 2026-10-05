package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvatarUploadResponse {
    private String message;
    private String avatarUrl;
    private String thumbnailUrl;
    private String avatarThumbnailUrl;
    private UserSummaryDto user;
}
