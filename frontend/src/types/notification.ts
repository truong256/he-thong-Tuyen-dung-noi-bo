export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  content: string;
  type: string;
  referenceType?: string;
  referenceId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPageResponse {
  content: NotificationItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
