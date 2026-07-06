import { useEffect, useState } from "react";
import { createVendorActivity, fetchVendorActivities } from "../api/activities";
import type { AuthMode } from "../api/auth";
import { fetchCurrentUser, signIn, signUp } from "../api/auth";
import { clearAuthToken, getAuthToken } from "../api/client";
import type {
  AuthUser,
  CreateActivityInput,
  Vendor,
  VendorActivity,
  VendorStats,
} from "../api/types";
import { createVendor, fetchMyVendor } from "../api/vendors";
import { CreateVendorPage } from "../pages/CreateVendorPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";

type AppStatus = "loading" | "auth" | "vendor-check" | "vendor-create" | "ready";

export function AppShell() {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [activities, setActivities] = useState<VendorActivity[]>([]);
  const [stats, setStats] = useState<VendorStats>({
    activities: 0,
    peopleAttended: 0,
    averageRating: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);

  const loadVendor = async () => {
    setStatus("vendor-check");
    const response = await fetchMyVendor();

    if (!response.vendor) {
      setVendor(null);
      setStatus("vendor-create");
      return;
    }

    setVendor(response.vendor);
    const activityResponse = await fetchVendorActivities();

    setActivities(activityResponse.activities);
    setStats(activityResponse.stats ?? response.stats ?? stats);
    setStatus("ready");
  };

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
        setStatus("auth");
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const handleAuthSubmit = async (
    mode: AuthMode,
    input: {
      name: string;
      handle?: string;
      email: string;
      password: string;
    },
  ) => {
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

  const handleVendorCreate = async (input: {
    name: string;
    profileUrl?: string;
    description?: string;
  }) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await createVendor(input);
      setVendor(response.vendor);
      setStats(response.stats);
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

  const handleSignOut = () => {
    clearAuthToken();
    setUser(null);
    setVendor(null);
    setActivities([]);
    setStatus("auth");
  };

  const handleCreateActivity = async (input: CreateActivityInput) => {
    setActivityError(null);
    setIsCreatingActivity(true);

    try {
      await createVendorActivity(input);
      const response = await fetchVendorActivities();

      setActivities(response.activities);
      setStats(response.stats);
    } catch (submissionError) {
      setActivityError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create activity.",
      );
    } finally {
      setIsCreatingActivity(false);
    }
  };

  if (status === "loading" || status === "vendor-check") {
    return (
      <div className="loading-screen">
        <img src="/logo.png" alt="Vida" />
        <span>{status === "loading" ? "Opening Vida" : "Checking vendor"}</span>
      </div>
    );
  }

  if (status === "auth") {
    return (
      <LoginPage
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  if (status === "vendor-create") {
    return (
      <CreateVendorPage
        error={error}
        isSubmitting={isSubmitting}
        onCreate={handleVendorCreate}
      />
    );
  }

  return (
    <DashboardPage
      user={user}
      vendor={vendor}
      activities={activities}
      stats={stats}
      activityError={activityError}
      isCreatingActivity={isCreatingActivity}
      onCreateActivity={handleCreateActivity}
      onSignOut={handleSignOut}
    />
  );
}
