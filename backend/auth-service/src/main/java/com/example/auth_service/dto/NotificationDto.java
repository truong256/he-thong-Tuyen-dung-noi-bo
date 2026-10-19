package com.example.auth_service.dto;

import com.example.auth_service.entity.Notification;

import java.time.Instant;

public record NotificationDto(
        Long id,
        Long userId,
        String title,
        String content,
        String type,
        Long relatedEntityId,
        String relatedEntityType,
        boolean read,
        Instant createdAt
) {
    public static NotificationDto from(Notification n) {
        return new NotificationDto(
                n.getId(),
                n.getUserId(),
                n.getTitle(),
                n.getContent(),
                n.getType(),
                n.getRelatedEntityId(),
                n.getRelatedEntityType(),
                n.isRead(),
                n.getCreatedAt()
        );
    }
}
