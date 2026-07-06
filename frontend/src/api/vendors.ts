import { apiRequest } from "./client";
import type { VendorActivity, VendorStats, VendorSummary } from "../lib/types";

export type VendorProfileResponse = {
  vendor: VendorSummary | null;
  stats: VendorStats | null;
};

export type VendorActivitiesResponse = {
  activities: VendorActivity[];
  stats: VendorStats;
};

export async function fetchVendorProfile(vendorId: string) {
  return apiRequest<VendorProfileResponse>(`/vendors/${vendorId}`);
}

export async function fetchVendorActivities(vendorId: string) {
  return apiRequest<VendorActivitiesResponse>(`/vendors/${vendorId}/activities`);
}
