import { apiRequest } from "./client";
import type {
  PublicVendorActivity,
  PublicVendorSession,
  VendorSummary,
} from "../lib/types";

export type VendorProfileResponse = {
  vendor: VendorSummary;
};

export type VendorActivitiesResponse = {
  activities: PublicVendorActivity[];
};

export type VendorSessionsResponse = {
  sessions: PublicVendorSession[];
};

export async function fetchVendorProfile(vendorId: string) {
  return apiRequest<VendorProfileResponse>(`/vendors/${vendorId}`);
}

export async function fetchVendorActivities(vendorId: string) {
  return apiRequest<VendorActivitiesResponse>(`/vendors/${vendorId}/activities`);
}

export async function fetchVendorSessions(vendorId: string) {
  return apiRequest<VendorSessionsResponse>(`/vendors/${vendorId}/sessions`);
}
