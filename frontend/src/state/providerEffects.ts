import { useEffect, type Dispatch, type SetStateAction } from "react";
import {
  clearAuthToken,
  fetchCurrentUser,
  fetchFeedPosts,
  fetchFriends,
  fetchGroupChats,
  fetchMapPins,
  fetchNotifications,
  fetchPremiumActivities,
  fetchProfile,
  fetchSettingsPreferences,
  fetchStandardActivities,
  getAuthToken,
} from "../api";
import { persistThemeMode } from "../app/themeMode";
import type {
  AuthUser,
  Activity,
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
import { activityIdsJoinedByProfile } from "./providerHelpers";

type Setter<T> = Dispatch<SetStateAction<T>>;

export function useRestoreSession({
  setAuthError,
  setAuthUser,
  setIsAuthReady,
  setProfile,
}: {
  setAuthError: Setter<string | null>;
  setAuthUser: Setter<AuthUser | null>;
  setIsAuthReady: Setter<boolean>;
  setProfile: Setter<Profile>;
}) {
  useEffect(() => {
    let ignore = false;

    async function restoreSession() {
      const token = getAuthToken();

      if (!token) {
        setIsAuthReady(true);
        return;
      }

      try {
        const { user } = await fetchCurrentUser();

        if (ignore) {
          return;
        }

        setAuthUser(user);
        setProfile(user);
        setAuthError(null);
      } catch (error) {
        console.error("Unable to restore session", error);
        clearAuthToken();

        if (!ignore) {
          setAuthUser(null);
        }
      } finally {
        if (!ignore) {
          setIsAuthReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      ignore = true;
    };
  }, [setAuthError, setAuthUser, setIsAuthReady, setProfile]);
}

export function useLoadAppData({
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
}: {
  authUser: AuthUser | null;
  isAuthReady: boolean;
  setApiError: Setter<string | null>;
  setFeedPosts: Setter<FeedPost[]>;
  setFriends: Setter<Friend[]>;
  setGroupChats: Setter<GroupChat[]>;
  setIsLoading: Setter<boolean>;
  setMapPins: Setter<MapPin[]>;
  setNotifications: Setter<Notification[]>;
  setPremiumActivities: Setter<PremiumActivity[]>;
  setJoinedActivityIds: Setter<number[]>;
  setProfile: Setter<Profile>;
  setSettingsPreferences: Setter<SettingsPreferences>;
  setStandardActivities: Setter<StandardActivity[]>;
}) {
  useEffect(() => {
    let ignore = false;

    async function loadAppData() {
      if (!isAuthReady || !authUser) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [
          nextPremiumActivities,
          nextStandardActivities,
          nextFeedPosts,
          nextGroupChats,
          nextFriends,
          nextMapPins,
          nextNotifications,
          nextProfile,
          nextSettingsPreferences,
        ] = await Promise.all([
          fetchPremiumActivities(),
          fetchStandardActivities(),
          fetchFeedPosts(),
          fetchGroupChats(),
          fetchFriends(),
          fetchMapPins(),
          fetchNotifications(),
          fetchProfile(),
          fetchSettingsPreferences(),
        ]);

        if (ignore) {
          return;
        }

        setPremiumActivities(nextPremiumActivities);
        setStandardActivities(nextStandardActivities);
        setJoinedActivityIds(
          activityIdsJoinedByProfile(
            [
              ...nextPremiumActivities,
              ...nextStandardActivities,
            ] as Activity[],
            nextProfile.handle,
          ),
        );
        setFeedPosts(nextFeedPosts);
        setGroupChats(nextGroupChats);
        setFriends(nextFriends);
        setMapPins(nextMapPins);
        setNotifications(nextNotifications);
        setProfile(nextProfile);
        setSettingsPreferences(nextSettingsPreferences);
        persistThemeMode(nextSettingsPreferences.appearance);
        setApiError(null);
      } catch (error) {
        if (!ignore) {
          console.error("Unable to load app data", error);
          setApiError(error instanceof Error ? error.message : "API unavailable");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadAppData();

    return () => {
      ignore = true;
    };
  }, [
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
  ]);
}
