import { apiRequest } from "@/lib/api";

export interface Notification {
  notification_id: number;
  notification_type: string;
  title: string | null;
  message: string;
  is_read: boolean;
  sent_at: string;
  data: any;
}

export const NotificationsService = {
  async getNotifications(): Promise<{ notifications: Notification[] }> {
    return apiRequest("/notifications");
  },

  async markAsRead(id: number): Promise<void> {
    return apiRequest(`/notifications/${id}/read`, { method: "PUT" });
  },

  async markAllAsRead(): Promise<void> {
    return apiRequest("/notifications/read-all", { method: "PUT" });
  },
};
