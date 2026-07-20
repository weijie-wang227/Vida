import { apiRequest } from "./client";
import type {
  CreateVendorChatMessageResponse,
  VendorChatMessage,
  VendorChatProfileActivity,
} from "./types";

export function fetchVendorChatMessages(chatId: number) {
  return apiRequest<VendorChatMessage[]>(`/groups/${chatId}/messages`);
}

export function createVendorPoll(
  chatId: number,
  input: { question: string; options: string[] },
) {
  return apiRequest<CreateVendorChatMessageResponse>(`/groups/${chatId}/polls`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function sendVendorChatMessage(chatId: number, text: string) {
  return apiRequest<CreateVendorChatMessageResponse>(`/groups/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function fetchVendorChatUserActivities(userId: string) {
  return apiRequest<VendorChatProfileActivity[]>(
    `/activities/previous/${encodeURIComponent(userId)}`,
  );
}
