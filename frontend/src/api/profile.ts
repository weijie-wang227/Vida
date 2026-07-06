import { apiRequest } from "./client";
import type {
  Friend,
  FriendSearchResult,
  HandleAvailability,
  Profile,
  UpdateProfileInput,
} from "../lib/types";

export async function fetchProfile() {
  return apiRequest<Profile>("/profile");
}

export async function checkHandleAvailability(handle: string) {
  return apiRequest<HandleAvailability>(
    `/profile/handle-availability?handle=${encodeURIComponent(handle)}`,
  );
}

export async function updateProfile(input: UpdateProfileInput) {
  return apiRequest<Profile>("/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function fetchFriends() {
  return apiRequest<Friend[]>("/friends");
}

export async function searchFriendsByHandle(query: string) {
  return apiRequest<FriendSearchResult[]>(
    `/friends/search?query=${encodeURIComponent(query)}`,
  );
}

export async function addFriend(friendId: string) {
  return apiRequest<Friend>(`/friends/add/${encodeURIComponent(friendId)}`, {
    method: "POST",
  });
}

export async function removeFriend(friendId: number | string) {
  await apiRequest<{ friendId: string }>(
    `/friends/${encodeURIComponent(String(friendId))}`,
    {
      method: "DELETE",
    },
  );
}
