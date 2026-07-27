import { apiRequest } from "./client";
import type { RemoteSettingsPreferences } from "../lib/types";

type SettingsResponse = {
  preferences: RemoteSettingsPreferences;
};

export async function fetchSettingsPreferences() {
  const response = await apiRequest<SettingsResponse>("/settings");

  return response.preferences;
}

export async function updateSettingsPreferences(input: RemoteSettingsPreferences) {
  const response = await apiRequest<SettingsResponse>("/settings", {
    method: "PUT",
    body: JSON.stringify({ preferences: input }),
  });

  return response.preferences;
}
