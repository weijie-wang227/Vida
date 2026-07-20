import { apiRequest } from "./client";
import type {
  UpdateVolunteerApplicationResponse,
  VolunteerOverviewResponse,
  VolunteerRosterResponse,
  VendorChatsResponse,
  VendorFinanceActivityResponse,
  VendorFinanceResponse,
  VendorResponse,
  VendorUsersPageStatsResponse,
} from "./types";

export type CreateVendorInput = {
  name: string;
  profileUrl?: string;
  description?: string;
};

export type UpdateVendorProfileInput = {
  profileUrl: string;
  description: string;
};

export function fetchMyVendor() {
  return apiRequest<VendorResponse>("/vendors/me");
}

export function fetchVendorChats() {
  return apiRequest<VendorChatsResponse>("/vendors/me/chats").then(
    (response) => response.chats,
  );
}

export function fetchVendorUsersPageStats() {
  return apiRequest<VendorUsersPageStatsResponse>("/vendors/me/users/stats").then(
    (response) => response.stats,
  );
}

export function fetchVendorFinances() {
  return apiRequest<VendorFinanceResponse>("/vendors/me/finances");
}

export function fetchVendorFinanceActivity(activityId: string) {
  return apiRequest<VendorFinanceActivityResponse>(
    `/vendors/me/finances/activities/${encodeURIComponent(activityId)}`,
  );
}

export function fetchVolunteerOverview() {
  return apiRequest<VolunteerOverviewResponse>("/vendors/me/volunteers");
}

export function fetchVolunteerRoster(sessionId: string) {
  return apiRequest<VolunteerRosterResponse>(
    `/vendors/me/volunteers/sessions/${encodeURIComponent(sessionId)}/roster`,
  );
}

export function updateVolunteerApplication(
  sessionId: string,
  userId: string,
  status: "approved" | "rejected",
) {
  return apiRequest<UpdateVolunteerApplicationResponse>(
    `/vendors/me/volunteers/sessions/${encodeURIComponent(sessionId)}/roster/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function createVendor(input: CreateVendorInput) {
  return apiRequest<Required<VendorResponse>>("/vendors/createVendor", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateVendorProfile(input: UpdateVendorProfileInput) {
  return apiRequest<Required<VendorResponse>>("/vendors/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
