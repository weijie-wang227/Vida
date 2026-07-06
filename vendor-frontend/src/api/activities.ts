import { apiRequest } from "./client";
import type {
  ActivityAttendeesResponse,
  CreateActivityInput,
  UpdateAttendanceResponse,
  VendorActivitiesResponse,
} from "./types";

export function fetchVendorActivities() {
  return apiRequest<VendorActivitiesResponse>("/vendors/me/activities");
}

export function createVendorActivity(input: CreateActivityInput) {
  return apiRequest<{ activity: unknown }>("/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchActivityAttendees(activityId: number | string) {
  return apiRequest<ActivityAttendeesResponse>(
    `/vendors/me/activities/${activityId}/attendees`,
  );
}

export function updateActivityAttendance({
  activityId,
  attended,
  userId,
}: {
  activityId: number | string;
  attended: boolean;
  userId: string;
}) {
  return apiRequest<UpdateAttendanceResponse>(
    `/vendors/me/activities/${activityId}/attendees/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ attended }),
    },
  );
}
