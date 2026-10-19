import apiClient from './client';
import { NotificationItem, NotificationPageResponse } from '../types/notification';

export const notificationApi = {
  getNotifications: async (params?: {
    unreadOnly?: boolean;
    page?: number;
    size?: number;
  }): Promise<NotificationPageResponse> => {
    const response = await apiClient.get<NotificationPageResponse>('/api/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const response = await apiClient.get<{ unreadCount: number }>('/api/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: number): Promise<NotificationItem> => {
    const response = await apiClient.patch<NotificationItem>(`/api/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ success: boolean; updatedCount: number }> => {
    const response = await apiClient.patch<{ success: boolean; updatedCount: number }>('/api/notifications/read-all');
    return response.data;
  },
};

export default notificationApi;
