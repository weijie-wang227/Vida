import { apiRequest } from "./client";
import type { AvailableTag } from "./types";

export function fetchAvailableTags() {
  return apiRequest<AvailableTag[]>("/tags");
}
