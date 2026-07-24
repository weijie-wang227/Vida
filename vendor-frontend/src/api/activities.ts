import { apiRequest } from "./client";
import type {
  ActivityAttendeesResponse,
  ActivityReviewsResponse,
  CreateActivityInput,
  CreateVendorActivityResponse,
  CreateSessionInput,
  CreateVendorSessionResponse,
  DeleteVendorSessionResponse,
  UpdateActivityOpenResponse,
  UpdateAttendanceResponse,
  AttendanceStatus,
  VendorActivitiesResponse,
  VendorSessionsResponse,
} from "./types";

export function fetchVendorActivities() {
  return apiRequest<VendorActivitiesResponse>("/vendors/me/activities").then(
    (response) => response.activities,
  );
}

export function fetchVendorSessions() {
  return apiRequest<VendorSessionsResponse>("/vendors/me/sessions").then(
    (response) => response.sessions,
  );
}

export function createVendorActivity(input: CreateActivityInput) {
  return apiRequest<CreateVendorActivityResponse>("/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createVendorSession(input: CreateSessionInput) {
  return apiRequest<CreateVendorSessionResponse>("/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteVendorSession(sessionId: number | string) {
  return apiRequest<DeleteVendorSessionResponse>(
    `/vendors/me/sessions/${sessionId}`,
    { method: "DELETE" },
  );
}

export function fetchActivityAttendees(
  activityId: number | string,
  page = 1,
  limit = 50,
) {
  return apiRequest<ActivityAttendeesResponse>(
    `/vendors/me/sessions/${activityId}/attendees?page=${page}&limit=${limit}`,
  );
}

export function fetchActivityReviews(sessionId: number | string) {
  return apiRequest<ActivityReviewsResponse>(`/sessions/${sessionId}/reviews`);
}

export function updateActivityAttendance({
  activityId,
  status,
  userId,
}: {
  activityId: number | string;
  status: AttendanceStatus;
  userId: string;
}) {
  return apiRequest<UpdateAttendanceResponse>(
    `/vendors/me/sessions/${activityId}/attendees/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function updateActivityOpen({
  activityId,
  isOpen,
}: {
  activityId: number | string;
  isOpen: boolean;
}) {
  return apiRequest<UpdateActivityOpenResponse>(
    `/vendors/me/sessions/${activityId}/open`,
    {
      method: "PATCH",
      body: JSON.stringify({ isOpen }),
    },
  );
}

export function updateSessionOpen({
  sessionId,
  isOpen,
}: {
  sessionId: number | string;
  isOpen: boolean;
}) {
  return updateActivityOpen({ activityId: sessionId, isOpen });
}
