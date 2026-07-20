import { apiRequest } from "./client";
import type {
  ActivityId,
  Activity,
  ActivityTemplate,
  ActivityReviewResponse,
  AvailableTag,
  CreateActivityInput,
  CreateActivityResponse,
  JoinActivityResponse,
  MapPin,
  PreviousActivity,
  SubmitActivityReviewInput,
} from "../lib/types";

export async function fetchAvailableTags() {
  return apiRequest<AvailableTag[]>("/tags");
}

export async function fetchActivities() {
  return apiRequest<Activity[]>("/activities");
}

export async function fetchActivity(activityId: ActivityId) {
  return apiRequest<Activity>(`/activities/${activityId}`);
}

export async function fetchMapPins() {
  return apiRequest<MapPin[]>("/activities/map-pins");
}

export async function fetchPreviousActivities(userId: number | string) {
  return apiRequest<PreviousActivity[]>(
    `/activities/previous/${encodeURIComponent(String(userId))}`,
  );
}

export async function fetchCreatedActivityTemplates() {
  return apiRequest<ActivityTemplate[]>("/activities/created-history");
}

export async function createActivity(input: CreateActivityInput) {
  return apiRequest<CreateActivityResponse>("/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function joinSession(sessionId: ActivityId) {
  return apiRequest<JoinActivityResponse>(`/sessions/${sessionId}/join`, {
    method: "POST",
  });
}

export async function joinActivity(activityId: ActivityId) {
  return joinSession(activityId);
}

export async function fetchActivityReview(activityId: ActivityId) {
  return apiRequest<ActivityReviewResponse>(`/sessions/${activityId}/review`);
}

export async function submitActivityReview(
  activityId: ActivityId,
  input: SubmitActivityReviewInput,
) {
  return apiRequest<ActivityReviewResponse>(`/sessions/${activityId}/review`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
