import { apiRequest } from "./client";
import type { Announcement } from "../lib/types";

export function fetchSessionAnnouncements(sessionId: string) {
  return apiRequest<Announcement[]>(
    `/sessions/${encodeURIComponent(sessionId)}/announcements`,
  );
}

export function voteOnAnnouncementPoll(
  sessionId: string,
  announcementId: string,
  optionId: string,
) {
  return apiRequest<{ announcement: Announcement }>(
    `/sessions/${encodeURIComponent(sessionId)}/announcements/${encodeURIComponent(
      announcementId,
    )}/votes`,
    {
      method: "POST",
      body: JSON.stringify({ optionId }),
    },
  );
}
