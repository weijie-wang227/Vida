import { apiRequest } from "./client";
import type {
  ChatMessage,
  GroupMutationResponse,
  GroupChat,
  JoinGroupResponse,
  SendGroupMessageResponse,
} from "../lib/types";

export async function fetchGroupChats() {
  return apiRequest<GroupChat[]>("/groups");
}

export async function fetchGroupMessages(groupId: number) {
  return apiRequest<ChatMessage[]>(`/groups/${groupId}/messages`);
}

export async function sendGroupMessage(groupId: number, body: string) {
  return apiRequest<SendGroupMessageResponse>(`/groups/${groupId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function joinGroup(groupId: number) {
  return apiRequest<JoinGroupResponse>(`/groups/${groupId}/join`, {
    method: "POST",
  });
}

export async function leaveGroup(groupId: number) {
  return apiRequest<void>(`/groups/${groupId}/members/me`, {
    method: "DELETE",
  });
}

export async function deleteGroup(groupId: number) {
  return apiRequest<void>(`/groups/${groupId}`, {
    method: "DELETE",
  });
}

export async function removeGroupMember(groupId: number, memberId: string) {
  return apiRequest<GroupMutationResponse>(
    `/groups/${groupId}/members/${memberId}`,
    {
      method: "DELETE",
    },
  );
}

export async function appointGroupAdmin(groupId: number, memberId: string) {
  return apiRequest<GroupMutationResponse>(
    `/groups/${groupId}/admins/${memberId}`,
    {
      method: "POST",
    },
  );
}

export async function blacklistGroupMember(groupId: number, memberId: string) {
  return apiRequest<GroupMutationResponse>(
    `/groups/${groupId}/blacklist/${memberId}`,
    {
      method: "POST",
    },
  );
}
