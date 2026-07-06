import { apiRequest } from "./client";
import type { Notification } from "../lib/types";

export async function fetchNotifications() {
  const notifications = await apiRequest<Notification[]>("/notifications");

  return [...notifications].sort(
    (first, second) =>
      new Date(second.dateReceived).getTime() -
      new Date(first.dateReceived).getTime(),
  );
}

export async function markNotificationAsRead(notificationId: string) {
  return apiRequest<Notification>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "POST",
    },
  );
}
