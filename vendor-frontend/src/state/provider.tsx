import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createVendorActivity,
  createVendorSession,
  deleteVendorSession,
  fetchVendorActivities,
  fetchVendorSessions,
  updateSessionOpen,
  updateVendorSession,
} from "../api/activities";
import type { AuthMode } from "../api/auth";
import { fetchCurrentUser, signIn, signUp } from "../api/auth";
import { clearAuthToken, getAuthToken } from "../api/client";
import type {
  Activity,
  AuthUser,
  CreateActivityInput,
  CreateSessionInput,
  CreateVendorActivityResponse,
  CreateVendorSessionResponse,
  Onboarded,
  Session,
  UpdateSessionInput,
  UpdateVendorSessionResponse,
  Vendor,
  VendorStats,
} from "../api/types";
import {
  createVendor,
  fetchMyVendor,
  updateVendorProfile,
  type CreateVendorInput,
  type UpdateVendorProfileInput,
} from "../api/vendors";
import { VendorStateContext } from "./context";
import type { AuthSubmitInput, VendorAppStatus } from "./types";

export function VendorStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [status, setStatus] = useState<VendorAppStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [onboarded, setOnboarded] = useState<Onboarded[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const loadVendor = useCallback(async () => {
    setStatus("vendor-check");
    const response = await fetchMyVendor();

    if (!response.vendor) {
      setVendor(null);
      setStats(null);
      setActivities([]);
      setSessions([]);
      setOnboarded([]);
      setStatus("vendor-create");
      return;
    }

    const [activityRows, sessionRows] = await Promise.all([
      fetchVendorActivities(),
      fetchVendorSessions(),
    ]);

    setVendor(response.vendor);
    setStats(response.stats);
    setActivities(activityRows);
    setSessions(sessionRows);
    setOnboarded([]);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!getAuthToken()) {
        setStatus("auth");
        return;
      }

      try {
        const response = await fetchCurrentUser();

        if (!active) {
          return;
        }

        setUser(response.user);
        await loadVendor();
      } catch {
        if (!active) {
          return;
        }

        clearAuthToken();
        setUser(null);
        setVendor(null);
        setStats(null);
        setActivities([]);
        setSessions([]);
        setStatus("auth");
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, [loadVendor]);

  const submitAuth = async (mode: AuthMode, input: AuthSubmitInput) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response =
        mode === "signup"
          ? await signUp(input)
          : await signIn({ email: input.email, password: input.password });

      setUser(response.user);
      await loadVendor();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const createVendorProfile = async (input: CreateVendorInput) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await createVendor(input);

      setVendor(response.vendor);
      setStats(response.stats);
      setActivities([]);
      setSessions([]);
      setOnboarded([]);
      setStatus("ready");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = () => {
    clearAuthToken();
    setUser(null);
    setVendor(null);
    setStats(null);
    setActivities([]);
    setSessions([]);
    setOnboarded([]);
    setStatus("auth");
  };

  const createActivity = async (
    input: CreateActivityInput,
  ): Promise<CreateVendorActivityResponse> => {
    setActivityError(null);
    setIsCreatingActivity(true);

    try {
      const createdActivity = await createVendorActivity(input);
      const activityRows = await fetchVendorActivities();

      setActivities(activityRows);
      return createdActivity;
    } catch (submissionError) {
      setActivityError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create activity.",
      );
      throw submissionError;
    } finally {
      setIsCreatingActivity(false);
    }
  };

  const createSession = async (
    input: CreateSessionInput,
  ): Promise<CreateVendorSessionResponse> => {
    setActivityError(null);
    setIsCreatingActivity(true);

    try {
      const createdSession = await createVendorSession(input);
      const [activityRows, sessionRows] = await Promise.all([
        fetchVendorActivities(),
        fetchVendorSessions(),
      ]);

      setActivities(activityRows);
      setSessions(sessionRows);
      return createdSession;
    } catch (submissionError) {
      setActivityError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create session.",
      );
      throw submissionError;
    } finally {
      setIsCreatingActivity(false);
    }
  };

  const saveVendorProfile = async (input: UpdateVendorProfileInput) => {
    const response = await updateVendorProfile(input);

    setVendor(response.vendor);
    setStats(response.stats);
  };

  const toggleSessionOpen = async (
    sessionId: number | string,
    isOpen: boolean,
  ) => {
    setActivityError(null);
    setUpdatingSessionId(String(sessionId));

    try {
      const response = await updateSessionOpen({ sessionId, isOpen });
      const responseSessionId = String(
        response.session?.mockId ?? response.session?.id ?? sessionId,
      );

      setSessions((current) =>
        current.map((row) => {
          const rowSessionId = String(row.mockId ?? row.id);

          return rowSessionId === responseSessionId
            ? { ...row, isOpen: response.session?.isOpen ?? response.activity.isOpen }
            : row;
        }),
      );
    } catch (submissionError) {
      setActivityError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to update session status.",
      );
    } finally {
      setUpdatingSessionId(null);
    }
  };

  const updateSessionDetails = async (
    sessionId: number | string,
    input: UpdateSessionInput,
  ): Promise<UpdateVendorSessionResponse> => {
    setActivityError(null);
    setUpdatingSessionId(String(sessionId));

    try {
      const response = await updateVendorSession(sessionId, input);
      const updatedIds = new Set(
        [
          response.session.id,
          response.session.objectId,
          response.session.mockId,
          sessionId,
        ].map(String),
      );

      setSessions((current) =>
        current.map((row) =>
          [row.id, row.objectId, row.mockId].some(
            (value) =>
              value !== undefined && updatedIds.has(String(value)),
          )
            ? response.session
            : row,
        ),
      );
      setActivities((current) =>
        current.map((activity) =>
          activity.id === response.activity.id ||
          activity.mockId === response.activity.mockId
            ? { ...activity, totalRevenue: response.activity.totalRevenue }
            : activity,
        ),
      );

      return response;
    } catch (submissionError) {
      setActivityError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to update session.",
      );
      throw submissionError;
    } finally {
      setUpdatingSessionId(null);
    }
  };

  const deleteSession = async (sessionId: number | string) => {
    setActivityError(null);
    setDeletingSessionId(String(sessionId));

    try {
      const response = await deleteVendorSession(sessionId);
      const deletedIds = new Set([
        String(response.session.id),
        String(response.session.mockId),
        String(sessionId),
      ]);

      setSessions((current) =>
        current.filter(
          (row) =>
            ![row.id, row.objectId, row.mockId].some(
              (value) => value !== undefined && deletedIds.has(String(value)),
            ),
        ),
      );
      setActivities((current) =>
        current.map((activity) =>
          activity.id === response.activity.id ||
          activity.mockId === response.activity.mockId
            ? {
                ...activity,
                sessionsNum: response.activity.sessionsNum,
                registeredCount: response.activity.registeredCount,
                totalRevenue: response.activity.totalRevenue,
              }
            : activity,
        ),
      );
    } catch (submissionError) {
      setActivityError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to delete session.",
      );
      throw submissionError;
    } finally {
      setDeletingSessionId(null);
    }
  };

  const value = useMemo(
    () => ({
      status,
      user,
      vendor,
      stats,
      activities,
      sessions,
      onboarded,
      error,
      activityError,
      isSubmitting,
      isCreatingActivity,
      updatingSessionId,
      deletingSessionId,
      submitAuth,
      createVendorProfile,
      signOut,
      createActivity,
      createSession,
      updateSessionDetails,
      updateVendorProfile: saveVendorProfile,
      toggleSessionOpen,
      deleteSession,
    }),
    [
      status,
      user,
      vendor,
      stats,
      activities,
      sessions,
      onboarded,
      error,
      activityError,
      isSubmitting,
      isCreatingActivity,
      updatingSessionId,
      deletingSessionId,
    ],
  );

  return (
    <VendorStateContext.Provider value={value}>
      {children}
    </VendorStateContext.Provider>
  );
}
