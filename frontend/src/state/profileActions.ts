import { useCallback, type Dispatch, type SetStateAction } from "react";
import { updateProfile as requestUpdateProfile } from "../api";
import type {
  AuthUser,
  ChatMessage,
  FeedComment,
  FeedPost,
  GroupChat,
  Profile,
  UpdateProfileInput,
} from "../lib/types";

type Setter<T> = Dispatch<SetStateAction<T>>;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function updateAuthUserProfile(
  currentUser: AuthUser | null,
  updatedProfile: Profile,
) {
  return currentUser ? { ...currentUser, ...updatedProfile } : currentUser;
}

function updateFeedPostsAuthor(
  posts: FeedPost[],
  previousProfile: Profile,
  updatedProfile: Profile,
) {
  return posts.map((post) =>
    post.handle === previousProfile.handle
      ? {
          ...post,
          user: updatedProfile.name,
          handle: updatedProfile.handle,
          avatar: updatedProfile.avatar,
        }
      : post,
  );
}

function updateFeedCommentsAuthor(
  commentsByPost: Record<number, FeedComment[]>,
  previousProfile: Profile,
  updatedProfile: Profile,
) {
  const nextComments: Record<number, FeedComment[]> = {};

  for (const [postId, comments] of Object.entries(commentsByPost)) {
    nextComments[Number(postId)] = comments.map((comment) =>
      comment.handle === previousProfile.handle
        ? {
            ...comment,
            user: updatedProfile.name,
            handle: updatedProfile.handle,
            avatar: updatedProfile.avatar,
          }
        : comment,
    );
  }

  return nextComments;
}

function updateGroupMembersProfile(
  groups: GroupChat[],
  userId: string | undefined,
  updatedProfile: Profile,
) {
  return groups.map((group) => ({
    ...group,
    memberList: group.memberList?.map((member) =>
      member.id === userId
        ? {
            ...member,
            name: updatedProfile.name,
            handle: updatedProfile.handle,
            avatar: updatedProfile.avatar,
          }
        : member,
    ),
  }));
}

function updateChatMessageSenders(
  messagesByGroup: Record<number, ChatMessage[]>,
  userId: string | undefined,
  updatedProfile: Profile,
) {
  const nextMessages: Record<number, ChatMessage[]> = {};

  for (const [groupId, messages] of Object.entries(messagesByGroup)) {
    nextMessages[Number(groupId)] = messages.map((message) =>
      message.sender.id === userId
        ? {
            ...message,
            sender: {
              ...message.sender,
              name: updatedProfile.name,
              handle: updatedProfile.handle,
              avatar: updatedProfile.avatar,
            },
          }
        : message,
    );
  }

  return nextMessages;
}

export function useProfileActions({
  authUser,
  profile,
  setApiError,
  setAuthUser,
  setChatMessages,
  setFeedComments,
  setFeedPosts,
  setGroupChats,
  setProfile,
}: {
  authUser: AuthUser | null;
  profile: Profile;
  setApiError: Setter<string | null>;
  setAuthUser: Setter<AuthUser | null>;
  setChatMessages: Setter<Record<number, ChatMessage[]>>;
  setFeedComments: Setter<Record<number, FeedComment[]>>;
  setFeedPosts: Setter<FeedPost[]>;
  setGroupChats: Setter<GroupChat[]>;
  setProfile: Setter<Profile>;
}) {
  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      const previousProfile = profile;
      const currentUserId = authUser?.id;

      try {
        const updatedProfile = await requestUpdateProfile(input);

        setProfile(updatedProfile);
        setAuthUser((current) => updateAuthUserProfile(current, updatedProfile));
        setFeedPosts((current) =>
          updateFeedPostsAuthor(current, previousProfile, updatedProfile),
        );
        setFeedComments((current) =>
          updateFeedCommentsAuthor(current, previousProfile, updatedProfile),
        );
        setGroupChats((current) =>
          updateGroupMembersProfile(current, currentUserId, updatedProfile),
        );
        setChatMessages((current) =>
          updateChatMessageSenders(current, currentUserId, updatedProfile),
        );
        setApiError(null);

        return updatedProfile;
      } catch (error) {
        console.error("Unable to update profile", error);
        const message = getErrorMessage(error, "Unable to update profile");
        setApiError(message);
        throw new Error(message);
      }
    },
    [
      authUser,
      profile,
      setApiError,
      setAuthUser,
      setChatMessages,
      setFeedComments,
      setFeedPosts,
      setGroupChats,
      setProfile,
    ],
  );

  return { updateProfile };
}
