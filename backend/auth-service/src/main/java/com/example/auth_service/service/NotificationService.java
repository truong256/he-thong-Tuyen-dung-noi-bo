package com.example.auth_service.service;

import com.example.auth_service.dto.NotificationDto;
import com.example.auth_service.entity.Notification;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.NotificationRepository;
import com.example.auth_service.security.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal user)) {
            throw new AccessDeniedException("Vui lòng đăng nhập để xem thông báo.");
        }
        return user.getId();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('NOTIFICATION_READ_OWN')")
    public Page<NotificationDto> getMyNotifications(Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(getCurrentUserId(), pageable)
                .map(NotificationDto::from);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('NOTIFICATION_READ_OWN')")
    public List<NotificationDto> getMyRecentNotifications() {
        return notificationRepository.findTop10ByUserIdOrderByCreatedAtDesc(getCurrentUserId())
                .stream()
                .map(NotificationDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('NOTIFICATION_READ_OWN')")
    public long getUnreadCount() {
        return notificationRepository.countByUserIdAndReadFalse(getCurrentUserId());
    }

    @PreAuthorize("hasAuthority('NOTIFICATION_READ_OWN')")
    public void markAsRead(Long notificationId) {
        Long userId = getCurrentUserId();
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo."));
        if (!n.getUserId().equals(userId)) {
            throw new AccessDeniedException("Bạn không có quyền thao tác trên thông báo này.");
        }
        n.setRead(true);
        notificationRepository.save(n);
    }

    @PreAuthorize("hasAuthority('NOTIFICATION_READ_OWN')")
    public void markAllAsRead() {
        notificationRepository.markAllAsReadByUserId(getCurrentUserId());
    }

    public Notification createNotification(Long userId, String title, String content, String type,
                                           Long relatedEntityId, String relatedEntityType) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setTitle(title);
        n.setContent(content);
        n.setType(type != null ? type : "INFO");
        n.setRelatedEntityId(relatedEntityId);
        n.setRelatedEntityType(relatedEntityType);
        n.setRead(false);
        return notificationRepository.save(n);
    }
}
