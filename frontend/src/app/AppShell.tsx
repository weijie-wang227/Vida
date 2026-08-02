import { lazy, Suspense, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { RequireSignIn } from "../components/SignInRequired";
import type { VidaLogoLevels } from "../components/VidaProgressLogo";
import { BottomNavigation } from "./BottomNavigation";
import { emptyLogoLevels, logoPortionOrder } from "./logoState";
import { VidaLogoOverlay } from "./VidaLogoOverlay";

const ActivitiesPage = lazy(() =>
  import("../pages/ActivitiesPage").then((module) => ({
    default: module.ActivitiesPage,
  })),
);
const ActivityDetailPage = lazy(() =>
  import("../pages/ActivityDetailPage").then((module) => ({
    default: module.ActivityDetailPage,
  })),
);
const ActivityReviewPage = lazy(() =>
  import("../pages/ActivityReviewPage").then((module) => ({
    default: module.ActivityReviewPage,
  })),
);
const ActivityCollectionPage = lazy(() =>
  import("../pages/ActivityCollectionPage").then((module) => ({
    default: module.ActivityCollectionPage,
  })),
);
const FavoritedActivitiesPage = lazy(() =>
  import("../pages/FavoritedActivitiesPage").then((module) => ({
    default: module.FavoritedActivitiesPage,
  })),
);
const ActivityCalendarPage = lazy(() =>
  import("../pages/ActivityCalendarPage").then((module) => ({
    default: module.ActivityCalendarPage,
  })),
);
const ChatPage = lazy(() =>
  import("../pages/ChatPage").then((module) => ({
    default: module.ChatPage,
  })),
);
const FeedPage = lazy(() =>
  import("../pages/FeedPage").then((module) => ({
    default: module.FeedPage,
  })),
);
const GroupDetailPage = lazy(() =>
  import("../pages/GroupDetailPage").then((module) => ({
    default: module.GroupDetailPage,
  })),
);
const ProfilePage = lazy(() =>
  import("../pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);
const SettingsPage = lazy(() =>
  import("../pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const PaymentReturnPage = lazy(() =>
  import("../pages/PaymentReturnPage").then((module) => ({
    default: module.PaymentReturnPage,
  })),
);

export function AppShell({ signInPage }: { signInPage: ReactNode }) {
  const location = useLocation();
  const [logoLevels, setLogoLevels] = useState<VidaLogoLevels>(emptyLogoLevels);
  const [isLogoExpanded, setIsLogoExpanded] = useState(false);
  const [nextPortionIndex, setNextPortionIndex] = useState(0);
  const hasFullScreenView =
    location.pathname === "/activities/calendar" ||
    location.pathname === "/activities/favorited" ||
    location.pathname === "/signin" ||
    /^\/activities\/collections\/[^/]+$/.test(location.pathname) ||
    /^\/activities\/[^/]+$/.test(location.pathname) ||
    /^\/groups\/[^/]+$/.test(location.pathname) ||
    location.pathname === "/payments/return" ||
    location.pathname === "/settings";

  const advanceLogoFill = () => {
    const portion = logoPortionOrder[nextPortionIndex];

    setLogoLevels((currentLevels) => ({
      ...currentLevels,
      [portion]:
        currentLevels[portion] >= 100
          ? 0
          : Math.min(100, currentLevels[portion] + 10),
    }));
    setNextPortionIndex(
      (currentIndex) => (currentIndex + 1) % logoPortionOrder.length,
    );
  };

  return (
    <div
      className="h-dvh min-h-dvh overflow-hidden bg-background"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="vida-phone-shell relative mx-auto h-full w-full overflow-hidden">
        <div
          className={`vida-app-content ${
            hasFullScreenView
              ? "vida-app-content--fullscreen"
              : "vida-app-content--with-nav"
          }`}
        >
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Navigate to="/activities" replace />} />
              <Route path="/signin" element={signInPage} />
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route
                path="/activities/favorited"
                element={
                  <RequireSignIn>
                    <FavoritedActivitiesPage />
                  </RequireSignIn>
                }
              />
              <Route
                path="/activities/collections/:collection"
                element={<ActivityCollectionPage />}
              />
              <Route
                path="/activities/calendar"
                element={<ActivityCalendarPage />}
              />
              <Route
                path="/activities/:activityId"
                element={<ActivityDetailPage />}
              />
              <Route
                path="/activities/:activityId/review"
                element={
                  <RequireSignIn>
                    <ActivityReviewPage />
                  </RequireSignIn>
                }
              />
              <Route
                path="/feed"
                element={
                  <RequireSignIn>
                    <FeedPage />
                  </RequireSignIn>
                }
              />
              <Route
                path="/groups"
                element={
                  <RequireSignIn>
                    <ChatPage />
                  </RequireSignIn>
                }
              />
              <Route
                path="/groups/:groupId"
                element={
                  <RequireSignIn>
                    <GroupDetailPage />
                  </RequireSignIn>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireSignIn>
                    <ProfilePage />
                  </RequireSignIn>
                }
              />
              <Route
                path="/payments/return"
                element={
                  <RequireSignIn>
                    <PaymentReturnPage />
                  </RequireSignIn>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireSignIn>
                    <SettingsPage />
                  </RequireSignIn>
                }
              />
              <Route path="*" element={<Navigate to="/activities" replace />} />
            </Routes>
          </Suspense>
        </div>

        {!hasFullScreenView && isLogoExpanded && (
          <VidaLogoOverlay
            levels={logoLevels}
            onAdvance={advanceLogoFill}
            onClose={() => setIsLogoExpanded(false)}
          />
        )}

        <BottomNavigation
          levels={logoLevels}
          onLogoClick={() => setIsLogoExpanded(true)}
        />
      </div>
    </div>
  );
}
