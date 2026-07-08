import { apiRequest } from "./client";
import type {
  ActivityId,
  Activity,
  ActivityTemplate,
  ActivityReviewResponse,
  CreateActivityInput,
  CreateActivityResponse,
  JoinActivityResponse,
  MapPin,
  PreviousActivity,
  SubmitActivityReviewInput,
} from "../lib/types";

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

export async function joinActivity(activityId: ActivityId) {
  return apiRequest<JoinActivityResponse>(`/activities/${activityId}/join`, {
    method: "POST",
  });
}

export async function fetchActivityReview(activityId: ActivityId) {
  return apiRequest<ActivityReviewResponse>(`/activities/${activityId}/review`);
}

export async function submitActivityReview(
  activityId: ActivityId,
  input: SubmitActivityReviewInput,
) {
  return apiRequest<ActivityReviewResponse>(`/activities/${activityId}/review`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
