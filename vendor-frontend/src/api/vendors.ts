import { apiRequest } from "./client";
import type { VendorResponse } from "./types";

export type CreateVendorInput = {
  name: string;
  profileUrl?: string;
  description?: string;
};

export function fetchMyVendor() {
  return apiRequest<VendorResponse>("/vendors/me");
}

export function createVendor(input: CreateVendorInput) {
  return apiRequest<Required<VendorResponse>>("/vendors/createVendor", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
