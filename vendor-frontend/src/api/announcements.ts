import { apiRequest } from "./client";
import type {
  Announcement,
  CreateAnnouncementResponse,
  VendorAnnouncementsResponse,
} from "./types";

export function fetchVendorAnnouncementSessions() {
  return apiRequest<VendorAnnouncementsResponse>(
    "/vendors/me/announcements",
  ).then((response) => response.sessions);
}

export function fetchSessionAnnouncements(sessionId: string) {
  return apiRequest<Announcement[]>(
    `/sessions/${encodeURIComponent(sessionId)}/announcements`,
  );
}

export function postSessionAnnouncement(sessionId: string, content: string) {
  return apiRequest<CreateAnnouncementResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/announcements`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
}

export function postSessionAnnouncementPoll(
  sessionId: string,
  input: { question: string; options: string[] },
) {
  return apiRequest<CreateAnnouncementResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/announcements/polls`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
