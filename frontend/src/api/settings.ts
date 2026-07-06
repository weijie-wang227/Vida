import { apiRequest } from "./client";
import type { SettingsPreferences } from "../lib/types";

type SettingsResponse = {
  preferences: SettingsPreferences;
};

export async function fetchSettingsPreferences() {
  const response = await apiRequest<SettingsResponse>("/settings");

  return response.preferences;
}

export async function updateSettingsPreferences(input: SettingsPreferences) {
  const response = await apiRequest<SettingsResponse>("/settings", {
    method: "PUT",
    body: JSON.stringify({ preferences: input }),
  });

  return response.preferences;
}
