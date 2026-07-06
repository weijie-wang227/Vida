import { apiRequest } from "./client";
import type {
  ActivityId,
  CreateActivityInput,
  CreateActivityResponse,
  JoinActivityResponse,
  MapPin,
  PremiumActivity,
  PreviousActivity,
  StandardActivity,
} from "../lib/types";

export async function fetchPremiumActivities() {
  return apiRequest<PremiumActivity[]>("/activities/premium");
}

export async function fetchStandardActivities() {
  return apiRequest<StandardActivity[]>("/activities");
}

export async function fetchMapPins() {
  return apiRequest<MapPin[]>("/activities/map-pins");
}

export async function fetchPreviousActivities(userId: number | string) {
  return apiRequest<PreviousActivity[]>(
    `/activities/previous/${encodeURIComponent(String(userId))}`,
  );
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
