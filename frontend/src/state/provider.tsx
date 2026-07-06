import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  addFriend as requestAddFriend,
  appointGroupAdmin as requestAppointGroupAdmin,
  blacklistGroupMember as requestBlacklistGroupMember,
  clearAuthToken,
  createActivity as requestCreateActivity,
  createFeedComment as requestCreateFeedComment,
  createFeedPost as requestCreateFeedPost,
  deleteGroup as requestDeleteGroup,
  deleteFeedPost as requestDeleteFeedPost,
  fetchFeedComments as requestFetchFeedComments,
  likeFeedPost as requestLikeFeedPost,
  leaveGroup as requestLeaveGroup,
  markNotificationAsRead as requestMarkNotificationAsRead,
  removeFriend as requestRemoveFriend,
  removeGroupMember as requestRemoveGroupMember,
  setAuthToken,
  signIn as requestSignIn,
  signUp as requestSignUp,
  unlikeFeedPost as requestUnlikeFeedPost,
  updateFeedPost as requestUpdateFeedPost,
  updateSettingsPreferences as requestUpdateSettingsPreferences,
} from "../api";
import { getStoredThemeMode, persistThemeMode } from "../app/themeMode";
import type {
  Activity,
  ChatMessage,
  FeedComment,
  FeedPost,
  Friend,
  GroupChat,
  MapPin,
  Notification,
  PremiumActivity,
  Profile,
  SettingsPreferences,
  StandardActivity,
} from "../lib/types";
import { AppStateContext } from "./context";
import {
  useGroupMessageActions,
  useJoinActivityAction,
  useJoinGroupAction,
} from "./providerActions";
import { useLoadAppData, useRestoreSession } from "./providerEffects";
import {
  markRecentActivityId,
  replaceActivity,
  upsertGroup,
} from "./providerHelpers";
import { useProfileActions } from "./profileActions";
import type { AppState, AppTab } from "./types";

const emptyProfile: Profile = {
  name: "",
  handle: "",
  avatar: "",
  bio: "",
  stats: [],
};

function getDefaultSettingsPreferences(): SettingsPreferences {
  return {
    appearance: getStoredThemeMode(),
    activityReminders: true,
    friendDiscovery: true,
    privateActivityHistory: false,
  };
}

const tabPaths: Record<AppTab, string> = {
  activities: "/activities",
  feed: "/feed",
  chat: "/groups",
  profile: "/profile",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getPendingFriendInviteId() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("friendId");
}

function clearPendingFriendInviteId() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("friendId");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AppTab>("activities");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [friendInviteFeedback, setFriendInviteFeedback] = useState<string | null>(
    null,
  );
  const [friendInviteFriend, setFriendInviteFriend] = useState<Friend | null>(
    null,
  );
  const [pendingFriendInviteId, setPendingFriendInviteId] = useState<
    string | null
  >(() => getPendingFriendInviteId());
  const [showProfile, setShowProfile] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showProfileFriends, setShowProfileFriends] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [premiumActivities, setPremiumActivities] = useState<PremiumActivity[]>([]);
  const [standardActivities, setStandardActivities] = useState<
    StandardActivity[]
  >([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedComments, setFeedComments] = useState<Record<number, FeedComment[]>>(
    {},
  );
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [chatMessages, setChatMessages] = useState<
    Record<number, ChatMessage[]>
  >({});
  const [friends, setFriends] = useState<Friend[]>([]);
  const [mapPins, setMapPins] = useState<MapPin[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [authUser, setAuthUser] = useState<AppState["authUser"]>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(
    null,
  );
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Record<number, boolean>>(
    {},
  );
  const [likedActivityIds, setLikedActivityIds] = useState<
    Record<number, boolean>
  >({});
  const [joinedActivityIds, setJoinedActivityIds] = useState<number[]>([]);
  const [settingsPreferences, setSettingsPreferences] =
    useState<SettingsPreferences>(() => getDefaultSettingsPreferences());

  useRestoreSession({
    setAuthError,
    setAuthUser,
    setIsAuthReady,
    setProfile,
  });

  useLoadAppData({
    authUser,
    isAuthReady,
    setApiError,
    setFeedPosts,
    setFriends,
    setGroupChats,
    setIsLoading,
    setMapPins,
    setNotifications,
    setPremiumActivities,
    setJoinedActivityIds,
    setProfile,
    setSettingsPreferences,
    setStandardActivities,
  });

  const applyActivityUpdate = useCallback((activity: Activity) => {
    if ("cover" in activity) {
      setPremiumActivities((current) => replaceActivity(current, activity));
      return;
    }

    setStandardActivities((current) => replaceActivity(current, activity));
  }, []);

  const applyGroupUpdate = useCallback((group: GroupChat) => {
    setGroupChats((current) => upsertGroup(current, group));
  }, []);

  const removeGroupLocally = useCallback((groupId: number) => {
    setGroupChats((current) => current.filter((group) => group.id !== groupId));
    setChatMessages((current) => {
      const { [groupId]: _removedMessages, ...next } = current;

      return next;
    });
  }, []);

  const navigateToGroup = useCallback(
    (groupId: number) => navigate(`/groups/${groupId}`),
    [navigate],
  );

  const { loadGroupMessages, sendGroupMessage } = useGroupMessageActions({
    applyGroupUpdate,
    setApiError,
    setChatMessages,
  });

  const joinActivity = useJoinActivityAction({
    applyActivityUpdate,
    applyGroupUpdate,
    navigateToGroup,
    setActiveTab,
    setApiError,
    setChatMessages,
    setJoinedActivityIds,
    setSelectedActivityId,
    setSelectedGroupId,
  });

  const joinGroup = useJoinGroupAction({
    applyGroupUpdate,
    navigateToGroup,
    setActiveTab,
    setApiError,
    setSelectedActivityId,
    setSelectedGroupId,
  });

  const { updateProfile } = useProfileActions({
    authUser,
    profile,
    setApiError,
    setAuthUser,
    setChatMessages,
    setFeedComments,
    setFeedPosts,
    setGroupChats,
    setProfile,
  });

  const addFriend = useCallback(async (friendId: string) => {
    const nextFriendId = friendId.trim();

    if (!nextFriendId) {
      const message = "Friend link is missing a user ID.";
      setApiError(message);
      throw new Error(message);
    }

    try {
      const friend = await requestAddFriend(nextFriendId);

      setFriends((current) =>
        current.some((item) => item.id === friend.id) ? current : [...current, friend],
      );
      setShowProfileFriends(true);
      setActiveTab("profile");
      navigate("/profile");
      setApiError(null);

      return friend;
    } catch (error) {
      console.error("Unable to add friend", error);
      const message = getErrorMessage(error, "Unable to add friend");
      setApiError(message);
      throw new Error(message);
    }
  }, [navigate]);

  const removeFriend = useCallback(async (friendId: number | string) => {
    try {
      await requestRemoveFriend(friendId);

      setFriends((current) =>
        current.filter((friend) => String(friend.id) !== String(friendId)),
      );
      setApiError(null);
    } catch (error) {
      console.error("Unable to remove friend", error);
      const message = getErrorMessage(error, "Unable to remove friend");
      setApiError(message);
      throw new Error(message);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      const notification = await requestMarkNotificationAsRead(notificationId);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? notification : item,
        ),
      );
      setApiError(null);
    } catch (error) {
      console.error("Unable to mark notification as read", error);
      const message = getErrorMessage(error, "Unable to mark notification as read");
      setApiError(message);
      throw new Error(message);
    }
  }, []);

  const clearFriendInvite = useCallback(() => {
    clearPendingFriendInviteId();
    setPendingFriendInviteId(null);
    setFriendInviteFeedback(null);
  }, []);

  const clearFriendInviteResult = useCallback(() => {
    setFriendInviteFriend(null);
    setFriendInviteFeedback(null);
  }, []);

  useEffect(() => {
    if (!authUser || !pendingFriendInviteId) {
      return;
    }

    let ignore = false;

    setActiveTab("profile");

    async function acceptFriendInvite() {
      if (!pendingFriendInviteId) {
        return;
      }

      if (pendingFriendInviteId === authUser.id) {
        setShowProfileFriends(false);
        setFriendInviteFeedback("You cannot add yourself from your own QR code.");
        navigate("/profile", { replace: true });
        clearPendingFriendInviteId();
        setPendingFriendInviteId(null);
        return;
      }

      try {
        const friend = await addFriend(pendingFriendInviteId);

        if (ignore) {
          return;
        }

        setFriendInviteFriend(friend);
        setFriendInviteFeedback(`${friend.name} added successfully.`);
        clearPendingFriendInviteId();
        setPendingFriendInviteId(null);
        navigate("/profile", { replace: true });
      } catch (error) {
        if (!ignore) {
          setShowProfileFriends(false);
          setFriendInviteFeedback(
            getErrorMessage(error, "Unable to add friend from invite link."),
          );
          clearPendingFriendInviteId();
          setPendingFriendInviteId(null);
          navigate("/profile", { replace: true });
        }
      }
    }

    acceptFriendInvite();

    return () => {
      ignore = true;
    };
  }, [addFriend, authUser, navigate, pendingFriendInviteId]);

  useEffect(() => {
    setLikedPostIds(
      Object.fromEntries(
        feedPosts
          .filter((post) => post.likedByMe)
          .map((post) => [post.id, true]),
      ),
    );
  }, [feedPosts]);

  const appState = useMemo<AppState>(
    () => ({
      activeTab,
      apiError,
      authError,
      authUser,
      isAuthReady,
      isAuthenticated: Boolean(authUser),
      isLoading,
      friendInviteFeedback,
      friendInviteFriend,
      showProfile,
      showMap,
      showProfileFriends,
      showSettings,
      selectedActivityId,
      selectedGroupId,
      premiumActivities,
      standardActivities,
      feedPosts,
      feedComments,
      groupChats,
      chatMessages,
      friends,
      mapPins,
      notifications,
      profile,
      joinedActivityIds,
      likedPostIds,
      likedActivityIds,
      settingsPreferences,
      signIn: async (input) => {
        try {
          const { token, user } = await requestSignIn(input);

          setAuthToken(token);
          setAuthUser(user);
          setProfile(user);
          setPremiumActivities([]);
          setStandardActivities([]);
          setFeedPosts([]);
          setFeedComments({});
          setGroupChats([]);
          setChatMessages({});
          setFriends([]);
          setMapPins([]);
          setNotifications([]);
          setAuthError(null);
          setActiveTab("activities");
          setShowProfile(false);
          setShowSettings(false);
          setSelectedActivityId(null);
          setSelectedGroupId(null);
          setJoinedActivityIds([]);
          setSettingsPreferences(getDefaultSettingsPreferences());
        } catch (error) {
          console.error("Unable to sign in", error);
          const message = getErrorMessage(error, "Unable to sign in");
          setAuthError(message);
          throw new Error(message);
        }
      },
      signUp: async (input) => {
        try {
          const { token, user } = await requestSignUp(input);

          setAuthToken(token);
          setAuthUser(user);
          setProfile(user);
          setPremiumActivities([]);
          setStandardActivities([]);
          setFeedPosts([]);
          setFeedComments({});
          setGroupChats([]);
          setChatMessages({});
          setFriends([]);
          setMapPins([]);
          setNotifications([]);
          setAuthError(null);
          setActiveTab("activities");
          setShowProfile(false);
          setShowSettings(false);
          setSelectedActivityId(null);
          setSelectedGroupId(null);
          setJoinedActivityIds([]);
          setSettingsPreferences(getDefaultSettingsPreferences());
        } catch (error) {
          console.error("Unable to sign up", error);
          const message = getErrorMessage(error, "Unable to sign up");
          setAuthError(message);
          throw new Error(message);
        }
      },
      createActivity: async (input) => {
        try {
          const { activity, group, mapPin } = await requestCreateActivity(input);

          setStandardActivities((current) => [...current, activity]);
          setMapPins((current) => [...current, mapPin]);
          setJoinedActivityIds((current) =>
            markRecentActivityId(current, activity.id),
          );
          applyGroupUpdate(group);
          setShowMap(false);
          setApiError(null);

          return activity;
        } catch (error) {
          console.error("Unable to create activity", error);
          const message = getErrorMessage(error, "Unable to create activity");
          setApiError(message);
          throw new Error(message);
        }
      },
      createFeedPost: async (input) => {
        try {
          const post = await requestCreateFeedPost(input);

          setFeedPosts((current) => [
            post,
            ...current.filter((item) => item.id !== post.id),
          ]);
          setApiError(null);

          return post;
        } catch (error) {
          console.error("Unable to create feed post", error);
          const message = getErrorMessage(error, "Unable to create feed post");
          setApiError(message);
          throw new Error(message);
        }
      },
      updateFeedPost: async (postId, input) => {
        try {
          const post = await requestUpdateFeedPost(postId, input);

          setFeedPosts((current) =>
            current.map((item) => (item.id === post.id ? post : item)),
          );
          setApiError(null);

          return post;
        } catch (error) {
          console.error("Unable to update feed post", error);
          const message = getErrorMessage(error, "Unable to update feed post");
          setApiError(message);
          throw new Error(message);
        }
      },
      deleteFeedPost: async (postId) => {
        try {
          await requestDeleteFeedPost(postId);

          setFeedPosts((current) => current.filter((post) => post.id !== postId));
          setFeedComments((current) => {
            const { [postId]: _deletedComments, ...next } = current;

            return next;
          });
          setLikedPostIds((current) => {
            const { [postId]: _deletedLike, ...next } = current;

            return next;
          });
          setApiError(null);
        } catch (error) {
          console.error("Unable to delete feed post", error);
          const message = getErrorMessage(error, "Unable to delete feed post");
          setApiError(message);
          throw new Error(message);
        }
      },
      loadFeedComments: async (postId) => {
        try {
          const response = await requestFetchFeedComments(postId);

          setFeedComments((current) => ({
            ...current,
            [postId]: response.comments,
          }));
          setFeedPosts((current) =>
            current.map((post) =>
              post.id === postId
                ? { ...post, comments: response.commentCount }
                : post,
            ),
          );
          setApiError(null);

          return response.comments;
        } catch (error) {
          console.error("Unable to load comments", error);
          const message = getErrorMessage(error, "Unable to load comments");
          setApiError(message);
          throw new Error(message);
        }
      },
      createFeedComment: async (postId, input) => {
        try {
          const response = await requestCreateFeedComment(postId, input);

          setFeedComments((current) => {
            const comments = current[postId] ?? [];

            return {
              ...current,
              [postId]: [
                ...comments.filter((comment) => comment.id !== response.comment.id),
                response.comment,
              ],
            };
          });
          setFeedPosts((current) =>
            current.map((post) =>
              post.id === postId
                ? { ...post, comments: response.commentCount }
                : post,
            ),
          );
          setApiError(null);

          return response.comment;
        } catch (error) {
          console.error("Unable to create comment", error);
          const message = getErrorMessage(error, "Unable to create comment");
          setApiError(message);
          throw new Error(message);
        }
      },
      addFriend,
      removeFriend,
      markNotificationAsRead,
      updateProfile,
      updateSettingsPreferences: async (input) => {
        const previousPreferences = settingsPreferences;

        setSettingsPreferences(input);
        persistThemeMode(input.appearance);

        try {
          const updatedPreferences = await requestUpdateSettingsPreferences(input);

          setSettingsPreferences(updatedPreferences);
          persistThemeMode(updatedPreferences.appearance);
          setApiError(null);

          return updatedPreferences;
        } catch (error) {
          console.error("Unable to update settings", error);
          setSettingsPreferences(previousPreferences);
          persistThemeMode(previousPreferences.appearance);

          const message = getErrorMessage(error, "Unable to update settings");
          setApiError(message);
          throw new Error(message);
        }
      },
      clearFriendInvite,
      clearFriendInviteResult,
      joinActivity,
      joinGroup,
      leaveGroup: async (groupId) => {
        try {
          await requestLeaveGroup(groupId);
          removeGroupLocally(groupId);
          setSelectedGroupId(null);
          setActiveTab("chat");
          navigate("/groups");
          setApiError(null);
        } catch (error) {
          console.error("Unable to leave group", error);
          const message = getErrorMessage(error, "Unable to leave group");
          setApiError(message);
          throw new Error(message);
        }
      },
      deleteGroup: async (groupId) => {
        try {
          await requestDeleteGroup(groupId);
          removeGroupLocally(groupId);
          setSelectedGroupId(null);
          setActiveTab("chat");
          navigate("/groups");
          setApiError(null);
        } catch (error) {
          console.error("Unable to delete group", error);
          const message = getErrorMessage(error, "Unable to delete group");
          setApiError(message);
          throw new Error(message);
        }
      },
      removeGroupMember: async (groupId, memberId) => {
        try {
          const response = await requestRemoveGroupMember(groupId, memberId);

          applyGroupUpdate(response.group);
          setApiError(null);

          return response.group;
        } catch (error) {
          console.error("Unable to remove member", error);
          const message = getErrorMessage(error, "Unable to remove member");
          setApiError(message);
          throw new Error(message);
        }
      },
      appointGroupAdmin: async (groupId, memberId) => {
        try {
          const response = await requestAppointGroupAdmin(groupId, memberId);

          applyGroupUpdate(response.group);
          setApiError(null);

          return response.group;
        } catch (error) {
          console.error("Unable to appoint admin", error);
          const message = getErrorMessage(error, "Unable to appoint admin");
          setApiError(message);
          throw new Error(message);
        }
      },
      blacklistGroupMember: async (groupId, memberId) => {
        try {
          const response = await requestBlacklistGroupMember(groupId, memberId);

          applyGroupUpdate(response.group);
          setApiError(null);

          return response.group;
        } catch (error) {
          console.error("Unable to blacklist member", error);
          const message = getErrorMessage(error, "Unable to blacklist member");
          setApiError(message);
          throw new Error(message);
        }
      },
      loadGroupMessages,
      sendGroupMessage,
      signOut: () => {
        clearAuthToken();
        setAuthUser(null);
        setAuthError(null);
        setProfile(emptyProfile);
        setPremiumActivities([]);
        setStandardActivities([]);
        setFeedPosts([]);
        setFeedComments({});
        setFriends([]);
        setMapPins([]);
        setNotifications([]);
        setGroupChats([]);
        setChatMessages({});
        setJoinedActivityIds([]);
        setSettingsPreferences(getDefaultSettingsPreferences());
        setActiveTab("activities");
        setShowProfile(false);
        setShowSettings(false);
        setSelectedActivityId(null);
        setSelectedGroupId(null);
        clearFriendInvite();
        clearFriendInviteResult();
        navigate("/activities", { replace: true });
      },
      selectTab: (tab) => {
        setShowProfile(false);
        setShowSettings(false);
        setSelectedActivityId(null);
        setSelectedGroupId(null);
        setActiveTab(tab);
        navigate(tabPaths[tab]);
      },
      openActivity: (activityId) => {
        setSelectedGroupId(null);
        setSelectedActivityId(activityId);
        navigate(`/activities/${activityId}`);
      },
      closeActivity: () => {
        setSelectedActivityId(null);
        navigate("/activities");
      },
      openGroup: (groupId) => {
        setSelectedActivityId(null);
        setSelectedGroupId(groupId);
        navigate(`/groups/${groupId}`);
      },
      closeGroup: () => {
        setSelectedGroupId(null);
        navigate("/groups");
      },
      openProfile: () => {
        setSelectedActivityId(null);
        setSelectedGroupId(null);
        setShowProfile(false);
        setShowSettings(false);
        setActiveTab("profile");
        navigate("/profile");
      },
      closeProfile: () => {
        setShowProfile(false);
        setShowSettings(false);
        setActiveTab("activities");
        navigate("/activities");
      },
      openSettings: () => {
        setSelectedActivityId(null);
        setSelectedGroupId(null);
        setShowSettings(true);
        setActiveTab("profile");
        navigate("/settings");
      },
      closeSettings: () => {
        setShowSettings(false);
        navigate("/profile");
      },
      setShowMap,
      setShowProfileFriends,
      togglePostLike: async (postId) => {
        const post = feedPosts.find((item) => item.id === postId);
        const isLiked = Boolean(likedPostIds[postId] ?? post?.likedByMe);

        try {
          const response = isLiked
            ? await requestUnlikeFeedPost(postId)
            : await requestLikeFeedPost(postId);

          setFeedPosts((current) =>
            current.map((item) =>
              item.id === postId
                ? {
                    ...item,
                    likesCount: response.likesCount,
                    likedByMe: response.likedByMe,
                  }
                : item,
            ),
          );
          setLikedPostIds((current) => ({
            ...current,
            [postId]: response.likedByMe,
          }));
          setApiError(null);
        } catch (error) {
          console.error("Unable to update post like", error);
          const message = getErrorMessage(error, "Unable to update post like");
          setApiError(message);
          throw new Error(message);
        }
      },
      toggleActivityLike: (activityId) =>
        setLikedActivityIds((current) => ({
          ...current,
          [activityId]: !current[activityId],
        })),
    }),
    [
      activeTab,
      apiError,
      authError,
      authUser,
      isAuthReady,
      isLoading,
      friendInviteFeedback,
      friendInviteFriend,
      showProfile,
      showMap,
      showProfileFriends,
      showSettings,
      selectedActivityId,
      selectedGroupId,
      premiumActivities,
      standardActivities,
      feedPosts,
      feedComments,
      groupChats,
      chatMessages,
      friends,
      mapPins,
      notifications,
      profile,
      joinedActivityIds,
      likedPostIds,
      likedActivityIds,
      settingsPreferences,
      navigate,
      applyGroupUpdate,
      addFriend,
      removeFriend,
      markNotificationAsRead,
      clearFriendInvite,
      clearFriendInviteResult,
      joinActivity,
      joinGroup,
      loadGroupMessages,
      removeGroupLocally,
      sendGroupMessage,
      updateProfile,
    ],
  );

  return (
    <AppStateContext.Provider value={appState}>
      {children}
    </AppStateContext.Provider>
  );
}
